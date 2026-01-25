/**
 * AnimatedFlowDiagramV3 - Using React Flow for modern animated flow diagrams
 * Features:
 * - Visible animated particles flowing along edges
 * - Clickable nodes to jump to steps
 * - Smooth transitions and glow effects
 * - Auto-layout from simple node/edge definitions
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
  EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface FlowStep {
  from: string;
  to: string;
  label: string;
  color?: string;
}

interface AnimatedFlowDiagramV3Props {
  chart: string; // Simplified node definitions (we'll parse this)
  steps: FlowStep[];
  currentStep: number;
  autoPlay?: boolean;
  stepDuration?: number;
  onStepChange?: (step: number) => void;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

// Custom animated edge with moving particle
function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const isActive = data?.isActive as boolean;
  const isCompleted = data?.isCompleted as boolean;
  const edgeColor = (data?.color as string) || '#8b5cf6';

  return (
    <>
      {/* Base edge */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={isActive ? edgeColor : isCompleted ? '#10b981' : '#475569'}
        strokeWidth={isActive ? 3 : 2}
        style={{
          filter: isActive ? `drop-shadow(0 0 8px ${edgeColor})` : undefined,
        }}
        markerEnd={typeof markerEnd === 'string' ? markerEnd : undefined}
      />

      {/* Animated particle when active */}
      {isActive && (
        <>
          {/* Multiple particles for a stream effect */}
          <circle r="6" fill={edgeColor} filter={`drop-shadow(0 0 6px ${edgeColor})`}>
            <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="4" fill="white" opacity="0.8">
            <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} begin="0.5s" />
          </circle>
          <circle r="6" fill={edgeColor} filter={`drop-shadow(0 0 6px ${edgeColor})`}>
            <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} begin="1s" />
          </circle>
        </>
      )}
    </>
  );
}

// Custom node component with glow effects
function CustomNode({ data }: { data: { label: string; type: string; isActive: boolean; isSource: boolean; isTarget: boolean; color: string } }) {
  const isActive = data.isActive || data.isSource || data.isTarget;
  const color = data.color || '#8b5cf6';

  // Different shapes based on type
  const getNodeStyle = () => {
    const baseStyle = {
      padding: '12px 20px',
      borderRadius: data.type === 'diamond' ? '4px' : data.type === 'circle' ? '50%' : '8px',
      border: `2px solid ${isActive ? color : '#475569'}`,
      background: isActive
        ? `linear-gradient(135deg, ${color}20, ${color}40)`
        : 'linear-gradient(135deg, #1e293b, #334155)',
      color: '#f8fafc',
      fontWeight: 500,
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: isActive
        ? `0 0 20px ${color}60, 0 4px 12px rgba(0,0,0,0.3)`
        : '0 4px 12px rgba(0,0,0,0.2)',
      transform: data.type === 'diamond' ? 'rotate(45deg)' : undefined,
      minWidth: data.type === 'circle' ? '60px' : undefined,
      minHeight: data.type === 'circle' ? '60px' : undefined,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
    return baseStyle;
  };

  return (
    <div style={getNodeStyle()}>
      <Handle type="target" position={Position.Left} style={{ background: color, border: 'none' }} />
      <span style={{ transform: data.type === 'diamond' ? 'rotate(-45deg)' : undefined }}>
        {data.label}
      </span>
      <Handle type="source" position={Position.Right} style={{ background: color, border: 'none' }} />
    </div>
  );
}

const nodeTypes = { custom: CustomNode };
const edgeTypes = { animated: AnimatedEdge };

// Parse simple chart definition to nodes and edges
function parseChartDefinition(chart: string): { nodeDefinitions: Map<string, { label: string; type: string }>; connections: Array<{ from: string; to: string; label?: string }> } {
  const nodeDefinitions = new Map<string, { label: string; type: string }>();
  const connections: Array<{ from: string; to: string; label?: string }> = [];

  const lines = chart.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('flowchart'));

  for (const line of lines) {
    // Parse node definitions like: Client([Client]) or API[API Server] or Auth{Auth Service}
    const nodeMatch = line.match(/^(\w+)(\[|\(|\{)(.+?)(\]|\)|\})\s*$/);
    if (nodeMatch) {
      const [, id, openBracket, label] = nodeMatch;
      let type = 'default';
      if (openBracket === '(') type = 'circle';
      else if (openBracket === '{') type = 'diamond';
      nodeDefinitions.set(id, { label: label.replace(/^\[|\]$/g, '').replace(/^\(|\)$/g, ''), type });
      continue;
    }

    // Parse connections like: Client -->|1| API or Client --> API
    const connMatch = line.match(/(\w+)\s*-->(|\|[^|]+\|)\s*(\w+)/);
    if (connMatch) {
      const [, from, labelPart, to] = connMatch;
      const label = labelPart ? labelPart.replace(/^\||\|$/g, '') : undefined;
      connections.push({ from, to, label });

      // Auto-create node definitions if not explicitly defined
      if (!nodeDefinitions.has(from)) {
        nodeDefinitions.set(from, { label: from, type: 'default' });
      }
      if (!nodeDefinitions.has(to)) {
        nodeDefinitions.set(to, { label: to, type: 'default' });
      }
    }
  }

  return { nodeDefinitions, connections };
}

