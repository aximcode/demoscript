import { useDemo } from '../context/DemoContext';

export function Controls() {
  const { state, dispatch, isFirstStep, isLastStep, totalSteps } = useDemo();

  return (
    <nav
      className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-[rgba(var(--color-primary-rgb),0.2)] p-3 sm:p-4 shadow-md dark:shadow-xl transition-colors duration-300"
      aria-label="Demo navigation"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => dispatch({ type: 'PREV_STEP' })}
            disabled={isFirstStep}
            aria-label="Previous step"
            className="px-2 sm:px-4 py-2 bg-gray-100 dark:bg-slate-700/50 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 transition-all duration-300 border border-gray-200 dark:border-slate-600/50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Previous</span>
          </button>
          <button
            onClick={() => dispatch({ type: 'NEXT_STEP' })}
            disabled={isLastStep}
            aria-label="Next step"
            className="px-2 sm:px-4 py-2 bg-gradient-to-r from-theme-primary to-theme-accent text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 shadow-lg shadow-[rgba(var(--color-primary-rgb),0.25)] transition-all duration-300"
          >
            <span className="hidden sm:inline">Next</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
            <span className="sm:hidden">{state.currentStep + 1}/{totalSteps}</span>
            <span className="hidden sm:inline">Step {state.currentStep + 1} of {totalSteps}</span>
          </span>
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            aria-label="Reset demo"
            className="px-2 sm:px-3 py-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500 dark:text-slate-500 hidden sm:flex gap-4">
        <span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600">←</kbd>{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600">→</kbd> Navigate
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600">Space</kbd> Next
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600">R</kbd> Reset
        </span>
      </div>
    </nav>
  );
}
