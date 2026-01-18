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

export function getErrorType(error: string): string {
  const lowerError = error.toLowerCase();
  if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
    return 'Request Timeout';
  }
  if (lowerError.includes('network') || lowerError.includes('failed to fetch') || lowerError.includes('connection')) {
    return 'Network Error';
  }
  if (lowerError.includes('401') || lowerError.includes('unauthorized')) {
    return 'Authentication Error';
  }
  if (lowerError.includes('403') || lowerError.includes('forbidden')) {
    return 'Access Denied';
  }
  // Check 415 before 404 - "unsupported media type" errors often contain "not found" in the message
  if (lowerError.includes('415') || lowerError.includes('unsupported media type') || lowerError.includes('mime')) {
    return 'Invalid Content-Type';
  }
  // Use word boundary match to avoid false positives like "was not found"
  if (lowerError.includes('404') || /\bnot found\b/.test(lowerError)) {
    return 'Not Found';
  }
  if (lowerError.includes('500') || lowerError.includes('internal server')) {
    return 'Server Error';
  }
  if (lowerError.includes('polling')) {
    return 'Polling Failed';
  }
  if (lowerError.includes('recording')) {
    return 'Recording Missing';
  }
  return 'Request Error';
}

export function getMethodColor(method: string): string {
  switch (method) {
    case 'GET':
      return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-500/30';
    case 'POST':
      return 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30';
    case 'PUT':
      return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-500/30';
    case 'PATCH':
      return 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-500/30';
    case 'DELETE':
      return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30';
    default:
      return 'bg-gray-100 dark:bg-slate-500/20 text-gray-700 dark:text-slate-400 border border-gray-300 dark:border-slate-500/30';
  }
}
