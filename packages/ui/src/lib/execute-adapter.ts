/**
 * Execution adapter - abstracts execution for local mode
 * This is the public/open-source version (local execution only)
 */

// Types
export interface ExecutePayload {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface ExecuteResult {
  data: unknown;
  status: number;
  error?: string;
}

/**
 * Execute a REST request via local /api/execute endpoint
 */
export async function executeRequest(payload: ExecutePayload): Promise<ExecuteResult> {
  const response = await fetch('/api/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  return { data: result.data, status: result.status ?? response.status };
}

/**
 * Execute a GraphQL request via local /api/execute-graphql endpoint
 */
export async function executeGraphQL(payload: {
  endpoint: string;
  query: string;
  variables?: Record<string, unknown>;
  headers?: Record<string, string>;
}): Promise<ExecuteResult> {
  const response = await fetch('/api/execute-graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    return {
      data: result,
      status: response.status,
      error: result.error || `Request failed with status ${response.status}`,
    };
  }

  return { data: result, status: response.status };
}

/**
 * Check if we're running in cloud mode (always false for open-source version)
 */
export function isCloudMode(): boolean {
  return false;
}

/**
 * Check if a step type is supported (always true for local mode)
 */
export function isStepTypeSupported(_stepType: 'rest' | 'shell' | 'database' | 'graphql'): boolean {
  return true;
}

/**
 * Get message explaining why a step type is unsupported (always null for local mode)
 */
export function getUnsupportedMessage(_stepType: string): string | null {
  return null;
}
