import { useState } from 'react';
import type { BuilderStep } from './types';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-500/20 text-blue-400',
  POST: 'bg-green-500/20 text-green-400',
  PUT: 'bg-yellow-500/20 text-yellow-400',
  DELETE: 'bg-red-500/20 text-red-400',
  PATCH: 'bg-purple-500/20 text-purple-400',
};

interface Props {
  steps: BuilderStep[];
  onEdit: (step: BuilderStep) => void;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function StepSequence({ steps, onEdit, onDelete, onReorder }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndex;
    setDragIndex(null);
    setDragOverIndex(null);

    if (fromIndex !== null && fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex);
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800">
        <h2 className="text-lg font-medium text-slate-200">Demo Steps</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          {steps.length === 0 ? 'No steps added yet' : `${steps.length} step${steps.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {steps.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-slate-400 text-sm">
            Execute an endpoint and click "Add to Demo" to add steps
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-800">
          {steps.map((step, index) => (
            <li
              key={step.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                group flex items-center gap-3 px-4 py-3 cursor-move
                transition-colors
                ${dragIndex === index ? 'opacity-50' : ''}
                ${dragOverIndex === index ? 'bg-purple-500/10 border-t-2 border-purple-500' : 'hover:bg-slate-800/50'}
              `}
            >
              {/* Drag Handle */}
              <div className="text-slate-600 group-hover:text-slate-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                </svg>
              </div>

              {/* Step Number */}
              <span className="text-slate-500 text-sm font-mono w-6">
                {index + 1}.
              </span>

              {/* Method Badge */}
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${METHOD_COLORS[step.method] || 'bg-slate-700 text-slate-300'}`}>
                {step.method}
              </span>

              {/* Title / Endpoint */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-200 truncate">
                  {step.title}
                </div>
                {step.title !== step.endpoint && (
                  <div className="text-xs text-slate-500 font-mono truncate">
                    {step.endpoint}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(step)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(step.id)}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
