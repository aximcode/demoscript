/**
 * ParticipantNode - Sequence diagram participant (actor) with lifeline
 * Used in React Flow-based sequence diagrams
 */

import { Handle, Position } from '@xyflow/react';
import { DEFAULT_THEME } from './types';

export interface ParticipantNodeData extends Record<string, unknown> {
  label: string;
  isActive: boolean;
  lifelineHeight: number;
  color?: string;
}

interface ParticipantNodeProps {
  data: ParticipantNodeData;
}

/**
 * Sequence diagram participant node with:
 * - Box at top with label
 * - Dashed lifeline extending downward
 * - Active state highlighting
 * - Hidden handles for edge connections
 */
export function ParticipantNode({ data }: ParticipantNodeProps) {
  const color = data.color || DEFAULT_THEME.primaryColor;
  const isActive = data.isActive;
  const lifelineHeight = data.lifelineHeight || 200;

  return (
    <div
      className="participant-node"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Participant box */}
      <div
        style={{
          padding: '8px 16px',
          borderRadius: '6px',
          border: `2px solid ${isActive ? color : DEFAULT_THEME.inactiveColor}`,
          background: isActive
            ? `linear-gradient(135deg, ${color}20, ${color}40)`
            : 'linear-gradient(135deg, #1e293b, #334155)',
          color: '#f8fafc',
          fontWeight: 600,
          fontSize: '12px',
          whiteSpace: 'nowrap',
          boxShadow: isActive
            ? `0 0 12px ${color}50`
            : '0 2px 4px rgba(0,0,0,0.2)',
          transition: 'all 0.3s ease',
          zIndex: 2,
          position: 'relative',
        }}
      >
        {data.label}
      </div>

      {/* Lifeline (dashed vertical line) */}
      <svg
        width="2"
        height={lifelineHeight}
        style={{
          overflow: 'visible',
          marginTop: '-1px', // Overlap with box border
        }}
      >
        <line
          x1="1"
          y1="0"
          x2="1"
          y2={lifelineHeight}
          stroke={isActive ? color : DEFAULT_THEME.inactiveColor}
          strokeWidth="2"
          strokeDasharray="6,4"
          style={{
            transition: 'stroke 0.3s ease',
          }}
        />
      </svg>

      {/* Hidden handles for edge connections - positioned along the lifeline */}
      {/* Source handle at center for outgoing messages */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{
          background: 'transparent',
          border: 'none',
          width: 1,
          height: 1,
          top: '50%',
        }}
      />
      {/* Target handle at center for incoming messages */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{
          background: 'transparent',
          border: 'none',
          width: 1,
          height: 1,
          top: '50%',
        }}
      />
    </div>
  );
}
