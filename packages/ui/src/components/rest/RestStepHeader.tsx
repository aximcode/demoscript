import { getMethodColor } from '../../lib/rest-helpers';
import { PulsingDot, SuccessCheck, GradientText } from '../effects';
import type { PollingState } from '../../hooks/usePolling';

interface Props {
  method: string;
  endpoint: string;
  description?: string;
  status: 'pending' | 'executing' | 'complete' | 'error';
  pollingState: PollingState | null;
}

export function RestStepHeader({ method, endpoint, description, status, pollingState }: Props) {
  const isExecuting = status === 'executing';

  return (
    <div className="border-b border-[rgba(var(--color-primary-rgb),0.1)] dark:border-slate-700/50 p-4 bg-[rgba(var(--color-primary-rgb),0.03)] dark:bg-slate-900/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-sm font-bold ${getMethodColor(method)}`}>
            {method}
          </span>
          <code className="text-gray-700 dark:text-slate-300 font-mono text-sm">
            {status === 'complete' ? (
              <GradientText variant="success">{endpoint}</GradientText>
            ) : isExecuting ? (
              <GradientText variant="primary">{endpoint}</GradientText>
            ) : (
              endpoint
            )}
          </code>
        </div>
        {status === 'complete' && (
          <span className="inline-flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
            <SuccessCheck size={20} animated={true} />
            Complete
          </span>
        )}
        {isExecuting && (
          <span className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-sm font-medium">
            <PulsingDot color="blue" size="sm" />
            {pollingState ? 'Confirming' : 'Processing'}
          </span>
        )}
      </div>
      {description && (
        <p className="text-gray-500 dark:text-slate-400 text-sm mt-2">{description}</p>
      )}
    </div>
  );
}
