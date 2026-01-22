import { useState, useEffect } from 'react';
import { useDemo } from '../context/DemoContext';
import { substituteVariables } from '../lib/variable-substitution';
import { isStepTypeSupported, getUnsupportedMessage } from '../lib/execute-adapter';
import { ErrorDisplay } from './rest/ErrorDisplay';
import type { ShellStep as ShellStepType, ExplicitShellStep } from '../types/schema';

export type StepMode = 'view' | 'edit' | 'preview';

interface Props {
  step: ShellStepType | ExplicitShellStep;
  mode?: StepMode;
  onChange?: (step: ShellStepType | ExplicitShellStep) => void;
  onDelete?: () => void;
}

interface ShellResponse {
  stdout: string;
  stderr: string;
  status: number;
  output: string; // Legacy alias for stdout
}

export function ShellStep({ step, mode = 'view', onChange: _onChange, onDelete }: Props) {
  const { state, dispatch, getStepStatus } = useDemo();
  const [displayedCommand, setDisplayedCommand] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const isEditMode = mode === 'edit';

  const status = getStepStatus(state.currentStep);
  const response = state.stepResponses[state.currentStep] as ShellResponse | undefined;
  const error = state.stepErrors[state.currentStep];

  // Get command from either concise or explicit syntax
  const rawCommand = 'shell' in step ? step.shell : step.command;
  const command = substituteVariables(rawCommand, state.variables);

  // Save variables from shell response
  // Supported keywords: stdout, stderr, status, output (legacy alias for stdout)
  const saveVariables = (result: ShellResponse) => {
    if (!step.save) return;

    const newVariables: Record<string, unknown> = {};
    for (const [varName, source] of Object.entries(step.save)) {
      if (source === 'stdout' || source === 'output') {
        newVariables[varName] = result.stdout;
      } else if (source === 'stderr') {
        newVariables[varName] = result.stderr;
      } else if (source === 'status') {
        newVariables[varName] = result.status;
      } else {
        // Treat as regex pattern against stdout for backward compatibility
        const regex = new RegExp(source);
        const match = result.stdout.match(regex);
        if (match) {
          newVariables[varName] = match[1] || match[0];
        }
      }
    }

    if (Object.keys(newVariables).length > 0) {
      dispatch({ type: 'SET_VARIABLES', payload: newVariables });
    }
  };

  // Typing animation effect
  useEffect(() => {
    if (status === 'executing' && !isTyping) {
      setIsTyping(true);
      setDisplayedCommand('');

      let index = 0;
      const interval = setInterval(() => {
        if (index < command.length) {
          setDisplayedCommand(command.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 30);

      return () => clearInterval(interval);
    }
  }, [status, command, isTyping]);

  const handleExecute = async () => {
    dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'executing' } });

    try {
      if (state.mode === 'live') {
        const proxyResponse = await fetch('/api/execute-shell', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({
            command,
            shell_type: step.shell_type,
            workdir: step.workdir,
            env: step.env,
          }),
        });

        const result = await proxyResponse.json() as ShellResponse;

        if (!proxyResponse.ok) {
          throw new Error(result.stderr || 'Command failed');
        }

        dispatch({
          type: 'SET_STEP_RESPONSE',
          payload: { step: state.currentStep, response: result },
        });
        saveVariables(result);
        dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'complete' } });
      } else {
        // Recorded mode
        const recording = state.recordings?.recordings.find(
          (r) => r.stepId === `step-${state.currentStep}`
        );

        // Simulate typing delay
        await new Promise((r) => setTimeout(r, command.length * 30 + 500));

        if (recording?.output || recording?.stdout) {
          // Build response from recording (supports both old and new format)
          const result: ShellResponse = {
            stdout: recording.stdout ?? recording.output ?? '',
            stderr: recording.stderr ?? '',
            status: recording.status ?? 0,
            output: recording.stdout ?? recording.output ?? '',
          };

          dispatch({
            type: 'SET_STEP_RESPONSE',
            payload: { step: state.currentStep, response: result },
          });
          saveVariables(result);
          dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'complete' } });
        } else {
          throw new Error('No recording available for this step');
        }
      }
    } catch (err) {
      dispatch({
        type: 'SET_STEP_ERROR',
        payload: { step: state.currentStep, error: err instanceof Error ? err.message : 'Unknown error' },
      });
      dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'error' } });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border border-gray-200 dark:border-[rgba(var(--color-primary-rgb),0.2)]">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 rounded text-sm font-bold bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300">
              {step.shell_type?.toUpperCase() || 'SHELL'}
            </span>
            {step.workdir && (
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                in <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">{step.workdir}</code>
              </span>
            )}
          </div>
          {isEditMode && onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
              title="Delete step"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
        {step.description && <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">{step.description}</p>}
      </div>

      {/* Unsupported step warning */}
      {!isStepTypeSupported('shell') && state.mode === 'live' && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/30">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {getUnsupportedMessage('shell')}
            </p>
          </div>
        </div>
      )}

      {/* Terminal */}
      <div className="bg-gray-900 p-4 font-mono text-sm">
        <div className="flex items-center gap-2 text-gray-400 mb-2">
          <span className="text-green-400">$</span>
          <span className="text-gray-100">
            {status === 'executing' ? displayedCommand : command}
            {status === 'executing' && isTyping && (
              <span className="animate-pulse bg-gray-100 w-2 h-4 inline-block ml-0.5" />
            )}
          </span>
        </div>

        {response?.stdout && (
          <pre className="text-gray-300 whitespace-pre-wrap mt-2 border-t border-gray-700 pt-2">
            {response.stdout}
          </pre>
        )}
        {response?.stderr && (
          <pre className="text-yellow-400 whitespace-pre-wrap mt-2 border-t border-gray-700 pt-2 text-sm">
            {response.stderr}
          </pre>
        )}
      </div>

      {/* Execute Button */}
      {mode === 'view' && (
        <div className="p-4 flex items-center gap-4 bg-white dark:bg-slate-800/30">
          {step.confirm && status === 'pending' && (
            <span className="text-amber-600 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Requires confirmation
            </span>
          )}
          <button
            onClick={handleExecute}
            disabled={status === 'executing' || (!isStepTypeSupported('shell') && state.mode === 'live')}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
          {status === 'executing' ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Running...
            </>
          ) : (
            'Run Command'
          )}
        </button>
        {status === 'complete' && (
          <span className="text-green-600 font-medium flex items-center gap-1">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Complete
          </span>
        )}
        {status === 'error' && (
          <span className="text-red-600 font-medium flex items-center gap-1">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            Failed
          </span>
        )}
        </div>
      )}

      {/* Error */}
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
    </div>
  );
}
