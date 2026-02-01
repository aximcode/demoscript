/**
 * FlowDiagramPanel - Panel wrapper for FlowDiagram/SequenceDiagram with position modes
 * Supports: top (replaces step nav), bottom, sidebar, toggle (show/hide)
 *
 * Visual Structure Priority:
 * 1. chart: provided -> use verbatim Mermaid
 * 2. nodes: provided -> auto-generate from nodes config
 * 3. enabled: true -> fully auto-generate from step diagram: values
 *
 * Diagram Types:
 * - flowchart: Uses React Flow for animated flow diagrams
 * - sequence: Uses Mermaid for sequence diagrams with highlighting
 */

import { useMemo } from 'react';
import { FlowDiagram } from './FlowDiagram';
import { SequenceDiagram } from './SequenceDiagram';
import type { DiagramSettings, Step } from '../../types/schema';
import {
  generateDiagram,
  buildPathToIndexFromSteps,
  getEffectivePosition,
  detectDiagramType,
} from '../../lib/diagram-generator';

interface StepInfo {
  index: number;
  title: string;
  path: string;
}

interface FlowDiagramPanelProps {
  settings: DiagramSettings;
  steps?: Step[];  // Full steps for auto-generation
  currentPath?: string;
  completedPaths?: string[];
  stepTitle?: string;
  currentStepIndex?: number;
  stepList?: StepInfo[];
  isVisible?: boolean;
  onToggle?: () => void;
  onNodeClick?: (nodeId: string) => void;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function FlowDiagramPanel({
  settings,
  steps = [],
  currentPath,
  completedPaths,
  stepTitle,
  currentStepIndex = 0,
  stepList = [],
  isVisible = true,
  onToggle,
  onNodeClick,
  onStepClick: _onStepClick,
  className = '',
}: FlowDiagramPanelProps) {
  // Determine effective position (smart defaults: LR -> top, TD -> sidebar)
  const position = getEffectivePosition(settings);
  const height = settings.height || 300;

  // Generate chart based on priority: chart -> nodes -> enabled
  // Also detect diagram type (flowchart vs sequence)
  const { chart, diagramType } = useMemo(() => {
    // Detect type from settings or step diagram: values
    const detectedType = settings.type || detectDiagramType(steps);

    // Priority 1: Custom chart provided
    if (settings.chart) {
      // Check if custom chart is a sequence diagram
      const isSequence = settings.chart.trim().startsWith('sequenceDiagram');
      return {
        chart: settings.chart,
        pathToIndex: buildPathToIndexFromSteps(steps),
        diagramType: isSequence ? 'sequence' as const : 'flowchart' as const,
      };
    }

    // Priority 2 & 3: Auto-generate from nodes or step diagram: values
    if (settings.nodes || settings.enabled) {
      const result = generateDiagram(steps, {
        enabled: settings.enabled,
        type: detectedType,
        direction: settings.direction,
        default_mode: settings.default_mode,
        nodes: settings.nodes,
        participants: settings.participants,
      });
      return {
        chart: result.chart,
        pathToIndex: result.pathToIndex,
        diagramType: detectedType,
      };
    }

    // No diagram configured
    return { chart: undefined, pathToIndex: new Map<string, number>(), diagramType: 'flowchart' as const };
  }, [settings, steps]);

  // Toggle mode: hidden by default, shown via button
  if (position === 'toggle' && !isVisible) {
    return null;
  }

  // No chart to display
  if (!chart) {
    return null;
  }


  // Panel content - no close button for sticky/top modes (diagram is always visible)
  const panelContent = (
    <div className={`relative ${position === 'sidebar' ? 'h-full flex flex-col' : ''} ${className}`}>
      {/* Render appropriate diagram component based on type */}
      {diagramType === 'sequence' ? (
        <SequenceDiagram
          chart={chart}
          currentPath={currentPath}
          completedPaths={completedPaths}
          height={position === 'sidebar' ? height : height}
          minimalMode={position === 'sticky' || position === 'top'}
          className={position === 'sidebar' ? 'flex-1 min-h-0' : ''}
        />
      ) : (
        <FlowDiagram
          chart={chart}
          currentPath={currentPath}
          completedPaths={completedPaths}
          stepTitle={stepTitle}
          height={position === 'sidebar' ? undefined : height}
          onNodeClick={onNodeClick}
          onClose={position === 'sidebar' ? onToggle : undefined}
          showStepNumbers={position === 'sidebar'}
          stepList={stepList}
          currentStepIndex={currentStepIndex}
          minimalMode={position === 'sticky' || position === 'top'}
          className={position === 'sidebar' ? 'flex-1 min-h-0' : ''}
        />
      )}
    </div>
  );

  // Render based on position mode
  switch (position) {
    case 'sticky':
      return (
        <div className="mb-4 bg-slate-800/50 rounded-lg border border-slate-700/50 p-1 backdrop-blur-sm">
          {panelContent}
        </div>
      );

    case 'sidebar':
      return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-2 backdrop-blur-sm h-full flex flex-col">
          {panelContent}
        </div>
      );

    case 'toggle':
    default:
      return (
        <div className="fixed bottom-4 right-4 z-50 w-[500px] max-w-[calc(100vw-2rem)] bg-slate-800/95 rounded-xl border border-slate-700/50 p-4 backdrop-blur-sm shadow-2xl">
          {/* Close button */}
          {onToggle && (
            <button
              onClick={onToggle}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-300 transition-colors z-10"
              title="Close Diagram"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {panelContent}
        </div>
      );
  }
}

/**
 * Toggle button to show/hide diagram (for use in header)
 */
interface DiagramToggleButtonProps {
  isVisible: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function DiagramToggleButton({ isVisible, onClick, disabled }: DiagramToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
        ${isVisible
          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300 border border-transparent'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      title={isVisible ? 'Hide Flow Diagram' : 'Show Flow Diagram'}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
        />
      </svg>
      <span>{isVisible ? 'Hide Diagram' : 'Diagram'}</span>
    </button>
  );
}
