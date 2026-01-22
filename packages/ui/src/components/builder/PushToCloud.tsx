/**
 * PushToCloud - Modal for pushing demos to DemoScript Cloud
 * Private repo only - excluded from public sync
 */

import { useState, useCallback, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { generateYaml } from '../../lib/yaml-parser';
import { useDraggable } from '../../hooks/useDraggable';

interface AuthStatus {
  isLoggedIn: boolean;
  username?: string;
  email?: string;
}

interface PushResult {
  success: boolean;
  url?: string;
  updated?: boolean;
  error?: string;
}

interface PushToCloudProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PushToCloud({ isOpen, onClose }: PushToCloudProps) {
  const { state, toConfig } = useEditor();
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [slug, setSlug] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<PushResult | null>(null);

  const { position, isDragging, handleMouseDown, resetPosition } = useDraggable();

  // Generate default slug from title
  useEffect(() => {
    if (isOpen && !slug) {
      const defaultSlug = (state.title || 'my-demo')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
      setSlug(defaultSlug);
    }
  }, [isOpen, state.title, slug]);

  // Check auth status on open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/auth/status')
        .then(res => res.json())
        .then((data: AuthStatus) => setAuthStatus(data))
        .catch(() => setAuthStatus({ isLoggedIn: false }));
    }
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(null);
      resetPosition();
    }
  }, [isOpen, resetPosition]);

  // Handle push
  const handlePush = useCallback(async () => {
    setPushing(true);
    setError(null);

    try {
      const config = toConfig();
      const yamlContent = generateYaml(config);

      const response = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title: config.title,
          yaml_content: yamlContent,
          is_public: isPublic,
        }),
      });

      const data = await response.json() as PushResult;

      if (!response.ok) {
        throw new Error(data.error || 'Push failed');
      }

      setSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push failed');
    } finally {
      setPushing(false);
    }
  }, [toConfig, slug, isPublic]);

  // Handle slug change
  const handleSlugChange = (value: string) => {
    // Only allow lowercase letters, numbers, and hyphens
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    setSlug(sanitized);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        data-draggable-modal
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        {/* Header */}
        <div
          onMouseDown={handleMouseDown}
          className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          <h3 className="font-medium text-gray-900 dark:text-slate-100 select-none">
            Push to Cloud
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

        {/* Content */}
        <div className="p-4">
          {/* Not logged in */}
          {authStatus && !authStatus.isLoggedIn && (
            <div className="text-center py-6">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-gray-600 dark:text-slate-400 mb-4">
                You need to log in first to push demos to the cloud.
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-500">
                Run <code className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-xs">demoscript login</code> in your terminal
              </p>
            </div>
          )}

          {/* Success state */}
          {success && (
            <div className="text-center py-6">
              <svg className="w-12 h-12 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                {success.updated ? 'Demo Updated!' : 'Demo Published!'}
              </p>
              <p className="text-gray-600 dark:text-slate-400 mb-4">
                Your demo is now live at:
              </p>
              <a
                href={success.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline break-all"
              >
                {success.url}
              </a>
            </div>
          )}

          {/* Push form */}
          {authStatus?.isLoggedIn && !success && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Demo Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="my-demo"
                  maxLength={50}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  URL: demoscript.app/u/{authStatus.username}/{slug || 'my-demo'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-slate-300">
                  Make demo public
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={handlePush}
                disabled={pushing || !slug.trim()}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {pushing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Pushing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Push to Cloud
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {success ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
