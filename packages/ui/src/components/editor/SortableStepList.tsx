import { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { EditorStep } from '../../context/EditorContext';
import { getStepTitle, getStepType, isStepGroup } from '../../types/schema';
import { STEP_TYPE_COLORS } from './GroupComponents';

interface SortableStepListProps {
  steps: EditorStep[];
  currentStep: number;
  selectedChildIndex: number | null;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onMoveIntoGroup?: (stepIndex: number, groupIndex: number) => void;
  onMoveOutOfGroup?: (groupIndex: number, childIndex: number, targetIndex?: number) => void;
  onReorderWithinGroup?: (groupIndex: number, fromChildIndex: number, toChildIndex: number) => void;
  onSelect: (index: number) => void;
  onSelectChild: (childIndex: number | null) => void;
  onDelete: (index: number) => void;
}

interface SortableItemProps {
  step: EditorStep;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isChild?: boolean;
  childIndex?: number;
  parentGroupIndex?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isGroup?: boolean;
  childCount?: number;
  isDropTarget?: boolean;
}

function SortableItem({ step, index, isActive, onSelect, onDelete, isChild, childIndex, parentGroupIndex, isExpanded, onToggleExpand, isGroup, childCount = 0, isDropTarget }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: step.id,
    data: {
      isChild,
      childIndex,
      parentGroupIndex,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const stepType = getStepType(step.step);
  const title = getStepTitle(step.step, index);

  // Display number: for children show parent.child format
  const displayNumber = isChild && childIndex !== undefined
    ? `${index + 1}.${childIndex + 1}`
    : `${index + 1}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-1.5 p-2 rounded border cursor-pointer
        transition-all duration-150
        ${isChild ? 'ml-4 border-l-2 border-l-slate-300 dark:border-l-slate-600' : ''}
        ${isActive
          ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-300 dark:border-primary-500/30 shadow-sm'
          : 'bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
        }
        ${isDragging ? 'shadow-lg ring-2 ring-primary-400 z-10' : ''}
        ${isDropTarget ? 'ring-2 ring-primary-400 border-primary-400' : ''}
      `}
      onClick={onSelect}
    >
      {/* Drag handle - for all items (including children) */}
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        title={isChild ? 'Drag to reorder or move out of group' : 'Drag to reorder'}
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
        </svg>
      </button>

      {/* Step number */}
      <span className={`flex items-center justify-center text-[10px] font-medium rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 ${isChild ? 'px-1.5 h-5' : 'w-5 h-5'}`}>
        {displayNumber}
      </span>

      {/* Step type badge */}
      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${STEP_TYPE_COLORS[stepType]}`}>
        {stepType.toUpperCase()}
      </span>

      {/* Step title */}
      <span className="flex-1 truncate text-xs text-gray-700 dark:text-slate-200">
        {title}
      </span>

      {/* Children count badge for groups */}
      {isGroup && (
        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${childCount > 0 ? 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
          {childCount}
        </span>
      )}

      {/* Expand/collapse button for groups - on the right */}
      {isGroup && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand?.();
          }}
          className={`p-0.5 rounded text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 ${childCount === 0 ? 'opacity-50' : ''}`}
          title={childCount === 0 ? 'Empty group - drag steps here' : isExpanded ? 'Collapse group' : 'Expand group'}
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Delete button */}
      {!isChild && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-0.5 rounded text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete step"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Group item that is both sortable and droppable
function SortableGroupItem({
  step,
  index,
  isActive,
  onSelect,
  onDelete,
  isExpanded,
  onToggleExpand,
  childCount,
}: {
  step: EditorStep;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  childCount: number;
}) {
  // Sortable for dragging/reordering
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: step.id,
    data: { isChild: false },
  });

  // Droppable for accepting items into the group
  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: `dropzone-${step.id}`,
    data: { type: 'group-dropzone', groupIndex: index },
  });

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const stepType = getStepType(step.step);
  const title = getStepTitle(step.step, index);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-1.5 p-2 rounded border cursor-pointer
        transition-all duration-150
        ${isActive
          ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-300 dark:border-primary-500/30 shadow-sm'
          : 'bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
        }
        ${isDragging ? 'shadow-lg ring-2 ring-primary-400 z-10' : ''}
        ${isOver ? 'ring-2 ring-green-400 border-green-400 bg-green-50 dark:bg-green-900/20' : ''}
      `}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        title="Drag to reorder"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
        </svg>
      </button>

      {/* Step number */}
      <span className="flex items-center justify-center w-5 h-5 text-[10px] font-medium rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
        {index + 1}
      </span>

      {/* Step type badge */}
      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${STEP_TYPE_COLORS[stepType]}`}>
        {stepType.toUpperCase()}
      </span>

      {/* Step title */}
      <span className="flex-1 truncate text-xs text-gray-700 dark:text-slate-200">
        {title}
      </span>

      {/* Children count badge */}
      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${childCount > 0 ? 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
        {childCount}
      </span>

      {/* Expand/collapse button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand();
        }}
        className={`p-0.5 rounded text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 ${childCount === 0 ? 'opacity-50' : ''}`}
        title={childCount === 0 ? 'Empty group - drag steps here' : isExpanded ? 'Collapse group' : 'Expand group'}
      >
        <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-0.5 rounded text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete step"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

export function SortableStepList({
  steps,
  currentStep,
  selectedChildIndex,
  onReorder,
  onMoveIntoGroup,
  onMoveOutOfGroup,
  onReorderWithinGroup,
  onSelect,
  onSelectChild,
  onDelete,
}: SortableStepListProps) {
  // Track which groups are expanded (default: all expanded)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initialExpanded = new Set<string>();
    steps.forEach((step) => {
      if (isStepGroup(step.step)) {
        initialExpanded.add(step.id);
      }
    });
    return initialExpanded;
  });


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Start drag after 5px movement
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Build list of all sortable IDs (top-level + children)
  const allSortableIds = useMemo(() => {
    const ids: string[] = [];
    steps.forEach((step) => {
      ids.push(step.id);
      if (isStepGroup(step.step)) {
        const children = (step.step as { steps?: unknown[] }).steps || [];
        children.forEach((_, childIndex) => {
          ids.push(`${step.id}-child-${childIndex}`);
        });
      }
    });
    return ids;
  }, [steps]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    const activeData = active.data?.current;
    const overData = over.data?.current;

    // Get info about what we're dragging
    const isDraggingChild = activeData?.isChild === true;
    const activeParentGroupIndex = activeData?.parentGroupIndex as number | undefined;
    const activeChildIndex = activeData?.childIndex as number | undefined;

    // Case 1: Dropping on a group drop zone (move into group)
    if (overData?.type === 'group-dropzone' && onMoveIntoGroup) {
      if (isDraggingChild && onMoveOutOfGroup && activeParentGroupIndex !== undefined && activeChildIndex !== undefined) {
        // Moving child from one group to another
        const targetGroupIndex = overData.groupIndex as number;
        if (activeParentGroupIndex !== targetGroupIndex) {
          // First move out, then move into the new group
          onMoveOutOfGroup(activeParentGroupIndex, activeChildIndex, targetGroupIndex);
          // Note: This is a simplified approach - for proper cross-group moves,
          // we'd need a dedicated action. For now, dropping a child on another
          // group's drop zone will move it out to top level.
        }
      } else {
        // Moving top-level step into group
        const stepIndex = steps.findIndex((s) => s.id === active.id);
        const groupIndex = overData.groupIndex as number;
        if (stepIndex !== groupIndex && stepIndex !== -1) {
          onMoveIntoGroup(stepIndex, groupIndex);
        }
      }
      return;
    }

    // Case 2: Dropping on top-level drop zone (move out of group)
    if (overData?.type === 'top-level-dropzone' && isDraggingChild && onMoveOutOfGroup) {
      if (activeParentGroupIndex !== undefined && activeChildIndex !== undefined) {
        const targetIndex = overData.targetIndex as number | undefined;
        onMoveOutOfGroup(activeParentGroupIndex, activeChildIndex, targetIndex);
      }
      return;
    }

    // Case 3: Dragging child within same group (reorder within group)
    if (isDraggingChild && overData?.isChild === true && onReorderWithinGroup) {
      const overParentGroupIndex = overData.parentGroupIndex as number | undefined;
      const overChildIndex = overData.childIndex as number | undefined;
      if (activeParentGroupIndex === overParentGroupIndex &&
          activeParentGroupIndex !== undefined &&
          activeChildIndex !== undefined &&
          overChildIndex !== undefined) {
        onReorderWithinGroup(activeParentGroupIndex, activeChildIndex, overChildIndex);
        return;
      }
    }

    // Case 4: Dragging child to a top-level position (move out of group)
    if (isDraggingChild && !overData?.isChild && onMoveOutOfGroup) {
      if (activeParentGroupIndex !== undefined && activeChildIndex !== undefined) {
        const targetIndex = steps.findIndex((s) => s.id === over.id);
        if (targetIndex !== -1) {
          onMoveOutOfGroup(activeParentGroupIndex, activeChildIndex, targetIndex);
        }
        return;
      }
    }

    // Case 5: Normal top-level reorder
    if (!isDraggingChild && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex);
      }
    }
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500 dark:text-slate-400">
        <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-xs font-medium">No steps yet</p>
        <p className="text-[10px] mt-0.5 text-gray-400 dark:text-slate-500">Add steps to start building your demo</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={allSortableIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {steps.map((step, index) => {
            const stepData = step.step;
            const isGroup = isStepGroup(stepData);
            const isExpanded = expandedGroups.has(step.id);
            const childSteps = isGroup ? stepData.steps || [] : [];
            const isCurrentStep = index === currentStep;

            return (
              <div key={step.id}>
                {/* Main step item - use sortable+droppable for groups */}
                {isGroup ? (
                  <SortableGroupItem
                    step={step}
                    index={index}
                    isActive={isCurrentStep && selectedChildIndex === null}
                    onSelect={() => { onSelect(index); onSelectChild(null); }}
                    onDelete={() => onDelete(index)}
                    childCount={childSteps.length}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleGroup(step.id)}
                  />
                ) : (
                  <SortableItem
                    step={step}
                    index={index}
                    isActive={isCurrentStep}
                    onSelect={() => onSelect(index)}
                    onDelete={() => onDelete(index)}
                    isGroup={false}
                    childCount={0}
                    isExpanded={false}
                  />
                )}

                {/* Child steps (indented) - only show when expanded */}
                {isGroup && isExpanded && childSteps.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    {childSteps.map((childStep, childIndex) => {
                      // Create a virtual EditorStep for the child
                      const childEditorStep: EditorStep = {
                        id: `${step.id}-child-${childIndex}`,
                        step: childStep,
                      };

                      const isChildActive = isCurrentStep && selectedChildIndex === childIndex;

                      return (
                        <SortableItem
                          key={childEditorStep.id}
                          step={childEditorStep}
                          index={index}
                          childIndex={childIndex}
                          parentGroupIndex={index}
                          isActive={isChildActive}
                          onSelect={() => { onSelect(index); onSelectChild(childIndex); }}
                          onDelete={() => {}} // Children are deleted via the editor panel
                          isChild={true}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// Re-export arrayMove for use in parent components
export { arrayMove };
