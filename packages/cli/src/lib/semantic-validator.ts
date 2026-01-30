/**
 * Semantic Validator for DemoScript
 *
 * Performs semantic validation beyond JSON Schema:
 * - Duplicate step ID detection
 * - Goto target validation
 * - Nested group detection (with friendly error)
 * - Undefined variable warnings
 */

import type { DemoConfig, StepOrGroup, Step, Choice } from '../types.js';
import { isStepGroup, isSlideStep } from '../types.js';

export interface SemanticError {
  path: string;
  message: string;
  type: 'error';
}

export interface SemanticWarning {
  path: string;
  message: string;
  type: 'warning';
}

export interface SemanticValidationResult {
  valid: boolean;
  errors: SemanticError[];
  warnings: SemanticWarning[];
}

/**
 * Extract all text content from a step that might contain variable references
 */
function getStepTextContent(step: Step): string[] {
  const texts: string[] = [];

  // REST endpoint
  if ('rest' in step) {
    texts.push(step.rest);
  }
  if ('path' in step && typeof step.path === 'string') {
    texts.push(step.path);
  }

  // Base URL
  if ('base_url' in step && step.base_url) {
    texts.push(step.base_url);
  }

  // Headers
  if ('headers' in step && step.headers) {
    for (const value of Object.values(step.headers)) {
      texts.push(value);
    }
  }

  // Slide content
  if ('slide' in step) {
    texts.push(step.slide);
  }
  if ('content' in step && typeof step.content === 'string') {
    texts.push(step.content);
  }

  // Shell command
  if ('shell' in step) {
    texts.push(step.shell);
  }
  if ('command' in step && typeof step.command === 'string') {
    texts.push(step.command);
  }

  // Poll endpoint
  if ('poll' in step && typeof step.poll === 'string') {
    texts.push(step.poll);
  }

  // Diagram
  if ('diagram' in step && step.diagram) {
    texts.push(step.diagram as string);
  }

  return texts;
}

/**
 * Extract variable references ($varName) from text
 */
function extractVariableReferences(text: string): string[] {
  const regex = /\$([a-zA-Z_][a-zA-Z0-9_]*)/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

/**
 * Check if an item looks like a nested group (group inside group.steps)
 */
function hasNestedGroups(items: StepOrGroup[], path: string, errors: SemanticError[]): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (isStepGroup(item)) {
      // Check if any step inside this group is also a group
      for (let j = 0; j < item.steps.length; j++) {
        const innerItem = item.steps[j] as unknown;
        if (innerItem && typeof innerItem === 'object' && 'group' in innerItem && 'steps' in innerItem) {
          errors.push({
            path: `${path}/${i}/steps/${j}`,
            message: `Nested groups are not supported. The group "${(innerItem as { group: string }).group}" cannot be inside group "${item.group}". Groups can only contain steps, not other groups.`,
            type: 'error',
          });
        }
      }
    }
  }
}

/**
 * Perform semantic validation on a demo config
 */
export function validateSemantics(config: DemoConfig): SemanticValidationResult {
  const errors: SemanticError[] = [];
  const warnings: SemanticWarning[] = [];

  // Track step IDs for duplicate detection and goto validation
  const stepIds = new Map<string, string>(); // id -> path where defined
  const gotoTargets: Array<{ target: string; path: string }> = [];

  // Track variable definitions and usages
  const variableDefinitions = new Map<string, { stepIndex: number; path: string }>();
  const variableUsages: Array<{ varName: string; stepIndex: number; path: string }> = [];

  // Check for nested groups
  hasNestedGroups(config.steps, '/steps', errors);

  // Flatten steps while tracking paths and collecting data
  let stepIndex = 0;

  function processStep(step: Step, path: string): void {
    // Check for duplicate IDs
    if ('id' in step && step.id) {
      const existingPath = stepIds.get(step.id);
      if (existingPath) {
        errors.push({
          path,
          message: `Duplicate step ID "${step.id}". This ID was already used at ${existingPath}. Each step ID must be unique.`,
          type: 'error',
        });
      } else {
        stepIds.set(step.id, path);
      }
    }

    // Collect goto targets
    if ('goto' in step && step.goto) {
      gotoTargets.push({ target: step.goto, path: `${path}/goto` });
    }

    // Collect choice goto targets
    if (isSlideStep(step) && step.choices) {
      for (let i = 0; i < step.choices.length; i++) {
        const choice = step.choices[i] as Choice;
        if (choice.goto) {
          gotoTargets.push({ target: choice.goto, path: `${path}/choices/${i}/goto` });
        }
      }
    }

    // Track variable definitions from save
    if ('save' in step && step.save) {
      for (const varName of Object.keys(step.save)) {
        // Check for overwrites
        const existing = variableDefinitions.get(varName);
        if (existing) {
          warnings.push({
            path: `${path}/save`,
            message: `Variable "$${varName}" overwrites a previous definition from ${existing.path}. This may be intentional, but could cause confusion.`,
            type: 'warning',
          });
        }
        variableDefinitions.set(varName, { stepIndex, path: `${path}/save/${varName}` });
      }
    }

    // Track variable usages
    const textContent = getStepTextContent(step);
    for (const text of textContent) {
      const refs = extractVariableReferences(text);
      for (const varName of refs) {
        variableUsages.push({ varName, stepIndex, path });
      }
    }

    stepIndex++;
  }

  function processItems(items: StepOrGroup[], basePath: string): void {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemPath = `${basePath}/${i}`;

      if (isStepGroup(item)) {
        // Process steps inside the group
        for (let j = 0; j < item.steps.length; j++) {
          processStep(item.steps[j], `${itemPath}/steps/${j}`);
        }
      } else {
        processStep(item, itemPath);
      }
    }
  }

  processItems(config.steps, '/steps');

  // Validate goto targets
  for (const { target, path } of gotoTargets) {
    if (!stepIds.has(target)) {
      const availableIds = [...stepIds.keys()];
      const suggestion = availableIds.length > 0
        ? ` Available IDs: ${availableIds.join(', ')}`
        : ' No steps have IDs defined. Add "id: some-name" to target steps.';

      errors.push({
        path,
        message: `Goto target "${target}" does not exist.${suggestion}`,
        type: 'error',
      });
    }
  }

  // Validate variable usages
  for (const { varName, stepIndex: usageStep, path } of variableUsages) {
    const definition = variableDefinitions.get(varName);

    if (!definition) {
      // Check if it's a built-in or special variable
      const builtInVars = ['base_url', 'formData'];
      if (!builtInVars.includes(varName)) {
        warnings.push({
          path,
          message: `Variable "$${varName}" is used but never defined. Add a "save:" property to a prior step to define it.`,
          type: 'warning',
        });
      }
    } else if (definition.stepIndex >= usageStep) {
      warnings.push({
        path,
        message: `Variable "$${varName}" is used before it's defined. It's defined later at ${definition.path}.`,
        type: 'warning',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format semantic validation results for display
 */
export function formatSemanticResults(result: SemanticValidationResult): string {
  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push('Validation errors:');
    lines.push('');
    for (const error of result.errors) {
      lines.push(`  \u2717 ${error.path}: ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('Warnings:');
    lines.push('');
    for (const warning of result.warnings) {
      lines.push(`  \u26A0 ${warning.path}: ${warning.message}`);
    }
  }

  if (result.errors.length === 0 && result.warnings.length === 0) {
    return '';
  }

  return lines.join('\n');
}
