import { createContext, useContext, useReducer, ReactNode, useState, useCallback, useMemo } from 'react';
import type { DemoConfig, DemoRecordings, StepOrGroup, Step, Recording, StepGroup } from '../types/schema';
import { isStepGroup, flattenSteps, getStepTitle } from '../types/schema';
import { extractValueByPath } from '../lib/variable-substitution';

// Info about which step provides a variable
export interface VariableProvider {
  stepIndex: number;
  stepTitle: string;
}

export type ExecutionMode = 'live' | 'recorded';
export type StepStatus = 'pending' | 'executing' | 'complete' | 'error';

interface DemoState {
  config: DemoConfig | null;
  recordings: DemoRecordings | null;
  currentStep: number;  // Index into flatSteps
  stepStatuses: Record<number, StepStatus>;
  stepErrors: Record<number, string>;
  stepResponses: Record<number, unknown>;
  variables: Record<string, unknown>;
  mode: ExecutionMode;
  isLiveAvailable: boolean;
  stepIdMap: Map<string, number>;  // Maps step IDs to flat indices
  flatSteps: Step[];  // Flattened array of all steps
  sidebarCollapsed: boolean;  // Sidebar navigation state
  variableProviders: Map<string, VariableProvider>;  // Maps variable names to their provider step
  diagramVisible: boolean;  // Flow diagram visibility state
  completedDiagramPaths: string[];  // Previously highlighted diagram paths
}

type DemoAction =
  | { type: 'SET_CONFIG'; payload: DemoConfig }
  | { type: 'SET_RECORDINGS'; payload: DemoRecordings }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GOTO_STEP_BY_ID'; payload: string }
  | { type: 'SET_STEP_STATUS'; payload: { step: number; status: StepStatus } }
  | { type: 'SET_STEP_ERROR'; payload: { step: number; error: string | null } }
  | { type: 'SET_STEP_RESPONSE'; payload: { step: number; response: unknown } }
  | { type: 'SET_VARIABLE'; payload: { name: string; value: unknown } }
  | { type: 'SET_VARIABLES'; payload: Record<string, unknown> }
  | { type: 'SET_MODE'; payload: ExecutionMode }
  | { type: 'SET_LIVE_AVAILABLE'; payload: boolean }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_DIAGRAM' }
  | { type: 'RESET' };

const initialState: DemoState = {
  config: null,
  recordings: null,
  currentStep: 0,
  stepStatuses: {},
  stepErrors: {},
  stepResponses: {},
  variables: {},
  mode: 'recorded',
  isLiveAvailable: false,
  stepIdMap: new Map(),
  flatSteps: [],
  sidebarCollapsed: false,
  variableProviders: new Map(),
  diagramVisible: false,
  completedDiagramPaths: [],
};

// Helper to build step ID map from flattened steps
function buildStepIdMap(flatSteps: Step[]): Map<string, number> {
  const map = new Map<string, number>();
  flatSteps.forEach((step, index) => {
    if ('id' in step && step.id) {
      map.set(step.id, index);
    }
  });
  return map;
}

// Helper to build variable providers map from flattened steps
function buildVariableProviders(flatSteps: Step[]): Map<string, VariableProvider> {
  const map = new Map<string, VariableProvider>();
  flatSteps.forEach((step, index) => {
    // Check for 'save' property on REST and shell steps
    if ('save' in step && step.save) {
      const saveConfig = step.save as Record<string, string>;
      for (const varName of Object.keys(saveConfig)) {
        map.set(varName, {
          stepIndex: index,
          stepTitle: getStepTitle(step, index),
        });
      }
    }
  });
  return map;
}

// Helper to pre-populate variables from recorded responses
// This allows assertions to work without requiring manual execution of each step
function extractVariablesFromRecordings(
  flatSteps: Step[],
  recordings: DemoRecordings
): Record<string, unknown> {
  const variables: Record<string, unknown> = {};

  flatSteps.forEach((step, index) => {
    if ('save' in step && step.save) {
      const recording = recordings.recordings.find((r) => r.stepId === `step-${index}`);
      if (!recording) return;

      const saveConfig = step.save as Record<string, string>;
      for (const [varName, path] of Object.entries(saveConfig)) {
        // Handle REST step recordings
        if ('rest' in step && recording.response?.body !== undefined) {
          if (path === '_status') {
            if (recording.response.status !== undefined) {
              variables[varName] = recording.response.status;
            }
          } else {
            variables[varName] = extractValueByPath(recording.response.body, path);
          }
        }
        // Handle shell step recordings
        if ('shell' in step) {
          if (path === 'stdout' || path === 'output') {
            variables[varName] = recording.stdout ?? recording.output;
          } else if (path === 'stderr') {
            variables[varName] = recording.stderr;
          } else if (path === 'status') {
            variables[varName] = recording.status;
          } else {
            // Regex pattern against stdout
            const stdout = recording.stdout ?? recording.output ?? '';
            if (typeof stdout === 'string') {
              try {
                const regex = new RegExp(path);
                const match = stdout.match(regex);
                if (match) {
                  variables[varName] = match[1] || match[0];
                }
              } catch {
                // Invalid regex, skip
              }
            }
          }
        }
      }
    }
  });

  return variables;
}


