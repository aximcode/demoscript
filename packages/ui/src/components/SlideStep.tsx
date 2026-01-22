import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDemo } from '../context/DemoContext';
import { substituteVariables } from '../lib/variable-substitution';
import type { SlideStep as SlideStepType, ExplicitSlideStep } from '../types/schema';
import { getSlideContent } from '../types/schema';
import { GlowingCard } from './effects';
import { ChoiceButtons } from './ChoiceButtons';

export type StepMode = 'view' | 'edit' | 'preview';

interface Props {
  step: SlideStepType | ExplicitSlideStep;
  mode?: StepMode;
  onChange?: (step: SlideStepType | ExplicitSlideStep) => void;
  onDelete?: () => void;
}

export function SlideStep({ step, mode = 'view', onChange, onDelete }: Props) {
  const { state, gotoStepById } = useDemo();
  const isEditMode = mode === 'edit';

  const rawContent = getSlideContent(step);
  const content = substituteVariables(rawContent, state.variables);
  const [editContent, setEditContent] = useState(rawContent);

  const handleChoiceSelect = (gotoId: string) => {
    gotoStepById(gotoId);
  };

  const handleContentChange = (newContent: string) => {
    setEditContent(newContent);
    if (onChange) {
      // Create updated step - handle both concise and explicit syntax
      if ('slide' in step) {
        onChange({ ...step, slide: newContent });
      } else {
        onChange({ ...step, content: newContent });
      }
    }
  };

  return (
    <GlowingCard isActive={true} color="primary" intensity="subtle">
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md dark:shadow-xl border border-gray-200 dark:border-[rgba(var(--color-primary-rgb),0.2)] transition-colors duration-300">
        {/* Edit mode header with delete button */}
        {isEditMode && (
          <div className="flex items-center justify-between px-8 py-3 border-b border-gray-200 dark:border-slate-700">
            <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Slide</span>
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
                title="Delete step"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="p-8">
          {isEditMode ? (
            <textarea
              value={editContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full min-h-[200px] p-4 font-mono text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary resize-y"
              placeholder="Enter markdown content..."
            />
          ) : (
            <div className="prose prose-lg max-w-none prose-headings:text-gray-900 dark:prose-invert dark:prose-headings:bg-gradient-to-r dark:prose-headings:from-theme-primary dark:prose-headings:to-theme-accent dark:prose-headings:bg-clip-text dark:prose-headings:text-transparent prose-strong:text-theme-primary dark:prose-strong:text-theme-primary prose-p:text-gray-700 dark:prose-p:text-slate-300 prose-li:text-gray-700 dark:prose-li:text-slate-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}

          {step.choices && step.choices.length > 0 && (
            <ChoiceButtons choices={step.choices} onSelect={handleChoiceSelect} />
          )}
        </div>
      </div>
    </GlowingCard>
  );
}
