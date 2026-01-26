/**
 * DemoMenu - Demo operations dropdown for Visual Editor (Cloud mode only)
 * Provides New, Open, Save As options that use cloud DB storage
 * Note: "Save" is handled by the parent dashboard's "Save Changes" button
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { parseYaml } from '../../lib/yaml-parser';
import { OpenDemoModal } from './OpenDemoModal';
import { SaveAsModal } from './SaveAsModal';

interface DemoMenuProps {
  onDemoLoaded: (id: string, slug: string) => void;
  onDemoSaved: (id: string, slug: string) => void;
  onNewDemo: () => void;
}

export function DemoMenu({ onDemoLoaded, onDemoSaved, onNewDemo }: DemoMenuProps) {
  const { state, loadFromConfig, newFile } = useEditor();
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Confirm discarding unsaved changes
  function confirmDiscardChanges(): boolean {
    if (!state.isDirty) return true;
    return window.confirm('You have unsaved changes. Discard them?');
  }

  // Handle New
  const handleNew = useCallback(() => {
    if (!confirmDiscardChanges()) return;
    newFile();
    onNewDemo();
    setIsOpen(false);
  }, [state.isDirty, newFile, onNewDemo]);

  // Handle Open
  const handleOpen = useCallback(() => {
    if (!confirmDiscardChanges()) return;
    setIsOpenModalOpen(true);
    setIsOpen(false);
  }, [state.isDirty]);

  // Handle demo selection from Open modal
  const handleDemoSelect = useCallback(async (demo: { id: string; slug: string; yaml_content: string }) => {
    try {
      const config = parseYaml(demo.yaml_content);
      loadFromConfig(config);
      onDemoLoaded(demo.id, demo.slug);
      setIsOpenModalOpen(false);
    } catch (err) {
      alert(`Failed to load demo: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [loadFromConfig, onDemoLoaded]);

  // Handle Save As
  const handleSaveAs = useCallback(() => {
    setIsSaveAsModalOpen(true);
    setIsOpen(false);
  }, []);

  // Handle save from Save As modal
  const handleSaveAsComplete = useCallback((id: string, slug: string) => {
    onDemoSaved(id, slug);
    setIsSaveAsModalOpen(false);
  }, [onDemoSaved]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Check for Ctrl/Cmd key
      if (!(e.ctrlKey || e.metaKey)) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          if (!e.shiftKey) {
            e.preventDefault();
            handleNew();
          }
          break;
        case 'o':
          if (!e.shiftKey) {
            e.preventDefault();
            handleOpen();
          }
          break;
        case 's':
          e.preventDefault();
          if (e.shiftKey) {
            handleSaveAs();
          } else {
            // Ctrl+S: notify parent to trigger "Save Changes"
            window.parent.postMessage({ type: 'demoscript:save' }, '*');
          }
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNew, handleOpen, handleSaveAs]);

  return (
    <>
      <div ref={menuRef} className="relative">
        {/* Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
        >
          Demo
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50 py-1">
            <MenuItem onClick={handleNew} shortcut="Ctrl+N">
              New
            </MenuItem>
            <MenuItem onClick={handleOpen} shortcut="Ctrl+O">
              Open...
            </MenuItem>
            <MenuItem onClick={handleSaveAs} shortcut="Ctrl+Shift+S">
              Save As...
            </MenuItem>
          </div>
        )}
      </div>

      {/* Open Demo Modal */}
      <OpenDemoModal
        isOpen={isOpenModalOpen}
        onClose={() => setIsOpenModalOpen(false)}
        onSelect={handleDemoSelect}
      />

      {/* Save As Modal */}
      <SaveAsModal
        isOpen={isSaveAsModalOpen}
        onClose={() => setIsSaveAsModalOpen(false)}
        onSave={handleSaveAsComplete}
        initialTitle={state.title}
        initialDescription={state.description}
      />
    </>
  );
}

// Menu item component
interface MenuItemProps {
  onClick: () => void;
  shortcut?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function MenuItem({ onClick, shortcut, disabled, children }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left ${
        disabled
          ? 'text-gray-400 dark:text-slate-500 cursor-not-allowed'
          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
      }`}
    >
      <span>{children}</span>
      {shortcut && (
        <span className="text-xs text-gray-400 dark:text-slate-500">{shortcut}</span>
      )}
    </button>
  );
}

