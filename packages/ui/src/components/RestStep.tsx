import { useMemo } from 'react';
import { useDemo } from '../context/DemoContext';
import { substituteVariables, substituteInObject, extractValueByPath, findVariablesInObject, findMissingVariables } from '../lib/variable-substitution';
import { extractErrorMessage, buildRequestBody, buildQueryString } from '../lib/rest-helpers';
import { executeRequest } from '../lib/execute-adapter';
import { parseRestMethod } from '../types/schema';
import type { RestStep as RestStepType, ExplicitRestStep } from '../types/schema';
import { GlowingCard } from './effects';

import { useRestFormState } from '../hooks/useRestFormState';
import { useTryItMode } from '../hooks/useTryItMode';
import { usePolling } from '../hooks/usePolling';
import { useOpenApiForm } from '../hooks/useOpenApiForm';

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

export type StepMode = 'view' | 'edit' | 'preview';

interface Props {
  step: RestStepType | ExplicitRestStep;
  mode?: StepMode;
  onChange?: (step: RestStepType | ExplicitRestStep) => void;
  onDelete?: () => void;
}

// Glow color lookup by status
const GLOW_COLORS: Record<string, 'blue' | 'green' | 'orange'> = {
  executing: 'blue',
  complete: 'green',
  error: 'orange',
};

