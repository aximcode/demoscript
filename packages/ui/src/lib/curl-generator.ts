/**
 * Generate a curl command from request parameters
 */
export function generateCurl(
  method: string,
  url: string,
  headers?: Record<string, string>,
  body?: unknown
): string {
  const upperMethod = method.toUpperCase();

  // HEAD uses -I flag, others use -X METHOD
  const parts: string[] = upperMethod === 'HEAD'
    ? ['curl -I']
    : [`curl -X ${upperMethod}`];

  // Add URL (escaped)
  parts.push(`'${escapeShell(url)}'`);

  // Add headers
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      parts.push(`-H '${escapeShell(key)}: ${escapeShell(value)}'`);
    }
  }

  // Add Content-Type if body present and not already in headers
  if (body && !headers?.['Content-Type'] && !headers?.['content-type']) {
    parts.push("-H 'Content-Type: application/json'");
  }

  // Add body (only for methods that support it)
  if (body) {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    parts.push(`-d '${escapeShell(bodyStr)}'`);
  }

  // Format with line breaks for readability
  if (parts.length <= 3) {
    return parts.join(' ');
  }

  return parts.join(' \\\n  ');
}

/**
 * Escape special characters for shell
 */
function escapeShell(str: string): string {
  // Escape single quotes by ending the string, adding escaped quote, and starting new string
  return str.replace(/'/g, "'\\''");
}

/**
 * Format curl command for display (syntax highlighted)
 */
export function formatCurlForDisplay(curl: string): string {
  return curl;
}
