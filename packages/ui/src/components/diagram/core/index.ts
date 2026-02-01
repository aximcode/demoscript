/**
 * Core diagram components and types
 * Shared between FlowDiagram and SequenceDiagram
 */

// Types
export {
  DEFAULT_THEME,
  type DiagramStep,
  type StepInfo,
  type NodeState,
  type EdgeState,
  type DiagramTheme,
  type BaseDiagramProps,
  type EdgeData,
  type NodeData,
} from './types';

// Components
export { AnimatedEdge } from './AnimatedEdge';
export { FlowNode } from './FlowNode';
export { ParticipantNode, type ParticipantNodeData } from './ParticipantNode';
export { MessageEdge, type MessageEdgeData } from './MessageEdge';

// Layout utilities
export {
  parseFlowchartDefinition,
  parseSequenceDiagram,
  calculateFlowchartLayout,
  calculateSequenceLayout,
  detectDiagramType,
  type NodeDefinition,
  type Connection,
  type SequenceMessage,
} from './layout';
