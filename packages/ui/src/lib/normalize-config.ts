/**
 * Normalize shorthand YAML config into full format
 *
 * Supports:
 * 1. Smart defaults for form fields (infer type, label from name)
 * 2. Shorthand form syntax: { name: "default" } instead of { name, default, ... }
 * 3. Auto-link inference from type (tx, address, token -> use configured link handler)
 */

import type { DemoConfig, FormField, ResultField, RestStep, Step, StepOrGroup } from '../types/schema';
import { isStepGroup, isRestStep } from '../types/schema';

/**
 * Capitalize first letter and convert camelCase/snake_case to Title Case
 */
function inferLabel(name: string): string {
  // Handle camelCase: tokenAddress -> Token Address
  const spaced = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Handle snake_case: token_address -> token address
  const normalized = spaced.replace(/_/g, ' ');
  // Capitalize each word
  return normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Infer field type from name patterns
 */
function inferFieldType(name: string, defaultValue?: string | number | boolean): 'text' | 'number' | 'toggle' {
  // If default is a boolean, use toggle type
  if (typeof defaultValue === 'boolean') {
    return 'toggle';
  }

  // If default is a number, use number type
  if (typeof defaultValue === 'number') {
    return 'number';
  }

  // Common number field patterns
  const numberPatterns = ['amount', 'count', 'quantity', 'decimals', 'limit', 'size', 'price'];
  const lowerName = name.toLowerCase();

  if (numberPatterns.some(p => lowerName.includes(p))) {
    return 'number';
  }

  return 'text';
}

/**
 * Normalize a single form field from shorthand to full format
 */
function normalizeFormField(field: FormField | Record<string, unknown>): FormField {
  // Already normalized format with 'name' property
  if ('name' in field && typeof field.name === 'string') {
    const f = field as FormField;
    return {
      ...f,
      label: f.label ?? inferLabel(f.name),
      type: f.type ?? inferFieldType(f.name, f.default),
    };
  }

  // Shorthand format: { fieldName: "defaultValue" }
  const entries = Object.entries(field);
  if (entries.length === 1) {
    const [name, defaultValue] = entries[0];
    // Check if it's a primitive (not extended shorthand object)
    if (typeof defaultValue !== 'object' || defaultValue === null) {
      return {
        name,
        label: inferLabel(name),
        type: inferFieldType(name, defaultValue as string | number | boolean),
        default: defaultValue as string | number | boolean,
      };
    }
    // Extended shorthand: { fieldName: { default: "value", readonly: true } }
    const cfg = defaultValue as Record<string, unknown>;
    return {
      name,
      label: (cfg.label as string) ?? inferLabel(name),
      type: (cfg.type as FormField['type']) ?? inferFieldType(name, cfg.default as string | number | boolean),
      default: cfg.default as string | number | boolean,
      readonly: cfg.readonly as boolean,
      required: cfg.required as boolean,
      hidden: cfg.hidden as boolean,
      placeholder: cfg.placeholder as string,
    };
  }

  throw new Error(`Invalid form field format: ${JSON.stringify(field)}`);
}

/**
 * Parse shorthand link syntax: "handler.template" -> { link: "handler", link_key: "template" }
 * Returns null if not shorthand (no dot in string)
 */
function parseShorthandLink(link: string): { link: string; link_key: string } | null {
  if (!link.includes('.')) {
    return null;
  }
  const dotIndex = link.indexOf('.');
  const handler = link.slice(0, dotIndex);
  const template = link.slice(dotIndex + 1);
  if (!handler || !template) {
    return null;
  }
  return { link: handler, link_key: template };
}

/**
 * Normalize result field:
 * - Normalize 'ref' type to 'id' (ref is deprecated alias)
 * - Parse shorthand link syntax: "github.user" -> { link: 'github', link_key: 'user', type: 'id' }
 * - Infer label from key if not provided
 */
function normalizeResultField(result: ResultField, settings?: DemoConfig['settings']): ResultField {
  const normalized = { ...result };

  // Infer label from key if not provided
  if (!normalized.label) {
    normalized.label = inferLabel(normalized.key);
  }

  // Normalize 'ref' type to 'id' (ref is deprecated)
  if (normalized.type === 'ref') {
    normalized.type = 'id';
  }

  // Handle shorthand link syntax: "github.user" -> { link: 'github', link_key: 'user' }
  if (normalized.link && !normalized.link_key) {
    const parsed = parseShorthandLink(normalized.link);
    if (parsed) {
      normalized.link = parsed.link;
      normalized.link_key = parsed.link_key;
      // Auto-infer type: 'id' when using shorthand (unless type was explicitly set)
      if (!result.type) {
        normalized.type = 'id';
      }
    }
  }

  // Legacy: Auto-link for address/tx/token types if link handler is configured
  // (This is for backwards compatibility with old type names that no longer exist)
  if (!normalized.link && normalized.type && settings?.links) {
    const linkTypes = ['address', 'tx', 'token'] as const;
    if (linkTypes.includes(normalized.type as typeof linkTypes[number])) {
      const handlerNames = Object.keys(settings.links);
      if (handlerNames.length > 0) {
        normalized.link = handlerNames[0];
      }
    }
  }

  return normalized;
}

/**
 * Normalize a REST step
 */
function normalizeRestStep(step: RestStep, settings?: DemoConfig['settings']): RestStep {
  const normalized = { ...step };

  // Normalize form fields
  if (normalized.form) {
    normalized.form = normalized.form.map(f => normalizeFormField(f));
  }

  // Normalize result fields
  if (normalized.results) {
    normalized.results = normalized.results.map(r => normalizeResultField(r, settings));
  }

  return normalized;
}

/**
 * Normalize a single step (not a group)
 */
function normalizeStepOnly(step: Step, settings?: DemoConfig['settings']): Step {
  if (isRestStep(step)) {
    return normalizeRestStep(step as RestStep, settings);
  }
  return step;
}

/**
 * Normalize a step or step group
 */
function normalizeStep(step: StepOrGroup, settings?: DemoConfig['settings']): StepOrGroup {
  // Handle step groups - they contain their own steps
  if (isStepGroup(step)) {
    return {
      ...step,
      steps: step.steps.map(s => normalizeStepOnly(s, settings))
    };
  }

  return normalizeStepOnly(step, settings);
}

/**
 * Normalize the entire demo config
 */
export function normalizeConfig(config: DemoConfig): DemoConfig {
  return {
    ...config,
    steps: config.steps.map(step => normalizeStep(step, config.settings)),
  };
}
