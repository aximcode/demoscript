/**
 * OpenDemoModal - Modal to list and select user's demos from cloud storage
 */

import { useState, useEffect } from 'react';
import { formatRelativeTime } from '../../lib/format-time';

interface Demo {
  id: string;
  slug: string;
  title: string | null;
  description: string | null;
  is_public: boolean;
  team_id: string | null;
  team_name: string | null;
  has_recordings: boolean;
  updated_at: string;
}

interface OpenDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (demo: { id: string; slug: string; yaml_content: string }) => void;
}

export function OpenDemoModal({ isOpen, onClose, onSelect }: OpenDemoModalProps) {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingDemoId, setLoadingDemoId] = useState<string | null>(null);

  // Fetch demos when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    fetch('/api/demos', {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch demos');
        }
        return res.json();
      })
      .then((data) => {
        setDemos(data.demos || []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  // Handle demo selection
  const handleSelect = async (demo: Demo) => {
    setLoadingDemoId(demo.id);
    setError(null);

    try {
      const res = await fetch(`/api/demos/${demo.id}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load demo');
      }

      const data = await res.json();
      onSelect({
        id: demo.id,
        slug: demo.slug,
        yaml_content: data.yaml_content,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo');
    } finally {
      setLoadingDemoId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <h3 className="font-medium text-gray-900 dark:text-slate-100">Open Demo</h3>
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
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700"
              >
                Try again
              </button>
            </div>
          ) : demos.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 dark:text-slate-400 font-medium">No demos yet</p>
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                Create your first demo to get started
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {demos.map((demo) => (
                <button
                  key={demo.id}
                  onClick={() => handleSelect(demo)}
                  disabled={loadingDemoId === demo.id}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-slate-100 truncate">
                          {demo.title || demo.slug}
                        </span>
                        {loadingDemoId === demo.id && (
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-600" />
                        )}
                      </div>
                      {demo.title && (
                        <p className="text-xs text-gray-500 dark:text-slate-500 font-mono truncate">
                          {demo.slug}
                        </p>
                      )}
                      {demo.description && (
                        <p className="text-sm text-gray-500 dark:text-slate-400 truncate mt-0.5">
                          {demo.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        {demo.team_name && (
                          <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                            {demo.team_name}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 text-xs rounded ${
                          demo.is_public
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400'
                        }`}>
                          {demo.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {formatRelativeTime(demo.updated_at)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