function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'SET_CONFIG': {
      const flatSteps = flattenSteps(action.payload.steps);
      // Initialize sidebar collapsed state from config
      const sidebarCollapsed = action.payload.settings?.sidebar?.collapsed ?? false;
      return {
        ...state,
        config: action.payload,
        flatSteps,
        stepIdMap: buildStepIdMap(flatSteps),
        variableProviders: buildVariableProviders(flatSteps),
        sidebarCollapsed,
      };
    }

    case 'SET_RECORDINGS': {
      // Pre-populate variables from recorded responses so assertions work
      // without requiring manual execution of each step
      const prePopulatedVars = state.flatSteps.length > 0
        ? extractVariablesFromRecordings(state.flatSteps, action.payload)
        : {};
      return {
        ...state,
        recordings: action.payload,
        variables: { ...state.variables, ...prePopulatedVars },
      };
    }

    case 'SET_STEP': {
      const newStep = action.payload;
      // If going backward, reset completed paths up to that point
      if (newStep < state.currentStep) {
        const pathsToKeep = state.flatSteps.slice(0, newStep)
          .map((step) => ('diagram' in step ? step.diagram : undefined))
          .filter((path): path is string => !!path);
        return { ...state, currentStep: newStep, completedDiagramPaths: pathsToKeep };
      }
      // If going forward, add intermediate paths
      if (newStep > state.currentStep) {
        const newPaths = state.flatSteps.slice(state.currentStep, newStep)
          .map((step) => ('diagram' in step ? step.diagram : undefined))
          .filter((path): path is string => !!path);
        return {
          ...state,
          currentStep: newStep,
          completedDiagramPaths: [...state.completedDiagramPaths, ...newPaths],
        };
      }
      return { ...state, currentStep: newStep };
    }

    case 'NEXT_STEP': {
      const currentDiagramPath = state.flatSteps[state.currentStep];
      const diagramPath = currentDiagramPath && 'diagram' in currentDiagramPath
        ? currentDiagramPath.diagram
        : undefined;
      const newCompletedPaths = diagramPath
        ? [...state.completedDiagramPaths, diagramPath]
        : state.completedDiagramPaths;
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, state.flatSteps.length - 1),
        completedDiagramPaths: newCompletedPaths,
      };
    }

    case 'PREV_STEP': {
      // When going back, remove the last completed path
      const newCompletedPaths = state.completedDiagramPaths.slice(0, -1);
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 0),
        completedDiagramPaths: newCompletedPaths,
      };
    }

    case 'GOTO_STEP_BY_ID': {
      const targetIndex = state.stepIdMap.get(action.payload);
      if (targetIndex !== undefined) {
        return { ...state, currentStep: targetIndex };
      }
      console.warn(`Step ID "${action.payload}" not found, staying on current step`);
      return state;
    }

    case 'SET_STEP_STATUS':
      return {
        ...state,
        stepStatuses: { ...state.stepStatuses, [action.payload.step]: action.payload.status },
      };

    case 'SET_STEP_ERROR': {
      const newErrors = { ...state.stepErrors };
      if (action.payload.error === null) {
        delete newErrors[action.payload.step];
      } else {
        newErrors[action.payload.step] = action.payload.error;
      }
      return { ...state, stepErrors: newErrors };
    }

    case 'SET_STEP_RESPONSE':
      return {
        ...state,
        stepResponses: { ...state.stepResponses, [action.payload.step]: action.payload.response },
      };

    case 'SET_VARIABLE':
      return {
        ...state,
        variables: { ...state.variables, [action.payload.name]: action.payload.value },
      };

    case 'SET_VARIABLES':
      return {
        ...state,
        variables: { ...state.variables, ...action.payload },
      };

    case 'SET_MODE':
      return { ...state, mode: action.payload };

    case 'SET_LIVE_AVAILABLE':
      return { ...state, isLiveAvailable: action.payload };

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };

    case 'TOGGLE_DIAGRAM':
      return { ...state, diagramVisible: !state.diagramVisible };

    case 'RESET':
      return {
        ...initialState,
        config: state.config,
        recordings: state.recordings,
        mode: state.mode,
        isLiveAvailable: state.isLiveAvailable,
        stepIdMap: state.stepIdMap,
        flatSteps: state.flatSteps,
        sidebarCollapsed: state.sidebarCollapsed,
        diagramVisible: state.diagramVisible,
        completedDiagramPaths: [],
      };

    default:
      return state;
  }
}

