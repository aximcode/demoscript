import { useState, useEffect, useRef, useCallback } from 'react';
import { useDemo } from '../context/DemoContext';
import type { TerminalStep as TerminalStepType, ExplicitTerminalStep } from '../types/schema';
import { getTerminalContent } from '../types/schema';
import { groupTerminalLines, parseTerminalContent } from '../lib/terminal-parser';
import { GlowingCard, SuccessCheck } from './effects';

interface Props {
  step: TerminalStepType | ExplicitTerminalStep;
}

export function TerminalStep({ step }: Props) {
  const { state, dispatch, getStepStatus } = useDemo();
  const [visibleBlocks, setVisibleBlocks] = useState<number>(0);
  const [typedText, setTypedText] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const status = getStepStatus(state.currentStep);
  const content = getTerminalContent(step);
  const prompt = step.prompt || '$';
  const typingSpeed = step.typing_speed || 30;
  const outputDelay = step.output_delay || 200;
  const theme = step.theme || 'dark';

  // Parse and group terminal content
  const parsedLines = parseTerminalContent(content, prompt);
  const blocks = groupTerminalLines(parsedLines);

  // Get theme styles
  const themeStyles = {
    dark: {
      bg: 'bg-slate-950',
      text: 'text-slate-200',
      prompt: 'text-green-400',
      command: 'text-white',
      output: 'text-slate-400',
    },
    light: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      prompt: 'text-green-600',
      command: 'text-gray-900',
      output: 'text-gray-600',
    },
    matrix: {
      bg: 'bg-black',
      text: 'text-green-400',
      prompt: 'text-green-300',
      command: 'text-green-400',
      output: 'text-green-500/80',
    },
  }[theme];

  // Scroll to bottom when content changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [visibleBlocks, typedText]);

  // Reset when step changes, but show all content if already complete
  useEffect(() => {
    setTypedText('');
    setIsTyping(false);
    setIsPlaying(false);
    // If step is already complete (navigated back), show all blocks
    if (status === 'complete') {
      setVisibleBlocks(blocks.length);
    } else {
      setVisibleBlocks(0);
    }
  }, [step, state.currentStep, status, blocks.length]);

  // Type out a command character by character
  const typeCommand = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      setIsTyping(true);
      let index = 0;
      const interval = setInterval(() => {
        if (index < text.length) {
          setTypedText((prev) => prev + text[index]);
          index++;
        } else {
          clearInterval(interval);
          setIsTyping(false);
          resolve();
        }
      }, typingSpeed);
    });
  }, [typingSpeed]);

  // Reset animation state
  const resetAnimation = useCallback(() => {
    setVisibleBlocks(0);
    setTypedText('');
    setIsTyping(false);
    setIsPlaying(false);
    dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'pending' } });
  }, [dispatch, state.currentStep]);

  // Play the terminal animation
  const playAnimation = useCallback(async () => {
    if (isPlaying) return;

    // Reset state before playing
    setVisibleBlocks(0);
    setTypedText('');
    setIsPlaying(true);
    dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'executing' } });

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      if (block.type === 'command') {
        // Type out command
        setTypedText('');
        await typeCommand(block.lines[0]);
        await new Promise((r) => setTimeout(r, outputDelay));
        setVisibleBlocks(i + 1);
        setTypedText('');
      } else {
        // Show output block
        setVisibleBlocks(i + 1);
        await new Promise((r) => setTimeout(r, outputDelay));
      }
    }

    setIsPlaying(false);
    dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'complete' } });
  }, [blocks, isPlaying, typeCommand, outputDelay, dispatch, state.currentStep]);

  // Get current block being typed (if any)
  const currentTypingBlock = isTyping && blocks[visibleBlocks]?.type === 'command' ? blocks[visibleBlocks] : null;

  return (
    <GlowingCard isActive={status === 'complete'} color="emerald" intensity="medium">
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md dark:shadow-xl border border-gray-200 dark:border-emerald-500/20 overflow-hidden transition-colors duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {step.title || 'Terminal'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Animated terminal playback
                </p>
              </div>
            </div>
            {status === 'complete' && <SuccessCheck size={24} animated={false} />}
          </div>
        </div>

        {/* Terminal display */}
        <div className="p-4">
          <div
            ref={terminalRef}
            className={`${themeStyles.bg} rounded-lg p-4 font-mono text-sm overflow-y-auto max-h-80`}
          >
            {/* Window controls */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700/50">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-xs text-gray-500">terminal</span>
            </div>

            {/* Rendered blocks */}
            <div className="space-y-1">
              {blocks.slice(0, visibleBlocks).map((block, idx) => (
                <div key={idx}>
                  {block.type === 'command' ? (
                    <div className="flex items-start gap-2">
                      <span className={themeStyles.prompt}>{prompt}</span>
                      <span className={themeStyles.command}>{block.lines[0]}</span>
                    </div>
                  ) : (
                    <div className={themeStyles.output}>
                      {block.lines.map((line, lineIdx) => (
                        <div key={lineIdx}>{line || '\u00A0'}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Currently typing command */}
              {currentTypingBlock && (
                <div className="flex items-start gap-2">
                  <span className={themeStyles.prompt}>{prompt}</span>
                  <span className={themeStyles.command}>
                    {typedText}
                    <span className="animate-pulse">▌</span>
                  </span>
                </div>
              )}

              {/* Idle cursor when not playing and not complete */}
              {!isPlaying && status !== 'complete' && visibleBlocks === 0 && (
                <div className="flex items-start gap-2">
                  <span className={themeStyles.prompt}>{prompt}</span>
                  <span className="animate-pulse">▌</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Play/Replay buttons */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700/50">
          {status === 'complete' ? (
            <div className="flex gap-3">
              <button
                onClick={resetAnimation}
                disabled={isPlaying}
                className="flex-1 px-4 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
              <button
                onClick={playAnimation}
                disabled={isPlaying}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-lg hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Replay
              </button>
            </div>
          ) : (
            <button
              onClick={playAnimation}
              disabled={isPlaying}
              className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-lg hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25 transition-all duration-300 flex items-center justify-center gap-2"
            >
              {isPlaying ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Playing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </GlowingCard>
  );
}
