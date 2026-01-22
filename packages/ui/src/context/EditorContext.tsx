/**
 * EditorContext - State management for the Visual Builder V2
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
  variables: Record<string, unknown>;
  isDirty: boolean; // Track unsaved changes
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
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'SET_EXECUTION_RESULT'; payload: { index: number; result: unknown } }
  | { type: 'SET_VARIABLES'; payload: Record<string, unknown> }
  | { type: 'LOAD_STATE'; payload: EditorState }
  | { type: 'MARK_SAVED' };

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
      return { ...state, currentStep: Math.max(0, Math.min(action.payload, state.steps.length - 1)) };

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
      return { ...state, isDirty: false };

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
    variables: {},
    isDirty: false,
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
  setCurrentStep: (index: number) => void;
  setExecutionResult: (index: number, result: unknown) => void;
  loadFromConfig: (config: DemoConfig) => void;
  toConfig: () => DemoConfig;
}

const EditorContext = createContext<EditorContextValue | null>(null);

// Provider props
interface EditorProviderProps {
  children: ReactNode;
  initialConfig?: DemoConfig;
}

// Convert DemoConfig to EditorState
function configToState(config: DemoConfig): EditorState {
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
    variables: {},
    isDirty: false,
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

  const setCurrentStep = useCallback((index: number) => {
    dispatch({ type: 'SET_CURRENT_STEP', payload: index });
  }, []);

  const setExecutionResult = useCallback((index: number, result: unknown) => {
    dispatch({ type: 'SET_EXECUTION_RESULT', payload: { index, result } });
  }, []);

  const loadFromConfig = useCallback((config: DemoConfig) => {
    dispatch({ type: 'LOAD_STATE', payload: configToState(config) });
  }, []);

  const toConfig = useCallback(() => {
    return stateToConfig(state);
  }, [state]);

  const value: EditorContextValue = {
    state,
    dispatch,
    addStep,
    removeStep,
    updateStep,
    reorderSteps,
    setCurrentStep,
    setExecutionResult,
    loadFromConfig,
    toConfig,
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
