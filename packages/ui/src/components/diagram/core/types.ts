/**
 * Shared types for diagram components (flow and sequence)
 * Used by React Flow-based diagrams
 */

/**
 * A step in the diagram showing data flow between nodes
 */
export interface DiagramStep {
  from: string;
  to: string;
  label?: string;
  color?: string;
}

/**
 * Information about a demo step that maps to a diagram path
 */
export interface StepInfo {
  index: number;
  title: string;
  path: string;
}

/**
 * Visual state for a node in the diagram
 */
export interface NodeState {
  isActive: boolean;
  isSource: boolean;
  isTarget: boolean;
  isCompleted?: boolean;
}

/**
 * Visual state for an edge in the diagram
 */
export interface EdgeState {
  isActive: boolean;
  isCompleted: boolean;
  stepNumber?: number;
  showStepNumber?: boolean;
}

/**
 * Theme configuration for diagram colors
 */
export interface DiagramTheme {
  primaryColor: string;
  completedColor: string;
  inactiveColor: string;
}

/**
 * Default theme using purple/green scheme
 */
export const DEFAULT_THEME: DiagramTheme = {
  primaryColor: '#8b5cf6',
  completedColor: '#10b981',
  inactiveColor: '#475569',
};

/**
 * Common props for diagram components
 */
export interface BaseDiagramProps {
  /** Diagram definition string (Mermaid-like syntax) */
  chart: string;
  /** Current highlighted path: "NodeA->NodeB" */
  currentPath?: string;
  /** Previously completed paths */
  completedPaths?: string[];
  /** Label for current step */
  stepTitle?: string;
  /** Container height */
  height?: number;
  /** Node click handler */
  onNodeClick?: (nodeId: string) => void;
  /** Close button handler (sidebar mode) */
  onClose?: () => void;
  /** Show step numbers on edges */
  showStepNumbers?: boolean;
  /** List of all steps with diagram paths */
  stepList?: StepInfo[];
  /** Current step index in the overall demo */
  currentStepIndex?: number;
  /** Hide extras for sticky/top positions */
  minimalMode?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Edge data passed to custom edge components
 */
export interface EdgeData {
  isActive: boolean;
  isCompleted: boolean;
  color: string;
  stepNumber?: number;
  showStepNumber?: boolean;
}

/**
 * Node data passed to custom node components
 */
export interface NodeData {
  label: string;
  type: string;
  isActive: boolean;
  isSource: boolean;
  isTarget: boolean;
  color: string;
  direction?: 'LR' | 'TD';
}
