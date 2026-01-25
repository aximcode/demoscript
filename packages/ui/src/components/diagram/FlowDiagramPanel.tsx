/**
 * FlowDiagramPanel - Panel wrapper for FlowDiagram with position modes
 * Supports: sticky (above content), sidebar (right panel), toggle (show/hide)
 */

import { FlowDiagram } from './FlowDiagram';
import type { DiagramSettings } from '../../types/schema';

interface FlowDiagramPanelProps {
  settings: DiagramSettings;
  currentPath?: string;
  completedPaths?: string[];
  stepTitle?: string;
  isVisible?: boolean;
  onToggle?: () => void;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

export function FlowDiagramPanel({
  settings,
  currentPath,
  completedPaths,
  stepTitle,
  isVisible = true,
  onToggle,
  onNodeClick,
  className = '',
}: FlowDiagramPanelProps) {
  const position = settings.position || 'toggle';
  const height = settings.height || 300;

  // Toggle mode: hidden by default, shown via button
  if (position === 'toggle' && !isVisible) {
    return null;
  }

  // Panel content
  const panelContent = (
    <div className={`relative ${className}`}>
      {/* Header with toggle button (for sticky/sidebar modes) */}
      {(position === 'sticky' || position === 'sidebar') && onToggle && (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-300 transition-colors"
            title={isVisible ? 'Hide Diagram' : 'Show Diagram'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Diagram */}
      <FlowDiagram
        chart={settings.chart}
        currentPath={currentPath}
        completedPaths={completedPaths}
        stepTitle={stepTitle}
        height={height}
        onNodeClick={onNodeClick}
      />
    </div>
  );

  // Render based on position mode
  switch (position) {
    case 'sticky':
      return (
        <div className="mb-6 bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 backdrop-blur-sm">
          {panelContent}
        </div>
      );

    case 'sidebar':
      return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 backdrop-blur-sm h-full">
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
