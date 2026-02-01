import { useDemo } from '../context/DemoContext';
import { ThemeToggle } from '../context/ThemeContext';
import { SoundToggle } from './effects';
import { DiagramToggleButton } from './diagram';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { ServiceHealthHeader } from './ServiceHealth';
import { isTabCaptureSupported } from '../lib/tab-capture';

interface HeaderProps {
  onExport?: () => void;
}

export function Header({ onExport }: HeaderProps) {
  const { state, dispatch, hasDiagram, toggleDiagram } = useDemo();

  const healthChecks = state.config?.settings?.health_checks;
  const { statuses } = useHealthCheck(healthChecks, {
    enabled: !!healthChecks?.length && state.isLiveAvailable,
  });

  // Check if diagram sidebar is visible to adjust header layout
  const diagramSettings = state.config?.settings?.diagram;
  const diagramPosition = diagramSettings?.position || 'toggle';
  const sidebarVisible = hasDiagram && diagramPosition === 'sidebar' && state.diagramVisible;

  if (!state.config) return null;

  return (
    <header className="header-themed bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-lg relative z-10 transition-colors duration-300">
      <div className={`px-4 py-4 transition-all duration-300 ${sidebarVisible ? 'md:pr-[340px]' : 'container mx-auto max-w-5xl'}`}>
        <div className="flex items-center justify-between">
          <div>
            {state.config.title && (
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:neon-text-primary">
                {state.config.title}
              </h1>
            )}
            <p className="text-gray-600 dark:text-slate-300/70 text-sm mt-1">
              {state.config.description}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Health status indicator */}
            {statuses.length > 0 && (
              <ServiceHealthHeader statuses={statuses} />
            )}
            {state.isLiveAvailable && (
              <button
                onClick={() =>
                  dispatch({
                    type: 'SET_MODE',
                    payload: state.mode === 'live' ? 'recorded' : 'live',
                  })
                }
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  state.mode === 'live'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                }`}
                title={state.mode === 'live' ? 'Click to switch to recorded responses' : 'Click to switch to live API calls'}
              >
                {state.mode === 'live' ? '⚡ Live API' : '📼 Recorded'}
              </button>
            )}
            {!state.isLiveAvailable && (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-theme-primary to-theme-accent text-white shadow-lg shadow-[rgba(var(--color-primary-rgb),0.3)]">
                📼 Recorded
              </span>
            )}
            {/* Only show toggle for toggle/sidebar modes (not sticky/top where diagram is always visible) */}
            {hasDiagram && (diagramPosition === 'toggle' || diagramPosition === 'sidebar') && (
              <DiagramToggleButton
                isVisible={state.diagramVisible}
                onClick={toggleDiagram}
              />
            )}
            {/* Export button - only show if browser supports screen capture */}
            {onExport && isTabCaptureSupported() && (
              <button
                onClick={onExport}
                className="p-2 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                title="Export as video"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
            <SoundToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
