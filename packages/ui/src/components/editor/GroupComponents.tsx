/**
 * GroupComponents - Shared components for group step editing and preview
 * Used by both StepEditor (Edit mode) and DemoEditor (Preview mode)
 */

import { useState, useMemo } from 'react';
import {
  getStepType,
  getStepTitle,
  parseRestMethod,
  getSlideContent,
  getShellCommand,
  getGraphQLQuery,
  getTerminalContent,
  getPollEndpoint,
  getFormTitle,
  isRestStep,
  isSlideStep,
  isShellStep,
  isGraphQLStep,
  isTerminalStep,
  isPollStep,
  isFormStep,
  type Step,
  type StepType,
  type StepOrGroup,
} from '../../types/schema';

// Shared step type badge colors - used by SortableStepList and GroupComponents
export const STEP_TYPE_COLORS: Record<StepType, string> = {
  rest: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
  slide: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300',
  shell: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300',
  browser: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300',
  code: 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300',
  wait: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300',
  assert: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300',
  graphql: 'bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-300',
  db: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300',
  form: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300',
  terminal: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  poll: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  group: 'bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300',
};

// Child item actions interface
interface ChildItemActions {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

interface GroupChildItemProps {
  step: StepOrGroup;
  index: number;
  actions?: ChildItemActions;
  isExpanded?: boolean;
  onToggle?: () => void;
  showPreview?: boolean;
}

/**
 * GroupChildItem - Displays a child step with optional actions
 * Used in Edit mode (with actions) and Preview mode (with expand/collapse)
 */
export function GroupChildItem({
  step,
  index,
  actions,
  isExpanded,
  onToggle,
  showPreview = false,
}: GroupChildItemProps) {
  const type = getStepType(step);
  const title = getStepTitle(step, index);

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg mb-2 overflow-hidden">
      <div
        className={`flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-800/50 ${
          onToggle ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800' : ''
        }`}
        onClick={onToggle}
      >
        {/* Expand/collapse chevron (Preview mode) */}
        {onToggle && (
          <svg
            className={`w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform flex-shrink-0 ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}

        {/* Step number */}
        <span className="w-5 h-5 text-[10px] font-medium rounded-full bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>

        {/* Type badge */}
        <span
          className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${STEP_TYPE_COLORS[type]}`}
        >
          {type.toUpperCase()}
        </span>

        {/* Title */}
        <span className="flex-1 truncate text-sm text-gray-700 dark:text-slate-300">
          {title}
        </span>

        {/* Action buttons (Edit mode) */}
        {actions && (
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={actions.onMoveUp}
              disabled={actions.isFirst}
              className="p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 disabled:opacity-30 transition-colors"
              title="Move up"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={actions.onMoveDown}
              disabled={actions.isLast}
              className="p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 disabled:opacity-30 transition-colors"
              title="Move down"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={actions.onDelete}
              className="p-1 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
              title="Remove from group"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Expanded preview (Preview mode) */}
      {showPreview && isExpanded && (
        <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/50">
          <MiniStepPreview step={step as Step} />
        </div>
      )}
    </div>
  );
}

interface MiniStepPreviewProps {
  step: Step;
}

/**
 * MiniStepPreview - Compact preview of step content
 * Shows just enough info to understand what the step does
 */
export function MiniStepPreview({ step }: MiniStepPreviewProps) {
  if (isRestStep(step)) {
    const { method, endpoint } = parseRestMethod(step);
    return (
      <pre className="text-xs bg-gray-100 dark:bg-slate-800 p-2 rounded font-mono text-gray-700 dark:text-slate-300 overflow-x-auto">
        {method} {endpoint}
      </pre>
    );
  }

  if (isSlideStep(step)) {
    const content = getSlideContent(step);
    const preview = content.length > 150 ? content.substring(0, 150) + '...' : content;
    return (
      <p className="text-xs text-gray-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-3">
        {preview}
      </p>
    );
  }

  if (isShellStep(step)) {
    const command = getShellCommand(step);
    return (
      <pre className="text-xs bg-gray-100 dark:bg-slate-800 p-2 rounded font-mono text-gray-700 dark:text-slate-300 overflow-x-auto">
        $ {command}
      </pre>
    );
  }

  if (isGraphQLStep(step)) {
    const query = getGraphQLQuery(step);
    const preview = query.length > 100 ? query.substring(0, 100) + '...' : query;
    return (
      <pre className="text-xs bg-gray-100 dark:bg-slate-800 p-2 rounded font-mono text-pink-600 dark:text-pink-400 overflow-x-auto">
        {preview}
      </pre>
    );
  }

  if (isTerminalStep(step)) {
    const content = getTerminalContent(step);
    const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
    return (
      <pre className="text-xs bg-slate-900 p-2 rounded font-mono text-green-400 overflow-x-auto">
        {preview}
      </pre>
    );
  }

  if (isPollStep(step)) {
    const endpoint = getPollEndpoint(step);
    return (
      <pre className="text-xs bg-gray-100 dark:bg-slate-800 p-2 rounded font-mono text-amber-600 dark:text-amber-400">
        Poll: {endpoint}
      </pre>
    );
  }

  if (isFormStep(step)) {
    const title = getFormTitle(step);
    const fieldCount = step.fields?.length || 0;
    return (
      <p className="text-xs text-gray-600 dark:text-slate-400">
        Form: {title} ({fieldCount} field{fieldCount !== 1 ? 's' : ''})
      </p>
    );
  }

  return (
    <p className="text-xs text-gray-400 dark:text-slate-500 italic">
      No preview available
    </p>
  );
}

interface TypeCountBadgesProps {
  steps: StepOrGroup[];
}

/**
 * TypeCountBadges - Shows count of steps by type
 * Used in group preview to summarize contents
 */
export function TypeCountBadges({ steps }: TypeCountBadgesProps) {
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    steps.forEach((step) => {
      const type = getStepType(step);
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [steps]);

  if (Object.keys(typeCounts).length === 0) {
    return (
      <span className="text-xs text-gray-400 dark:text-slate-500 italic">
        No steps
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(typeCounts).map(([type, count]) => (
        <span
          key={type}
          className={`px-2 py-0.5 text-xs font-medium rounded ${STEP_TYPE_COLORS[type as StepType]}`}
        >
          {count} {type.toUpperCase()}
        </span>
      ))}
    </div>
  );
}

interface GroupPreviewPanelProps {
  groupName: string;
  description?: string;
  steps: Step[];
}

/**
 * GroupPreviewPanel - Full preview panel for a group step
 * Shows chapter header, type summary, and expandable child list
 */
export function GroupPreviewPanel({ groupName, description, steps }: GroupPreviewPanelProps) {
  const [expandedChildren, setExpandedChildren] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    setExpandedChildren((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chapter Header */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Group
          </span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
          {groupName}
        </h2>
        {description && (
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
            {description}
          </p>
        )}
      </div>

      {/* Summary Card */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
        <TypeCountBadges steps={steps} />
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
          {steps.length} step{steps.length !== 1 ? 's' : ''} in this group
        </p>
      </div>

      {/* Expandable Child List */}
      <div className="flex-1 overflow-auto p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
          Contents
        </h3>
        {steps.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500 italic">
            This group is empty. Drag steps here to add them.
          </p>
        ) : (
          steps.map((child, index) => (
            <GroupChildItem
              key={index}
              step={child}
              index={index}
              isExpanded={expandedChildren.has(index)}
              onToggle={() => toggleExpanded(index)}
              showPreview={true}
            />
          ))
        )}
      </div>
    </div>
  );
}
