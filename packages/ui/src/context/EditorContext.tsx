/**
 * EditorContext - State management for the Visual Editor
 *
 * Provides:
 * - Editor state (steps, settings, current step, variables)
 * - Actions: addStep, removeStep, reorderSteps, updateStep, setCurrentStep
 * - YAML import/export via parseYamlToState and generateYaml
 */

import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { StepOrGroup, DemoConfig, DemoSettings, DemoMetadata } from '../types/schema';

// Editor step wraps a StepOrGroup with an ID for reordering
export interface EditorStep {
  id: string;
  step: StepOrGroup;
  executionResult?: unknown;
}

export interface EditorState {
  title: string;
  description: string;
  settings: DemoSettings;
  metadata: DemoMetadata;
  steps: EditorStep[];
  currentStep: number;
  selectedChildIndex: number | null; // Index of selected child within a group (null = group itself)
  variables: Record<string, unknown>;
  isDirty: boolean; // Track unsaved changes
  currentFilePath: string | null; // Path to currently open file (CLI mode)
  isNewFile: boolean; // True if never saved (CLI mode)
}

// Action types
type EditorAction =
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_SETTINGS'; payload: Partial<DemoSettings> }
  | { type: 'SET_METADATA'; payload: Partial<DemoMetadata> }
  | { type: 'ADD_STEP'; payload: { step: StepOrGroup; afterIndex?: number } }
  | { type: 'REMOVE_STEP'; payload: number }
  | { type: 'UPDATE_STEP'; payload: { index: number; step: StepOrGroup } }
  | { type: 'REORDER_STEPS'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'MOVE_INTO_GROUP'; payload: { stepIndex: number; groupIndex: number } }
  | { type: 'MOVE_OUT_OF_GROUP'; payload: { groupIndex: number; childIndex: number; targetIndex?: number } }
  | { type: 'REORDER_WITHIN_GROUP'; payload: { groupIndex: number; fromChildIndex: number; toChildIndex: number } }
  | { type: 'DELETE_FROM_GROUP'; payload: { groupIndex: number; childIndex: number } }
  | { type: 'FLATTEN_GROUP'; payload: { groupIndex: number } }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'SET_SELECTED_CHILD'; payload: number | null }
  | { type: 'SET_EXECUTION_RESULT'; payload: { index: number; result: unknown } }
  | { type: 'SET_VARIABLES'; payload: Record<string, unknown> }
  | { type: 'LOAD_STATE'; payload: EditorState }
  | { type: 'MARK_SAVED'; payload?: string } // Optional path for Save As
  | { type: 'SET_FILE_PATH'; payload: string | null }
  | { type: 'NEW_FILE' };

