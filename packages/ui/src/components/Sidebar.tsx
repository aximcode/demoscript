import { useDemo } from '../context/DemoContext';
import { isStepGroup, getStepTitle, getStepType } from '../types/schema';
import type { StepOrGroup, StepType } from '../types/schema';

interface Props {
  steps: StepOrGroup[];
  onStepClick: (index: number) => void;
}

const stepTypeIcons: Record<StepType, string> = {
  slide: '📄',
  rest: '🌐',
  shell: '💻',
  browser: '🔗',
  code: '📝',
  wait: '⏱️',
  assert: '✓',
  graphql: '◈',
  db: '🗄️',
  group: '📁',
};

function getStepIcon(step: StepOrGroup): string {
  const type = getStepType(step);
  return stepTypeIcons[type] || '•';
}

export function Sidebar({ steps, onStepClick }: Props) {
  const { state, dispatch, totalSteps } = useDemo();
  const sidebarSettings = state.config?.settings?.sidebar;
  const isCollapsed = state.sidebarCollapsed;

  if (!sidebarSettings?.enabled) {
    return null;
  }

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  // Flatten steps for display, tracking group membership
  interface DisplayStep {
    index: number;
    step: StepOrGroup;
    isGroup: boolean;
    groupName?: string;
    flatIndex: number;
  }

  const displaySteps: DisplayStep[] = [];
  let flatIndex = 0;

  steps.forEach((item, index) => {
    if (isStepGroup(item)) {
      // Add the group header
      displaySteps.push({
        index,
        step: item,
        isGroup: true,
        groupName: item.group,
        flatIndex: flatIndex,
      });
      // Add each step in the group
      item.steps.forEach((groupStep) => {
        displaySteps.push({
          index: flatIndex,
          step: groupStep,
          isGroup: false,
          groupName: item.group,
          flatIndex: flatIndex,
        });
        flatIndex++;
      });
    } else {
      displaySteps.push({
        index: flatIndex,
        step: item,
        isGroup: false,
        flatIndex: flatIndex,
      });
      flatIndex++;
    }
  });

  return (
    <aside
      className={`fixed left-0 top-0 h-full sidebar-themed bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 transition-all duration-300 z-40 flex flex-col ${
        isCollapsed ? 'w-14' : 'w-72'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-slate-700">
        {!isCollapsed && (
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
            Steps
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-4 h-4 text-gray-500 dark:text-slate-400 transition-transform ${
              isCollapsed ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Step list */}
      <div className="flex-1 overflow-y-auto p-2">
        {displaySteps.map((displayStep, idx) => {
          if (displayStep.isGroup) {
            // Group header
            return (
              <div
                key={`group-${idx}`}
                className={`mt-3 mb-1 ${isCollapsed ? 'px-1' : 'px-2'}`}
              >
                {!isCollapsed && (
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">
                    {displayStep.groupName}
                  </span>
                )}
                {isCollapsed && (
                  <span className="text-xs text-gray-400 dark:text-slate-600">
                    ─
                  </span>
                )}
              </div>
            );
          }

          const stepIndex = displayStep.flatIndex;
          const isCurrent = stepIndex === state.currentStep;
          const stepStatus = state.stepStatuses[stepIndex];
          const isComplete = stepStatus === 'complete';
          const isError = stepStatus === 'error';
          const title = getStepTitle(displayStep.step, stepIndex);
          const icon = getStepIcon(displayStep.step);

          return (
            <button
              key={`step-${stepIndex}-${idx}`}
              onClick={() => onStepClick(stepIndex)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${
                isCurrent
                  ? 'bg-[rgba(var(--color-primary-rgb),0.15)] dark:bg-[rgba(var(--color-primary-rgb),0.2)] text-theme-primary'
                  : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'
              } ${displayStep.groupName ? 'ml-2' : ''}`}
              title={isCollapsed ? title : undefined}
            >
              {/* Status indicator */}
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {isComplete ? (
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : isError ? (
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span className="text-sm">{icon}</span>
                )}
              </span>

              {/* Step title */}
              {!isCollapsed && (
                <span className="flex-1 text-sm truncate">{title}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer with step count */}
      <div className="p-3 border-t border-gray-200 dark:border-slate-700">
        {!isCollapsed && (
          <div className="text-xs text-gray-500 dark:text-slate-500">
            Step {state.currentStep + 1} of {totalSteps}
          </div>
        )}
        {isCollapsed && (
          <div className="text-xs text-center text-gray-500 dark:text-slate-500">
            {state.currentStep + 1}/{totalSteps}
          </div>
        )}
      </div>
    </aside>
  );
}
