import { useState, useMemo } from 'react';
import type { OpenApiSpec, EndpointInfo } from '@demoscript/shared/openapi';
import { groupEndpointsByTag, searchEndpoints } from '@demoscript/shared/openapi';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  POST: 'bg-green-500/20 text-green-400 border-green-500/30',
  PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  PATCH: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

interface Props {
  openapiUrl: string;
  onOpenapiUrlChange: (url: string) => void;
  onSelectEndpoint: (endpoint: EndpointInfo) => void;
  selectedEndpoint: EndpointInfo | null;
  onSpecLoaded?: (spec: OpenApiSpec) => void;
}

export function EndpointBrowser({
  openapiUrl,
  onOpenapiUrlChange,
  onSelectEndpoint,
  selectedEndpoint,
  onSpecLoaded,
}: Props) {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set());

  // Fetch spec when URL is provided and user clicks fetch
  const handleFetch = async () => {
    if (!openapiUrl.trim()) {
      setError('Please enter an OpenAPI spec URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the proxy endpoint if we're in builder mode
      const proxyUrl = `/api/openapi?url=${encodeURIComponent(openapiUrl)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to fetch: ${response.status}`);
      }

      const data = await response.json();

      // Validate it's an OpenAPI spec
      if ((!data.openapi && !data.swagger) || !data.paths) {
        throw new Error('Invalid OpenAPI spec: missing openapi/swagger or paths');
      }

      setSpec(data);
      onSpecLoaded?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch spec');
      setSpec(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Group endpoints by tag
  const groupedEndpoints = useMemo(() => {
    if (!spec) return new Map<string, EndpointInfo[]>();
    if (searchQuery.trim()) {
      // When searching, return flat list under "Search Results"
      const results = searchEndpoints(spec, searchQuery);
      return new Map([['Search Results', results]]);
    }
    return groupEndpointsByTag(spec);
  }, [spec, searchQuery]);

  const toggleTag = (tag: string) => {
    setCollapsedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const isEndpointSelected = (endpoint: EndpointInfo) => {
    return selectedEndpoint?.method === endpoint.method &&
           selectedEndpoint?.path === endpoint.path;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800">
        <h2 className="text-lg font-medium text-slate-200">OpenAPI Browser</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Load an OpenAPI spec to browse and test endpoints
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* URL Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={openapiUrl}
            onChange={(e) => onOpenapiUrlChange(e.target.value)}
            placeholder="https://api.example.com/openapi.json"
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
          />
          <button
            onClick={handleFetch}
            disabled={isLoading || !openapiUrl.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {isLoading ? 'Loading...' : 'Fetch'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Spec Info */}
        {spec && (
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-200">{spec.info.title}</h3>
                <p className="text-xs text-slate-400">v{spec.info.version}</p>
              </div>
              <span className="text-xs text-slate-500">
                {Array.from(groupedEndpoints.values()).flat().length} endpoints
              </span>
            </div>
          </div>
        )}

        {/* Search */}
        {spec && (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search endpoints..."
              className="w-full px-3 py-2 pl-9 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        )}

        {/* Endpoints List */}
        {spec && (
          <div className="max-h-96 overflow-y-auto space-y-1">
            {groupedEndpoints.size === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                No endpoints found
              </p>
            ) : (
              Array.from(groupedEndpoints.entries()).map(([tag, endpoints]) => (
                <div key={tag} className="border border-slate-800 rounded-lg overflow-hidden">
                  {/* Tag Header */}
                  <button
                    onClick={() => toggleTag(tag)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-300">{tag}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{endpoints.length}</span>
                      <svg
                        className={`h-4 w-4 text-slate-500 transition-transform ${
                          collapsedTags.has(tag) ? '' : 'rotate-180'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* Endpoints */}
                  {!collapsedTags.has(tag) && (
                    <div className="divide-y divide-slate-800/50">
                      {endpoints.map((endpoint) => (
                        <button
                          key={`${endpoint.method}-${endpoint.path}`}
                          onClick={() => onSelectEndpoint(endpoint)}
                          className={`w-full flex items-start gap-2 px-3 py-2 text-left transition-colors ${
                            isEndpointSelected(endpoint)
                              ? 'bg-purple-500/20 border-l-2 border-purple-500'
                              : 'hover:bg-slate-800/30'
                          }`}
                        >
                          <span
                            className={`px-1.5 py-0.5 text-xs font-medium rounded border ${
                              METHOD_COLORS[endpoint.method] || 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {endpoint.method}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-200 font-mono truncate">
                              {endpoint.path}
                            </p>
                            {endpoint.summary && (
                              <p className="text-xs text-slate-500 truncate">
                                {endpoint.summary}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Empty State */}
        {!spec && !isLoading && !error && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm text-slate-400">
              Enter an OpenAPI spec URL and click Fetch to browse endpoints
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
