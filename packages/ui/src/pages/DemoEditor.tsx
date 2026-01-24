import { useState, useCallback, useEffect, useRef } from 'react';
import * as jsYaml from 'js-yaml';
import { EditorProvider, useEditor, type EditorStep } from '../context/EditorContext';
import { useDemo } from '../context/DemoContext';
import { SortableStepList } from '../components/editor/SortableStepList';
import { SplitView } from '../components/editor/SplitView';
import { EndpointExplorerModal } from '../components/editor/EndpointExplorerModal';
import { FileMenu } from '../components/editor/FileMenu';
import { FilePicker } from '../components/editor/FilePicker';
import { PushToCloud } from '../components/editor/PushToCloud';
import { StepEditor } from '../components/editor/StepEditor';
import { usePlayback } from '../hooks/usePlayback';
import { useStepEffects } from '../hooks/useStepEffects';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useDraggable } from '../hooks/useDraggable';
import { parseYaml, generateYaml, validateYaml } from '../lib/yaml-parser';
import { fileService, isCliMode, isCloudEnabled } from '../lib/file-service';
import { RestStep } from '../components/RestStep';
import { SlideStep } from '../components/SlideStep';
import { ShellStep } from '../components/ShellStep';
import { GraphQLStep } from '../components/GraphQLStep';
import { CodeStep } from '../components/CodeStep';
import { WaitStep } from '../components/WaitStep';
import { BrowserStep } from '../components/BrowserStep';
import { AssertStep } from '../components/AssertStep';
import { DatabaseStep } from '../components/DatabaseStep';
import { FormStep } from '../components/FormStep';
import { TerminalStep } from '../components/TerminalStep';
import { PollStep } from '../components/PollStep';
import { isRestStep, isSlideStep, isShellStep, isStepGroup, isGraphQLStep, isCodeStep, isWaitStep, isBrowserStep, isAssertStep, isDatabaseStep, isFormStep, isTerminalStep, isPollStep, type StepOrGroup, type DemoConfig, type DemoMetadata } from '../types/schema';
import { getThemeColors, applyThemeColors, type ThemePreset } from '../lib/theme-colors';

// Generate YAML for a single step
function stepToYaml(step: StepOrGroup): string {
  try {
    return jsYaml.dump([step], { indent: 2, lineWidth: -1 }).trim();
  } catch {
    return '# Error generating YAML';
  }
}

// Storage key for editor state
const STORAGE_KEY = 'demoscript-editor-state';

// Embedded mode detection for cloud integration
const isEmbedded = (window as unknown as { __DEMOSCRIPT_EDITOR_EMBEDDED__?: boolean }).__DEMOSCRIPT_EDITOR_EMBEDDED__;

// Default config for cloud mode with sandbox API
const DEFAULT_CLOUD_CONFIG: DemoConfig = {
  title: 'Untitled Demo',
  description: '',
  settings: {
    base_url: 'https://demoscript.app/api/sandbox',
    openapi: 'https://demoscript.app/api/sandbox/openapi.json',
  },
  steps: [],
};

// Load state from localStorage
function loadSavedState(): DemoConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Save state to localStorage
function saveState(config: DemoConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
}

// Step type selector for adding new steps
type StepTypeOption = 'rest' | 'slide' | 'shell' | 'group' | 'graphql' | 'code' | 'wait' | 'form' | 'terminal' | 'poll';

interface AddStepMenuProps {
  onAddStep: (type: StepTypeOption) => void;
}

