import { getErrorType } from '../../lib/rest-helpers';

interface Props {
  error: string;
  onRetry: () => void;
  onSkip?: () => void;
}

export function ErrorDisplay({ error, onRetry, onSkip }: Props) {
  return (
    <div className="border-t border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-red-700 dark:text-red-400">
              {getErrorType(error)}
            </span>
          </div>
          <div className="text-red-600 dark:text-red-400 text-sm max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
            {error}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRetry}
            className="px-3 py-1.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-500/30 flex items-center gap-1.5 border border-red-300 dark:border-red-500/30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-1.5 border border-gray-300 dark:border-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