export function RestStep({ step, mode = 'view', onChange: _onChange, onDelete }: Props) {
  const { state, dispatch, getStepStatus, getVariableProvider } = useDemo();

  // Parse method and URL
  const { method, endpoint } = parseRestMethod(step);
  const resolvedEndpoint = substituteVariables(endpoint, state.variables);
  const baseUrl = step.base_url || state.config?.settings?.base_url || '';
  const fullUrl = `${baseUrl}${resolvedEndpoint}`;

  // Get OpenAPI URL from step or settings
  const openapiUrl = step.openapi || state.config?.settings?.openapi;

  // Generate form fields from OpenAPI if needed
  const { formFields: generatedForm, isLoading: isLoadingForm } = useOpenApiForm({
    openapiUrl,
    method,
    path: endpoint,
    defaults: step.defaults,
    manualForm: step.form,
  });

  // Use generated form or manual form
  const effectiveForm = generatedForm || step.form;

  // Use form state hook with effective form
  const {
    formValues,
    setFormValues,
    hasModifications,
    isFieldModified,
  } = useRestFormState({ form: effectiveForm, variables: state.variables });

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

  // Use polling hook
  const defaultInterval = state.config?.settings?.polling?.interval || 2000;
  const defaultMaxAttempts = state.config?.settings?.polling?.max_attempts || 30;
  const { pollingState, pollForResult, abortControllerRef } = usePolling({
    pollConfig: step.poll,
    defaultInterval,
    defaultMaxAttempts,
  });

  const status = getStepStatus(state.currentStep);
  const response = state.stepResponses[state.currentStep];
  const error = state.stepErrors[state.currentStep];

  // Calculate missing variables for this step (memoized)
  const missingVariables = useMemo(() => {
    const usedVariables = [
      ...findVariablesInObject(endpoint),
      ...findVariablesInObject(step.body),
      ...findVariablesInObject(step.headers),
      ...findVariablesInObject(effectiveForm?.map(f => f.default)),
    ];
    const missingVarNames = findMissingVariables(usedVariables, state.variables);
    return missingVarNames.map(name => ({
      name,
      provider: getVariableProvider(name),
    }));
  }, [endpoint, step.body, step.headers, effectiveForm, state.variables, getVariableProvider]);

  // Build request body preview for display
  function getRequestBodyPreview(): string {
    // Use effective form (includes OpenAPI-generated fields)
    if (effectiveForm && effectiveForm.length > 0) {
      const body = buildRequestBody(effectiveForm, formValues);
      return body ? JSON.stringify(body, null, 2) : '';
    }
    if (step.body) {
      const body = substituteInObject(step.body, state.variables);
      return body ? JSON.stringify(body, null, 2) : '';
    }
    return '';
  }

  // Save variables from response (supports _status for HTTP status code)
  function saveVariables(responseData: unknown, httpStatus?: number): void {
    if (!step.save) return;

    const newVars: Record<string, unknown> = {};
    for (const [varName, path] of Object.entries(step.save)) {
      if (path === '_status' && httpStatus !== undefined) {
        newVars[varName] = httpStatus;
      } else if (responseData) {
        newVars[varName] = extractValueByPath(responseData, path);
      }
    }

    if (Object.keys(newVars).length > 0) {
      dispatch({ type: 'SET_VARIABLES', payload: newVars });
    }
  }

  // Handle execution result and update state
  function handleExecutionResult(responseData: unknown, httpStatus: number): void {
    dispatch({ type: 'SET_STEP_RESPONSE', payload: { step: state.currentStep, response: responseData } });
    saveVariables(responseData, httpStatus);

    if (httpStatus >= 400) {
      dispatch({ type: 'SET_STEP_ERROR', payload: { step: state.currentStep, error: extractErrorMessage(responseData, httpStatus) } });
      dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'error' } });
    } else {
      dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'complete' } });
    }
  }

  async function handleExecute(): Promise<void> {
    dispatch({ type: 'SET_STEP_ERROR', payload: { step: state.currentStep, error: null } });
    dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'executing' } });
    abortControllerRef.current = new AbortController();

    try {
      // Build request body from effective form (includes OpenAPI-generated fields) or explicit body
      const body = effectiveForm && effectiveForm.length > 0
        ? buildRequestBody(effectiveForm, formValues)
        : step.body
          ? substituteInObject(step.body, state.variables)
          : undefined;

      // Build query string from query parameters
      const queryString = effectiveForm ? buildQueryString(effectiveForm, formValues) : '';
      const requestUrl = fullUrl + queryString;

      if (state.mode === 'live') {
        const result = await executeRequest({
          method,
          url: requestUrl,
          headers: substituteInObject(step.headers, state.variables) as Record<string, string>,
          body: method !== 'GET' ? body : undefined,
        });

        if (result.error) {
          throw new Error(result.error);
        }

        let finalResponse = result.data;

        // Handle polling for async operations
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

        handleExecutionResult(finalResponse, result.status);
      } else {
        // Recorded mode: use pre-recorded response
        const recording = state.recordings?.recordings.find(
          (r) => r.stepId === `step-${state.currentStep}`
        );

        if (!recording?.response?.body) {
          throw new Error('No recording available for this step');
        }

        await new Promise((r) => setTimeout(r, 500));
        handleExecutionResult(recording.response.body, recording.response.status || 200);
      }
    } catch (err) {
      dispatch({ type: 'SET_STEP_ERROR', payload: { step: state.currentStep, error: err instanceof Error ? err.message : 'Unknown error' } });
      dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'error' } });
    }
  }

  function handleFormChange(name: string, value: string | number | boolean): void {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }

  const isExecuting = status === 'executing';
  const showTryIt = state.mode === 'recorded' && hasModifications && !isTryItMode && state.isLiveAvailable;
  const glowColor = GLOW_COLORS[status] || 'blue';

  // Check if we have output to show (for two-column layout)
  const hasOutput = (response !== null && response !== undefined && !isTryItMode) || isTryItMode;

  // Check if we have form fields (affects Results placement)
  const hasFormFields = effectiveForm && effectiveForm.length > 0;

  return (
    <GlowingCard isActive={isExecuting || status === 'complete'} color={glowColor} intensity="medium">
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-[rgba(var(--color-primary-rgb),0.12)] dark:border-slate-700/50 overflow-hidden transition-colors duration-300">
        <RestStepHeader
          method={method}
          endpoint={resolvedEndpoint}
          title={step.title}
          description={step.description}
          status={status}
          pollingState={pollingState}
          mode={mode}
          onDelete={onDelete}
        />

        {/* Show loading state while fetching OpenAPI spec */}
        {isLoadingForm && (
          <div className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400">
            Loading form fields...
          </div>
        )}

        {/* Two-column layout on desktop when there's output */}
        <div className={hasOutput ? 'xl:grid xl:grid-cols-2' : ''}>
          {/* Left column: inputs and controls */}
          <div className={hasOutput ? 'xl:pr-4' : ''}>
            {effectiveForm && effectiveForm.length > 0 && (
              <RestFormFields
                fields={effectiveForm}
                values={formValues}
                onChange={handleFormChange}
                isFieldModified={isFieldModified}
                disabled={isExecuting}
              />
            )}

            <RequestPreview
              method={method}
              url={fullUrl + (effectiveForm ? buildQueryString(effectiveForm, formValues) : '')}
              body={method !== 'GET' && (effectiveForm || step.body) ? getRequestBodyPreview() : undefined}
              headers={step.headers ? substituteInObject(step.headers, state.variables) as Record<string, string> : undefined}
              showCurl={step.show_curl}
            />

            {pollingState && <PollingStatus pollingState={pollingState} />}

            {missingVariables.length > 0 && status === 'pending' && (
              <div className="px-4 pb-2">
                <MissingVariablesBanner missingVariables={missingVariables} />
              </div>
            )}

            {mode === 'view' && (
              <ExecuteButtons
                onExecute={handleExecute}
                onTryIt={handleTryIt}
                status={status}
                isExecuting={isExecuting}
                isTryItExecuting={isTryItExecuting}
                pollingState={pollingState}
                showTryIt={showTryIt}
              />
            )}

            {mode === 'view' && error && (
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
