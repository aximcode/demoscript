import { useState, useEffect } from 'react';
import { useDemo } from '../context/DemoContext';
import { substituteVariables } from '../lib/variable-substitution';
import { evaluateCondition, formatValue } from '../lib/condition-evaluator';
import type { AssertStep as AssertStepType, ExplicitAssertStep } from '../types/schema';
import { getAssertCondition } from '../types/schema';
import { GlowingCard, SuccessCheck } from './effects';

interface Props {
  step: AssertStepType | ExplicitAssertStep;
}

export function AssertStep({ step }: Props) {
  const { state, dispatch, getStepStatus } = useDemo();
  const [result, setResult] = useState<{
    passed: boolean;
    leftValue: unknown;
    rightValue: unknown;
    operator: string;
    error?: string;
  } | null>(null);

  const status = getStepStatus(state.currentStep);
  const description = step.description
    ? substituteVariables(step.description, state.variables)
    : undefined;

  // Reset result when step changes
  useEffect(() => {
    setResult(null);
  }, [state.currentStep]);

  const handleVerify = () => {
    dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'executing' } });

    // Small delay for visual feedback
    setTimeout(() => {
      const evalResult = evaluateCondition(getAssertCondition(step), state.variables);
      setResult(evalResult);

      if (evalResult.passed) {
        dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'complete' } });
      } else {
        dispatch({ type: 'SET_STEP_ERROR', payload: { step: state.currentStep, error: step.message || 'Assertion failed' } });
        dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'error' } });
      }
    }, 300);
  };

  const glowColor = result === null ? 'cyan' : result.passed ? 'green' : 'red';

  return (
    <GlowingCard isActive={result !== null} color={glowColor as 'cyan' | 'green' | 'red'} intensity="medium">
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md dark:shadow-xl border border-gray-200 dark:border-[rgba(var(--color-primary-rgb),0.2)] p-8 transition-colors duration-300">
        <div className="text-center">
          {/* Icon */}
          <div className="mb-6">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full transition-colors duration-300 ${
              result === null
                ? 'bg-cyan-100 dark:bg-cyan-500/20'
                : result.passed
                ? 'bg-green-100 dark:bg-green-500/20'
                : 'bg-red-100 dark:bg-red-500/20'
            }`}>
              {result === null ? (
                <svg className="w-10 h-10 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : result.passed ? (
                <SuccessCheck size={40} animated={true} />
              ) : (
                <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {step.title || 'Assertion'}
          </h3>

          {/* Description */}
          {description && (
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {description}
            </p>
          )}

          {/* Condition display */}
          <div className="bg-gray-100 dark:bg-slate-900/50 rounded-lg p-4 mb-6 font-mono text-sm">
            <code className="text-gray-800 dark:text-slate-200">
              {getAssertCondition(step)}
            </code>
          </div>

          {/* Result details */}
          {result && (
            <div className={`rounded-lg p-4 mb-6 ${
              result.passed
                ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30'
                : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30'
            }`}>
              {result.error ? (
                <p className="text-red-600 dark:text-red-400">{result.error}</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Left value:</span>
                    <span className={`font-mono ${result.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatValue(result.leftValue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Operator:</span>
                    <span className="font-mono text-gray-800 dark:text-slate-200">{result.operator}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Right value:</span>
                    <span className={`font-mono ${result.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatValue(result.rightValue)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom failure message */}
          {result && !result.passed && step.message && (
            <p className="text-red-600 dark:text-red-400 font-medium mb-6">
              {step.message}
            </p>
          )}

          {/* Verify button */}
          {status !== 'complete' && status !== 'error' && (
            <button
              onClick={handleVerify}
              disabled={status === 'executing'}
              className="px-6 py-3 bg-gradient-to-r from-theme-primary to-theme-accent text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[rgba(var(--color-primary-rgb),0.25)] transition-all duration-300"
            >
              {status === 'executing' ? 'Verifying...' : 'Verify'}
            </button>
          )}

          {/* Retry button on error */}
          {status === 'error' && (
            <button
              onClick={handleVerify}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-500/25 transition-all duration-300"
            >
              Retry
            </button>
          )}

          {/* Success message */}
          {status === 'complete' && (
            <p className="text-green-600 dark:text-green-400 font-medium">
              Assertion passed!
            </p>
          )}
        </div>
      </div>
    </GlowingCard>
  );
}