// Simple auto-layout
function calculateLayout(
  nodeDefinitions: Map<string, { label: string; type: string }>,
  connections: Array<{ from: string; to: string }>,
  direction: 'LR' | 'TD' = 'LR'
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const nodeIds = Array.from(nodeDefinitions.keys());

  // Build adjacency for topological sort
  const inDegree = new Map<string, number>();
  const outEdges = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    outEdges.set(id, []);
  }

  for (const conn of connections) {
    inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
    outEdges.get(conn.from)?.push(conn.to);
  }

  // Topological layers
  const layers: string[][] = [];
  const remaining = new Set(nodeIds);

  while (remaining.size > 0) {
    const layer: string[] = [];
    for (const id of remaining) {
      if ((inDegree.get(id) || 0) === 0) {
        layer.push(id);
      }
    }

    if (layer.length === 0) {
      // Handle cycles - just add remaining
      layer.push(...remaining);
      remaining.clear();
    } else {
      for (const id of layer) {
        remaining.delete(id);
        for (const target of outEdges.get(id) || []) {
          inDegree.set(target, (inDegree.get(target) || 0) - 1);
        }
      }
    }

    layers.push(layer);
  }

  // Position nodes
  const xSpacing = direction === 'LR' ? 200 : 0;
  const ySpacing = direction === 'LR' ? 100 : 150;

  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const layer = layers[layerIdx];
    const layerHeight = layer.length * ySpacing;
    const startY = -layerHeight / 2 + ySpacing / 2;

    for (let nodeIdx = 0; nodeIdx < layer.length; nodeIdx++) {
      const id = layer[nodeIdx];
      if (direction === 'LR') {
        positions.set(id, {
          x: layerIdx * xSpacing,
          y: startY + nodeIdx * ySpacing,
        });
      } else {
        positions.set(id, {
          x: startY + nodeIdx * 200,
          y: layerIdx * ySpacing,
        });
      }
    }
  }

  return positions;
}

