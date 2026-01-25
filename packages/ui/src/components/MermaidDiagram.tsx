/**
 * MermaidDiagram - Renders Mermaid diagrams in slides
 * Used by SlideStep to render ```mermaid code blocks
 */

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid with theme support
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
  },
});

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export function MermaidDiagram({ chart, className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!chart.trim()) {
        setSvg('');
        return;
      }

      try {
        // Generate unique ID for this diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Update theme based on dark mode
        const isDark = document.documentElement.classList.contains('dark');
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
          },
        });

        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setSvg('');
      }
    };

    renderDiagram();
  }, [chart]);

  if (error) {
    return (
      <div className={`p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">Diagram Error</span>
        </div>
        <pre className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">{error}</pre>
        <details className="mt-2">
          <summary className="text-xs text-red-500 dark:text-red-400 cursor-pointer">Show source</summary>
          <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-xs overflow-x-auto">{chart}</pre>
        </details>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`mermaid-diagram flex justify-center p-4 bg-white dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
