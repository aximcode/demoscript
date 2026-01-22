import { useState, useCallback, useRef, type ReactNode } from 'react';

interface SplitViewProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number; // Percentage (0-100)
  minLeftWidth?: number; // Percentage
  maxLeftWidth?: number; // Percentage
  showDivider?: boolean;
}

export function SplitView({
  left,
  right,
  defaultLeftWidth = 40,
  minLeftWidth = 20,
  maxLeftWidth = 80,
  showDivider = true,
}: SplitViewProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Clamp to min/max
      const clampedWidth = Math.min(Math.max(newWidth, minLeftWidth), maxLeftWidth);
      setLeftWidth(clampedWidth);
    },
    [isDragging, minLeftWidth, maxLeftWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Attach global mouse events when dragging
  useState(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  });

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full overflow-hidden"
      onMouseMove={isDragging ? (e) => handleMouseMove(e.nativeEvent) : undefined}
      onMouseUp={isDragging ? handleMouseUp : undefined}
      onMouseLeave={isDragging ? handleMouseUp : undefined}
    >
      {/* Left panel */}
      <div
        className="h-full overflow-auto flex-shrink-0"
        style={{ width: `${leftWidth}%` }}
      >
        {left}
      </div>

      {/* Divider */}
      {showDivider && (
        <div
          className={`
            w-1 flex-shrink-0 cursor-col-resize
            bg-gray-200 dark:bg-slate-700
            hover:bg-primary-400 dark:hover:bg-primary-500
            transition-colors duration-150
            ${isDragging ? 'bg-primary-500 dark:bg-primary-400' : ''}
          `}
          onMouseDown={handleMouseDown}
        >
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-0.5 h-8 bg-gray-400 dark:bg-slate-500 rounded-full opacity-50" />
          </div>
        </div>
      )}

      {/* Right panel */}
      <div className="flex-1 h-full overflow-auto">
        {right}
      </div>
    </div>
  );
}

// Collapsible variant for mobile-friendly layouts
interface CollapsibleSplitViewProps extends SplitViewProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  collapseLabel?: string;
}

export function CollapsibleSplitView({
  left,
  right,
  collapsed = false,
  onToggleCollapse,
  collapseLabel = 'Editor',
  ...splitProps
}: CollapsibleSplitViewProps) {
  if (collapsed) {
    return (
      <div className="flex flex-col h-full">
        {/* Collapsed header */}
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
            {collapseLabel}
          </span>
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Preview only */}
        <div className="flex-1 overflow-auto">
          {right}
        </div>
      </div>
    );
  }

  return <SplitView left={left} right={right} {...splitProps} />;
}
