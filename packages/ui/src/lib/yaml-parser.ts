/**
 * YAML Parser for Visual Editor
 *
 * Provides bidirectional conversion between YAML strings and EditorState.
 * - parseYaml: Parse YAML string to DemoConfig
 * - generateYaml: Convert DemoConfig back to YAML string
 */

import * as jsYaml from 'js-yaml';
import type { DemoConfig, StepOrGroup, DemoSettings, DemoMetadata } from '../types/schema';
import type { EditorState } from '../context/EditorContext';

/**
 * Parse a YAML string into a DemoConfig
 * Handles common YAML errors with helpful messages
 */
export function parseYaml(yaml: string): DemoConfig {
  try {
    const parsed = jsYaml.load(yaml) as Record<string, unknown>;

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid YAML: expected an object');
    }

    return {
      title: String(parsed.title || 'Untitled Demo'),
      description: parsed.description ? String(parsed.description) : undefined,
      version: parsed.version ? String(parsed.version) : undefined,
      author: parsed.author ? String(parsed.author) : undefined,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : undefined,
      metadata: (parsed.metadata as DemoMetadata) || {},
      settings: (parsed.settings as DemoSettings) || {},
      steps: Array.isArray(parsed.steps) ? (parsed.steps as StepOrGroup[]) : [],
    };
  } catch (error) {
    if (error instanceof jsYaml.YAMLException) {
      const line = error.mark?.line ? ` at line ${error.mark.line + 1}` : '';
      throw new Error(`YAML parse error${line}: ${error.reason}`);
    }
    throw error;
  }
}

/**
 * Convert DemoConfig to EditorState
 */
export function configToEditorState(config: DemoConfig): EditorState {
  // Flatten StepOrGroup to individual steps for editing
  // Groups are expanded inline for simplicity in the editor
  const flatSteps: StepOrGroup[] = [];
  for (const stepOrGroup of config.steps || []) {
    if ('group' in stepOrGroup) {
      // Expand group steps inline
      for (const step of stepOrGroup.steps || []) {
        flatSteps.push(step);
      }
    } else {
      flatSteps.push(stepOrGroup);
    }
  }

  return {
    title: config.title || 'Untitled Demo',
    description: config.description || '',
    settings: config.settings || {},
    metadata: config.metadata || {},
    steps: flatSteps.map((step, index) => ({
      id: `step-${index}-${Date.now()}`,
      step,
    })),
    currentStep: 0,
    selectedChildIndex: null,
    variables: {},
    isDirty: false,
    currentFilePath: null,
    isNewFile: true,
  };
}

/**
 * Convert EditorState to DemoConfig
 */
export function editorStateToConfig(state: EditorState): DemoConfig {
  return {
    title: state.title,
    description: state.description || undefined,
    metadata: state.metadata && Object.keys(state.metadata).length > 0 ? state.metadata : undefined,
    settings: Object.keys(state.settings).length > 0 ? state.settings : undefined,
    steps: state.steps.map((s) => s.step),
  };
}

/**
 * Escape a string value for YAML output
 * Quotes strings that contain special characters
 */
function yamlEscape(value: string): string {
  if (
    value.includes(':') ||
    value.includes('#') ||
    value.includes('\n') ||
    value.includes('"') ||
    value.startsWith(' ') ||
    value.endsWith(' ') ||
    value.startsWith('{') ||
    value.startsWith('[') ||
    /^[0-9]/.test(value) ||
    value === 'true' ||
    value === 'false' ||
    value === 'null' ||
    value === ''
  ) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

/**
 * Generate a single step's YAML using js-yaml for reliable output
 */
function stepToYaml(step: StepOrGroup, indent: number = 2): string {
  const spaces = ' '.repeat(indent);

  // Use js-yaml for reliable YAML generation
  const dumped = jsYaml.dump([step], {
    indent: 2,
    lineWidth: -1, // No line wrapping
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });

  // Format the output with proper indentation
  const lines = dumped.trim().split('\n');
  return lines.map((line, i) => {
    if (i === 0) {
      // First line already has the - prefix
      return `${spaces}${line}`;
    }
    return `${spaces}${line}`;
  }).join('\n');
}

/**
 * Generate YAML string from DemoConfig
 * Produces clean, human-readable YAML
 */
export function generateYaml(config: DemoConfig): string {
  const lines: string[] = [];

  // Title (required)
  lines.push(`title: ${yamlEscape(config.title)}`);

  // Optional top-level fields
  if (config.description) {
    lines.push(`description: ${yamlEscape(config.description)}`);
  }
  if (config.version) {
    lines.push(`version: ${yamlEscape(config.version)}`);
  }
  if (config.author) {
    lines.push(`author: ${yamlEscape(config.author)}`);
  }
  if (config.tags && config.tags.length > 0) {
    lines.push('tags:');
    for (const tag of config.tags) {
      lines.push(`  - ${yamlEscape(tag)}`);
    }
  }

  // Metadata
  if (config.metadata && Object.keys(config.metadata).length > 0) {
    lines.push('');
    lines.push('metadata:');
    const metadataYaml = jsYaml.dump(config.metadata, {
      indent: 2,
      noRefs: true,
    }).trim();
    for (const line of metadataYaml.split('\n')) {
      lines.push(`  ${line}`);
    }
  }

  // Settings
  if (config.settings && Object.keys(config.settings).length > 0) {
    lines.push('');
    lines.push('settings:');
    const settingsYaml = jsYaml.dump(config.settings, {
      indent: 2,
      noRefs: true,
    }).trim();
    // Indent settings content
    for (const line of settingsYaml.split('\n')) {
      lines.push(`  ${line}`);
    }
  }

  // Steps
  if (config.steps && config.steps.length > 0) {
    lines.push('');
    lines.push('steps:');
    for (const step of config.steps) {
      lines.push(stepToYaml(step));
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Parse YAML string directly to EditorState
 */
export function parseYamlToEditorState(yaml: string): EditorState {
  const config = parseYaml(yaml);
  return configToEditorState(config);
}

/**
 * Generate YAML from EditorState
 */
export function editorStateToYaml(state: EditorState): string {
  const config = editorStateToConfig(state);
  return generateYaml(config);
}

/**
 * Validate YAML structure without fully parsing
 * Returns error message if invalid, null if valid
 */
export function validateYaml(yaml: string): string | null {
  try {
    const parsed = jsYaml.load(yaml);
    if (!parsed || typeof parsed !== 'object') {
      return 'Invalid YAML: expected an object with title and steps';
    }
    const obj = parsed as Record<string, unknown>;
    if (!obj.title) {
      return 'Missing required field: title';
    }
    if (obj.steps && !Array.isArray(obj.steps)) {
      return 'Invalid field: steps must be an array';
    }
    return null;
  } catch (error) {
    if (error instanceof jsYaml.YAMLException) {
      const line = error.mark?.line ? ` at line ${error.mark.line + 1}` : '';
      return `YAML syntax error${line}: ${error.reason}`;
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
