import { getMethodColor } from '../../lib/rest-helpers';
import { PulsingDot, SuccessCheck, GradientText } from '../effects';
import type { PollingState } from '../../hooks/usePolling';

interface Props {
  method: string;
  endpoint: string;
  title?: string;
  description?: string;
  status: 'pending' | 'executing' | 'complete' | 'error';
  pollingState: PollingState | null;
  mode?: 'view' | 'edit' | 'preview';
  onDelete?: () => void;
}

export function RestStepHeader({ method, endpoint, title, description, status, pollingState, mode = 'view', onDelete }: Props) {
  const isExecuting = status === 'executing';
  const isEditMode = mode === 'edit';

  return (
    <div className="border-b border-[rgba(var(--color-primary-rgb),0.1)] dark:border-slate-700/50 p-4 bg-[rgba(var(--color-primary-rgb),0.03)] dark:bg-slate-900/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-sm font-bold ${getMethodColor(method)}`}>
            {method}
          </span>
          <div className="min-w-0">
            {title && (
              <div className="font-medium text-gray-900 dark:text-slate-100 truncate">{title}</div>
            )}
            <code className={`text-gray-700 dark:text-slate-300 font-mono ${title ? 'text-xs' : 'text-sm'}`}>
              {status === 'complete' ? (
                <GradientText variant="success">{endpoint}</GradientText>
              ) : isExecuting ? (
                <GradientText variant="primary">{endpoint}</GradientText>
              ) : (
                endpoint
              )}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
      </div>
      {description && (
        <p className="text-gray-500 dark:text-slate-400 text-sm mt-2">{description}</p>
      )}
    </div>
  );
}
