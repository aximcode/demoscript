import { extractValueByPath } from '../../lib/variable-substitution';
import { ResultValue } from './ResultValue';
import { CollapsibleSection } from '../CollapsibleSection';
import type { ResultField } from '../../types/schema';

interface Props {
  response: unknown;
  results: ResultField[];
}

export function ResultsDisplay({ response, results }: Props) {
  if (!results || results.length === 0) return null;

  return (
    <div className="border-t border-gray-200 dark:border-slate-700/50 p-4 bg-gray-50/50 dark:bg-slate-900/30">
      <CollapsibleSection
        title="Results"
        summary={`${results.length} field${results.length > 1 ? 's' : ''}`}
        defaultExpanded={true}
      >
        <div className="bg-gray-100 dark:bg-slate-800/50 rounded-lg p-4 space-y-3 border border-gray-200 dark:border-slate-700/50">
          {results.map((result) => {
            const value = extractValueByPath(response, result.key);
            const isBlockType = result.type === 'table' || result.type === 'json' || result.type === 'code';

            if (isBlockType) {
              return (
                <div key={result.key || result.label} className="space-y-1">
                  <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">{result.label}</span>
                  <ResultValue
                    value={value}
                    type={result.type}
                    link={result.link}
                    linkKey={result.link_key}
                    expandedDepth={result.expandedDepth}
                    columns={result.columns}
                  />
                </div>
              );
            }

            return (
              <div key={result.key || result.label} className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-slate-400 text-sm">{result.label}:</span>
                <ResultValue
                  value={value}
                  type={result.type}
                  link={result.link}
                  linkKey={result.link_key}
                  expandedDepth={result.expandedDepth}
                  columns={result.columns}
                />
              </div>
            );
          })}
        </div>
      </CollapsibleSection>
    </div>
  );
}
