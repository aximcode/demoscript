import { useState, useCallback } from 'react';
import { substituteInObject } from '../lib/variable-substitution';
import { executeRequest } from '../lib/execute-adapter';
import { buildRequestBody } from '../lib/rest-helpers';
import type { RestStep as RestStepType, ExplicitRestStep } from '../types/schema';

interface UseTryItModeProps {
  step: RestStepType | ExplicitRestStep;
  formValues: Record<string, string | number | boolean>;
  variables: Record<string, unknown>;
  method: string;
  fullUrl: string;
}

interface UseTryItModeReturn {
  isTryItMode: boolean;
  tryItResponse: unknown;
  tryItError: string | null;
  isTryItExecuting: boolean;
  handleTryIt: () => Promise<void>;
  handleReturnToRecorded: () => void;
}

export function useTryItMode({
  step,
  formValues,
  variables,
  method,
  fullUrl,
}: UseTryItModeProps): UseTryItModeReturn {
  const [isTryItMode, setIsTryItMode] = useState(false);
  const [tryItResponse, setTryItResponse] = useState<unknown>(null);
  const [tryItError, setTryItError] = useState<string | null>(null);
  const [isTryItExecuting, setIsTryItExecuting] = useState(false);

  const handleTryIt = useCallback(async () => {
    setIsTryItMode(true);
    setIsTryItExecuting(true);
    setTryItError(null);
    setTryItResponse(null);

    try {
      const body = step.form
        ? buildRequestBody(step.form, formValues)
        : substituteInObject(step.body, variables);

      const result = await executeRequest({
        method,
        url: fullUrl,
        headers: substituteInObject(step.headers, variables) as Record<string, string>,
        body: method !== 'GET' ? body : undefined,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setTryItResponse(result.data);
    } catch (err) {
      setTryItError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsTryItExecuting(false);
    }
  }, [step, formValues, variables, method, fullUrl]);

  const handleReturnToRecorded = useCallback(() => {
    setIsTryItMode(false);
    setTryItResponse(null);
    setTryItError(null);
  }, []);

  return {
    isTryItMode,
    tryItResponse,
    tryItError,
    isTryItExecuting,
    handleTryIt,
    handleReturnToRecorded,
  };
}
