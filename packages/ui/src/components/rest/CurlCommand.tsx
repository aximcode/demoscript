import { useState, ReactElement } from 'react';
import { generateCurl } from '../../lib/curl-generator';
import { CollapsibleSection } from '../CollapsibleSection';

interface CurlCommandProps {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  defaultExpanded?: boolean;
}

export function CurlCommand({
  method,
  url,
  headers,
  body,
  defaultExpanded = false,
}: CurlCommandProps) {
  const [copied, setCopied] = useState(false);

  const curlCommand = generateCurl(method, url, headers, body);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <CollapsibleSection
      title="cURL Command"
      defaultExpanded={defaultExpanded}
    >
      <div className="relative">
        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto">
          <code className="whitespace-pre-wrap break-all">
            {highlightCurl(curlCommand)}
          </code>
        </pre>
        <button
          onClick={handleCopy}
          className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </CollapsibleSection>
  );
}

// Simple syntax highlighting for curl command
function highlightCurl(cmd: string): ReactElement {
  // Split by spaces but keep quoted strings together
  const parts = cmd.split(/(\s+|'[^']*')/g).filter(Boolean);

  return (
    <>
      {parts.map((part, i) => {
        // Command (curl)
        if (part === 'curl') {
          return <span key={i} className="text-cyan-400">{part}</span>;
        }
        // Flags (-X, -H, -d)
        if (part.match(/^-[A-Za-z]$/)) {
          return <span key={i} className="text-yellow-400">{part}</span>;
        }
        // HTTP methods
        if (part.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/)) {
          return <span key={i} className="text-green-400">{part}</span>;
        }
        // Quoted strings
        if (part.startsWith("'") && part.endsWith("'")) {
          return <span key={i} className="text-orange-300">{part}</span>;
        }
        // Line continuation
        if (part === '\\') {
          return <span key={i} className="text-slate-500">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
