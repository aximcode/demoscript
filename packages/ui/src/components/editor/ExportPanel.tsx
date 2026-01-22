import { useState } from 'react';
import { generateDemoYaml } from '@demoscript/builder';
import type { BuilderState } from './types';

interface Props {
  state: BuilderState;
  embedded?: boolean;
}

export function ExportPanel({ state, embedded }: Props) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sentToEditor, setSentToEditor] = useState(false);

  const yaml = generateDemoYaml(state);

  const handleSendToEditor = () => {
    // Send YAML to parent window (cloud dashboard)
    window.parent.postMessage({ type: 'demoscript-builder-export', yaml }, '*');
    setSentToEditor(true);
    setTimeout(() => setSentToEditor(false), 2000);
  };

  const handleCopyYaml = async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = yaml;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadYaml = () => {
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'demo.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isDisabled = state.steps.length === 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800">
        <h2 className="text-lg font-medium text-slate-200">Export</h2>
      </div>

      <div className="p-4 space-y-3">
        {/* Send to Editor button - only shown in embedded mode */}
        {embedded && (
          <button
            onClick={handleSendToEditor}
            disabled={isDisabled}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
          >
            {sentToEditor ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Sent!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Send to Editor
              </>
            )}
          </button>
        )}

        <button
          onClick={handleCopyYaml}
          disabled={isDisabled}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy YAML
            </>
          )}
        </button>

        <button
          onClick={handleDownloadYaml}
          disabled={isDisabled}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-500 text-slate-200 font-medium rounded-lg transition-colors border border-slate-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download YAML
        </button>

        <button
          onClick={() => setShowPreview(!showPreview)}
          disabled={isDisabled}
          className="w-full text-sm text-slate-400 hover:text-slate-200 disabled:text-slate-600 py-1"
        >
          {showPreview ? 'Hide Preview' : 'Preview YAML'}
        </button>

        {showPreview && !isDisabled && (
          <div className="mt-3 p-3 bg-slate-950 rounded-lg overflow-auto max-h-64">
            <pre className="text-xs text-slate-300 font-mono whitespace-pre">{yaml}</pre>
          </div>
        )}

        {isDisabled && (
          <p className="text-xs text-slate-500 text-center">
            Add steps to export your demo
          </p>
        )}
      </div>
    </div>
  );
}
