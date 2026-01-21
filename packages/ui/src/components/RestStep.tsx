import { useState, useRef } from 'react';
import { useDemo } from '../context/DemoContext';
import { substituteVariables, substituteInObject, extractValueByPath, findVariablesInObject, findMissingVariables } from '../lib/variable-substitution';
import { evaluateCondition } from '../lib/rest-helpers';
import { executeRequest } from '../lib/execute-adapter';
import { parseRestMethod } from '../types/schema';
import type { RestStep as RestStepType, ExplicitRestStep } from '../types/schema';
import { GlowingCard } from './effects';

import { useRestFormState } from '../hooks/useRestFormState';
import { useTryItMode } from '../hooks/useTryItMode';
import type { PollingState } from '../hooks/usePolling';

import {
  RestStepHeader,
  RestFormFields,
  RequestPreview,
  PollingStatus,
  ExecuteButtons,
  ErrorDisplay,
  TryItBanner,
  ResponseDisplay,
  ResultsDisplay,
  MissingVariablesBanner,
} from './rest';

interface Props {
  step: RestStepType | ExplicitRestStep;
}

export function RestStep({ step }: Props) {
  const { state, dispatch, getStepStatus, getVariableProvider } = useDemo();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [pollingState, setPollingState] = useState<PollingState | null>(null);

  // Use form state hook
  const {
    formValues,
    setFormValues,
    hasModifications,
    isFieldModified,
  } = useRestFormState({ form: step.form, variables: state.variables });

  // Parse method and URL
  const { method, endpoint } = parseRestMethod(step);
  const resolvedEndpoint = substituteVariables(endpoint, state.variables);
  const baseUrl = step.base_url || state.config?.settings?.base_url || '';
  const fullUrl = `${baseUrl}${resolvedEndpoint}`;

  // Use try-it mode hook
  const {
    isTryItMode,
    tryItResponse,
    tryItError,
    isTryItExecuting,
    handleTryIt,
    handleReturnToRecorded,
  } = useTryItMode({
    step,
    formValues,
    variables: state.variables,
    method,
    fullUrl,
  });

  const status = getStepStatus(state.currentStep);
  const response = state.stepResponses[state.currentStep];
  const error = state.stepErrors[state.currentStep];

  // Calculate missing variables for this step
  const usedVariables = [
    ...findVariablesInObject(endpoint),
    ...findVariablesInObject(step.body),
    ...findVariablesInObject(step.headers),
    ...findVariablesInObject(step.form?.map(f => f.default)),
  ];
  const missingVarNames = findMissingVariables(usedVariables, state.variables);
  const missingVariables = missingVarNames.map(name => ({
    name,
    provider: getVariableProvider(name),
  }));

  const getRequestBodyPreview = (): string => {
    if (!step.form) return '';
    const body: Record<string, string | number | boolean> = {};
    for (const f of step.form.filter((field) => !field.hidden)) {
      const value = formValues[f.name];
      // Only include required fields or fields with non-empty values
      if (f.required || (value !== '' && value !== undefined && value !== null)) {
        body[f.name] = value ?? '';
      }
    }
    return JSON.stringify(body, null, 2);
  };

  const pollForResult = async (
    jobId: string,
    variables: Record<string, unknown>
  ): Promise<unknown> => {
    if (!step.poll) {
      throw new Error('No poll configuration');
    }

    const pollConfig = step.poll;
    const interval = pollConfig.interval || state.config?.settings?.polling?.interval || 2000;
    const maxAttempts = pollConfig.max_attempts || state.config?.settings?.polling?.max_attempts || 30;

    const pollEndpoint = substituteVariables(
      pollConfig.endpoint.replace('$jobId', jobId),
      { ...variables, jobId }
    );

    setPollingState({ isPolling: true, attempt: 0, maxAttempts, status: 'polling' });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Polling cancelled');
      }

      setPollingState({ isPolling: true, attempt, maxAttempts, status: 'polling' });

      await new Promise((resolve) => setTimeout(resolve, interval));

      const pollResult = await executeRequest({
        method: 'GET',
        url: pollEndpoint,
      });

      if (pollResult.status >= 400) {
        continue;
      }

      const data = pollResult.data;

      if (pollConfig.success_when) {
        const isSuccess = evaluateCondition(pollConfig.success_when, data);
        if (isSuccess) {
          setPollingState(null);
          return data;
        }
      }

      if (pollConfig.failure_when) {
        const isFailure = evaluateCondition(pollConfig.failure_when, data);
        if (isFailure) {
          setPollingState(null);
          throw new Error(`Job failed: ${JSON.stringify(data)}`);
        }
      }
    }

    setPollingState(null);
    throw new Error(`Polling timeout after ${maxAttempts} attempts`);
  };

  // Extract error message from response body or return default HTTP status message
  function extractErrorMessage(body: unknown, httpStatus: number): string {
    if (typeof body === 'object' && body !== null) {
      const obj = body as Record<string, unknown>;
      return String(obj.error || obj.detail || obj.message || `HTTP ${httpStatus}`);
    }
    return `HTTP ${httpStatus}`;
  }

  // Save variables from response
  // Supported special keywords: _status (HTTP status code)
  function saveVariables(responseData: unknown, httpStatus?: number): void {
    if (!step.save) return;

    const newVars: Record<string, unknown> = {};
    for (const [varName, path] of Object.entries(step.save)) {
      if (path === '_status') {
        // Special keyword: capture HTTP status code (200, 404, etc.)
        if (httpStatus !== undefined) {
          newVars[varName] = httpStatus;
        }
      } else if (responseData) {
        // JSON path extraction from response body
        newVars[varName] = extractValueByPath(responseData, path);
      }
    }

    if (Object.keys(newVars).length > 0) {
      dispatch({ type: 'SET_VARIABLES', payload: newVars });
    }
  }

  const handleExecute = async () => {
    // Clear any previous error before executing
    dispatch({ type: 'SET_STEP_ERROR', payload: { step: state.currentStep, error: null } });
    dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'executing' } });
    abortControllerRef.current = new AbortController();

    try {
      const body = step.form
        ? Object.fromEntries(
            step.form
              .filter((f) => !f.hidden)
              .filter((f) => {
                const value = formValues[f.name];
                // Keep required fields, or fields with non-empty values
                return f.required || (value !== '' && value !== undefined && value !== null);
              })
              .map((f) => [f.name, formValues[f.name]])
          )
        : substituteInObject(step.body, state.variables);

      if (state.mode === 'live') {
        const result = await executeRequest({
          method,
          url: fullUrl,
          headers: substituteInObject(step.headers, state.variables) as Record<string, string>,
          body: method !== 'GET' ? body : undefined,
        });

        if (result.error) {
          throw new Error(result.error);
        }

        let finalResponse = result.data;

        if (step.wait_for && step.poll && result.data) {
          const jobId = extractValueByPath(result.data, step.wait_for);
          if (jobId) {
            const pollResult = await pollForResult(String(jobId), {
              ...state.variables,
              ...result.data,
            });
            finalResponse = { ...result.data, ...pollResult as Record<string, unknown> };
          }
        }

        dispatch({ type: 'SET_STEP_RESPONSE', payload: { step: state.currentStep, response: finalResponse } });
        saveVariables(finalResponse, result.status);

        // Check if the API returned an error status code
        if (result.status >= 400) {
          dispatch({ type: 'SET_STEP_ERROR', payload: { step: state.currentStep, error: extractErrorMessage(finalResponse, result.status) } });
          dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'error' } });
        } else {
          dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'complete' } });
        }
      } else {
        const recording = state.recordings?.recordings.find(
          (r) => r.stepId === `step-${state.currentStep}`
        );

        if (recording?.response?.body) {
          await new Promise((r) => setTimeout(r, 500));
          dispatch({ type: 'SET_STEP_RESPONSE', payload: { step: state.currentStep, response: recording.response.body } });
          saveVariables(recording.response.body, recording.response.status);

          // Check if the recorded response was an error
          if (recording.response.status && recording.response.status >= 400) {
            dispatch({ type: 'SET_STEP_ERROR', payload: { step: state.currentStep, error: extractErrorMessage(recording.response.body, recording.response.status) } });
            dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'error' } });
          } else {
            dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'complete' } });
          }
        } else {
          throw new Error('No recording available for this step');
        }
      }
    } catch (err) {
      setPollingState(null);
      dispatch({ type: 'SET_STEP_ERROR', payload: { step: state.currentStep, error: err instanceof Error ? err.message : 'Unknown error' } });
      dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'error' } });
    }
  };

  const handleFormChange = (name: string, value: string | number | boolean) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const isExecuting = status === 'executing';
  const showTryIt = state.mode === 'recorded' && hasModifications && !isTryItMode && state.isLiveAvailable;

  function getGlowColor(): 'blue' | 'green' | 'orange' {
    if (isExecuting) return 'blue';
    if (status === 'complete') return 'green';
    if (status === 'error') return 'orange';
    return 'blue';
  }
  const glowColor = getGlowColor();

  // Check if we have output to show (for two-column layout)
  const hasOutput = (response !== null && response !== undefined && !isTryItMode) || isTryItMode;

  // Check if we have form fields (affects Results placement)
  const hasFormFields = step.form && step.form.length > 0;

  return (
    <GlowingCard isActive={isExecuting || status === 'complete'} color={glowColor} intensity="medium">
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-[rgba(var(--color-primary-rgb),0.12)] dark:border-slate-700/50 overflow-hidden transition-colors duration-300">
        <RestStepHeader
          method={method}
          endpoint={resolvedEndpoint}
          description={step.description}
          status={status}
          pollingState={pollingState}
        />

        {/* Two-column layout on desktop when there's output */}
        <div className={hasOutput ? 'xl:grid xl:grid-cols-2' : ''}>
          {/* Left column: inputs and controls */}
          <div className={hasOutput ? 'xl:pr-4' : ''}>
            {step.form && (
              <RestFormFields
                fields={step.form}
                values={formValues}
                onChange={handleFormChange}
                isFieldModified={isFieldModified}
                disabled={isExecuting}
              />
            )}

            <RequestPreview
              method={method}
              url={fullUrl}
              body={method !== 'GET' && step.form ? getRequestBodyPreview() : undefined}
              headers={step.headers ? substituteInObject(step.headers, state.variables) as Record<string, string> : undefined}
              showCurl={step.show_curl}
            />

            {pollingState && <PollingStatus pollingState={pollingState} />}

            {missingVariables.length > 0 && status === 'pending' && (
              <div className="px-4 pb-2">
                <MissingVariablesBanner missingVariables={missingVariables} />
              </div>
            )}

            <ExecuteButtons
              onExecute={handleExecute}
              onTryIt={handleTryIt}
              status={status}
              isExecuting={isExecuting}
              isTryItExecuting={isTryItExecuting}
              pollingState={pollingState}
              showTryIt={showTryIt}
            />

            {error && (
              <ErrorDisplay
                error={error}
                onRetry={handleExecute}
                onSkip={() => {
                  dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'complete' } });
                  dispatch({ type: 'NEXT_STEP' });
                }}
              />
            )}

            {/* Results in left column when no form fields (desktop only) */}
            {!hasFormFields && response !== null && response !== undefined && !isTryItMode && step.results && step.results.length > 0 && (
              <div className="hidden xl:block">
                <ResultsDisplay response={response} results={step.results} />
              </div>
            )}
          </div>

          {/* Right column: outputs (visible on desktop when there's output) */}
          {hasOutput && (
            <div className="xl:border-l xl:border-gray-200 xl:dark:border-slate-700/50">
              {isTryItMode && (
                <TryItBanner
                  response={tryItResponse}
                  error={tryItError}
                  onReturn={handleReturnToRecorded}
                />
              )}

              {response !== null && response !== undefined && !isTryItMode && (
                <>
                  {/* Results above Response on desktop (only when form fields exist) */}
                  {hasFormFields && step.results && step.results.length > 0 && (
                    <div className="hidden xl:block">
                      <ResultsDisplay response={response} results={step.results} />
                    </div>
                  )}
                  <ResponseDisplay response={response} results={step.results} hideResultsOnDesktop={step.results && step.results.length > 0} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </GlowingCard>
  );
}
