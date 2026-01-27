import { useDemo } from '../context/DemoContext';

/**
 * Shows a "Powered by AximCode APIs" badge when the demo uses apis.aximcode.com
 */
export function PoweredByBadge() {
  const { state } = useDemo();

  // Check if base_url contains apis.aximcode.com
  const baseUrl = state.config?.settings?.base_url || '';
  const isAximCodeApi = baseUrl.includes('apis.aximcode.com');

  if (!isAximCodeApi) {
    return null;
  }

  return (
    <div className="flex justify-center mt-4">
      <a
        href="https://apis.aximcode.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 bg-gray-100/50 dark:bg-slate-800/50 rounded-full border border-gray-200/50 dark:border-slate-700/50 transition-colors"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Powered by <span className="font-medium">AximCode APIs</span></span>
      </a>
    </div>
  );
}
