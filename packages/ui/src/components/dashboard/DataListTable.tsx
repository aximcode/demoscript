import { ResultValue } from '../rest/ResultValue';
import { extractValueByPath } from '../../lib/variable-substitution';
import type { TableColumnConfig } from '../../types/dashboard-data';

interface DataListTableProps {
  items: unknown[];
  columns: TableColumnConfig[];
  emptyMessage?: string;
}

export function DataListTable({ items, columns, emptyMessage }: DataListTableProps) {
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
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 dark:bg-slate-800">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, rowIndex) => {
            if (typeof item !== 'object' || item === null) {
              return null;
            }
            const record = item as Record<string, unknown>;

            return (
              <tr
                key={rowIndex}
                className={
                  rowIndex % 2 === 0
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-slate-50 dark:bg-slate-800/50'
                }
              >
                {columns.map((col, colIndex) => {
                  const value = extractValueByPath(record, col.key);
                  return (
                    <td
                      key={colIndex}
                      className="px-4 py-3 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700"
                    >
                      <ResultValue
                        value={value}
                        type={col.type || 'text'}
                        link={col.link}
                        linkKey={col.link_key}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
