import { useState, useEffect, useMemo, useCallback } from 'react';
import { executeRequest } from '../../lib/execute-adapter';
import { ResponseDisplay } from '../rest/ResponseDisplay';
import type { EndpointInfo, OpenApiSpec } from '@demoscript/shared/openapi';
import { generateFormFields, getParameterFields } from '@demoscript/shared/openapi';
import type { BuilderStep } from './types';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  POST: 'bg-green-500/20 text-green-400 border-green-500/30',
  PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  PATCH: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

interface Props {
  endpoint: EndpointInfo;
  spec: OpenApiSpec;
  baseUrl: string;
  variables: Record<string, unknown>;
  onAddStep: (step: BuilderStep) => void;
  onSaveVariable: (name: string, value: unknown) => void;
}

export function ExecutionPanel({
  endpoint,
  spec,
  baseUrl,
  variables,
  onAddStep,
  onSaveVariable,
}: Props) {
  // Form fields from OpenAPI
  const bodyFields = useMemo(() =>
    generateFormFields(spec, endpoint.method, endpoint.path),
    [spec, endpoint.method, endpoint.path]
  );

  const paramFields = useMemo(() =>
    getParameterFields(spec, endpoint.method, endpoint.path),
    [spec, endpoint.method, endpoint.path]
  );

  const allFields = useMemo(() => [...paramFields, ...bodyFields], [paramFields, bodyFields]);

  // Form values state
  const [formValues, setFormValues] = useState<Record<string, string | number | boolean>>({});
  const [title, setTitle] = useState('');

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [response, setResponse] = useState<unknown>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Variable saving UI
  const [showSaveVariable, setShowSaveVariable] = useState(false);
  const [variableName, setVariableName] = useState('');
  const [variablePath, setVariablePath] = useState('');

  // Initialize form values from defaults
  useEffect(() => {
    const defaults: Record<string, string | number | boolean> = {};
    for (const field of allFields) {
      if (field.default !== undefined) {
        defaults[field.name] = field.default;
      }
    }
    setFormValues(defaults);
    setResponse(null);
    setResponseStatus(null);
    setError(null);
  }, [allFields]);

  // Substitute variables in a string
  const substituteVariables = useCallback((str: string): string => {
    return str.replace(/\$([\w.]+)/g, (_, name) => {
      const value = variables[name];
      return value !== undefined ? String(value) : `$${name}`;
    });
  }, [variables]);

  // Build URL with path parameters
  const buildUrl = useCallback((): string => {
    let path = endpoint.path;

    // Replace path parameters like {userId} with form values
    path = path.replace(/\{(\w+)\}/g, (_, param) => {
      const value = formValues[param];
      return value !== undefined ? String(value) : `{${param}}`;
    });

    // Substitute $variables
    path = substituteVariables(path);

    return `${baseUrl}${path}`;
  }, [endpoint.path, formValues, baseUrl, substituteVariables]);

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);
    setResponse(null);
    setResponseStatus(null);

    try {
      const url = buildUrl();

      // Build request body from form values (only body fields, not params)
      let body: unknown = undefined;
      if (bodyFields.length > 0 && endpoint.method !== 'GET') {
        const bodyObj: Record<string, unknown> = {};
        for (const field of bodyFields) {
          const rawValue = formValues[field.name];
          if (rawValue !== undefined) {
            let value: unknown = rawValue;
            // Handle textarea (JSON input)
            if (field.type === 'textarea' && typeof rawValue === 'string') {
              try {
                value = JSON.parse(substituteVariables(rawValue));
              } catch {
                // Keep as string if not valid JSON
                value = substituteVariables(rawValue);
              }
            } else if (typeof rawValue === 'string') {
              value = substituteVariables(rawValue);
            }
            bodyObj[field.name] = value;
          }
        }
        body = bodyObj;
      }

      const result = await executeRequest({
        method: endpoint.method,
        url,
        body,
      });

      setResponseStatus(result.status);
      setResponse(result.data);

      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAddToDemo = () => {
    // Build body object from form values
    let body: unknown = undefined;
    if (bodyFields.length > 0 && endpoint.method !== 'GET') {
      const bodyObj: Record<string, unknown> = {};
      for (const field of bodyFields) {
        if (formValues[field.name] !== undefined) {
          bodyObj[field.name] = formValues[field.name];
        }
      }
      body = bodyObj;
    }

    const step: BuilderStep = {
      id: `step-${Date.now()}`,
      method: endpoint.method,
      endpoint: endpoint.path,
      title: title || endpoint.summary || `${endpoint.method} ${endpoint.path}`,
      body,
    };

    onAddStep(step);
    setTitle('');
  };

  const handleSaveVariable = () => {
    if (!variableName || !response) return;

    let value: unknown = response;
    if (variablePath) {
      // Simple path extraction (e.g., "data.id" or "items[0].name")
      const parts = variablePath.split(/[.[\]]+/).filter(Boolean);
      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[part];
        } else {
          value = undefined;
          break;
        }
      }
    }

    if (value !== undefined) {
      onSaveVariable(variableName, value);
      setShowSaveVariable(false);
      setVariableName('');
      setVariablePath('');
    }
  };

  const updateFieldValue = useCallback((name: string, value: string | number | boolean) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-sm font-medium rounded border ${
              METHOD_COLORS[endpoint.method] || 'bg-slate-800 text-slate-400'
            }`}
          >
            {endpoint.method}
          </span>
          <span className="text-slate-200 font-mono text-sm">{endpoint.path}</span>
        </div>
        {endpoint.summary && (
          <p className="text-sm text-slate-400 mt-1">{endpoint.summary}</p>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Form Fields */}
        {allFields.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-300">Parameters</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {allFields.map(field => (
                <div key={field.name}>
                  <label className="block text-sm text-slate-400 mb-1">
                    {field.label || field.name}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={String(formValues[field.name] ?? '')}
                      onChange={(e) => updateFieldValue(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                    />
                  ) : field.type === 'select' && field.options ? (
                    <select
                      value={String(formValues[field.name] ?? '')}
                      onChange={(e) => updateFieldValue(field.name, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select...</option>
                      {field.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={String(formValues[field.name] ?? '')}
                      onChange={(e) => updateFieldValue(
                        field.name,
                        field.type === 'number' ? Number(e.target.value) : e.target.value
                      )}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Step Title <span className="text-slate-500">(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={endpoint.summary || `${endpoint.method} ${endpoint.path}`}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
          >
            {isExecuting ? 'Executing...' : 'Execute'}
          </button>

          {response !== null && (
            <button
              onClick={handleAddToDemo}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
            >
              + Add to Demo
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Response */}
        {response !== null && (
          <div className="border-t border-slate-800 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300">
                Response
                {responseStatus && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                    responseStatus >= 200 && responseStatus < 300
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {responseStatus}
                  </span>
                )}
              </h3>

              <button
                onClick={() => setShowSaveVariable(!showSaveVariable)}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                {showSaveVariable ? 'Cancel' : 'Save Variable'}
              </button>
            </div>

            {/* Save Variable UI */}
            {showSaveVariable && (
              <div className="mb-3 p-3 bg-slate-800/50 rounded-lg space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={variableName}
                    onChange={(e) => setVariableName(e.target.value)}
                    placeholder="Variable name"
                    className="flex-1 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="text"
                    value={variablePath}
                    onChange={(e) => setVariablePath(e.target.value)}
                    placeholder="Path (e.g., data.id)"
                    className="flex-1 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-sm text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleSaveVariable}
                    disabled={!variableName}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white text-sm rounded transition-colors"
                  >
                    Save
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Save a value from the response as a variable to use in later steps (e.g., $userId)
                </p>
              </div>
            )}

            <div className="max-h-80 overflow-auto">
              <ResponseDisplay response={response} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
