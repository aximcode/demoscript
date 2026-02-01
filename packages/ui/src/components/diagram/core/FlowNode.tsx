/**
 * FlowNode - Reusable node component for React Flow flowcharts
 * Supports multiple shapes (rectangle, circle, diamond) and direction-aware handles
 */

import { Position, Handle } from '@xyflow/react';
import { DEFAULT_THEME, type NodeData } from './types';

interface FlowNodeProps {
  data: NodeData;
}

/**
 * Custom flow node with support for multiple shapes and glow effects
 * Shape variants: default (rectangle), circle, diamond
 * Handles are positioned based on flow direction (LR or TD)
 */
export function FlowNode({ data }: FlowNodeProps) {
  const isActive = data.isActive || data.isSource || data.isTarget;
  const color = data.color || DEFAULT_THEME.primaryColor;
  const direction = data.direction || 'LR';

  // Handle positions based on flow direction
  const targetPosition = direction === 'TD' ? Position.Top : Position.Left;
  const sourcePosition = direction === 'TD' ? Position.Bottom : Position.Right;

  // Different shapes based on type - compact sizing for edge alignment
  const getNodeStyle = (): React.CSSProperties => {
    // Use fixed height for ALL shapes to ensure horizontal edge alignment
    const nodeHeight = 20;
    const baseStyle: React.CSSProperties = {
      padding: '2px 8px',
      borderRadius: data.type === 'diamond' ? '4px' : data.type === 'circle' ? '50%' : '6px',
      border: `1px solid ${isActive ? color : DEFAULT_THEME.inactiveColor}`,
      background: isActive
        ? `linear-gradient(135deg, ${color}20, ${color}40)`
        : 'linear-gradient(135deg, #1e293b, #334155)',
      color: '#f8fafc',
      fontWeight: 500,
      fontSize: '10px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: isActive
        ? `0 0 8px ${color}50, 0 1px 4px rgba(0,0,0,0.3)`
        : '0 1px 4px rgba(0,0,0,0.2)',
      transform: data.type === 'diamond' ? 'rotate(45deg)' : undefined,
      // Consistent sizing for ALL shapes to ensure horizontal edges
      minWidth: data.type === 'circle' ? `${nodeHeight}px` : '60px',
      height: `${nodeHeight}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      whiteSpace: 'nowrap',
    };
    return baseStyle;
  };

  return (
    <div style={getNodeStyle()}>
      <Handle
        type="target"
        position={targetPosition}
        style={{ background: color, border: 'none' }}
      />
      <span style={{ transform: data.type === 'diamond' ? 'rotate(-45deg)' : undefined }}>
        {data.label}
      </span>
      <Handle
        type="source"
        position={sourcePosition}
        style={{ background: color, border: 'none' }}
      />
    </div>
  );
}
