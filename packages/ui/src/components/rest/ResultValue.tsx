import { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import { AnimatedCounter, CurrencyCounter } from '../effects';
import { formatRelativeTime } from '../../lib/format-time';
import { buildLink, truncateRef } from '../../lib/result-formatting';

import type { TableColumn } from '../../types/schema';

interface Props {
  value: unknown;
  type?: string;
  link?: string;
  linkKey?: string;
  expandedDepth?: number;
  columns?: TableColumn[];
}

// Chevron icon for expand/collapse buttons
const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg className={`w-3 h-3 mr-1 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
);

// Expand/collapse button for JSON tree nodes
interface ExpandButtonProps {
  expanded: boolean;
  onToggle: () => void;
  label: string;
}

function ExpandButton({ expanded, onToggle, label }: ExpandButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 focus:outline-none"
    >
      <ChevronIcon expanded={expanded} />
      <span className="text-gray-500 dark:text-slate-400">{label}</span>
    </button>
  );
}

// JSON Tree Viewer component
function JsonTreeNode({ data, depth = 0, expandedDepth = 2 }: { data: unknown; depth?: number; expandedDepth?: number }) {
  const [expanded, setExpanded] = useState(depth < expandedDepth);

  if (data === null) {
    return <span className="text-gray-400 dark:text-slate-500 italic">null</span>;
  }

  if (data === undefined) {
    return <span className="text-gray-400 dark:text-slate-500 italic">undefined</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="text-purple-600 dark:text-purple-400">{String(data)}</span>;
  }

  if (typeof data === 'number') {
    return <span className="text-cyan-600 dark:text-cyan-400">{data}</span>;
  }

  if (typeof data === 'string') {
    return <span className="text-green-600 dark:text-green-400">"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-gray-500 dark:text-slate-400">[]</span>;
    }

    return (
      <span>
        <ExpandButton expanded={expanded} onToggle={() => setExpanded(!expanded)} label={`[${data.length}]`} />
        {expanded && (
          <div className="ml-4 pl-2 border-l-2 border-gray-200 dark:border-slate-600">
            {data.map((item, index) => (
              <div key={index} className="py-0.5">
                <span className="text-gray-400 dark:text-slate-500 mr-2">{index}:</span>
                <JsonTreeNode data={item} depth={depth + 1} expandedDepth={expandedDepth} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return <span className="text-gray-500 dark:text-slate-400">{'{}'}</span>;
    }

    return (
      <span>
        <ExpandButton expanded={expanded} onToggle={() => setExpanded(!expanded)} label={`{${entries.length}}`} />
        {expanded && (
          <div className="ml-4 pl-2 border-l-2 border-gray-200 dark:border-slate-600">
            {entries.map(([key, val]) => (
              <div key={key} className="py-0.5">
                <span className="text-blue-600 dark:text-blue-400 mr-1">"{key}"</span>
                <span className="text-gray-400 dark:text-slate-500 mr-1">:</span>
                <JsonTreeNode data={val} depth={depth + 1} expandedDepth={expandedDepth} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  return <span className="text-gray-700 dark:text-slate-300">{String(data)}</span>;
}

// Copy button component
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy errors
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
      )}
    </button>
  );
}

export function ResultValue({ value, type, link, linkKey, expandedDepth, columns }: Props) {
  const { state } = useDemo();
  const stringValue = String(value ?? '');

  // Check if counters are enabled (defaults to true)
  const countersEnabled = state.config?.settings?.effects?.counters ?? true;

  // Animate numeric values that don't have an explicit type
  if (typeof value === 'number' && !type) {
    return (
      <span className="font-mono text-sm text-gray-700 dark:text-slate-300">
        {countersEnabled ? (
          <AnimatedCounter end={value} decimals={Number.isInteger(value) ? 0 : 2} duration={1} />
        ) : (
          value
        )}
      </span>
    );
  }

  if (type === 'ref') {
    const truncated = truncateRef(stringValue);

    // Build URL from settings.links config or use direct URL
    let explorerUrl: string | undefined;
    if (link) {
      // Get link handlers from config
      const linksConfig = state.config?.settings?.links || {};

      // Try to resolve via configured link handler
      const resolvedUrl = buildLink(stringValue, link, linksConfig, linkKey);

      if (resolvedUrl) {
        explorerUrl = resolvedUrl;
      } else if (link.startsWith('http')) {
        // Fallback: direct URL - append value
        explorerUrl = `${link}${stringValue}`;
      }
    }

    if (explorerUrl) {
      return (
        <span className="inline-flex items-center">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 hover:underline transition-colors"
          >
            {truncated}
          </a>
          <CopyButton text={stringValue} />
        </span>
      );
    }

    return (
      <span className="inline-flex items-center">
        <code className="font-mono text-sm bg-gray-200 dark:bg-slate-700/50 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded border border-gray-300 dark:border-slate-600/50">
          {truncated}
        </code>
        <CopyButton text={stringValue} />
      </span>
    );
  }

  if (type === 'currency') {
    return (
      <span className="font-semibold text-green-600 dark:text-green-400">
        {countersEnabled ? (
          <CurrencyCounter amount={Number(value)} duration={1.5} />
        ) : (
          `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        )}
      </span>
    );
  }

  if (type === 'link') {
    return (
      <a
        href={stringValue}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:underline transition-colors inline-flex items-center gap-1"
      >
        {stringValue.length > 50 ? `${stringValue.slice(0, 50)}...` : stringValue}
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    );
  }

  if (type === 'code') {
    return (
      <pre className="font-mono text-sm bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 p-3 rounded-lg border border-gray-200 dark:border-slate-700 overflow-x-auto">
        <code>{stringValue}</code>
      </pre>
    );
  }

  if (type === 'table' && Array.isArray(value) && columns) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 dark:bg-slate-800">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left font-medium text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.map((row, i) => (
              <tr
                key={i}
                className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-gray-50 dark:bg-slate-800/50'}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-3 py-2 text-gray-700 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700"
                  >
                    {typeof row === 'object' && row !== null ? String(row[col.key] ?? '') : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'json') {
    return (
      <div className="font-mono text-sm bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-3 max-h-80 overflow-auto">
        <JsonTreeNode data={value} expandedDepth={expandedDepth ?? 2} />
      </div>
    );
  }

  if (type === 'mono') {
    return (
      <code className="font-mono text-sm text-gray-600 dark:text-slate-400">
        {stringValue}
      </code>
    );
  }

  if (type === 'relative_time') {
    try {
      return (
        <span className="text-sm text-gray-500 dark:text-slate-400">
          {formatRelativeTime(stringValue)}
        </span>
      );
    } catch {
      return <span className="text-sm text-gray-500 dark:text-slate-400">{stringValue}</span>;
    }
  }

  return <span className="font-mono text-sm text-gray-700 dark:text-slate-300">{stringValue}</span>;
}
