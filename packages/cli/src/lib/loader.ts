import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import yaml from 'js-yaml';
import type { DemoConfig, DemoRecordings, StepOrGroup, Step, RestStep, ExplicitRestStep, ResultField } from '../types.js';
import { isRestStep, isStepGroup } from '../types.js';
import { validateDemoConfig, formatValidationErrors } from './validator.js';
import { fetchOpenApiSpec, generateFormFields, mergeFormFields, type OpenApiSpec } from './openapi.js';

/**
 * Convert camelCase variable name to human-readable label
 * e.g. "accessToken" -> "Access Token", "adminUserId" -> "Admin User Id"
 */
function formatSaveLabel(varName: string): string {
  return varName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, str => str.toUpperCase());
}

/**
 * Infer result display type from variable name and json path
 */
function inferResultType(varName: string, jsonPath: string): ResultField['type'] {
  const nameLower = varName.toLowerCase();
  const pathLower = jsonPath.toLowerCase();

  // Token/ID fields -> mono (monospace)
  if (nameLower.includes('token') || nameLower.includes('id') ||
      pathLower.includes('token') || pathLower.includes('id')) {
    return 'mono';
  }

  // Address/wallet fields
  if (nameLower.includes('address') || nameLower.includes('wallet')) {
    return 'ref';
  }

  // URL fields
  if (nameLower.includes('url') || nameLower.includes('link')) {
    return 'link';
  }

  return 'text';
}

interface LoadedDemo {
  config: DemoConfig;
  recordings: DemoRecordings | null;
  openapiSpec: OpenApiSpec | null;
}

export async function loadDemo(demoFile: string, skipValidation = false): Promise<LoadedDemo> {
  if (!existsSync(demoFile)) {
    throw new Error(`Demo file not found: ${demoFile}`);
  }

  const content = readFileSync(demoFile, 'utf-8');
  const config = yaml.load(content) as DemoConfig;

  // Validate against JSON Schema
  if (!skipValidation) {
    const result = validateDemoConfig(config);
    if (!result.valid) {
      throw new Error(formatValidationErrors(result.errors));
    }
  }

  // Basic required fields check (fallback)
  if (!config.title) {
    throw new Error('Demo config missing required field: title');
  }
  if (!config.steps || !Array.isArray(config.steps)) {
    throw new Error('Demo config missing required field: steps');
  }

  // Try to load recordings
  const demoDir = dirname(demoFile);
  const recordingsPath = join(demoDir, 'recordings.json');
  let recordings: DemoRecordings | null = null;

  if (existsSync(recordingsPath)) {
    const recordingsContent = readFileSync(recordingsPath, 'utf-8');
    recordings = JSON.parse(recordingsContent) as DemoRecordings;
  }

  // Fetch OpenAPI spec if configured
  const openapiUrl = config.settings?.openapi;
  let openapiSpec: OpenApiSpec | null = null;

  if (openapiUrl) {
    openapiSpec = await fetchOpenApiSpec(openapiUrl);
    if (openapiSpec) {
      // Process steps to generate forms from OpenAPI
      config.steps = processStepsWithOpenApi(config.steps, openapiSpec, config.settings?.base_url);
    }
  }

  return { config, recordings, openapiSpec };
}

/**
 * Process steps to generate form fields from OpenAPI spec
 */
function processStepsWithOpenApi(
  steps: StepOrGroup[],
  spec: OpenApiSpec,
  baseUrl?: string
): StepOrGroup[] {
  return steps.map(item => {
    if (isStepGroup(item)) {
      return {
        ...item,
        steps: processStepsArray(item.steps, spec, baseUrl)
      };
    }

    if (isRestStep(item)) {
      return processRestStepWithOpenApi(item, spec, baseUrl);
    }

    return item;
  });
}

/**
 * Process a flat array of steps (inside a group)
 */
function processStepsArray(
  steps: Step[],
  spec: OpenApiSpec,
  baseUrl?: string
): Step[] {
  return steps.map(step => {
    if (isRestStep(step)) {
      return processRestStepWithOpenApi(step, spec, baseUrl);
    }
    return step;
  });
}

/**
 * Process a single REST step to generate form fields and result fields from OpenAPI
 */
function processRestStepWithOpenApi(
  step: RestStep | ExplicitRestStep,
  spec: OpenApiSpec,
  baseUrl?: string
): RestStep | ExplicitRestStep {
  // Get method and path from step
  let method: string;
  let path: string;

  if ('rest' in step) {
    const parts = step.rest.trim().split(/\s+/);
    if (parts.length === 1) {
      method = 'GET';
      path = parts[0];
    } else {
      method = parts[0].toUpperCase();
      path = parts.slice(1).join(' ');
    }
  } else {
    method = step.method;
    path = step.path;
  }

  // Generate form fields from OpenAPI request body schema
  const openapiFields = generateFormFields(spec, method, path);

  // Generate result fields from save mappings (only if results not specified)
  // This shows what variables were captured from the response
  let results = step.results;
  if (!results || results.length === 0) {
    if (step.save && Object.keys(step.save).length > 0) {
      // Generate results from save mappings
      results = Object.entries(step.save).map(([varName, jsonPath]) => ({
        key: jsonPath as string,
        label: formatSaveLabel(varName),
        type: inferResultType(varName, jsonPath as string)
      }));
    }
  }

  // If no OpenAPI data found, return step unchanged
  if (openapiFields.length === 0 && !results) {
    return step;
  }

  // Merge form fields with defaults and manual overrides
  const mergedFields = openapiFields.length > 0
    ? mergeFormFields(openapiFields, step.defaults, step.form)
    : step.form;

  return {
    ...step,
    form: mergedFields || step.form,
    results: results || step.results
  };
}