// Generate unique step ID
function generateStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Reducer
function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_TITLE':
      return { ...state, title: action.payload, isDirty: true };

    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload, isDirty: true };

    case 'SET_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        isDirty: true,
      };

    case 'SET_METADATA':
      return {
        ...state,
        metadata: { ...state.metadata, ...action.payload },
        isDirty: true,
      };

    case 'ADD_STEP': {
      const newStep: EditorStep = {
        id: generateStepId(),
        step: action.payload.step,
      };
      const insertIndex = action.payload.afterIndex !== undefined
        ? action.payload.afterIndex + 1
        : state.steps.length;
      const newSteps = [...state.steps];
      newSteps.splice(insertIndex, 0, newStep);
      return {
        ...state,
        steps: newSteps,
        currentStep: insertIndex,
        isDirty: true,
      };
    }

    case 'REMOVE_STEP': {
      const newSteps = state.steps.filter((_, i) => i !== action.payload);
      const newCurrentStep = Math.min(state.currentStep, newSteps.length - 1);
      return {
        ...state,
        steps: newSteps,
        currentStep: Math.max(0, newCurrentStep),
        isDirty: true,
      };
    }

    case 'UPDATE_STEP': {
      const newSteps = [...state.steps];
      if (newSteps[action.payload.index]) {
        newSteps[action.payload.index] = {
          ...newSteps[action.payload.index],
          step: action.payload.step,
        };
      }
      return { ...state, steps: newSteps, isDirty: true };
    }

    case 'REORDER_STEPS': {
      const { fromIndex, toIndex } = action.payload;
      const newSteps = [...state.steps];
      const [moved] = newSteps.splice(fromIndex, 1);
      newSteps.splice(toIndex, 0, moved);
      // Adjust current step if it was affected
      let newCurrentStep = state.currentStep;
      if (state.currentStep === fromIndex) {
        newCurrentStep = toIndex;
      } else if (fromIndex < state.currentStep && toIndex >= state.currentStep) {
        newCurrentStep--;
      } else if (fromIndex > state.currentStep && toIndex <= state.currentStep) {
        newCurrentStep++;
      }
      return { ...state, steps: newSteps, currentStep: newCurrentStep, isDirty: true };
    }

    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: Math.max(0, Math.min(action.payload, state.steps.length - 1)), selectedChildIndex: null };

    case 'SET_SELECTED_CHILD':
      return { ...state, selectedChildIndex: action.payload };

    case 'MOVE_INTO_GROUP': {
      const { stepIndex, groupIndex } = action.payload;
      // Can't move a step into itself or if indices are invalid
      if (stepIndex === groupIndex || stepIndex < 0 || groupIndex < 0) {
        return state;
      }
      if (stepIndex >= state.steps.length || groupIndex >= state.steps.length) {
        return state;
      }
      const groupStep = state.steps[groupIndex]?.step;
      // Target must be a group step
      if (!groupStep || !('group' in groupStep || (groupStep as { step?: string }).step === 'group')) {
        return state;
      }
      // Get the step to move
      const stepToMove = state.steps[stepIndex];
      if (!stepToMove) return state;
      // Can't move a group into another group (groups can only contain Steps, not StepGroups)
      if ('group' in stepToMove.step) {
        return state;
      }
      // Remove the step from the main list
      const newSteps = state.steps.filter((_, i) => i !== stepIndex);
      // Adjust group index if step was before it
      const adjustedGroupIndex = stepIndex < groupIndex ? groupIndex - 1 : groupIndex;
      // Add the step's content to the group's children
      const updatedGroup = { ...newSteps[adjustedGroupIndex] };
      const groupData = updatedGroup.step as { group?: string; steps?: StepOrGroup[] };
      updatedGroup.step = {
        ...groupData,
        steps: [...(groupData.steps || []), stepToMove.step] as StepOrGroup[],
      } as StepOrGroup;
      newSteps[adjustedGroupIndex] = updatedGroup;
      // Adjust current step index
      let newCurrentStep = state.currentStep;
      if (state.currentStep === stepIndex) {
        newCurrentStep = adjustedGroupIndex;
      } else if (state.currentStep > stepIndex) {
        newCurrentStep--;
      }
      return {
        ...state,
        steps: newSteps,
        currentStep: Math.max(0, Math.min(newCurrentStep, newSteps.length - 1)),
        isDirty: true,
      };
    }

    case 'MOVE_OUT_OF_GROUP': {
      const { groupIndex, childIndex, targetIndex } = action.payload;
      if (groupIndex < 0 || groupIndex >= state.steps.length) {
        return state;
      }
      const groupStep = state.steps[groupIndex]?.step;
      if (!groupStep || !('group' in groupStep)) {
        return state;
      }
      const groupData = groupStep as { group: string; steps?: StepOrGroup[] };
      const children = groupData.steps || [];
      if (childIndex < 0 || childIndex >= children.length) {
        return state;
      }
      // Get the child step to move out
      const childStep = children[childIndex];
      // Remove child from group
      const newChildren = children.filter((_, i) => i !== childIndex);
      const updatedGroup: EditorStep = {
        ...state.steps[groupIndex],
        step: { ...groupData, steps: newChildren } as StepOrGroup,
      };
      // Insert at target position or after the group
      const insertAt = targetIndex !== undefined ? targetIndex : groupIndex + 1;
      const newStep: EditorStep = {
        id: generateStepId(),
        step: childStep,
      };
      const newSteps = [...state.steps];
      newSteps[groupIndex] = updatedGroup;
      newSteps.splice(insertAt, 0, newStep);
      return {
        ...state,
        steps: newSteps,
        currentStep: insertAt,
        isDirty: true,
      };
    }

    case 'REORDER_WITHIN_GROUP': {
      const { groupIndex, fromChildIndex, toChildIndex } = action.payload;
      if (groupIndex < 0 || groupIndex >= state.steps.length) {
        return state;
      }
      const groupStep = state.steps[groupIndex]?.step;
      if (!groupStep || !('group' in groupStep)) {
        return state;
      }
      const groupData = groupStep as { group: string; steps?: StepOrGroup[] };
      const children = [...(groupData.steps || [])];
      if (fromChildIndex < 0 || fromChildIndex >= children.length ||
          toChildIndex < 0 || toChildIndex >= children.length ||
          fromChildIndex === toChildIndex) {
        return state;
      }
      // Reorder children
      const [moved] = children.splice(fromChildIndex, 1);
      children.splice(toChildIndex, 0, moved);
      const updatedGroup: EditorStep = {
        ...state.steps[groupIndex],
        step: { ...groupData, steps: children } as StepOrGroup,
      };
      const newSteps = [...state.steps];
      newSteps[groupIndex] = updatedGroup;
      return {
        ...state,
        steps: newSteps,
        isDirty: true,
      };
    }

    case 'DELETE_FROM_GROUP': {
      const { groupIndex, childIndex } = action.payload;
      if (groupIndex < 0 || groupIndex >= state.steps.length) {
        return state;
      }
      const groupStep = state.steps[groupIndex]?.step;
      if (!groupStep || !('group' in groupStep)) {
        return state;
      }
      const groupData = groupStep as { group: string; steps?: StepOrGroup[] };
      const children = groupData.steps || [];
      if (childIndex < 0 || childIndex >= children.length) {
        return state;
      }
      // Remove child from group
      const newChildren = children.filter((_, i) => i !== childIndex);
      const updatedGroup: EditorStep = {
        ...state.steps[groupIndex],
        step: { ...groupData, steps: newChildren } as StepOrGroup,
      };
      const newSteps = [...state.steps];
      newSteps[groupIndex] = updatedGroup;
      return {
        ...state,
        steps: newSteps,
        isDirty: true,
      };
    }

    case 'FLATTEN_GROUP': {
      const { groupIndex } = action.payload;
      if (groupIndex < 0 || groupIndex >= state.steps.length) {
        return state;
      }
      const groupStep = state.steps[groupIndex]?.step;
      if (!groupStep || !('group' in groupStep)) {
        return state;
      }
      const groupData = groupStep as { group: string; steps?: StepOrGroup[] };
      const children = groupData.steps || [];
      if (children.length === 0) {
        // Empty group - just remove it
        const newSteps = state.steps.filter((_, i) => i !== groupIndex);
        return {
          ...state,
          steps: newSteps,
          currentStep: Math.min(state.currentStep, newSteps.length - 1),
          isDirty: true,
        };
      }
      // Replace group with its children
      const newSteps = [...state.steps];
      const childEditorSteps: EditorStep[] = children.map((child) => ({
        id: generateStepId(),
        step: child,
      }));
      newSteps.splice(groupIndex, 1, ...childEditorSteps);
      return {
        ...state,
        steps: newSteps,
        currentStep: groupIndex, // Select first child after flattening
        isDirty: true,
      };
    }

    case 'SET_EXECUTION_RESULT': {
      const newSteps = [...state.steps];
      if (newSteps[action.payload.index]) {
        newSteps[action.payload.index] = {
          ...newSteps[action.payload.index],
          executionResult: action.payload.result,
        };
      }
      return { ...state, steps: newSteps };
    }

    case 'SET_VARIABLES':
      return { ...state, variables: { ...state.variables, ...action.payload } };

    case 'LOAD_STATE':
      return { ...action.payload, isDirty: false };

    case 'MARK_SAVED':
      return {
        ...state,
        isDirty: false,
        currentFilePath: action.payload ?? state.currentFilePath,
        isNewFile: false,
      };

    case 'SET_FILE_PATH':
      return { ...state, currentFilePath: action.payload, isNewFile: false };

    case 'NEW_FILE':
      return {
        ...createInitialState(),
        isDirty: false,
        isNewFile: true,
        currentFilePath: null,
      };

    default:
      return state;
  }
}

