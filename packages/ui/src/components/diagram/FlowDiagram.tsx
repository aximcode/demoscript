/**
 * FlowDiagram - Wrapper component for AnimatedFlowDiagramV3
 * Converts diagram path strings to the step format expected by the core component
 */

import { useMemo, useCallback } from 'react';
import { AnimatedFlowDiagramV3 } from '../AnimatedFlowDiagramV3';

interface FlowStep {
  from: string;
  to: string;
  label: string;
  color?: string;
}

interface FlowDiagramProps {
  chart: string;                    // Mermaid flowchart syntax
  currentPath?: string;             // Current path: "NodeA->NodeB" or "NodeA"
  completedPaths?: string[];        // Previously highlighted paths
  stepTitle?: string;               // Label to show on current edge
  height?: number;                  // Diagram height (default: 300)
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

/**
 * Parse a diagram path string into a FlowStep object
 * Supports: "NodeA->NodeB" for edges, "NodeA" for single node highlight
 */
function parseDiagramPath(path: string, label: string = ''): FlowStep | null {
  if (!path) return null;

  // Check for edge syntax: "NodeA->NodeB"
  const edgeMatch = path.match(/^(\w+)\s*->\s*(\w+)$/);
  if (edgeMatch) {
    return {
      from: edgeMatch[1],
      to: edgeMatch[2],
      label,
    };
  }

  // Single node highlight: "NodeA"
  const nodeMatch = path.match(/^(\w+)$/);
  if (nodeMatch) {
    return {
      from: nodeMatch[1],
      to: nodeMatch[1],  // Same node = highlight only, no edge animation
      label,
    };
  }

  return null;
}

/**
 * Build a steps array from current and completed paths
 */
function buildStepsFromPaths(
  currentPath?: string,
  completedPaths?: string[],
  stepTitle?: string
): FlowStep[] {
  const steps: FlowStep[] = [];

  // Add completed paths first
  if (completedPaths) {
    for (const path of completedPaths) {
      const step = parseDiagramPath(path, '');
      if (step) {
        steps.push(step);
      }
    }
  }

  // Add current path last
  if (currentPath) {
    const step = parseDiagramPath(currentPath, stepTitle || '');
    if (step) {
      steps.push(step);
    }
  }

  return steps;
}

export function FlowDiagram({
  chart,
  currentPath,
  completedPaths,
  stepTitle,
  height = 300,
  onNodeClick,
  className = '',
}: FlowDiagramProps) {
  // Build steps array from paths
  const steps = useMemo(
    () => buildStepsFromPaths(currentPath, completedPaths, stepTitle),
    [currentPath, completedPaths, stepTitle]
  );

  // Current step is always the last one (the current path)
  const currentStep = steps.length > 0 ? steps.length - 1 : 0;

  // Handle node click - find steps involving this node
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      onNodeClick?.(nodeId);
    },
    [onNodeClick]
  );

  // Don't render if no steps
  if (steps.length === 0 && !chart) {
    return null;
  }

  return (
    <div className={className} style={{ height }}>
      <AnimatedFlowDiagramV3
        chart={chart}
        steps={steps}
        currentStep={currentStep}
        onNodeClick={handleNodeClick}
        className="h-full"
      />
    </div>
  );
}

// Re-export the parse function for testing/utilities
export { parseDiagramPath };
