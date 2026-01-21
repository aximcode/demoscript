import { useState, useCallback } from 'react';
import { CustomEndpoint } from '../components/builder/CustomEndpoint';
import { EndpointBrowser } from '../components/builder/EndpointBrowser';
import { ExecutionPanel } from '../components/builder/ExecutionPanel';
import { StepSequence } from '../components/builder/StepSequence';
import { ExportPanel } from '../components/builder/ExportPanel';
import type { BuilderStep, BuilderState } from '../components/builder/types';
import type { EndpointInfo, OpenApiSpec } from '@demoscript/shared/openapi';

const STORAGE_KEY = 'demoscript-builder-state';

// Check if running in embedded mode (inside iframe in cloud dashboard)
const isEmbedded = (window as unknown as { __DEMOSCRIPT_BUILDER_EMBEDDED__?: boolean }).__DEMOSCRIPT_BUILDER_EMBEDDED__;

function loadState(): BuilderState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return {
    mode: 'custom',
    baseUrl: '',
    steps: [],
    variables: {},
  };
}

function saveState(state: BuilderState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function Builder() {
  const [state, setState] = useState<BuilderState>(loadState);
  const [editingStep, setEditingStep] = useState<BuilderStep | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointInfo | null>(null);
  const [openapiSpec, setOpenapiSpec] = useState<OpenApiSpec | null>(null);

  const updateState = useCallback((updates: Partial<BuilderState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      saveState(newState);
      return newState;
    });
  }, []);

  const addStep = useCallback((step: BuilderStep) => {
    setState(prev => {
      const newState = {
        ...prev,
        steps: [...prev.steps, step],
      };
      saveState(newState);
      return newState;
    });
    setEditingStep(null);
  }, []);

  const updateStep = useCallback((id: string, updates: Partial<BuilderStep>) => {
    setState(prev => {
      const newState = {
        ...prev,
        steps: prev.steps.map(s => s.id === id ? { ...s, ...updates } : s),
      };
      saveState(newState);
      return newState;
    });
  }, []);

  const deleteStep = useCallback((id: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        steps: prev.steps.filter(s => s.id !== id),
      };
      saveState(newState);
      return newState;
    });
  }, []);

  const reorderSteps = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      const steps = [...prev.steps];
      const [removed] = steps.splice(fromIndex, 1);
      steps.splice(toIndex, 0, removed);
      const newState = { ...prev, steps };
      saveState(newState);
      return newState;
    });
  }, []);

  const saveVariable = useCallback((name: string, value: unknown) => {
    setState(prev => {
      const newState = {
        ...prev,
        variables: { ...prev.variables, [name]: value },
      };
      saveState(newState);
      return newState;
    });
  }, []);

  const clearAll = useCallback(() => {
    const newState: BuilderState = {
      mode: 'custom',
      baseUrl: '',
      steps: [],
      variables: {},
    };
    setState(newState);
    saveState(newState);
    setEditingStep(null);
  }, []);

  // Handle OpenAPI spec loading (from EndpointBrowser)
  const handleOpenapiSpecLoaded = useCallback((spec: OpenApiSpec) => {
    setOpenapiSpec(spec);
    // Don't clear selected endpoint if the spec is the same (re-fetch)
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header - hidden in embedded mode */}
      {!isEmbedded && (
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎬</span>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                DemoScript Builder
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => updateState({ mode: 'openapi' })}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    state.mode === 'openapi'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  OpenAPI
                </button>
                <button
                  onClick={() => updateState({ mode: 'custom' })}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    state.mode === 'custom'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Custom
                </button>
              </div>
              <button
                onClick={clearAll}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Embedded mode toolbar */}
      {isEmbedded && (
        <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => updateState({ mode: 'openapi' })}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  state.mode === 'openapi'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                OpenAPI
              </button>
              <button
                onClick={() => updateState({ mode: 'custom' })}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  state.mode === 'custom'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Custom
              </button>
            </div>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Endpoint Input */}
          <div className="lg:col-span-2 space-y-6">
            {state.mode === 'openapi' ? (
              <>
                <EndpointBrowser
                  openapiUrl={state.openapiUrl || ''}
                  onOpenapiUrlChange={(url) => updateState({ openapiUrl: url })}
                  onSelectEndpoint={(endpoint) => setSelectedEndpoint(endpoint)}
                  selectedEndpoint={selectedEndpoint}
                  onSpecLoaded={handleOpenapiSpecLoaded}
                />

                {selectedEndpoint && openapiSpec && (
                  <ExecutionPanel
                    endpoint={selectedEndpoint}
                    spec={openapiSpec}
                    baseUrl={state.baseUrl}
                    variables={state.variables}
                    onAddStep={addStep}
                    onSaveVariable={saveVariable}
                  />
                )}

                {/* Base URL for OpenAPI mode */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={state.baseUrl}
                    onChange={(e) => updateState({ baseUrl: e.target.value })}
                    placeholder="https://api.example.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    The base URL to use when executing requests (leave empty if OpenAPI spec includes server URL)
                  </p>
                </div>
              </>
            ) : (
              <CustomEndpoint
                baseUrl={state.baseUrl}
                onBaseUrlChange={(url) => updateState({ baseUrl: url })}
                variables={state.variables}
                onAddStep={addStep}
                onSaveVariable={saveVariable}
                editingStep={editingStep}
                onCancelEdit={() => setEditingStep(null)}
                onUpdateStep={updateStep}
              />
            )}
          </div>

          {/* Right Column: Steps & Export */}
          <div className="space-y-6">
            <StepSequence
              steps={state.steps}
              onEdit={setEditingStep}
              onDelete={deleteStep}
              onReorder={reorderSteps}
            />

            <ExportPanel
              state={state}
              embedded={isEmbedded}
            />

            {/* Variables Panel */}
            {Object.keys(state.variables).length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Variables</h3>
                <div className="space-y-2">
                  {Object.entries(state.variables).map(([name, value]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="text-purple-400 font-mono">${name}</span>
                      <span className="text-slate-400 font-mono text-xs truncate max-w-[150px]">
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
