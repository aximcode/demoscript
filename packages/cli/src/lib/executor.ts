import type { RestStep, DemoConfig, PollConfig } from '../types.js';
import {
  substituteVariables,
  substituteInObject,
  extractValueByPath,
  methodSupportsBody,
} from '@demoscript/shared/variables';

interface ExecutionResult {
  request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  status: number;
  body: unknown;
  pollingResult?: {
    attempts: number;
    finalResponse: unknown;
  };
}

export async function executeRestStep(
  step: RestStep,
  config: DemoConfig,
  variables: Record<string, unknown>
): Promise<ExecutionResult> {
  // Parse method and endpoint
  const [method, ...endpointParts] = step.rest.split(' ');
  const endpoint = endpointParts.join(' ');

  // Substitute variables in endpoint
  const resolvedEndpoint = substituteVariables(endpoint, variables);

  // Build full URL
  const baseUrl = step.base_url || config.settings?.base_url || '';
  const fullUrl = `${baseUrl}${resolvedEndpoint}`;

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...substituteInObject(step.headers || {}, variables) as Record<string, string>,
  };

  // Build body from form defaults or body
  let body: unknown = undefined;
  if (methodSupportsBody(method)) {
    if (step.form) {
      body = Object.fromEntries(
        step.form.map((field) => {
          const value = field.default ?? '';
          const resolved = typeof value === 'string' ? substituteVariables(value, variables) : value;
          return [field.name, resolved];
        })
      );
    } else if (step.body) {
      body = substituteInObject(step.body, variables);
    }
  }

  // Execute request
  const response = await fetch(fullUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseBody = await response.json().catch(() => null);

  const result: ExecutionResult = {
    request: {
      method,
      url: fullUrl,
      headers,
      body,
    },
    status: response.status,
    body: responseBody,
  };

  // Save variables from initial response BEFORE polling
  // This allows poll endpoint to reference saved variables like $jobId
  // Supported special keywords: _status (HTTP status code)
  if (step.save) {
    for (const [varName, path] of Object.entries(step.save)) {
      if (path === '_status') {
        // Special keyword: capture HTTP status code (200, 404, etc.)
        variables[varName] = response.status;
      } else if (responseBody) {
        // JSON path extraction from response body
        const value = extractValueByPath(responseBody, path);
        if (value !== undefined) {
          variables[varName] = value;
        }
      }
    }
  }

  // Handle polling if configured
  if (step.poll) {
    const pollingResult = await executePoll(
      step.poll,
      baseUrl,
      headers,
      variables,
      config.settings?.polling
    );
    result.pollingResult = pollingResult;
    result.body = pollingResult.finalResponse;
  }

  return result;
}

interface PollingResult {
  attempts: number;
  finalResponse: unknown;
}

interface PollingDefaults {
  interval?: number;
  max_attempts?: number;
}

async function executePoll(
  pollConfig: PollConfig,
  baseUrl: string,
  headers: Record<string, string>,
  variables: Record<string, unknown>,
  defaults?: PollingDefaults
): Promise<PollingResult> {
  const interval = pollConfig.interval ?? defaults?.interval ?? 2000;
  const maxAttempts = pollConfig.max_attempts ?? defaults?.max_attempts ?? 30;

  const endpoint = substituteVariables(pollConfig.endpoint, variables);
  // If endpoint is already an absolute URL, don't prepend baseUrl
  const pollUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${baseUrl}${endpoint}`;

  let attempts = 0;
  let lastResponse: unknown = null;

  while (attempts < maxAttempts) {
    attempts++;

    const response = await fetch(pollUrl, {
      method: 'GET',
      headers,
    });

    lastResponse = await response.json().catch(() => null);

    // Check success condition
    if (evaluateCondition(pollConfig.success_when, lastResponse)) {
      return { attempts, finalResponse: lastResponse };
    }

    // Check failure condition if specified
    if (pollConfig.failure_when && evaluateCondition(pollConfig.failure_when, lastResponse)) {
      throw new Error(`Polling failed: ${pollConfig.failure_when} matched after ${attempts} attempts`);
    }

    // Wait before next attempt
    await sleep(interval);
  }

  throw new Error(`Polling timed out after ${maxAttempts} attempts`);
}

export function evaluateCondition(condition: string, response: unknown): boolean {
  // Parse conditions like "response.status == 'complete'" or "status == 'confirmed'"
  // Support both with and without "response." prefix
  let match = condition.match(/^response\.(.+?)\s*(==|!=)\s*(.+)$/);
  if (!match) {
    // Try without response. prefix
    match = condition.match(/^(.+?)\s*(==|!=)\s*(.+)$/);
  }
  if (!match) {
    console.warn(`Unable to parse condition: ${condition}`);
    return false;
  }

  const [, path, operator, expectedRaw] = match;
  const actualValue = extractValueByPath(response, path);

  // Parse expected value
  let expectedValue: unknown;
  if (expectedRaw === 'true') {
    expectedValue = true;
  } else if (expectedRaw === 'false') {
    expectedValue = false;
  } else if (expectedRaw === 'null') {
    expectedValue = null;
  } else if (/^['"](.*)['"]$/.test(expectedRaw)) {
    expectedValue = expectedRaw.slice(1, -1);
  } else if (!isNaN(Number(expectedRaw))) {
    expectedValue = Number(expectedRaw);
  } else {
    expectedValue = expectedRaw;
  }

  if (operator === '==') {
    return actualValue === expectedValue;
  } else if (operator === '!=') {
    return actualValue !== expectedValue;
  }

  return false;
}

// Re-export for backward compatibility
export { extractValueByPath as getNestedValue } from '@demoscript/shared/variables';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
