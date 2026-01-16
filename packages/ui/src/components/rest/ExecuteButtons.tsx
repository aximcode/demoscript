import { PulsingDot, SuccessCheck, GradientText } from '../effects';
import type { PollingState } from '../../hooks/usePolling';

interface Props {
  onExecute: () => void;
  onTryIt: () => void;
  status: 'pending' | 'executing' | 'complete' | 'error';
  isExecuting: boolean;
  isTryItExecuting: boolean;
  pollingState: PollingState | null;
  showTryIt: boolean;
}

export function ExecuteButtons({
  onExecute,
  onTryIt,
  status,
  isExecuting,
  isTryItExecuting,
  pollingState,
  showTryIt,
}: Props) {
  return (
    <div className="p-4 flex items-center gap-4 bg-gray-50/50 dark:bg-slate-900/30 flex-wrap">
      <button
        onClick={onExecute}
        disabled={isExecuting || isTryItExecuting}
        className="px-6 py-2.5 bg-gradient-to-r from-theme-primary to-theme-accent text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-[rgba(var(--color-primary-rgb),0.25)] transition-all duration-300 hover:shadow-xl hover:shadow-[rgba(var(--color-primary-rgb),0.4)] border border-[rgba(var(--color-primary-rgb),0.3)]"
      >
        {isExecuting ? (
          <>
            <PulsingDot color="purple" size="sm" />
            {pollingState ? 'Confirming...' : 'Executing...'}
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Execute
          </>
        )}
      </button>

      {showTryIt && (
        <button
          onClick={onTryIt}
          disabled={isTryItExecuting}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/40 border border-amber-500/30"
        >
          {isTryItExecuting ? (
            <>
              <PulsingDot color="purple" size="sm" />
              Trying...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Try with your values
            </>
          )}
        </button>
      )}

      {status === 'complete' && (
        <span className="font-medium flex items-center gap-2">
          <SuccessCheck size={24} animated={true} />
          <GradientText variant="success">Success!</GradientText>
        </span>
      )}

      {status === 'error' && (
        <span className="text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
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
  );
}
