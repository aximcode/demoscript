/**
 * SaveAsModal - Modal to save demo with title/slug to cloud storage
 * Includes slug availability check and quota display
 */

import { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { generateYaml } from '../../lib/yaml-parser';
import { slugify } from '../../lib/string-utils';

interface SaveAsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, slug: string) => void;
  initialTitle?: string;
  initialDescription?: string;
}

interface Usage {
  count: number;
  limit: number;
  unlimited: boolean;
  plan: string;
}

export function SaveAsModal({ isOpen, onClose, onSave, initialTitle = '', initialDescription = '' }: SaveAsModalProps) {
  const { toConfig } = useEditor();
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState(initialDescription);
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Slug availability state
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Usage/quota state
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || '');
      setDescription(initialDescription || '');
      setSlug(slugify(initialTitle || ''));
      setIsPublic(true);
      setError(null);
      setSlugAvailable(null);
      setSlugError(null);

      // Fetch usage
      setLoadingUsage(true);
      fetch('/api/demos/usage', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setUsage(data))
        .catch(() => setUsage(null))
        .finally(() => setLoadingUsage(false));
    }
  }, [isOpen, initialTitle, initialDescription]);

  // Auto-generate slug when title changes
  useEffect(() => {
    if (title) {
      setSlug(slugify(title));
    }
  }, [title]);

  // Check slug availability with debounce
  useEffect(() => {
    setSlugError(null);

    if (!slug || slug.length < 1) {
      setSlugAvailable(null);
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
      setSlugAvailable(false);
      setSlugError('Invalid format');
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const res = await fetch(`/api/demos/check-slug?slug=${encodeURIComponent(slug)}`, {
          credentials: 'include',
        });
        const data = await res.json();

        if (!res.ok) {
          // API error (401, 400, etc.)
          setSlugAvailable(null);
          setSlugError(data.error === 'Unauthorized' ? 'Please log out and log back in' : (data.error || 'Check failed'));
        } else if (data.available === false) {
          setSlugAvailable(false);
          setSlugError('This slug is already taken');
        } else {
          setSlugAvailable(true);
          setSlugError(null);
        }
      } catch {
        setSlugAvailable(null);
        setSlugError('Failed to check availability');
      } finally {
        setCheckingSlug(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [slug]);

  // Handle save
  const handleSave = async () => {
    if (!slug || slugAvailable === false) return;

    setSaving(true);
    setError(null);

    try {
      const config = toConfig();
      const yaml = generateYaml(config);

      const response = await fetch('/api/demos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          slug,
          title: title || undefined,
          description: description || undefined,
          yaml_content: yaml,
          is_public: isPublic,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      const data = await response.json();
      onSave(data.id, data.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Check if can save
  const canSave = slug && slugAvailable && !saving && !checkingSlug &&
    (usage?.unlimited || (usage && usage.count < usage.limit));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-medium text-gray-900 dark:text-slate-100">Save Demo</h3>
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
        <div className="p-4 space-y-4">
          {/* Quota display */}
          {!loadingUsage && usage && !usage.unlimited && (
            <div className={`p-3 rounded-lg ${
              usage.count >= usage.limit
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                : 'bg-gray-50 dark:bg-slate-800'
            }`}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">
                  Demo quota ({usage.plan} plan)
                </span>
                <span className={usage.count >= usage.limit ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-slate-300'}>
                  {usage.count} / {usage.limit}
                </span>
              </div>
              {usage.count >= usage.limit && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Upgrade your plan to save more demos.
                </p>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Awesome Demo"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              URL Slug
            </label>
            <div className="relative">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="my-awesome-demo"
                className={`w-full px-3 py-2 pr-8 bg-gray-50 dark:bg-slate-800 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 ${
                  slugAvailable === false || slugError
                    ? 'border-red-500 focus:ring-red-500'
                    : slugAvailable === true
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-gray-300 dark:border-slate-600 focus:ring-primary-500'
                }`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {checkingSlug && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600" />
                )}
                {!checkingSlug && slugAvailable === true && !slugError && (
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {!checkingSlug && (slugAvailable === false || slugError) && (
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
            {slugError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {slugError}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your demo"
              rows={2}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Visibility</span>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {isPublic ? 'Anyone can view this demo' : 'Only you can view this demo'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPublic(true)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  isPublic
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                Public
              </button>
              <button
                onClick={() => setIsPublic(false)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  !isPublic
                    ? 'bg-gray-700 dark:bg-slate-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                Private
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
