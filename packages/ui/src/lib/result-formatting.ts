/**
 * Result formatting utilities
 */

export function formatCurrency(value: unknown, format?: string): string {
  const num = Number(value);
  if (isNaN(num)) return String(value);

  const currency = format || 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num);
}

/**
 * Truncate a reference string (address, hash, ID, etc.) for display
 * Shows first 10 chars ... last 8 chars for long values
 */
export function truncateRef(value: string, threshold = 16): string {
  if (value.length <= threshold) return value;
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

// Legacy aliases for backward compatibility
export const truncateAddress = truncateRef;
export const truncateTxHash = truncateRef;

/**
 * Build a link URL using a configured link handler
 *
 * @param value - The value to insert into the URL template
 * @param handler - Name of the link handler (e.g., 'github', 'polygonscan')
 * @param linkHandlers - Map of handler configs
 * @param linkKey - Explicit key within handler to use (e.g., 'user', 'address', 'tx')
 */
export function buildLink(
  value: string,
  handler: string,
  linkHandlers: Record<string, Record<string, string | undefined>>,
  linkKey?: string
): string | null {
  const handlerConfig = linkHandlers[handler];
  if (!handlerConfig) return null;

  let template: string | undefined;

  // Priority 1: Explicit link_key
  if (linkKey && handlerConfig[linkKey]) {
    template = handlerConfig[linkKey];
  }
  // Priority 2: Default key
  else if (handlerConfig.default) {
    template = handlerConfig.default;
  }
  // Priority 3: First available key (fallback)
  else {
    const keys = Object.keys(handlerConfig);
    if (keys.length > 0) {
      template = handlerConfig[keys[0]];
    }
  }

  if (!template) return null;

  return template.replace('{value}', value);
}