export function AnimatedFlowDiagramV3({
  chart,
  steps,
  currentStep: externalStep,
  autoPlay = false,
  stepDuration = 2000,
  onStepChange,
  onNodeClick,
  className = '',
}: AnimatedFlowDiagramV3Props) {
  const [internalStep, setInternalStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  const currentStep = onStepChange ? externalStep : internalStep;
  const setCurrentStep = onStepChange || setInternalStep;

  // Parse chart and create initial nodes/edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodeDefinitions, connections } = parseChartDefinition(chart);
    const direction = chart.includes('flowchart TD') || chart.includes('flowchart TB') ? 'TD' : 'LR';
    const positions = calculateLayout(nodeDefinitions, connections, direction);

    const nodes: Node[] = [];
    for (const [id, def] of nodeDefinitions) {
      const pos = positions.get(id) || { x: 0, y: 0 };
      nodes.push({
        id,
        type: 'custom',
        position: pos,
        data: {
          label: def.label,
          type: def.type,
          isActive: false,
          isSource: false,
          isTarget: false,
          color: '#8b5cf6',
        },
      });
    }

    const edges: Edge[] = connections.map((conn, idx) => ({
      id: `e-${conn.from}-${conn.to}-${idx}`,
      source: conn.from,
      target: conn.to,
      type: 'animated',
      data: { isActive: false, isCompleted: false, color: '#8b5cf6' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
    }));

    return { initialNodes: nodes, initialEdges: edges };
  }, [chart, steps]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges based on current step
  useEffect(() => {
    if (steps.length === 0) return;

    const activeStep = steps[currentStep];
    if (!activeStep) return;

    // Update nodes
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isActive: node.id === activeStep.from || node.id === activeStep.to,
          isSource: node.id === activeStep.from,
          isTarget: node.id === activeStep.to,
          color: activeStep.color || '#8b5cf6',
        },
      }))
    );

    // Update edges
    setEdges((eds) =>
      eds.map((edge) => {
        const isActive = edge.source === activeStep.from && edge.target === activeStep.to;
        const isCompleted = steps.slice(0, currentStep).some(
          (s) => edge.source === s.from && edge.target === s.to
        );

        return {
          ...edge,
          data: {
            ...edge.data,
            isActive,
            isCompleted,
            color: activeStep.color || '#8b5cf6',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isActive ? (activeStep.color || '#8b5cf6') : isCompleted ? '#10b981' : '#475569',
          },
        };
      })
    );
  }, [currentStep, steps, setNodes, setEdges]);

  // Auto-play
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      const next = currentStep + 1;
      if (next >= steps.length) {
        setIsPlaying(false);
      } else {
        setCurrentStep(next);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isPlaying, currentStep, steps.length, stepDuration, setCurrentStep]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    // Find the step that involves this node
    const stepIdx = steps.findIndex((s) => s.from === node.id || s.to === node.id);
    if (stepIdx !== -1) {
      setIsPlaying(false);
      setCurrentStep(stepIdx);
      onNodeClick?.(node.id);
    }
  }, [steps, setCurrentStep, onNodeClick]);

  const handlePlay = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(true);
  }, [currentStep, steps.length, setCurrentStep]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, [setCurrentStep]);

  const handleStepClick = useCallback((index: number) => {
    setIsPlaying(false);
    setCurrentStep(index);
  }, [setCurrentStep]);

  const activeStep = steps[currentStep];

  return (
    <div className={`animated-flow-diagram-v3 ${className}`}>
      {/* Diagram */}
      <div className="h-[400px] bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.5}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#334155" gap={20} size={1} />
          <Controls
            className="!bg-slate-800 !border-slate-600 !rounded-lg"
            showInteractive={false}
          />
        </ReactFlow>
      </div>

      {/* Current Step Label */}
      {activeStep && (
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/30">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{
                backgroundColor: activeStep.color || '#8b5cf6',
                boxShadow: `0 0 20px ${activeStep.color || '#8b5cf6'}60`,
              }}
            >
              {currentStep + 1}
            </div>
            <div>
              <div className="text-sm text-slate-400">
                {activeStep.from} → {activeStep.to}
              </div>
              <div className="text-lg font-medium text-white">
                {activeStep.label}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step Timeline */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((step, index) => (
          <button
            key={index}
            onClick={() => handleStepClick(index)}
            className={`
              flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${index === currentStep
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                : index < currentStep
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }
            `}
          >
            <span className="font-bold mr-1">{index + 1}.</span>
            {step.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          onClick={handleReset}
          className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          title="Reset"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {isPlaying ? (
          <button
            onClick={handlePause}
            className="p-3 rounded-full bg-purple-500 text-white shadow-lg shadow-purple-500/30 hover:bg-purple-600 transition-colors"
            title="Pause"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handlePlay}
            className="p-3 rounded-full bg-purple-500 text-white shadow-lg shadow-purple-500/30 hover:bg-purple-600 transition-colors"
            title="Play"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}

        <button
          onClick={() => setCurrentStep(Math.min(currentStep + 1, steps.length - 1))}
          disabled={currentStep >= steps.length - 1}
          className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors disabled:opacity-40"
          title="Next Step"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
