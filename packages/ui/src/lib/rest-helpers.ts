import { extractValueByPath } from './variable-substitution';

export function evaluateCondition(condition: string, data: unknown): boolean {
  // Parse simple conditions like "status == 'completed'"
  const match = condition.match(/^(\w+)\s*(==|!=)\s*['"]?(\w+)['"]?$/);
  if (!match) return false;

  const [, field, operator, expected] = match;
  const actual = extractValueByPath(data, field);

  if (operator === '==') {
    return String(actual) === expected;
  } else if (operator === '!=') {
    return String(actual) !== expected;
  }

  return false;
}

// Error patterns ordered by priority (415 before 404 to avoid false matches)
const ERROR_PATTERNS: Array<{ patterns: string[]; regex?: RegExp; type: string }> = [
  { patterns: ['timeout', 'timed out'], type: 'Request Timeout' },
  { patterns: ['network', 'failed to fetch', 'connection'], type: 'Network Error' },
  { patterns: ['401', 'unauthorized'], type: 'Authentication Error' },
  { patterns: ['403', 'forbidden'], type: 'Access Denied' },
  { patterns: ['415', 'unsupported media type', 'mime'], type: 'Invalid Content-Type' },
  { patterns: ['404'], regex: /\bnot found\b/, type: 'Not Found' },
  { patterns: ['500', 'internal server'], type: 'Server Error' },
  { patterns: ['polling'], type: 'Polling Failed' },
  { patterns: ['recording'], type: 'Recording Missing' },
];

export function getErrorType(error: string): string {
  const lowerError = error.toLowerCase();

  for (const { patterns, regex, type } of ERROR_PATTERNS) {
    const matchesPattern = patterns.some(p => lowerError.includes(p));
    const matchesRegex = regex ? regex.test(lowerError) : false;
    if (matchesPattern || matchesRegex) {
      return type;
    }
  }

  return 'Request Error';
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-500/30',
  POST: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30',
  PUT: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-500/30',
  PATCH: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-500/30',
  DELETE: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30',
};

const DEFAULT_METHOD_COLOR = 'bg-gray-100 dark:bg-slate-500/20 text-gray-700 dark:text-slate-400 border border-gray-300 dark:border-slate-500/30';

export function getMethodColor(method: string): string {
  return METHOD_COLORS[method] || DEFAULT_METHOD_COLOR;
}

/**
 * Extract error message from response body or return default HTTP status message.
 */
export function extractErrorMessage(body: unknown, httpStatus: number): string {
  if (typeof body === 'object' && body !== null) {
    const obj = body as Record<string, unknown>;
    return String(obj.error || obj.detail || obj.message || `HTTP ${httpStatus}`);
  }
  return `HTTP ${httpStatus}`;
}

/**
 * Build request body from form fields, filtering out hidden and empty optional fields.
 */
export function buildRequestBody(
  form: Array<{ name: string; hidden?: boolean; required?: boolean }> | undefined,
  formValues: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!form) return undefined;

  return Object.fromEntries(
    form
      .filter((f) => !f.hidden)
      .filter((f) => {
        const value = formValues[f.name];
        return f.required || (value !== '' && value !== undefined && value !== null);
      })
      .map((f) => [f.name, formValues[f.name]])
  );
}
