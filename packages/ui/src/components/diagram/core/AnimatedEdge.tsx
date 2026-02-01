/**
 * AnimatedEdge - Reusable animated edge component for React Flow diagrams
 * Uses CSS offset-path for GPU-accelerated particle animation
 * Supports step number badges on edges
 */

import { getSmoothStepPath, EdgeProps } from '@xyflow/react';
import { DEFAULT_THEME, type EdgeData } from './types';

/**
 * Custom animated edge with moving particles and optional step number badge
 * Used by both FlowDiagram and SequenceDiagram
 */
export function AnimatedEdge({
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

  const edgeData = data as EdgeData | undefined;
  const isActive = edgeData?.isActive ?? false;
  const isCompleted = edgeData?.isCompleted ?? false;
  const edgeColor = edgeData?.color || DEFAULT_THEME.primaryColor;
  const stepNumber = edgeData?.stepNumber;
  const showStepNumber = edgeData?.showStepNumber ?? false;

  // Calculate midpoint for step number badge
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  // Determine edge stroke color based on state
  const strokeColor = isActive
    ? edgeColor
    : isCompleted
      ? DEFAULT_THEME.completedColor
      : DEFAULT_THEME.inactiveColor;

  // Determine badge colors based on state
  const badgeFill = isActive
    ? edgeColor
    : isCompleted
      ? DEFAULT_THEME.completedColor
      : '#1e293b';
  const badgeStroke = isActive
    ? 'white'
    : isCompleted
      ? DEFAULT_THEME.completedColor
      : DEFAULT_THEME.inactiveColor;

  return (
    <>
      {/* Base edge path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isActive ? 3 : 2}
        markerEnd={typeof markerEnd === 'string' ? markerEnd : undefined}
      />

      {/* Step number badge on edge (optional) */}
      {showStepNumber && stepNumber !== undefined && (
        <g transform={`translate(${midX}, ${midY})`}>
          <circle
            r="14"
            fill={badgeFill}
            stroke={badgeStroke}
            strokeWidth="2"
          />
          <text
            x="0"
            y="1"
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize="12"
            fontWeight="bold"
          >
            {stepNumber}
          </text>
        </g>
      )}

      {/* Animated particles when active - CSS offset-path for GPU acceleration */}
      {isActive && (
        <>
          <circle
            r="6"
            fill={edgeColor}
            className="flow-particle flow-particle-1"
            style={{ offsetPath: `path('${edgePath}')` }}
          />
          <circle
            r="4"
            fill={edgeColor}
            opacity="0.7"
            className="flow-particle flow-particle-2"
            style={{ offsetPath: `path('${edgePath}')` }}
          />
          <circle
            r="3"
            fill={edgeColor}
            opacity="0.5"
            className="flow-particle flow-particle-3"
            style={{ offsetPath: `path('${edgePath}')` }}
          />
        </>
      )}
    </>
  );
}
