/**
 * MessageEdge - Horizontal message arrow for sequence diagrams
 * Uses CSS offset-path for GPU-accelerated particle animation
 */

import { EdgeProps, getBezierPath } from '@xyflow/react';
import { DEFAULT_THEME } from './types';

export interface MessageEdgeData extends Record<string, unknown> {
  label?: string;
  isActive: boolean;
  isCompleted: boolean;
  isAsync?: boolean; // Dashed line for async messages
  color?: string;
  stepNumber?: number;
  showStepNumber?: boolean;
}

/**
 * Sequence diagram message edge with:
 * - Horizontal arrow between participants
 * - Label above the arrow
 * - Solid (sync) or dashed (async) line style
 * - Animated particles when active
 * - Step number badge (optional)
 */
export function MessageEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const edgeData = data as MessageEdgeData | undefined;
  const isActive = edgeData?.isActive ?? false;
  const isCompleted = edgeData?.isCompleted ?? false;
  const isAsync = edgeData?.isAsync ?? false;
  const color = edgeData?.color || DEFAULT_THEME.primaryColor;
  const label = edgeData?.label;
  const stepNumber = edgeData?.stepNumber;
  const showStepNumber = edgeData?.showStepNumber ?? false;

  // Use a simple straight line path for horizontal messages
  // We'll create a gentle curve for better visual
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.1, // Slight curve for visual interest
  });

  // Determine stroke color based on state
  const strokeColor = isActive
    ? color
    : isCompleted
      ? DEFAULT_THEME.completedColor
      : DEFAULT_THEME.inactiveColor;

  // Arrow marker ID
  const markerId = `arrow-${id}`;

  return (
    <>
      {/* Define arrow marker */}
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,10 L10,5 z"
            fill={strokeColor}
          />
        </marker>
      </defs>

      {/* Message line */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isActive ? 2.5 : 2}
        strokeDasharray={isAsync ? '6,4' : undefined}
        markerEnd={`url(#${markerId})`}
        style={{
          transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
        }}
      />

      {/* Message label above the line */}
      {label && (
        <g transform={`translate(${labelX}, ${labelY - 10})`}>
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill={isActive ? '#f8fafc' : isCompleted ? DEFAULT_THEME.completedColor : '#94a3b8'}
            fontSize="11"
            fontWeight={isActive ? 'bold' : 'normal'}
            style={{
              transition: 'fill 0.3s ease',
            }}
          >
            {label}
          </text>
        </g>
      )}

      {/* Step number badge (optional) */}
      {showStepNumber && stepNumber !== undefined && (
        <g transform={`translate(${labelX}, ${labelY + 12})`}>
          <circle
            r="10"
            fill={isActive ? color : isCompleted ? DEFAULT_THEME.completedColor : '#1e293b'}
            stroke={isActive ? 'white' : isCompleted ? DEFAULT_THEME.completedColor : DEFAULT_THEME.inactiveColor}
            strokeWidth="1.5"
          />
          <text
            x="0"
            y="1"
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize="10"
            fontWeight="bold"
          >
            {stepNumber}
          </text>
        </g>
      )}

      {/* Animated particles when active */}
      {isActive && (
        <>
          <circle
            r="5"
            fill={color}
            className="flow-particle flow-particle-1"
            style={{ offsetPath: `path('${edgePath}')` }}
          />
          <circle
            r="3"
            fill={color}
            opacity="0.6"
            className="flow-particle flow-particle-2"
            style={{ offsetPath: `path('${edgePath}')` }}
          />
        </>
      )}
    </>
  );
}
