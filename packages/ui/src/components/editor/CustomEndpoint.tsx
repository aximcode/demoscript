import { useState, useEffect } from 'react';
import { executeRequest } from '../../lib/execute-adapter';
import { ResponseDisplay } from '../rest/ResponseDisplay';
import type { BuilderStep } from './types';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  POST: 'bg-green-500/20 text-green-400 border-green-500/30',
  PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  PATCH: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

interface Props {
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
  variables: Record<string, unknown>;
  onAddStep: (step: BuilderStep) => void;
  onSaveVariable: (name: string, value: unknown) => void;
  editingStep: BuilderStep | null;
  onCancelEdit: () => void;
  onUpdateStep: (id: string, updates: Partial<BuilderStep>) => void;
}

export function CustomEndpoint({
  baseUrl,
  onBaseUrlChange,
  variables,
  onAddStep,
  onSaveVariable,
  editingStep,
  onCancelEdit,
  onUpdateStep,
}: Props) {
  const [method, setMethod] = useState<string>('GET');
  const [path, setPath] = useState('/');
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');

  const [isExecuting, setIsExecuting] = useState(false);
  const [response, setResponse] = useState<unknown>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Variable saving UI
  const [showSaveVariable, setShowSaveVariable] = useState(false);
  const [variableName, setVariableName] = useState('');
  const [variablePath, setVariablePath] = useState('');

  // Load editing step data
  useEffect(() => {
    if (editingStep) {
      setMethod(editingStep.method);
      setPath(editingStep.endpoint);
      setTitle(editingStep.title);
      setBody(editingStep.body ? JSON.stringify(editingStep.body, null, 2) : '');
      setHeaders(editingStep.headers ? JSON.stringify(editingStep.headers, null, 2) : '');
    }
  }, [editingStep]);

  // Substitute variables in a string
  const substituteVariables = (str: string): string => {
    return str.replace(/\$(\w+)/g, (_, name) => {
      const value = variables[name];
      return value !== undefined ? String(value) : `$${name}`;
    });
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);
    setResponse(null);
    setResponseStatus(null);

    try {
      const fullUrl = substituteVariables(`${baseUrl}${path}`);
      let parsedHeaders: Record<string, string> = {};
      let parsedBody: unknown = undefined;

      if (headers.trim()) {
        try {
          parsedHeaders = JSON.parse(substituteVariables(headers));
        } catch {
          throw new Error('Invalid JSON in headers');
        }
      }

      if (body.trim() && method !== 'GET') {
        try {
          parsedBody = JSON.parse(substituteVariables(body));
        } catch {
          throw new Error('Invalid JSON in body');
        }
      }

      const result = await executeRequest({
        method,
        url: fullUrl,
        headers: parsedHeaders,
        body: parsedBody,
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
    const step: BuilderStep = {
      id: editingStep?.id || `step-${Date.now()}`,
      method,
      endpoint: path,
      title: title || `${method} ${path}`,
      body: body.trim() ? JSON.parse(body) : undefined,
      headers: headers.trim() ? JSON.parse(headers) : undefined,
    };

    if (editingStep) {
      onUpdateStep(editingStep.id, step);
      onCancelEdit();
    } else {
      onAddStep(step);
    }

    // Reset form
    setMethod('GET');
    setPath('/');
    setHeaders('');
    setBody('');
    setTitle('');
    setResponse(null);
    setResponseStatus(null);
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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800">
        <h2 className="text-lg font-medium text-slate-200">
          {editingStep ? 'Edit Step' : 'Custom Endpoint'}
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Enter the API endpoint details and execute to test
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Base URL */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Base URL
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => onBaseUrlChange(e.target.value)}
            placeholder="https://api.example.com"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Method + Path */}
        <div className="flex gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={`px-3 py-2 border rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 ${METHOD_COLORS[method] || 'bg-slate-800 text-slate-200 border-slate-700'}`}
          >
            {HTTP_METHODS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/endpoint"
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Step Title <span className="text-slate-500">(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${method} ${path}`}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Headers */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Headers <span className="text-slate-500">(JSON, optional)</span>
          </label>
          <textarea
            value={headers}
            onChange={(e) => setHeaders(e.target.value)}
            placeholder='{"Authorization": "Bearer $token"}'
            rows={2}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
          />
        </div>

        {/* Body */}
        {method !== 'GET' && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Request Body <span className="text-slate-500">(JSON)</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder='{"name": "John", "email": "john@example.com"}'
              rows={4}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleExecute}
            disabled={isExecuting || !baseUrl || !path}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
          >
            {isExecuting ? 'Executing...' : 'Execute'}
          </button>

          {response !== null && (
            <button
              onClick={handleAddToDemo}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
            >
              {editingStep ? 'Update Step' : '+ Add to Demo'}
            </button>
          )}

          {editingStep && (
            <button
              onClick={onCancelEdit}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
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
