import { useState, useEffect } from 'react';
import { useDemo } from '../context/DemoContext';
import { substituteVariables, substituteInObject, extractValueByPath } from '../lib/variable-substitution';
import { isStepTypeSupported, getUnsupportedMessage, executeGraphQL } from '../lib/execute-adapter';
import type { GraphQLStep as GraphQLStepType, ExplicitGraphQLStep } from '../types/schema';
import { getGraphQLQuery } from '../types/schema';
import { GlowingCard, SuccessCheck } from './effects';

interface Props {
  step: GraphQLStepType | ExplicitGraphQLStep;
}

export function GraphQLStep({ step }: Props) {
  const { state, dispatch, getStepStatus } = useDemo();
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const status = getStepStatus(state.currentStep);

  // Initialize variable values from step config
  useEffect(() => {
    if (step.variables) {
      const initialValues: Record<string, string> = {};
      for (const [key, value] of Object.entries(step.variables)) {
        const substituted = substituteVariables(String(value), state.variables);
        initialValues[key] = substituted;
      }
      setVariableValues(initialValues);
    }
    setResponse(null);
    setError(null);
  }, [step, state.currentStep]);

  // Load from recordings in recorded mode
  useEffect(() => {
    if (state.mode === 'recorded' && state.recordings) {
      const recording = state.recordings.recordings.find(
        (r) => r.stepId === `step-${state.currentStep}`
      );
      if (recording?.response?.body) {
        setResponse(recording.response.body);
      }
    }
  }, [state.mode, state.recordings, state.currentStep]);

  const handleExecute = async () => {
    dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'executing' } });
    setError(null);

    try {
      if (state.mode === 'recorded') {
        // Simulate delay for recorded mode
        await new Promise((resolve) => setTimeout(resolve, 500));

        const recording = state.recordings?.recordings.find(
          (r) => r.stepId === `step-${state.currentStep}`
        );

        if (recording?.response?.body) {
          setResponse(recording.response.body);
          saveVariables(recording.response.body);
          dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'complete' } });
        } else {
          throw new Error('No recording found for this step');
        }
      } else {
        // Live execution
        const endpoint = step.endpoint || state.config?.settings?.base_url || '';
        const resolvedEndpoint = substituteVariables(endpoint, state.variables);

        const headers = substituteInObject(step.headers || {}, state.variables) as Record<string, string>;
        const variables = substituteInObject(variableValues, state.variables);

        const result = await executeGraphQL({
          endpoint: resolvedEndpoint,
          query: getGraphQLQuery(step),
          variables,
          headers,
        });

        if (result.error) {
          throw new Error(result.error);
        }

        setResponse(result.data);
        saveVariables(result.data);
        dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'complete' } });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setError(message);
      dispatch({ type: 'SET_STEP_ERROR', payload: { step: state.currentStep, error: message } });
      dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'error' } });
    }
  };

  const saveVariables = (data: unknown) => {
    if (!step.save) return;

    const newVariables: Record<string, unknown> = {};
    for (const [varName, path] of Object.entries(step.save)) {
      const value = extractValueByPath(data, path);
      if (value !== undefined) {
        newVariables[varName] = value;
      }
    }

    if (Object.keys(newVariables).length > 0) {
      dispatch({ type: 'SET_VARIABLES', payload: newVariables });
    }
  };

  return (
    <GlowingCard isActive={status === 'complete'} color="pink" intensity="medium">
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md dark:shadow-xl border border-gray-200 dark:border-pink-500/20 overflow-hidden transition-colors duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {step.title || 'GraphQL Query'}
                </h3>
                {step.endpoint && (
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {substituteVariables(step.endpoint, state.variables)}
                  </p>
                )}
              </div>
            </div>
            {status === 'complete' && <SuccessCheck size={24} animated={false} />}
          </div>
        </div>

        {/* Unsupported step warning */}
        {!isStepTypeSupported('graphql') && state.mode === 'live' && (
          <div className="px-6 py-3 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/30">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {getUnsupportedMessage('graphql')}
              </p>
            </div>
          </div>
        )}

        {/* Query display */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700/50">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Query
          </label>
          <pre className="p-4 bg-slate-950 rounded-lg text-sm font-mono text-pink-300 overflow-x-auto">
            {getGraphQLQuery(step)}
          </pre>
        </div>

        {/* Variables editor */}
        {step.variables && Object.keys(step.variables).length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-slate-700/50">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Variables
            </label>
            <div className="space-y-3">
              {Object.entries(step.variables).map(([key]) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="w-32 text-sm text-gray-600 dark:text-slate-400 font-mono">
                    {key}
                  </label>
                  <input
                    type="text"
                    value={variableValues[key] || ''}
                    onChange={(e) =>
                      setVariableValues({ ...variableValues, [key]: e.target.value })
                    }
                    disabled={status === 'executing'}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600/50 rounded-lg text-sm font-mono text-gray-900 dark:text-white disabled:opacity-50"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Execute button */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700/50">
          <button
            onClick={handleExecute}
            disabled={status === 'executing' || (!isStepTypeSupported('graphql') && state.mode === 'live')}
            className="w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-lg hover:from-pink-400 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-500/25 transition-all duration-300 flex items-center justify-center gap-2"
          >
            {status === 'executing' ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Executing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Execute Query
              </>
            )}
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 border-b border-red-200 dark:border-red-500/30">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Response display */}
        {response !== null && response !== undefined && (
          <div className="p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Response
            </label>
            <pre className="p-4 bg-slate-950 rounded-lg text-sm font-mono text-green-300 overflow-x-auto max-h-96">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </GlowingCard>
  );
}
