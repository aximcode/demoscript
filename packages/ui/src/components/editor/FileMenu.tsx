/**
 * FileMenu - File operations dropdown for Visual Editor (CLI mode only)
 * Provides New, Open, Save, Save As, and Push to Cloud options
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { fileService, isCloudEnabled } from '../../lib/file-service';
import { generateYaml } from '../../lib/yaml-parser';

interface FileMenuProps {
  onOpenFilePicker: (mode: 'open' | 'save') => void;
  onPushToCloud?: () => void;
}

export function FileMenu({ onOpenFilePicker, onPushToCloud }: FileMenuProps) {
  const { state, toConfig, newFile, markSaved } = useEditor();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const cloudEnabled = isCloudEnabled();

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

  // Handle New
  const handleNew = useCallback(() => {
    if (state.isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Discard them?');
      if (!confirmed) return;
    }
    newFile();
    setIsOpen(false);
  }, [state.isDirty, newFile]);

  // Handle Open
  const handleOpen = useCallback(() => {
    if (state.isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Discard them?');
      if (!confirmed) return;
    }
    onOpenFilePicker('open');
    setIsOpen(false);
  }, [state.isDirty, onOpenFilePicker]);

  // Handle Save
  const handleSave = useCallback(async () => {
    if (state.currentFilePath && !state.isNewFile) {
      // Save to existing file
      setIsSaving(true);
      try {
        const config = toConfig();
        const yaml = generateYaml(config);
        await fileService.saveFile(state.currentFilePath, yaml);
        markSaved();
      } catch (err) {
        alert(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsSaving(false);
      }
    } else {
      // No file path, show Save As dialog
      onOpenFilePicker('save');
    }
    setIsOpen(false);
  }, [state.currentFilePath, state.isNewFile, toConfig, markSaved, onOpenFilePicker]);

  // Handle Save As
  const handleSaveAs = useCallback(() => {
    onOpenFilePicker('save');
    setIsOpen(false);
  }, [onOpenFilePicker]);

  // Handle Push to Cloud
  const handlePushToCloud = useCallback(() => {
    onPushToCloud?.();
    setIsOpen(false);
  }, [onPushToCloud]);

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
            handleSave();
          }
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNew, handleOpen, handleSave, handleSaveAs]);

  return (
    <div ref={menuRef} className="relative">
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
      >
        File
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

          <MenuDivider />

          <MenuItem onClick={handleSave} shortcut="Ctrl+S" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </MenuItem>
          <MenuItem onClick={handleSaveAs} shortcut="Ctrl+Shift+S">
            Save As...
          </MenuItem>

          {cloudEnabled && onPushToCloud && (
            <>
              <MenuDivider />
              <MenuItem onClick={handlePushToCloud}>
                Push to Cloud...
              </MenuItem>
            </>
          )}
        </div>
      )}
    </div>
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

// Menu divider
function MenuDivider() {
  return <div className="my-1 border-t border-gray-200 dark:border-slate-700" />;
}
