import { useState, useEffect, useRef, useCallback } from 'react';
import { useDemo } from '../context/DemoContext';
import { substituteVariables, extractValueByPath } from '../lib/variable-substitution';
import { evaluateCondition } from '../lib/rest-helpers';
import { executeRequest } from '../lib/execute-adapter';
import type { PollStep as PollStepType, ExplicitPollStep } from '../types/schema';
import { getPollEndpoint } from '../types/schema';
import { GlowingCard, SuccessCheck } from './effects';

interface Props {
  step: PollStepType | ExplicitPollStep;
}

interface PollState {
  status: 'idle' | 'polling' | 'success' | 'failure';
  attempt: number;
  maxAttempts: number;
  currentStage: string | null;
  lastResponse: unknown;
  error: string | null;
}

export function PollStep({ step }: Props) {
  const { state, dispatch, getStepStatus } = useDemo();
  const [pollState, setPollState] = useState<PollState>({
    status: 'idle',
    attempt: 0,
    maxAttempts: step.max_attempts || 30,
    currentStage: null,
    lastResponse: null,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const stepStatus = getStepStatus(state.currentStep);
  const endpoint = getPollEndpoint(step);
  const interval = step.interval || 2000;
  const maxAttempts = step.max_attempts || 30;
  const stages = step.stages || [];

  // Reset when step changes
  useEffect(() => {
    setPollState({
      status: 'idle',
      attempt: 0,
      maxAttempts,
      currentStage: null,
      lastResponse: null,
      error: null,
    });
    abortRef.current?.abort();
  }, [step, state.currentStep, maxAttempts]);

  // Determine current stage from response
  const getCurrentStage = useCallback((response: unknown): string | null => {
    if (!stages.length) return null;

    for (const stage of stages) {
      if (evaluateCondition(stage.when, response)) {
        return stage.label;
      }
    }

    return null;
  }, [stages]);

  // Save variables from response
  const saveVariables = useCallback((data: unknown) => {
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
  }, [step.save, dispatch]);

  // Execute polling
  const startPolling = useCallback(async () => {
    if (pollState.status === 'polling') return;

    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'executing' } });
    setPollState((prev) => ({ ...prev, status: 'polling', attempt: 0, error: null }));

    // Resolve endpoint with variables
    const baseUrl = step.base_url || state.config?.settings?.base_url || '';
    const path = endpoint;
    const isFullUrl = path.startsWith('http://') || path.startsWith('https://');
    const resolvedEndpoint = substituteVariables(
      isFullUrl ? path : baseUrl + path,
      state.variables
    );

    // Resolve headers
    const headers: Record<string, string> = {};
    if (step.headers) {
      for (const [key, value] of Object.entries(step.headers)) {
        headers[key] = substituteVariables(String(value), state.variables);
      }
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (controller.signal.aborted) {
        setPollState((prev) => ({ ...prev, status: 'idle', error: 'Polling cancelled' }));
        return;
      }

      setPollState((prev) => ({ ...prev, attempt }));

      try {
        const result = await executeRequest({
          method: 'GET',
          url: resolvedEndpoint,
          headers,
        });

        const data = result.data;
        const currentStage = getCurrentStage(data);

        setPollState((prev) => ({
          ...prev,
          lastResponse: data,
          currentStage,
        }));

        // Check success condition
        if (step.success_when) {
          const isSuccess = evaluateCondition(step.success_when, data);
          if (isSuccess) {
            setPollState((prev) => ({
              ...prev,
              status: 'success',
              lastResponse: data,
            }));
            saveVariables(data);
            dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'complete' } });
            return;
          }
        }

        // Check failure condition
        if (step.failure_when) {
          const isFailure = evaluateCondition(step.failure_when, data);
          if (isFailure) {
            const errorMsg = `Condition failed: ${step.failure_when}`;
            setPollState((prev) => ({
              ...prev,
              status: 'failure',
              error: errorMsg,
            }));
            dispatch({ type: 'SET_STEP_ERROR', payload: { step: state.currentStep, error: errorMsg } });
            dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'error' } });
            return;
          }
        }
      } catch (err) {
        // Continue polling on errors
      }

      // Wait for interval before next attempt
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    // Timeout
    const errorMsg = `Polling timeout after ${maxAttempts} attempts`;
    setPollState((prev) => ({
      ...prev,
      status: 'failure',
      error: errorMsg,
    }));
    dispatch({ type: 'SET_STEP_ERROR', payload: { step: state.currentStep, error: errorMsg } });
    dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'error' } });
  }, [pollState.status, endpoint, maxAttempts, interval, step, state, dispatch, getCurrentStage, saveVariables]);

  // Abort polling
  const abortPolling = useCallback(() => {
    abortRef.current?.abort();
    setPollState((prev) => ({ ...prev, status: 'idle', error: 'Polling cancelled' }));
    dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'pending' } });
  }, [dispatch, state.currentStep]);

  // Progress percentage
  const progressPercent = maxAttempts > 0 ? (pollState.attempt / maxAttempts) * 100 : 0;

  return (
    <GlowingCard isActive={stepStatus === 'complete'} color="amber" intensity="medium">
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md dark:shadow-xl border border-gray-200 dark:border-amber-500/20 overflow-hidden transition-colors duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ animationDuration: pollState.status === 'polling' ? '1s' : '0s', animationPlayState: pollState.status === 'polling' ? 'running' : 'paused' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {step.title || 'Polling'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 font-mono truncate max-w-md">
                  {substituteVariables(endpoint, state.variables)}
                </p>
              </div>
            </div>
            {stepStatus === 'complete' && <SuccessCheck size={24} animated={false} />}
          </div>
        </div>

        {/* Stages visualization */}
        {stages.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              {stages.map((stage, idx) => {
                const stageIdx = stages.findIndex((s) => s.label === pollState.currentStage);
                const isActive = stage.label === pollState.currentStage;
                const isComplete = stageIdx > idx || pollState.status === 'success';

                return (
                  <div key={stage.label} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                          isComplete
                            ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                            : isActive
                            ? 'bg-amber-500 text-white animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                            : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                        }`}
                      >
                        {isComplete ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span className={`mt-1 text-xs ${isActive || isComplete ? 'text-gray-700 dark:text-slate-200 font-medium' : 'text-gray-400 dark:text-slate-500'}`}>
                        {stage.label}
                      </span>
                    </div>
                    {idx < stages.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-2 rounded transition-all duration-300 ${isComplete ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-slate-400">
              {pollState.status === 'polling'
                ? `Attempt ${pollState.attempt} of ${maxAttempts}`
                : pollState.status === 'success'
                ? 'Complete!'
                : pollState.status === 'failure'
                ? 'Failed'
                : 'Ready'}
            </span>
            {pollState.currentStage && pollState.status === 'polling' && (
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {pollState.currentStage}
              </span>
            )}
          </div>
          <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                pollState.status === 'success'
                  ? 'bg-green-500'
                  : pollState.status === 'failure'
                  ? 'bg-red-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: pollState.status === 'success' ? '100%' : `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action button */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700/50">
          {pollState.status === 'polling' ? (
            <button
              onClick={abortPolling}
              className="w-full px-4 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={startPolling}
                disabled={stepStatus === 'executing'}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-lg hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/25 transition-all duration-300 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Start Polling
              </button>

              {stepStatus === 'complete' && (
                <button
                  onClick={() => {
                    setPollState({
                      status: 'idle',
                      attempt: 0,
                      maxAttempts,
                      currentStage: null,
                      lastResponse: null,
                      error: null,
                    });
                    dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'pending' } });
                  }}
                  className="px-4 py-2.5 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 shadow-lg transition-all duration-300 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </button>
              )}

              {stepStatus === 'complete' && (
                <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Complete
                </span>
              )}
            </div>
          )}
        </div>

        {/* Error display */}
        {pollState.error && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 border-t border-red-200 dark:border-red-500/30">
            <p className="text-red-600 dark:text-red-400 text-sm">{pollState.error}</p>
          </div>
        )}

        {/* Response display */}
        {pollState.lastResponse !== null && pollState.status === 'success' && (
          <div className="p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Final Response
            </label>
            <pre className="p-4 bg-slate-950 rounded-lg text-sm font-mono text-green-300 overflow-x-auto max-h-48">
              {JSON.stringify(pollState.lastResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </GlowingCard>
  );
}
