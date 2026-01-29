import { CurlCommand } from './CurlCommand';
import { methodSupportsBody } from '../../lib/variable-substitution';

interface Props {
  method: string;
  url: string;
  body?: string;
  headers?: Record<string, string>;
  showCurl?: boolean;
}

export function RequestPreview({ method, url, body, headers, showCurl = false }: Props) {
  let parsedBody: unknown;
  try {
    parsedBody = body ? JSON.parse(body) : undefined;
  } catch {
    parsedBody = body;
  }

  return (
    <div className="border-b border-gray-200 dark:border-slate-700/50 p-4 bg-gray-50/50 dark:bg-slate-900/30">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Request</h3>
      <pre className="bg-gray-100 dark:bg-slate-950 text-gray-800 dark:text-slate-100 p-3 rounded-lg text-sm overflow-x-auto border border-gray-200 dark:border-slate-700/50">
        <code>
          {method} {url}
          {methodSupportsBody(method) && body && (
            <>
              {'\n\n'}
              {body}
            </>
          )}
        </code>
      </pre>
      {showCurl && (
        <div className="mt-3">
          <CurlCommand
            method={method}
            url={url}
            headers={headers}
            body={parsedBody}
          />
        </div>
      )}
    </div>
  );
}