// Structure info for rendering stepper with groups
export interface StepperItem {
  type: 'step' | 'group';
  flatIndex?: number;  // For steps, the index in flatSteps
  step?: Step;
  group?: StepGroup;
  groupIndex?: number;  // For groups, the index in config.steps
  stepsInGroup?: { step: Step; flatIndex: number }[];  // For groups, the nested steps
}

// Build stepper structure that maps to flat indices
function buildStepperStructure(steps: StepOrGroup[]): StepperItem[] {
  const items: StepperItem[] = [];
  let flatIndex = 0;

  for (let i = 0; i < steps.length; i++) {
    const item = steps[i];
    if (isStepGroup(item)) {
      const stepsInGroup = item.steps.map((step) => ({
        step,
        flatIndex: flatIndex++,
      }));
      items.push({
        type: 'group',
        group: item,
        groupIndex: i,
        stepsInGroup,
      });
    } else {
      items.push({
        type: 'step',
        step: item,
        flatIndex: flatIndex++,
      });
    }
  }

  return items;
}

interface DemoContextValue {
  state: DemoState;
  dispatch: React.Dispatch<DemoAction>;
  currentStepConfig: Step | null;
  currentRecording: Recording | null;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  getStepStatus: (step: number) => StepStatus;
  gotoStepById: (id: string) => void;
  hasStepId: (id: string) => boolean;
  getVariableProvider: (varName: string) => VariableProvider | undefined;
  // Group expansion
  expandedGroups: Record<number, boolean>;
  toggleGroup: (groupIndex: number) => void;
  stepperStructure: StepperItem[];
  // Flow diagram
  toggleDiagram: () => void;
  currentDiagramPath: string | undefined;
  hasDiagram: boolean;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(demoReducer, initialState);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});

  // Initialize expanded state when config changes
  useMemo(() => {
    if (state.config) {
      const initial: Record<number, boolean> = {};
      state.config.steps.forEach((item, index) => {
        if (isStepGroup(item)) {
          // Expanded by default unless collapsed: true
          initial[index] = !item.collapsed;
        }
      });
      setExpandedGroups(initial);
    }
  }, [state.config]);

  const toggleGroup = useCallback((groupIndex: number) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupIndex]: !prev[groupIndex],
    }));
  }, []);

  const toggleDiagram = useCallback(() => {
    dispatch({ type: 'TOGGLE_DIAGRAM' });
  }, []);

  // Current step from flat array
  const currentStepConfig = state.flatSteps[state.currentStep] ?? null;

  // Current diagram path from step
  const currentDiagramPath = currentStepConfig && 'diagram' in currentStepConfig
    ? currentStepConfig.diagram
    : undefined;

  // Whether the demo has a diagram configured
  const hasDiagram = !!state.config?.settings?.diagram?.chart;

  const currentRecording = state.recordings?.recordings.find(
    (r) => r.stepId === `step-${state.currentStep}`
  ) ?? null;

  const totalSteps = state.flatSteps.length;
  const isFirstStep = state.currentStep === 0;
  const isLastStep = state.currentStep === totalSteps - 1;

  const getStepStatus = (step: number): StepStatus => {
    return state.stepStatuses[step] ?? 'pending';
  };

  const gotoStepById = (id: string) => {
    dispatch({ type: 'GOTO_STEP_BY_ID', payload: id });
  };

  const hasStepId = (id: string): boolean => {
    return state.stepIdMap.has(id);
  };

  const getVariableProvider = (varName: string): VariableProvider | undefined => {
    return state.variableProviders.get(varName);
  };

  // Build stepper structure for rendering
  const stepperStructure = useMemo(() => {
    if (!state.config) return [];
    return buildStepperStructure(state.config.steps);
  }, [state.config]);

  return (
    <DemoContext.Provider
      value={{
        state,
        dispatch,
        currentStepConfig,
        currentRecording,
        totalSteps,
        isFirstStep,
        isLastStep,
        getStepStatus,
        gotoStepById,
        hasStepId,
        getVariableProvider,
        expandedGroups,
        toggleGroup,
        stepperStructure,
        toggleDiagram,
        currentDiagramPath,
        hasDiagram,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