// Initial state
function createInitialState(): EditorState {
  return {
    title: 'Untitled Demo',
    description: '',
    settings: {},
    metadata: {},
    steps: [],
    currentStep: 0,
    selectedChildIndex: null,
    variables: {},
    isDirty: false,
    currentFilePath: null,
    isNewFile: true,
  };
}

// Context value type
interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  // Convenience methods
  addStep: (step: StepOrGroup, afterIndex?: number) => void;
  removeStep: (index: number) => void;
  updateStep: (index: number, step: StepOrGroup) => void;
  reorderSteps: (fromIndex: number, toIndex: number) => void;
  moveIntoGroup: (stepIndex: number, groupIndex: number) => void;
  moveOutOfGroup: (groupIndex: number, childIndex: number, targetIndex?: number) => void;
  reorderWithinGroup: (groupIndex: number, fromChildIndex: number, toChildIndex: number) => void;
  deleteFromGroup: (groupIndex: number, childIndex: number) => void;
  flattenGroup: (groupIndex: number) => void;
  setCurrentStep: (index: number) => void;
  setSelectedChild: (childIndex: number | null) => void;
  setExecutionResult: (index: number, result: unknown) => void;
  loadFromConfig: (config: DemoConfig, filePath?: string) => void;
  toConfig: () => DemoConfig;
  // File operations (CLI mode)
  setFilePath: (path: string | null) => void;
  newFile: () => void;
  markSaved: (path?: string) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

