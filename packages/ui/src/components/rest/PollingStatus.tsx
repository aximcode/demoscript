import { PulsingDot, GradientText, PollingProgress, RequestFlow } from '../effects';
import type { PollingState } from '../../hooks/usePolling';

interface Props {
  pollingState: PollingState;
}

export function PollingStatus({ pollingState }: Props) {
  return (
    <div className="border-b border-gray-200 dark:border-slate-700/50 p-4 bg-gradient-to-br from-gray-100 via-[rgba(var(--color-primary-rgb),0.1)] to-gray-100 dark:from-slate-900 dark:via-[rgba(var(--color-primary-rgb),0.1)] dark:to-slate-900">
      {/* Request Flow Visualization */}
      <RequestFlow status="confirming" />

      {/* Progress Steps */}
      <div className="mt-4">
        <PollingProgress stage="confirming" />
      </div>

      {/* Status Text */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-[rgba(var(--color-accent-rgb),0.2)] flex items-center justify-center border border-[rgba(var(--color-accent-rgb),0.3)]">
            <PulsingDot color="blue" size="lg" />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-[rgba(var(--color-accent-rgb),0.3)] animate-ping opacity-20" />
        </div>
        <div>
          <p className="text-theme-accent font-medium">
            <GradientText variant="primary">Waiting for confirmation...</GradientText>
          </p>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            Attempt {pollingState.attempt} of {pollingState.maxAttempts}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 bg-gray-300 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-theme-primary via-theme-accent to-theme-primary h-full transition-all duration-300"
          style={{ width: `${(pollingState.attempt / pollingState.maxAttempts) * 100}%` }}
        />
      </div>
    </div>
  );
}
