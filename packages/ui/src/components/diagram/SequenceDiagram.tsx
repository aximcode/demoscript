/**
 * SequenceDiagram - Renders Mermaid sequence diagrams with step highlighting
 * Uses CSS styling to highlight the current message/interaction
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import mermaid from 'mermaid';

interface SequenceDiagramProps {
  chart: string;                    // Mermaid sequence diagram syntax
  currentPath?: string;             // Current message: "A->>B" or "A-->>B"
  completedPaths?: string[];        // Previously highlighted paths
  height?: number;                  // Diagram height (default: 300)
  minimalMode?: boolean;            // Compact mode for sticky/top positions
  className?: string;
}

// Parse sequence diagram path to extract participants
function parseSequencePath(path: string): { from: string; to: string; arrow: string } | null {
  // Match: A->>B or A-->>B or A->B or A-->B
  const match = path.match(/^(\w+)(--?>>?|--?>)(\w+)$/);
  if (match) {
    return { from: match[1], arrow: match[2], to: match[3] };
  }
  return null;
}

export function SequenceDiagram({
  chart,
  currentPath,
  completedPaths = [],
  height = 300,
  minimalMode = false,
  className = '',
}: SequenceDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Parse current and completed paths for highlighting
  const highlightInfo = useMemo(() => {
    const current = currentPath ? parseSequencePath(currentPath) : null;
    const completed = completedPaths.map(p => parseSequencePath(p)).filter(Boolean);
    return { current, completed };
  }, [currentPath, completedPaths]);

  // Get the message index for the current path (1-indexed for CSS)
  const currentMessageIndex = useMemo(() => {
    if (!currentPath) return -1;
    // Count messages in chart up to and including current
    const lines = chart.split('\n');
    let messageCount = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      // Match message patterns
      if (trimmed.match(/^\w+\s*--?>>?\s*\w+/)) {
        messageCount++;
        // Check if this line matches current path pattern
        const parsed = parseSequencePath(currentPath);
        if (parsed && trimmed.includes(parsed.from) && trimmed.includes(parsed.to)) {
          // Check arrow type matches too
          if (trimmed.includes(parsed.arrow)) {
            return messageCount;
          }
        }
      }
    }
    return completedPaths.length + 1;
  }, [chart, currentPath, completedPaths]);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!chart.trim()) {
        setSvg('');
        return;
      }

      try {
        const id = `seq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Configure mermaid for sequence diagrams
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          sequence: {
            useMaxWidth: true,
            showSequenceNumbers: false,
            actorMargin: 50,
            messageFontSize: 12,
            noteFontSize: 12,
            wrap: true,
            mirrorActors: false,
          },
          themeVariables: {
            primaryColor: '#8b5cf6',
            primaryTextColor: '#f8fafc',
            primaryBorderColor: '#6d28d9',
            lineColor: '#64748b',
            secondaryColor: '#1e293b',
            tertiaryColor: '#334155',
            actorBkg: '#1e293b',
            actorBorder: '#6d28d9',
            actorTextColor: '#f8fafc',
            actorLineColor: '#64748b',
            signalColor: '#f8fafc',
            signalTextColor: '#f8fafc',
            labelBoxBkgColor: '#1e293b',
            labelBoxBorderColor: '#6d28d9',
            labelTextColor: '#f8fafc',
            loopTextColor: '#f8fafc',
            noteBorderColor: '#6d28d9',
            noteBkgColor: '#1e293b',
            noteTextColor: '#f8fafc',
            activationBorderColor: '#8b5cf6',
            activationBkgColor: '#6d28d9',
            sequenceNumberColor: '#f8fafc',
          },
        });

        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        console.error('Sequence diagram render error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setSvg('');
      }
    };

    renderDiagram();
  }, [chart]);

  // Apply highlighting styles after SVG is rendered
  useEffect(() => {
    if (!containerRef.current || !svg || currentMessageIndex < 0) return;

    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    // Find all message lines (arrows) and text
    const messageLines = svgElement.querySelectorAll('.messageLine0, .messageLine1');
    const messageTexts = svgElement.querySelectorAll('.messageText');

    // Reset all styles first
    messageLines.forEach((line, idx) => {
      const el = line as SVGElement;
      const isCompleted = idx < currentMessageIndex - 1;
      const isCurrent = idx === currentMessageIndex - 1;

      if (isCurrent) {
        el.style.stroke = '#8b5cf6';
        el.style.strokeWidth = '3';
        el.style.filter = 'drop-shadow(0 0 6px #8b5cf6)';
      } else if (isCompleted) {
        el.style.stroke = '#10b981';
        el.style.strokeWidth = '2';
        el.style.filter = 'none';
      } else {
        el.style.stroke = '#64748b';
        el.style.strokeWidth = '1.5';
        el.style.filter = 'none';
      }
    });

    // Style message text
    messageTexts.forEach((text, idx) => {
      const el = text as SVGElement;
      const isCompleted = idx < currentMessageIndex - 1;
      const isCurrent = idx === currentMessageIndex - 1;

      if (isCurrent) {
        el.style.fill = '#f8fafc';
        el.style.fontWeight = 'bold';
      } else if (isCompleted) {
        el.style.fill = '#10b981';
        el.style.fontWeight = 'normal';
      } else {
        el.style.fill = '#94a3b8';
        el.style.fontWeight = 'normal';
      }
    });

    // Highlight actors involved in current message
    if (highlightInfo.current) {
      const actors = svgElement.querySelectorAll('.actor');

      actors.forEach((actor) => {
        const el = actor as SVGElement;
        const textEl = el.querySelector('text') || el;
        const actorName = textEl?.textContent?.trim();

        if (actorName === highlightInfo.current?.from || actorName === highlightInfo.current?.to) {
          // Highlight active participants
          const rect = el.querySelector('rect') || el;
          if (rect instanceof SVGElement) {
            rect.style.stroke = '#8b5cf6';
            rect.style.strokeWidth = '2';
            rect.style.filter = 'drop-shadow(0 0 4px #8b5cf6)';
          }
        }
      });
    }
  }, [svg, currentMessageIndex, highlightInfo]);

  if (error) {
    return (
      <div className={`p-4 bg-red-900/20 border border-red-800 rounded-lg ${className}`}>
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">Sequence Diagram Error</span>
        </div>
        <pre className="text-sm text-red-300 whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`sequence-diagram bg-slate-900/50 rounded-lg border border-slate-700 overflow-auto ${className}`}
      style={{ height: minimalMode ? 'auto' : height, maxHeight: height }}
    >
      <div
        className="flex justify-center items-center p-4 min-h-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <style>{`
        .sequence-diagram svg {
          max-width: 100%;
          height: auto;
        }
        .sequence-diagram .actor {
          transition: all 0.3s ease;
        }
        .sequence-diagram .messageLine0,
        .sequence-diagram .messageLine1 {
          transition: stroke 0.3s ease, stroke-width 0.3s ease;
        }
        .sequence-diagram .messageText {
          transition: fill 0.3s ease;
        }
      `}</style>
    </div>
  );
}