function AddStepMenu({ onAddStep }: AddStepMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Calculate menu position when opening - prefer left-align, fallback to right-align
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 192; // w-48 = 12rem
      const viewportWidth = window.innerWidth;

      // Try left-align first (menu left = button left)
      let left = rect.left;

      // If menu would overflow right edge, right-align instead
      if (left + menuWidth > viewportWidth - 8) {
        left = rect.right - menuWidth;
      }

      // Ensure minimum 8px from left edge
      left = Math.max(8, left);

      setMenuPosition({
        top: rect.bottom + 4,
        left,
      });
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded font-medium transition-colors text-sm"
        title="Add Step"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="hidden sm:inline">Add</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div
            className="fixed w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-[101]"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <button
              onClick={() => { onAddStep('rest'); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              REST Request
            </button>
            <button
              onClick={() => { onAddStep('slide'); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Slide
            </button>
            <button
              onClick={() => { onAddStep('shell'); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Shell Command
            </button>
            <button
              onClick={() => { onAddStep('graphql'); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              GraphQL
            </button>
            <button
              onClick={() => { onAddStep('form'); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Form
            </button>
            <button
              onClick={() => { onAddStep('terminal'); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Terminal
            </button>
            <button
              onClick={() => { onAddStep('poll'); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Poll
            </button>
            <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
            <button
              onClick={() => { onAddStep('code'); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Code Block
            </button>
            <button
              onClick={() => { onAddStep('wait'); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Wait/Delay
            </button>
            <button
              onClick={() => { onAddStep('group'); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Step Group
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Playback controls component
interface PlaybackControlsProps {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

function PlaybackControls({
  isPlaying,
  currentStep,
  totalSteps,
  speed,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onReset,
  onSpeedChange,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 dark:bg-slate-800 rounded">
      {/* Reset */}
      <button
        onClick={onReset}
        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
        title="Reset"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      {/* Prev */}
      <button
        onClick={onPrev}
        disabled={currentStep === 0}
        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-50"
        title="Previous step"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Play/Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        className="p-1.5 bg-primary-600 text-white rounded-full hover:bg-primary-700"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Next */}
      <button
        onClick={onNext}
        disabled={currentStep >= totalSteps - 1}
        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-50"
        title="Next step"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Step counter */}
      <span className="text-xs text-gray-600 dark:text-slate-400 ml-1 tabular-nums">
        {currentStep + 1}/{totalSteps}
      </span>

      {/* Speed selector */}
      <select
        value={speed}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        className="ml-1 px-1 py-0.5 text-xs bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded"
      >
        <option value={0.5}>0.5x</option>
        <option value={1}>1x</option>
        <option value={1.5}>1.5x</option>
        <option value={2}>2x</option>
      </select>
    </div>
  );
}

// YAML import/export panel
interface YamlPanelProps {
  onImport: (yaml: string) => void;
  onExport: () => string;
}

function YamlPanel({ onImport, onExport }: YamlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [yamlContent, setYamlContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    const validationError = validateYaml(yamlContent);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onImport(yamlContent);
    setIsOpen(false);
    setYamlContent('');
  };

  const handleExport = () => {
    const yaml = onExport();
    setYamlContent(yaml);
    setError(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-2.5 py-1.5 text-xs bg-slate-600 hover:bg-slate-700 text-white rounded font-medium transition-colors whitespace-nowrap flex items-center gap-1"
        title="Import or export YAML manually"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        YAML
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-medium text-gray-900 dark:text-slate-100">Import / Export YAML</h3>
          <button
            onClick={() => { setIsOpen(false); setError(null); }}
            className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <textarea
            value={yamlContent}
            onChange={(e) => setYamlContent(e.target.value)}
            placeholder="Paste YAML here to import, or click Export to get current demo YAML"
            className="w-full h-64 px-3 py-2 font-mono text-sm bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          />

          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Export
          </button>
          <button
            onClick={handleImport}
            disabled={!yamlContent.trim()}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

// Collapsible section component for settings
interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-slate-300"
      >
        {title}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}

// Toggle switch component
interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

function ToggleSwitch({ label, checked, onChange, description }: ToggleSwitchProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
        {description && (
          <p className="text-xs text-gray-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
          checked ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-600'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// Settings panel for configuring demo settings
interface SettingsPanelProps {
  settings: DemoConfig['settings'] | undefined;
  metadata: DemoMetadata | undefined;
  title: string;
  description: string;
  onSettingsChange: (settings: Partial<NonNullable<DemoConfig['settings']>>) => void;
  onMetadataChange: (metadata: Partial<DemoMetadata>) => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
}

function SettingsPanel({
  settings,
  metadata,
  title,
  description,
  onSettingsChange,
  onMetadataChange,
  onTitleChange,
  onDescriptionChange,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Draggable modal
  const { position, isDragging, handleMouseDown, resetPosition } = useDraggable();

  // Helper to update nested effects settings
  const updateEffects = (key: string, value: boolean | number) => {
    onSettingsChange({
      effects: { ...settings?.effects, [key]: value },
    });
  };

  // Helper to update nested theme settings
  const updateTheme = (key: string, value: string) => {
    onSettingsChange({
      theme: { ...settings?.theme, [key]: value },
    });
  };

  // Helper to update nested dashboard settings
  const updateDashboard = (key: string, value: boolean) => {
    onSettingsChange({
      dashboard: { ...settings?.dashboard, [key]: value },
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 rounded transition-colors"
        title="Demo Settings"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    );
  }

  const handleClose = () => {
    setIsOpen(false);
    resetPosition();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        data-draggable-modal
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        <div
          onMouseDown={handleMouseDown}
          className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex-shrink-0 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          <h3 className="font-medium text-gray-900 dark:text-slate-100 select-none">Demo Settings</h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* General Settings */}
          <CollapsibleSection title="General" defaultOpen={true}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="My API Demo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="A brief description of your demo"
              />
            </div>
          </CollapsibleSection>

          {/* Metadata */}
          <CollapsibleSection title="Metadata" defaultOpen={false}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Duration
              </label>
              <input
                type="text"
                value={metadata?.duration || ''}
                onChange={(e) => onMetadataChange({ duration: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 5 minutes"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Estimated time to complete the demo
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Difficulty
              </label>
              <select
                value={metadata?.difficulty || ''}
                onChange={(e) => onMetadataChange({ difficulty: e.target.value as DemoMetadata['difficulty'] })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Not set</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Skill level required for this demo
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <input
                type="text"
                value={metadata?.category || ''}
                onChange={(e) => onMetadataChange({ category: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Tutorial, API, Authentication"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Category for gallery organization
              </p>
            </div>
          </CollapsibleSection>

          {/* API Configuration */}
          <CollapsibleSection title="API Configuration" defaultOpen={true}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Base URL
              </label>
              <input
                type="text"
                value={settings?.base_url || ''}
                onChange={(e) => onSettingsChange({ base_url: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://api.example.com"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Base URL prepended to all REST endpoints
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                OpenAPI Spec URL
              </label>
              <input
                type="text"
                value={settings?.openapi || ''}
                onChange={(e) => onSettingsChange({ openapi: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://api.example.com/openapi.json"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Auto-generate form fields from OpenAPI/Swagger spec
              </p>
            </div>
          </CollapsibleSection>

          {/* Theme Settings */}
          <CollapsibleSection title="Theme" defaultOpen={false}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Color Preset
              </label>
              <select
                value={settings?.theme?.preset || 'purple'}
                onChange={(e) => updateTheme('preset', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="purple">Purple (Default)</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="teal">Teal</option>
                <option value="orange">Orange</option>
                <option value="rose">Rose</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Color Mode
              </label>
              <select
                value={settings?.theme?.mode || 'auto'}
                onChange={(e) => updateTheme('mode', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="auto">Auto (System)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </CollapsibleSection>

          {/* Visual Effects */}
          <CollapsibleSection title="Visual Effects" defaultOpen={false}>
            <ToggleSwitch
              label="Confetti"
              checked={settings?.effects?.confetti !== false}
              onChange={(v) => updateEffects('confetti', v)}
              description="Fire confetti on step completion"
            />
            <ToggleSwitch
              label="Sounds"
              checked={settings?.effects?.sounds !== false}
              onChange={(v) => updateEffects('sounds', v)}
              description="Play success/error sounds"
            />
            <ToggleSwitch
              label="Transitions"
              checked={settings?.effects?.transitions !== false}
              onChange={(v) => updateEffects('transitions', v)}
              description="Animate step changes"
            />
            <ToggleSwitch
              label="Neon Glow"
              checked={settings?.effects?.neon_glow !== false}
              onChange={(v) => updateEffects('neon_glow', v)}
              description="Neon text effects (dark mode)"
            />
            <ToggleSwitch
              label="Grid Background"
              checked={settings?.effects?.grid_background !== false}
              onChange={(v) => updateEffects('grid_background', v)}
              description="Animated grid background"
            />
            <ToggleSwitch
              label="Glow Orbs"
              checked={settings?.effects?.glow_orbs !== false}
              onChange={(v) => updateEffects('glow_orbs', v)}
              description="Floating glow orbs (dark mode)"
            />
          </CollapsibleSection>

          {/* Display Options */}
          <CollapsibleSection title="Display Options" defaultOpen={false}>
            <ToggleSwitch
              label="Dashboard"
              checked={settings?.dashboard?.enabled === true}
              onChange={(v) => updateDashboard('enabled', v)}
              description="Show overview dashboard on load"
            />
            {settings?.dashboard?.enabled && (
              <div className="ml-4 pl-3 border-l-2 border-gray-200 dark:border-slate-700 space-y-3">
                <ToggleSwitch
                  label="Show Stats"
                  checked={settings?.dashboard?.show_stats !== false}
                  onChange={(v) => updateDashboard('show_stats', v)}
                  description="Display step count and duration"
                />
                <ToggleSwitch
                  label="Show Health"
                  checked={settings?.dashboard?.show_health !== false}
                  onChange={(v) => updateDashboard('show_health', v)}
                  description="Display service health status"
                />
                <ToggleSwitch
                  label="Show Description"
                  checked={settings?.dashboard?.show_description !== false}
                  onChange={(v) => updateDashboard('show_description', v)}
                  description="Display demo description"
                />
              </div>
            )}
            <ToggleSwitch
              label="Sidebar"
              checked={settings?.sidebar?.enabled === true}
              onChange={(v) => onSettingsChange({ sidebar: { ...settings?.sidebar, enabled: v } })}
              description="Show step navigation sidebar"
            />
          </CollapsibleSection>
        </div>

        <div className="flex items-center justify-end px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Step preview component (view mode with Execute button)
interface StepPreviewProps {
  step: EditorStep;
}

function StepPreview({ step }: StepPreviewProps) {
  const stepData = step.step;

  if (isStepGroup(stepData)) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
        <h3 className="font-medium">Group: {stepData.group}</h3>
      </div>
    );
  }

  // Use mode="view" to show Execute button for testing
  if (isRestStep(stepData)) {
    return <RestStep step={stepData} mode="view" />;
  }

  if (isSlideStep(stepData)) {
    return <SlideStep step={stepData} mode="view" />;
  }

  if (isShellStep(stepData)) {
    return <ShellStep step={stepData} mode="view" />;
  }

  if (isGraphQLStep(stepData)) {
    return <GraphQLStep step={stepData} />;
  }

  if (isCodeStep(stepData)) {
    return <CodeStep step={stepData} />;
  }

  if (isWaitStep(stepData)) {
    return <WaitStep step={stepData} />;
  }

  if (isBrowserStep(stepData)) {
    return <BrowserStep step={stepData} />;
  }

  if (isAssertStep(stepData)) {
    return <AssertStep step={stepData} />;
  }

  if (isDatabaseStep(stepData)) {
    return <DatabaseStep step={stepData} />;
  }

  if (isFormStep(stepData)) {
    return <FormStep step={stepData} />;
  }

  if (isTerminalStep(stepData)) {
    return <TerminalStep step={stepData} />;
  }

  if (isPollStep(stepData)) {
    return <PollStep step={stepData} />;
  }

  return (
    <div className="p-4 text-gray-500">
      Unsupported step type
    </div>
  );
}

// Step YAML panel - editable YAML for current step
interface StepYamlPanelProps {
  step: EditorStep;
  stepIndex: number;
  onUpdate: (step: StepOrGroup) => void;
}

function StepYamlPanel({ step, stepIndex, onUpdate }: StepYamlPanelProps) {
  const initialYaml = stepToYaml(step.step);
  const [yamlContent, setYamlContent] = useState(initialYaml);
  const [error, setError] = useState<string | null>(null);

  // Update local state when step changes externally
  useEffect(() => {
    setYamlContent(stepToYaml(step.step));
    setError(null);
  }, [step.step]);

  const handleChange = (value: string) => {
    setYamlContent(value);
    setError(null);
  };

  const handleBlur = () => {
    try {
      // Parse YAML - it's wrapped in array
      const parsed = jsYaml.load(yamlContent) as StepOrGroup[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        onUpdate(parsed[0]);
        setError(null);
      } else {
        setError('Invalid step format');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid YAML');
    }
  };

  return (
    <div className="h-full bg-slate-900 flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-700 flex-shrink-0">
        <span className="text-xs font-medium text-slate-400">
          Step {stepIndex + 1} YAML
          {error && <span className="text-red-400 ml-2">({error})</span>}
        </span>
        <button
          onClick={() => navigator.clipboard.writeText(yamlContent)}
          className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
          title="Copy to clipboard"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
      <textarea
        value={yamlContent}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className={`flex-1 p-3 text-xs font-mono bg-slate-900 text-slate-300 resize-none focus:outline-none focus:ring-1 focus:ring-inset ${
          error ? 'focus:ring-red-500' : 'focus:ring-primary-500'
        }`}
        spellCheck={false}
      />
    </div>
  );
}

// Main editor content (uses EditorContext)
function EditorContent() {
  const { state, addStep, removeStep, updateStep, reorderSteps, setCurrentStep, loadFromConfig, toConfig, dispatch, markSaved } = useEditor();
  const { dispatch: demoDispatch } = useDemo();
  const lastSyncedConfig = useRef<string>('');
  const [isEndpointExplorerOpen, setIsEndpointExplorerOpen] = useState(false);
  const [yamlPanelHeight, setYamlPanelHeight] = useState(180);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const editorPanelRef = useRef<HTMLDivElement>(null);

  // File operations state (CLI mode only)
  const [filePickerMode, setFilePickerMode] = useState<'open' | 'save' | null>(null);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const cliMode = isCliMode();
  const cloudEnabled = isCloudEnabled();
  const initialLoadDone = useRef(false);

  // Edit mode toggle for right panel
  const [isEditMode, setIsEditMode] = useState(true);

  // Load initial demo from CLI argument (CLI mode only)
  useEffect(() => {
    if (!cliMode || initialLoadDone.current) return;
    initialLoadDone.current = true;

    fileService.getInitialDemo().then((data) => {
      if (data.config) {
        loadFromConfig(data.config as DemoConfig, data.path ?? undefined);
      }
    }).catch(() => {
      // Ignore errors, just use default state
    });
  }, [cliMode, loadFromConfig]);

  // Warn before closing with unsaved changes (CLI mode)
  useEffect(() => {
    if (!cliMode || !state.isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cliMode, state.isDirty]);

  // Handle file open from FilePicker
  const handleFileOpen = useCallback(async (path: string) => {
    try {
      const { content } = await fileService.readFile(path);
      const config = parseYaml(content);
      loadFromConfig(config, path);
      setFilePickerMode(null);
    } catch (err) {
      alert(`Failed to open file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [loadFromConfig]);

  // Handle file save from FilePicker
  const handleFileSave = useCallback(async (path: string) => {
    try {
      const config = toConfig();
      const yaml = generateYaml(config);
      await fileService.saveFile(path, yaml);
      markSaved(path);
      setFilePickerMode(null);
    } catch (err) {
      alert(`Failed to save file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [toConfig, markSaved]);

  // Handle divider drag for resizable YAML panel
  useEffect(() => {
    if (!isDraggingDivider) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!editorPanelRef.current) return;
      const rect = editorPanelRef.current.getBoundingClientRect();
      const newHeight = rect.bottom - e.clientY;
      setYamlPanelHeight(Math.max(80, Math.min(400, newHeight)));
    };

    const handleMouseUp = () => {
      setIsDraggingDivider(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingDivider]);

  // Enable step effects (confetti, sounds) on step completion
  useStepEffects();

  // Playback hook
  const {
    playbackState,
    play,
    pause,
    toggle: _toggle,
    goToStep: _goToStep,
    nextStep,
    prevStep,
    setSpeed,
    reset,
  } = usePlayback({
    totalSteps: state.steps.length,
    onStepChange: setCurrentStep,
    autoAdvanceDelay: 2000,
  });

  // Keyboard shortcuts for navigation (Arrow keys) - shared with DemoRunner
  useKeyboardNavigation({
    onNext: nextStep,
    onPrev: prevStep,
  });

  // Sync editor config to DemoContext for live execution
  useEffect(() => {
    const config = toConfig();
    const configKey = JSON.stringify(config);

    // Only sync if config actually changed
    if (configKey !== lastSyncedConfig.current) {
      lastSyncedConfig.current = configKey;
      demoDispatch({ type: 'SET_CONFIG', payload: config });
      demoDispatch({ type: 'SET_MODE', payload: 'live' });
    }
  }, [state.steps, state.settings, state.metadata, state.title, toConfig, demoDispatch]);

  // Sync current step to DemoContext
  useEffect(() => {
    demoDispatch({ type: 'SET_STEP', payload: state.currentStep });
  }, [state.currentStep, demoDispatch]);

  // Auto-save to localStorage on changes
  useEffect(() => {
    if (state.isDirty) {
      const config = toConfig();
      saveState(config);
    }
  }, [state, toConfig]);

  // Apply theme from settings - runs after ThemeProvider to override its default
  const themeMode = state.settings.theme?.mode;
  useEffect(() => {
    const root = document.documentElement;
    console.log('[DemoEditor] Applying theme mode:', themeMode);

    if (themeMode === 'dark') {
      root.classList.add('dark');
      console.log('[DemoEditor] Added dark class');
    } else if (themeMode === 'light') {
      root.classList.remove('dark');
      console.log('[DemoEditor] Removed dark class');
    } else {
      // Auto mode: use system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
        console.log('[DemoEditor] Auto: added dark class (system prefers dark)');
      } else {
        root.classList.remove('dark');
        console.log('[DemoEditor] Auto: removed dark class (system prefers light)');
      }
    }
  }, [themeMode]);

  // Apply theme colors (preset) from settings
  const themeSettings = state.settings.theme;
  useEffect(() => {
    const colors = getThemeColors(themeSettings);
    applyThemeColors(colors, themeSettings?.preset as ThemePreset);
    console.log('[DemoEditor] Applied theme colors:', themeSettings?.preset || 'purple');
  }, [themeSettings]);

  // Handle adding new step
  const handleAddStep = useCallback((type: StepTypeOption) => {
    let newStep: StepOrGroup;

    switch (type) {
      case 'rest':
        newStep = { rest: 'GET /health', title: 'New Request' };
        break;
      case 'slide':
        newStep = { slide: '# New Slide\n\nAdd your content here.' };
        break;
      case 'shell':
        newStep = { shell: 'echo "Hello, World!"', title: 'New Command' };
        break;
      case 'graphql':
        newStep = { graphql: 'query {\n  hello\n}', title: 'GraphQL Query' };
        break;
      case 'code':
        newStep = { code: '// Your code here\nconsole.log("Hello");', language: 'javascript', title: 'Code Example' };
        break;
      case 'wait':
        newStep = { wait: 2000, message: 'Waiting...', title: 'Pause' };
        break;
      case 'form':
        newStep = { form: 'New Form', fields: [{ name: 'field1', label: 'Field 1', type: 'text' }] };
        break;
      case 'terminal':
        newStep = { terminal: '$ echo "Hello, World!"\nHello, World!', title: 'Terminal Demo' };
        break;
      case 'poll':
        newStep = { poll: '/status', success_when: "status == 'complete'", title: 'Wait for Completion' };
        break;
      case 'group':
        newStep = { group: 'New Group', steps: [] };
        break;
    }

    addStep(newStep, state.currentStep);
  }, [addStep, state.currentStep]);

  // Handle adding endpoint from explorer
  const handleAddEndpoint = useCallback((step: StepOrGroup) => {
    addStep(step, state.currentStep);
  }, [addStep, state.currentStep]);

  // Handle YAML import
  const handleYamlImport = useCallback((yaml: string) => {
    try {
      const config = parseYaml(yaml);
      loadFromConfig(config);
    } catch (error) {
      console.error('Failed to import YAML:', error);
    }
  }, [loadFromConfig]);

  // Handle YAML export
  const handleYamlExport = useCallback(() => {
    const config = toConfig();
    return generateYaml(config);
  }, [toConfig]);

  // Listen for messages from parent window (for embedded mode)
  useEffect(() => {
    if (!isEmbedded) return;

    const handleMessage = (event: MessageEvent) => {
      // Handle YAML import request
      if (event.data && event.data.type === 'demoscript-yaml-import' && event.data.yaml) {
        handleYamlImport(event.data.yaml);
      }

      // Handle YAML request (auto-sync when switching away from Visual Editor tab)
      if (event.data && event.data.type === 'demoscript-request-yaml') {
        const yaml = handleYamlExport();
        window.parent.postMessage({
          type: 'demoscript-builder-export',
          yaml,
          title: state.title || '',
          description: state.description || ''
        }, '*');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleYamlImport, handleYamlExport, state.title, state.description]);

  // Current step data
  const currentStepData = state.steps[state.currentStep];

  // Editor panel (left side)
  const editorPanel = (
    <div ref={editorPanelRef} className="h-full flex flex-col bg-gray-50 dark:bg-slate-900">
      {/* Header - responsive layout */}
      <div className="flex flex-col gap-2 px-3 py-2 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* File Menu (CLI mode only) */}
            {cliMode && (
              <FileMenu
                onOpenFilePicker={(mode) => setFilePickerMode(mode)}
                onPushToCloud={cloudEnabled ? () => setIsPushModalOpen(true) : undefined}
              />
            )}
            <div className="flex items-center min-w-0 overflow-hidden">
              <h2
                className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate"
                title={state.currentFilePath || state.title}
              >
                {state.currentFilePath
                  ? state.currentFilePath.split('/').pop()
                  : state.title || 'Untitled Demo'}
              </h2>
              {state.isDirty && (
                <span className="ml-1 text-xs text-gray-400 flex-shrink-0">*</span>
              )}
            </div>
          </div>
          <SettingsPanel
            settings={state.settings}
            metadata={state.metadata}
            title={state.title}
            description={state.description}
            onSettingsChange={(settings) => dispatch({ type: 'SET_SETTINGS', payload: settings })}
            onMetadataChange={(metadata) => dispatch({ type: 'SET_METADATA', payload: metadata })}
            onTitleChange={(title) => dispatch({ type: 'SET_TITLE', payload: title })}
            onDescriptionChange={(desc) => dispatch({ type: 'SET_DESCRIPTION', payload: desc })}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* YAML import/export panel - hidden in embedded mode (auto-sync handles it) */}
          {!isEmbedded && <YamlPanel onImport={handleYamlImport} onExport={handleYamlExport} />}
          <AddStepMenu onAddStep={handleAddStep} />
          {state.settings?.openapi && (
            <button
              onClick={() => setIsEndpointExplorerOpen(true)}
              className="px-2.5 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition-colors whitespace-nowrap flex items-center gap-1"
              title="Browse API endpoints from OpenAPI spec"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Browse API
            </button>
          )}
        </div>
      </div>

      {/* Step list */}
      <div className="flex-1 overflow-auto p-2 min-h-0">
        <SortableStepList
          steps={state.steps}
          currentStep={state.currentStep}
          onReorder={reorderSteps}
          onSelect={setCurrentStep}
          onDelete={removeStep}
        />
      </div>

      {/* Resizable divider */}
      {currentStepData && (
        <div
          className="h-1.5 bg-gray-200 dark:bg-slate-700 hover:bg-primary-400 dark:hover:bg-primary-500 cursor-ns-resize transition-colors flex-shrink-0"
          onMouseDown={() => setIsDraggingDivider(true)}
        />
      )}

      {/* Step YAML panel */}
      {currentStepData && (
        <div style={{ height: yamlPanelHeight }} className="flex-shrink-0">
          <StepYamlPanel
            step={currentStepData}
            stepIndex={state.currentStep}
            onUpdate={(step) => updateStep(state.currentStep, step)}
          />
        </div>
      )}
    </div>
  );

  // Handle step update from StepEditor
  const handleStepChange = useCallback((updatedStep: StepOrGroup) => {
    if (currentStepData) {
      updateStep(state.currentStep, updatedStep);
    }
  }, [currentStepData, state.currentStep, updateStep]);

  // Handle step delete from StepEditor
  const handleStepDelete = useCallback(() => {
    if (currentStepData) {
      removeStep(state.currentStep);
    }
  }, [currentStepData, state.currentStep, removeStep]);

  // Preview/Edit panel (right side)
  const previewPanel = (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950">
      {/* Header with mode toggle and playback controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-slate-800">
        {/* Edit/Preview toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setIsEditMode(true)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              isEditMode
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setIsEditMode(false)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              !isEditMode
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
          >
            Preview
          </button>
        </div>

        {/* Playback controls (only in preview mode) */}
        {!isEditMode && state.steps.length > 0 && (
          <PlaybackControls
            isPlaying={playbackState.isPlaying}
            currentStep={playbackState.currentStep}
            totalSteps={state.steps.length}
            speed={playbackState.speed}
            onPlay={play}
            onPause={pause}
            onPrev={prevStep}
            onNext={nextStep}
            onReset={reset}
            onSpeedChange={setSpeed}
          />
        )}

        {/* Step counter in edit mode */}
        {isEditMode && state.steps.length > 0 && (
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {state.currentStep + 1}/{state.steps.length}
          </span>
        )}
      </div>

      {/* Step content - Edit or Preview */}
      <div className="flex-1 overflow-auto">
        {currentStepData ? (
          isEditMode ? (
            <StepEditor
              step={currentStepData.step}
              onChange={handleStepChange}
              onDelete={handleStepDelete}
            />
          ) : (
            <div className="p-4">
              <StepPreview step={currentStepData} />
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500">
            <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium">No steps yet</p>
            <p className="text-xs mt-1">Add a step to start building your demo</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="h-screen">
        <SplitView
          left={editorPanel}
          right={previewPanel}
          defaultLeftWidth={35}
          minLeftWidth={25}
          maxLeftWidth={60}
        />
      </div>

      {/* Endpoint Explorer Modal */}
      {state.settings?.openapi && (
        <EndpointExplorerModal
          isOpen={isEndpointExplorerOpen}
          onClose={() => setIsEndpointExplorerOpen(false)}
          onAddEndpoint={handleAddEndpoint}
          openapiUrl={state.settings.openapi}
        />
      )}

      {/* File Picker Modal (CLI mode) */}
      {cliMode && (
        <FilePicker
          mode={filePickerMode || 'open'}
          isOpen={filePickerMode !== null}
          initialPath={state.currentFilePath || undefined}
          defaultFileName={state.currentFilePath?.split('/').pop() || 'demo.yaml'}
          onSelect={filePickerMode === 'save' ? handleFileSave : handleFileOpen}
          onClose={() => setFilePickerMode(null)}
        />
      )}

      {/* Push to Cloud Modal (CLI mode with cloud enabled) */}
      {cliMode && cloudEnabled && (
        <PushToCloud
          isOpen={isPushModalOpen}
          onClose={() => setIsPushModalOpen(false)}
        />
      )}
    </>
  );
}

// Main DemoEditor component with provider
export function DemoEditor() {
  const savedConfig = loadSavedState();

  // Use default cloud config when starting fresh in embedded mode
  const initialConfig = savedConfig || (isEmbedded ? DEFAULT_CLOUD_CONFIG : undefined);

  return (
    <EditorProvider initialConfig={initialConfig}>
      <EditorContent />
    </EditorProvider>
  );
}
