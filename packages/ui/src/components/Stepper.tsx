import { useRef, useState, useEffect } from 'react';
import { useDemo, StepperItem } from '../context/DemoContext';
import { getStepTitle, getStepType, Step } from '../types/schema';
import { SuccessCheck } from './effects';

export function Stepper() {
  const { state, dispatch, getStepStatus, expandedGroups, toggleGroup, stepperStructure } = useDemo();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [state.config]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 300);
    }
  };

  if (!state.config) return null;

  return (
    <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-[rgba(var(--color-primary-rgb),0.2)] p-4 shadow-md dark:shadow-xl transition-colors duration-300">
      <div className="relative flex items-center">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 z-10 w-8 h-8 flex items-center justify-center bg-white/90 dark:bg-slate-700/90 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
            aria-label="Scroll left"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {stepperStructure.map((item, idx) => (
            <StepperItemComponent
              key={idx}
              item={item}
              currentStep={state.currentStep}
              getStepStatus={getStepStatus}
              dispatch={dispatch}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
            />
          ))}
        </div>
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 z-10 w-8 h-8 flex items-center justify-center bg-white/90 dark:bg-slate-700/90 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
            aria-label="Scroll right"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      {/* Progress line underneath */}
      <div className="mt-3 h-1 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-theme-primary via-theme-accent to-theme-primary transition-all duration-500"
          style={{ width: `${((state.currentStep + 1) / state.flatSteps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

interface GroupProgress {
  completed: number;
  total: number;
  hasError: boolean;
}

function getGroupProgress(
  stepsInGroup: { step: Step; flatIndex: number }[],
  getStepStatus: (step: number) => 'pending' | 'executing' | 'complete' | 'error'
): GroupProgress {
  let completed = 0;
  let hasError = false;

  for (const { flatIndex } of stepsInGroup) {
    const status = getStepStatus(flatIndex);
    if (status === 'complete') completed++;
    if (status === 'error') hasError = true;
  }

  return { completed, total: stepsInGroup.length, hasError };
}

interface StepperItemProps {
  item: StepperItem;
  currentStep: number;
  getStepStatus: (step: number) => 'pending' | 'executing' | 'complete' | 'error';
  dispatch: React.Dispatch<{ type: 'SET_STEP'; payload: number }>;
  expandedGroups: Record<number, boolean>;
  toggleGroup: (groupIndex: number) => void;
}

function StepperItemComponent({
  item,
  currentStep,
  getStepStatus,
  dispatch,
  expandedGroups,
  toggleGroup,
}: StepperItemProps) {
  if (item.type === 'group' && item.group && item.stepsInGroup && item.groupIndex !== undefined) {
    const isExpanded = expandedGroups[item.groupIndex] ?? true;
    const groupHasCurrentStep = item.stepsInGroup.some((s) => s.flatIndex === currentStep);
    const progress = getGroupProgress(item.stepsInGroup, getStepStatus);
    const isComplete = progress.completed === progress.total;
    const progressPercent = (progress.completed / progress.total) * 100;

    return (
      <div className="flex items-center gap-1">
        {/* Group header with progress */}
        <div className="relative">
          <button
            onClick={() => toggleGroup(item.groupIndex!)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all duration-300 ${
              groupHasCurrentStep
                ? 'bg-gradient-to-r from-[rgba(var(--color-primary-rgb),0.1)] to-[rgba(var(--color-accent-rgb),0.1)] dark:from-[rgba(var(--color-primary-rgb),0.2)] dark:to-[rgba(var(--color-accent-rgb),0.2)] text-theme-primary border-2 border-[rgba(var(--color-primary-rgb),0.5)] dark:border-[rgba(var(--color-primary-rgb),0.4)] shadow-md'
                : isComplete
                ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30'
                : progress.hasError
                ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30'
                : 'bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 border border-gray-200 dark:border-slate-600/30'
            }`}
          >
            {/* Chevron */}
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            {/* Folder icon */}
            <svg className="w-3.5 h-3.5 opacity-60" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>

            {/* Group name */}
            <span className="text-xs font-medium">{item.group.group}</span>

            {/* Progress badge */}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                isComplete
                  ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                  : progress.hasError
                  ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                  : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-slate-300'
              }`}
            >
              {progress.completed}/{progress.total}
            </span>

            {/* Complete checkmark */}
            {isComplete && <SuccessCheck size={12} animated={false} />}
          </button>

          {/* Progress bar underneath */}
          {!isComplete && progress.completed > 0 && (
            <div className="absolute -bottom-0.5 left-2 right-2 h-0.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-theme-primary to-theme-accent transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Nested steps (when expanded) */}
        {isExpanded && (
          <div className="flex items-center gap-1 pl-2 border-l-2 border-[rgba(var(--color-primary-rgb),0.3)] dark:border-[rgba(var(--color-primary-rgb),0.3)] ml-1">
            {item.stepsInGroup.map(({ step, flatIndex }) => (
              <StepButton
                key={flatIndex}
                step={step}
                flatIndex={flatIndex}
                currentStep={currentStep}
                getStepStatus={getStepStatus}
                dispatch={dispatch}
                compact
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Regular step
  if (item.step && item.flatIndex !== undefined) {
    return (
      <StepButton
        step={item.step}
        flatIndex={item.flatIndex}
        currentStep={currentStep}
        getStepStatus={getStepStatus}
        dispatch={dispatch}
      />
    );
  }

  return null;
}

interface StepButtonProps {
  step: Step;
  flatIndex: number;
  currentStep: number;
  getStepStatus: (step: number) => 'pending' | 'executing' | 'complete' | 'error';
  dispatch: React.Dispatch<{ type: 'SET_STEP'; payload: number }>;
  compact?: boolean;
}

function StepButton({ step, flatIndex, currentStep, getStepStatus, dispatch, compact }: StepButtonProps) {
  const status = getStepStatus(flatIndex);
  const isCurrent = flatIndex === currentStep;
  const title = getStepTitle(step, flatIndex);
  const type = getStepType(step);

  return (
    <button
      onClick={() => dispatch({ type: 'SET_STEP', payload: flatIndex })}
      aria-label={`Step ${flatIndex + 1}: ${title}`}
      aria-current={isCurrent ? 'step' : undefined}
      className={`flex items-center gap-1 sm:gap-2 ${compact ? 'px-2 py-1' : 'px-2 sm:px-3 py-1.5 sm:py-2'} rounded-lg whitespace-nowrap transition-all duration-300 ${
        isCurrent
          ? 'bg-gradient-to-r from-theme-primary to-theme-accent text-white shadow-lg shadow-[rgba(var(--color-primary-rgb),0.3)] scale-105'
          : status === 'complete'
          ? 'bg-green-50 dark:bg-slate-700/50 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-slate-700'
          : status === 'error'
          ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
          : 'bg-gray-100 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700/50'
      }`}
    >
      <span
        className={`${compact ? 'w-4 h-4 text-[10px]' : 'w-5 h-5 sm:w-6 sm:h-6 text-xs'} rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
          isCurrent
            ? 'bg-white/20 text-white ring-2 ring-white/30'
            : status === 'complete'
            ? 'bg-green-100 dark:bg-green-500/20'
            : status === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400'
        }`}
      >
        {status === 'complete' ? (
          <SuccessCheck size={compact ? 12 : 16} animated={false} />
        ) : status === 'error' ? (
          <svg className={compact ? 'w-2 h-2' : 'w-3 h-3 sm:w-4 sm:h-4'} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          flatIndex + 1
        )}
      </span>
      {!compact && <span className="text-xs sm:text-sm font-medium hidden sm:inline">{title}</span>}
      <TypeBadge type={type} compact={compact} />
    </button>
  );
}

function TypeBadge({ type, compact }: { type: 'slide' | 'rest' | 'shell' | 'browser' | 'code' | 'wait' | 'assert' | 'graphql' | 'db' | 'group'; compact?: boolean }) {
  const styles: Record<string, string> = {
    slide: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30',
    rest: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30',
    shell: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30',
    browser: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/30',
    code: 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-500/30',
    wait: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-500/30',
    assert: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30',
    graphql: 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30',
    db: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30',
    group: 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-500/30',
  };

  const labels: Record<string, string> = {
    slide: 'Slide',
    rest: 'REST',
    shell: 'Shell',
    browser: 'Web',
    code: 'Code',
    wait: 'Wait',
    assert: 'Assert',
    graphql: 'GraphQL',
    db: 'DB',
    group: 'Group',
  };

  return (
    <span className={`${compact ? 'px-1 py-0.5 text-[10px]' : 'px-1.5 py-0.5 text-xs'} rounded font-medium ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}
