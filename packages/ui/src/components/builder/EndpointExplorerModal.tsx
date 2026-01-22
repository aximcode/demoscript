import { useState, useMemo, useEffect, useCallback } from 'react';
import type { OpenApiSpec, EndpointInfo } from '@demoscript/shared/openapi';
import {
  groupEndpointsByTag,
  searchEndpoints,
  generateFormFields,
  generateResultFields,
} from '@demoscript/shared/openapi';
import type { StepOrGroup, FormField, ResultField } from '../../types/schema';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500/20 text-green-400 border-green-500/30',
  POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  PATCH: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddEndpoint: (step: StepOrGroup) => void;
  openapiUrl: string;
}

export function EndpointExplorerModal({
  isOpen,
  onClose,
  onAddEndpoint,
  openapiUrl,
}: Props) {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);

  // Fetch spec when modal opens
  useEffect(() => {
    if (!isOpen || !openapiUrl || spec) return;

    const fetchSpec = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use the proxy endpoint to bypass CORS
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch spec');
        setSpec(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpec();
  }, [isOpen, openapiUrl, spec]);

  // Get all unique tags
  const allTags = useMemo(() => {
    if (!spec) return [];
    const grouped = groupEndpointsByTag(spec);
    return Array.from(grouped.keys()).filter(tag => tag !== 'Other');
  }, [spec]);

  // Group and filter endpoints
  const filteredEndpoints = useMemo(() => {
    if (!spec) return [];

    let endpoints: EndpointInfo[];

    if (searchQuery.trim()) {
      endpoints = searchEndpoints(spec, searchQuery);
    } else {
      const grouped = groupEndpointsByTag(spec);
      if (selectedTag) {
        endpoints = grouped.get(selectedTag) || [];
      } else {
        endpoints = Array.from(grouped.values()).flat();
      }
    }

    return endpoints;
  }, [spec, searchQuery, selectedTag]);

  // Handle adding endpoint as a step
  const handleAddEndpoint = useCallback((endpoint: EndpointInfo) => {
    if (!spec) return;

    const { method, path, summary } = endpoint;

    // Generate form fields from request schema
    const formFields = generateFormFields(spec, method, path) as FormField[];

    // Generate result fields from response schema
    const resultFields = generateResultFields(spec, method, path) as ResultField[];

    // Create REST step
    const newStep: StepOrGroup = {
      rest: `${method} ${path}`,
      title: summary || `${method} ${path}`,
      ...(formFields.length > 0 && { form: formFields }),
      ...(resultFields.length > 0 && { results: resultFields }),
    };

    onAddEndpoint(newStep);
    onClose();
  }, [spec, onAddEndpoint, onClose]);

  // Toggle endpoint details
  const toggleEndpoint = (key: string) => {
    setExpandedEndpoint(prev => prev === key ? null : key);
  };

  // Get endpoint key for tracking
  const getEndpointKey = (endpoint: EndpointInfo) =>
    `${endpoint.method}-${endpoint.path}`;

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedTag(null);
      setExpandedEndpoint(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-slate-100">Browse API Endpoints</h3>
            {spec && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {spec.info.title} v{spec.info.version} - {filteredEndpoints.length} endpoints
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        {spec && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search endpoints..."
                className="w-full px-3 py-2 pl-9 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
              <svg
                className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-slate-500"
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
          </div>
        )}

        {/* Tag tabs */}
        {spec && allTags.length > 0 && !searchQuery && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex-shrink-0 overflow-x-auto">
            <div className="flex gap-1.5">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                  selectedTag === null
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                    selectedTag === tag
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-gray-500 dark:text-slate-400">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading OpenAPI spec...</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setSpec(null);
                }}
                className="mt-2 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300 underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {spec && filteredEndpoints.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-slate-400">
                {searchQuery ? 'No endpoints match your search' : 'No endpoints found'}
              </p>
            </div>
          )}

          {/* Endpoint list */}
          {spec && filteredEndpoints.length > 0 && (
            <div className="space-y-2">
              {filteredEndpoints.map((endpoint) => {
                const key = getEndpointKey(endpoint);
                const isExpanded = expandedEndpoint === key;

                return (
                  <div
                    key={key}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden"
                  >
                    {/* Endpoint row */}
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800/50">
                      {/* Method badge */}
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded border flex-shrink-0 ${
                          METHOD_COLORS[endpoint.method] || 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {endpoint.method}
                      </span>

                      {/* Path and summary */}
                      <button
                        onClick={() => toggleEndpoint(key)}
                        className="flex-1 text-left min-w-0"
                      >
                        <span className="text-sm font-mono text-gray-900 dark:text-slate-200 truncate block">
                          {endpoint.path}
                        </span>
                        {endpoint.summary && (
                          <span className="text-xs text-gray-500 dark:text-slate-400 truncate block">
                            {endpoint.summary}
                          </span>
                        )}
                      </button>

                      {/* Deprecated badge */}
                      {endpoint.deprecated && (
                        <span className="px-1.5 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded flex-shrink-0">
                          Deprecated
                        </span>
                      )}

                      {/* Add button */}
                      <button
                        onClick={() => handleAddEndpoint(endpoint)}
                        className="px-3 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors flex-shrink-0"
                      >
                        + Add
                      </button>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                        {endpoint.description && (
                          <p className="text-gray-600 dark:text-slate-400 mb-3">
                            {endpoint.description}
                          </p>
                        )}

                        {/* Preview what will be generated */}
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase">
                              Request Fields
                            </span>
                            <div className="mt-1 text-xs font-mono text-gray-600 dark:text-slate-400">
                              {(() => {
                                const fields = generateFormFields(spec, endpoint.method, endpoint.path);
                                if (fields.length === 0) return <span className="italic">No request body</span>;
                                return fields.map((f: FormField) => f.name).join(', ');
                              })()}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase">
                              Response Fields
                            </span>
                            <div className="mt-1 text-xs font-mono text-gray-600 dark:text-slate-400">
                              {(() => {
                                const fields = generateResultFields(spec, endpoint.method, endpoint.path);
                                if (fields.length === 0) return <span className="italic">No response schema</span>;
                                return fields.map((f: ResultField) => f.key).join(', ');
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex-shrink-0 bg-gray-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