// Provider props
interface EditorProviderProps {
  children: ReactNode;
  initialConfig?: DemoConfig;
}

// Convert DemoConfig to EditorState
function configToState(config: DemoConfig, filePath?: string): EditorState {
  return {
    title: config.title || 'Untitled Demo',
    description: config.description || '',
    settings: config.settings || {},
    metadata: config.metadata || {},
    steps: (config.steps || []).map((step, index) => ({
      id: `step-${index}`,
      step,
    })),
    currentStep: 0,
    selectedChildIndex: null,
    variables: {},
    isDirty: false,
    currentFilePath: filePath ?? null,
    isNewFile: !filePath,
  };
}

// Convert EditorState to DemoConfig
function stateToConfig(state: EditorState): DemoConfig {
  return {
    title: state.title,
    description: state.description,
    settings: state.settings,
    metadata: state.metadata,
    steps: state.steps.map((s) => s.step),
  };
}

// Provider component
export function EditorProvider({ children, initialConfig }: EditorProviderProps) {
  const [state, dispatch] = useReducer(
    editorReducer,
    initialConfig ? configToState(initialConfig) : createInitialState()
  );

  const addStep = useCallback((step: StepOrGroup, afterIndex?: number) => {
    dispatch({ type: 'ADD_STEP', payload: { step, afterIndex } });
  }, []);

  const removeStep = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_STEP', payload: index });
  }, []);

  const updateStep = useCallback((index: number, step: StepOrGroup) => {
    dispatch({ type: 'UPDATE_STEP', payload: { index, step } });
  }, []);

  const reorderSteps = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_STEPS', payload: { fromIndex, toIndex } });
  }, []);

  const moveIntoGroup = useCallback((stepIndex: number, groupIndex: number) => {
    dispatch({ type: 'MOVE_INTO_GROUP', payload: { stepIndex, groupIndex } });
  }, []);

  const moveOutOfGroup = useCallback((groupIndex: number, childIndex: number, targetIndex?: number) => {
    dispatch({ type: 'MOVE_OUT_OF_GROUP', payload: { groupIndex, childIndex, targetIndex } });
  }, []);

  const reorderWithinGroup = useCallback((groupIndex: number, fromChildIndex: number, toChildIndex: number) => {
    dispatch({ type: 'REORDER_WITHIN_GROUP', payload: { groupIndex, fromChildIndex, toChildIndex } });
  }, []);

  const deleteFromGroup = useCallback((groupIndex: number, childIndex: number) => {
    dispatch({ type: 'DELETE_FROM_GROUP', payload: { groupIndex, childIndex } });
  }, []);

  const flattenGroup = useCallback((groupIndex: number) => {
    dispatch({ type: 'FLATTEN_GROUP', payload: { groupIndex } });
  }, []);

  const setCurrentStep = useCallback((index: number) => {
    dispatch({ type: 'SET_CURRENT_STEP', payload: index });
  }, []);

  const setSelectedChild = useCallback((childIndex: number | null) => {
    dispatch({ type: 'SET_SELECTED_CHILD', payload: childIndex });
  }, []);

  const setExecutionResult = useCallback((index: number, result: unknown) => {
    dispatch({ type: 'SET_EXECUTION_RESULT', payload: { index, result } });
  }, []);

  const loadFromConfig = useCallback((config: DemoConfig, filePath?: string) => {
    dispatch({ type: 'LOAD_STATE', payload: configToState(config, filePath) });
  }, []);

  const toConfig = useCallback(() => {
    return stateToConfig(state);
  }, [state]);

  // File operations (CLI mode)
  const setFilePath = useCallback((path: string | null) => {
    dispatch({ type: 'SET_FILE_PATH', payload: path });
  }, []);

  const newFile = useCallback(() => {
    dispatch({ type: 'NEW_FILE' });
  }, []);

  const markSaved = useCallback((path?: string) => {
    dispatch({ type: 'MARK_SAVED', payload: path });
  }, []);

  const value: EditorContextValue = {
    state,
    dispatch,
    addStep,
    removeStep,
    updateStep,
    reorderSteps,
    moveIntoGroup,
    moveOutOfGroup,
    reorderWithinGroup,
    deleteFromGroup,
    flattenGroup,
    setCurrentStep,
    setSelectedChild,
    setExecutionResult,
    loadFromConfig,
    toConfig,
    setFilePath,
    newFile,
    markSaved,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

// Hook to use editor context
export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}

// Export types
export type { EditorAction, EditorContextValue };
