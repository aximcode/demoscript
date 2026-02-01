/**
 * SequenceDiagram - React Flow-based sequence diagram with animated messages
 * Features:
 * - Horizontal participants with lifelines
 * - Animated message arrows between participants
 * - GPU-accelerated particle animations via CSS offset-path
 * - Consistent API with FlowDiagram
 */

import { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  ParticipantNode,
  MessageEdge,
  parseSequenceDiagram,
  calculateSequenceLayout,
  DEFAULT_THEME,
  type StepInfo,
  type ParticipantNodeData,
  type MessageEdgeData,
} from './core';

interface SequenceDiagramProps {
  chart: string;                    // Sequence diagram syntax
  currentPath?: string;             // Current message: "A->>B" or "A-->>B"
  completedPaths?: string[];        // Previously highlighted paths
  stepTitle?: string;               // Label for current step
  height?: number;                  // Diagram height (default: 300)
  onNodeClick?: (nodeId: string) => void;
  onClose?: () => void;
  showStepNumbers?: boolean;
  stepList?: StepInfo[];
  currentStepIndex?: number;
  minimalMode?: boolean;
  className?: string;
}

// Node and edge type registrations
const nodeTypes = { participant: ParticipantNode };
const edgeTypes = { message: MessageEdge };

// Parse path to extract from/to/async
function parseMessagePath(path: string): { from: string; to: string; isAsync: boolean } | null {
  // Match: A->>B or A-->>B or A->B or A-->B
  const match = path.match(/^(\w+)(--?>>?)(\w+)$/);
  if (match) {
    const [, from, arrow, to] = match;
    return { from, to, isAsync: arrow.startsWith('--') };
  }
  return null;
}

// Toolbar component
function DiagramToolbar({ onClose }: { onClose?: () => void }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="flex items-center justify-between px-2 py-1.5 bg-slate-800/50 border-b border-slate-700/50">
      <div className="flex gap-1">
        <button
          onClick={() => zoomOut()}
          className="p-1.5 rounded bg-slate-700/90 hover:bg-slate-600 text-slate-300 transition-colors"
          title="Zoom Out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={() => zoomIn()}
          className="p-1.5 rounded bg-slate-700/90 hover:bg-slate-600 text-slate-300 transition-colors"
          title="Zoom In"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={() => fitView({ padding: 0.1 })}
          className="p-1.5 rounded bg-slate-700/90 hover:bg-slate-600 text-slate-300 transition-colors"
          title="Fit View"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1.5 rounded bg-slate-700/90 hover:bg-slate-600 text-slate-300 transition-colors"
          title="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function SequenceDiagram({
  chart,
  currentPath,
  completedPaths = [],
  stepTitle: _stepTitle,
  height = 300,
  onNodeClick,
  onClose,
  showStepNumbers = false,
  stepList = [],
  currentStepIndex: _currentStepIndex = 0,
  minimalMode = false,
  className = '',
}: SequenceDiagramProps) {
  // Parse the chart to get participants and messages
  const { participants, messages } = useMemo(() => {
    return parseSequenceDiagram(chart);
  }, [chart]);

  // Calculate layout
  const { participantPositions, lifelineHeight, messageYPositions } = useMemo(() => {
    return calculateSequenceLayout(participants, messages.length);
  }, [participants, messages.length]);

  // Build step number map from stepList
  const messageToStepNumber = useMemo(() => {
    const map = new Map<string, number>();
    stepList.forEach((step, idx) => {
      const parsed = parseMessagePath(step.path);
      if (parsed) {
        const key = `${parsed.from}-${parsed.to}`;
        if (!map.has(key)) {
          map.set(key, idx + 1);
        }
      }
    });
    return map;
  }, [stepList]);

  // Create React Flow nodes for participants
  const initialNodes: Node<ParticipantNodeData>[] = useMemo(() => {
    return participants.map((participant) => {
      const pos = participantPositions.get(participant) || { x: 0, y: 0 };
      return {
        id: participant,
        type: 'participant',
        position: pos,
        data: {
          label: participant,
          isActive: false,
          lifelineHeight,
          color: DEFAULT_THEME.primaryColor,
        },
      };
    });
  }, [participants, participantPositions, lifelineHeight]);

  // Create React Flow edges for messages
  const initialEdges: Edge<MessageEdgeData>[] = useMemo(() => {
    return messages.map((msg, idx) => {
      const sourcePos = participantPositions.get(msg.from);
      const targetPos = participantPositions.get(msg.to);
      if (!sourcePos || !targetPos) return null;

      const y = messageYPositions[idx] || 100;
      const messageKey = `${msg.from}-${msg.to}`;
      const stepNumber = messageToStepNumber.get(messageKey);

      return {
        id: `msg-${idx}`,
        source: msg.from,
        target: msg.to,
        type: 'message',
        sourceHandle: 'source',
        targetHandle: 'target',
        // Custom edge positioning based on message index
        style: { stroke: DEFAULT_THEME.inactiveColor },
        data: {
          label: msg.label,
          isActive: false,
          isCompleted: false,
          isAsync: msg.isAsync,
          color: DEFAULT_THEME.primaryColor,
          stepNumber,
          showStepNumber: showStepNumbers,
          // Store Y position for edge rendering
          messageY: y,
        } as MessageEdgeData & { messageY: number },
      };
    }).filter((e): e is NonNullable<typeof e> => e !== null);
  }, [messages, participantPositions, messageYPositions, messageToStepNumber, showStepNumbers]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges based on current step
  useEffect(() => {
    const currentParsed = currentPath ? parseMessagePath(currentPath) : null;
    const completedSet = new Set(
      completedPaths.map((p) => {
        const parsed = parseMessagePath(p);
        return parsed ? `${parsed.from}-${parsed.to}` : '';
      }).filter(Boolean)
    );

    // Update participant highlighting
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isActive: currentParsed
            ? node.id === currentParsed.from || node.id === currentParsed.to
            : false,
        },
      }))
    );

    // Update message highlighting
    setEdges((eds) =>
      eds.map((edge, idx) => {
        const msg = messages[idx];
        if (!msg) return edge;

        const msgKey = `${msg.from}-${msg.to}`;
        const isActive = currentParsed
          ? msg.from === currentParsed.from && msg.to === currentParsed.to
          : false;
        const isCompleted = completedSet.has(msgKey);

        return {
          ...edge,
          data: {
            ...edge.data,
            isActive,
            isCompleted,
          },
        };
      })
    );
  }, [currentPath, completedPaths, messages, setNodes, setEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onNodeClick?.(node.id);
  }, [onNodeClick]);

  const compactMode = showStepNumbers;
  const hideExtras = compactMode || minimalMode;

  const containerClass = hideExtras
    ? 'h-full'
    : 'h-full bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden';

  return (
    <div className={`sequence-diagram ${className} ${compactMode ? 'flex flex-col' : ''}`} style={{ height }}>
      <div className={containerClass}>
        <ReactFlowProvider>
          {compactMode && <DiagramToolbar onClose={onClose} />}

          <div className={compactMode ? 'flex-1 min-h-0' : 'h-full'}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.1, minZoom: 0.5, maxZoom: 1.5 }}
              minZoom={0.3}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
              // Sequence diagrams flow horizontally
              defaultEdgeOptions={{
                type: 'message',
              }}
            >
              <Background color="#334155" gap={20} size={1} />
            </ReactFlow>
          </div>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
