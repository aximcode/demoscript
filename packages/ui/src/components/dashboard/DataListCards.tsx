import { ResultValue } from '../rest/ResultValue';
import { extractValueByPath } from '../../lib/variable-substitution';
import type { CardLayoutConfig, BadgeConfig } from '../../types/dashboard-data';

interface DataListCardsProps {
  items: unknown[];
  config: CardLayoutConfig;
  emptyMessage?: string;
  linksConfig?: Record<string, Record<string, string | undefined>>;
}

// Badge component
function Badge({
  value,
  config,
}: {
  value: unknown;
  config: BadgeConfig;
}) {
  const stringValue = String(value ?? '');
  const variant = config.variants?.[stringValue] || 'default';

  const variantClasses: Record<string, string> = {
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    default: 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${variantClasses[variant]}`}>
      {config.label || stringValue}
    </span>
  );
}

// Single card item
function DataListCardItem({
  item,
  config,
}: {
  item: unknown;
  config: CardLayoutConfig;
}) {
  if (typeof item !== 'object' || item === null) {
    return null;
  }

  const record = item as Record<string, unknown>;

  // Get title value
  const titleValue = extractValueByPath(record, config.title.key);
  const prefix = config.title.prefix_key
    ? String(extractValueByPath(record, config.title.prefix_key) ?? '')
    : '';
  const suffix = config.title.suffix_key
    ? String(extractValueByPath(record, config.title.suffix_key) ?? '')
    : '';

  // Determine title prefix symbol based on common patterns
  let prefixSymbol = '';
  if (prefix) {
    const lowerPrefix = prefix.toLowerCase();
    if (lowerPrefix === 'deposit' || lowerPrefix === 'credit' || lowerPrefix === 'in') {
      prefixSymbol = '+';
    } else if (lowerPrefix === 'withdrawal' || lowerPrefix === 'debit' || lowerPrefix === 'out' || lowerPrefix === 'payout') {
      prefixSymbol = '-';
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      {/* Header with badges */}
      {config.badges && config.badges.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          {config.badges.map((badgeConfig, i) => {
            const badgeValue = extractValueByPath(record, badgeConfig.key);
            return <Badge key={i} value={badgeValue} config={badgeConfig} />;
          })}
        </div>
      )}

      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          {prefixSymbol && (
            <span className={prefixSymbol === '+' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {prefixSymbol}
            </span>
          )}
          {config.title.type === 'currency' ? (
            <ResultValue value={titleValue} type="currency" />
          ) : config.title.type === 'number' ? (
            <ResultValue value={titleValue} type="text" />
          ) : (
            <span>{String(titleValue ?? '')}</span>
          )}
          {suffix && (
            <span className="ml-1 text-slate-500 dark:text-slate-400 text-sm">
              {suffix}
            </span>
          )}
        </div>
      </div>

      {/* Fields */}
      {config.fields && config.fields.length > 0 && (
        <div className="space-y-2 text-sm">
          {config.fields.map((field, i) => {
            const fieldValue = extractValueByPath(record, field.key);
            if (fieldValue === undefined || fieldValue === null) {
              return null;
            }

            return (
              <div key={i} className="flex items-start gap-2">
                {field.label && (
                  <span className="text-slate-500 dark:text-slate-400 min-w-[80px]">
                    {field.label}:
                  </span>
                )}
                <span className="flex-1">
                  <ResultValue
                    value={fieldValue}
                    type={field.type || 'text'}
                    link={field.link}
                    linkKey={field.link_key}
                  />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DataListCards({ items, config, emptyMessage }: DataListCardsProps) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500 dark:text-slate-400">
          {emptyMessage || 'No items found'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <DataListCardItem key={index} item={item} config={config} />
      ))}
    </div>
  );
}
