/**
 * FilePicker - File browser modal for Visual Editor
 * Supports both Open and Save modes
 */

import { useState, useEffect, useCallback } from 'react';
import { fileService, type FileItem, type DirectoryListing } from '../../lib/file-service';
import { useDraggable } from '../../hooks/useDraggable';

interface FilePickerProps {
  mode: 'open' | 'save';
  isOpen: boolean;
  initialPath?: string;
  defaultFileName?: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}

export function FilePicker({
  mode,
  isOpen,
  initialPath,
  defaultFileName = 'demo.yaml',
  onSelect,
  onClose,
}: FilePickerProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState(defaultFileName);
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);

  const { position, isDragging, handleMouseDown, resetPosition } = useDraggable();

  // Fetch directory contents
  const fetchDirectory = useCallback(async (dir?: string) => {
    setLoading(true);
    setError(null);
    setSelectedItem(null);

    try {
      const data: DirectoryListing = await fileService.listDirectory(dir);
      setCurrentPath(data.path);
      setParentPath(data.parent);
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial directory
  useEffect(() => {
    if (isOpen) {
      // If initialPath is a file, use its directory
      const dir = initialPath?.endsWith('.yaml') || initialPath?.endsWith('.yml')
        ? initialPath.substring(0, initialPath.lastIndexOf('/'))
        : initialPath;
      fetchDirectory(dir || undefined);
    }
  }, [isOpen, initialPath, fetchDirectory]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setFileName(defaultFileName);
      setSelectedItem(null);
      resetPosition();
    }
  }, [isOpen, defaultFileName, resetPosition]);

  // Handle item click
  const handleItemClick = (item: FileItem) => {
    if (item.isDirectory) {
      fetchDirectory(item.path);
    } else {
      setSelectedItem(item);
      if (mode === 'save') {
        setFileName(item.name);
      }
    }
  };

  // Handle item double-click
  const handleItemDoubleClick = (item: FileItem) => {
    if (item.isDirectory) {
      fetchDirectory(item.path);
    } else if (mode === 'open' && item.isYaml) {
      onSelect(item.path);
    }
  };

  // Handle navigate up
  const handleNavigateUp = () => {
    if (parentPath && parentPath !== currentPath) {
      fetchDirectory(parentPath);
    }
  };

  // Handle select/save
  const handleConfirm = () => {
    if (mode === 'open') {
      if (selectedItem && selectedItem.isYaml) {
        onSelect(selectedItem.path);
      }
    } else {
      // Save mode
      if (fileName) {
        // Ensure .yaml extension
        const finalName = fileName.endsWith('.yaml') || fileName.endsWith('.yml')
          ? fileName
          : `${fileName}.yaml`;
        const fullPath = `${currentPath}/${finalName}`;
        onSelect(fullPath);
      }
    }
  };

  if (!isOpen) return null;

  const canConfirm = mode === 'open'
    ? selectedItem?.isYaml
    : fileName.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        data-draggable-modal
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        {/* Header */}
        <div
          onMouseDown={handleMouseDown}
          className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          <h3 className="font-medium text-gray-900 dark:text-slate-100 select-none">
            {mode === 'open' ? 'Open Demo' : 'Save Demo'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Path breadcrumb */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
          <button
            onClick={handleNavigateUp}
            disabled={!parentPath || parentPath === currentPath}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Go up"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
          <span className="text-sm text-gray-600 dark:text-slate-400 truncate flex-1" title={currentPath}>
            {currentPath}
          </span>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-auto p-2 min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-slate-400">
              <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-500">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-slate-400">
              Empty directory
            </div>
          ) : (
            <div className="space-y-0.5">
              {items.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleItemClick(item)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left transition-colors ${
                    selectedItem?.path === item.path
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.isDirectory ? (
                    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  ) : item.isYaml ? (
                    <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  )}
                  <span className={`text-sm ${
                    item.isYaml
                      ? 'text-gray-900 dark:text-slate-100 font-medium'
                      : 'text-gray-700 dark:text-slate-300'
                  }`}>
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          {mode === 'save' && (
            <div className="flex items-center gap-3 mb-3">
              <label className="text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap">
                File name:
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="demo.yaml"
              />
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {mode === 'open' ? 'Open' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
