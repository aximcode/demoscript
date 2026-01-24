import { useCallback, useEffect, useState } from 'react';
import yaml from 'js-yaml';
import { useDemo } from '../context/DemoContext';
import { useTheme } from '../context/ThemeContext';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { Stepper } from './Stepper';
import { StepViewer } from './StepViewer';
import { Controls } from './Controls';
import { Header } from './Header';
import { KeyboardHelp } from './KeyboardHelp';
import { LoginScreen } from './LoginScreen';
import { Dashboard } from './Dashboard';
import { Sidebar } from './Sidebar';
import { GridBackground, GlowOrbs } from './effects';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { normalizeConfig } from '../lib/normalize-config';
import { isCloudMode } from '../lib/execute-adapter';
import { getThemeColors, applyThemeColors } from '../lib/theme-colors';
import type { DemoConfig, AuthSettings, EffectsSettings } from '../types/schema';

// Background effects wrapper
function BackgroundEffects({ effects }: { effects?: EffectsSettings }) {
  const gridEnabled = effects?.grid_background !== false;
  const orbsEnabled = effects?.glow_orbs !== false;

  return (
    <>
      <GridBackground enabled={gridEnabled} />
      <GlowOrbs enabled={orbsEnabled} />
    </>
  );
}

// For development, we'll load the demo config from window or fetch it
// Cloud mode adds IS_CLOUD, CLOUD_PROXY_URL, DEMO_ID, DEMO_MODE for proxy execution
declare global {
  interface Window {
    DEMO_CONFIG?: DemoConfig;
    DEMO_RECORDINGS?: unknown;
    IS_CLOUD?: boolean;
    CLOUD_PROXY_URL?: string;
    CLOUD_GRAPHQL_PROXY_URL?: string;
    DEMO_ID?: string;
    DEMO_MODE?: 'live' | 'recorded';
  }
}

// Inner component that renders the demo content
function DemoContent() {
  const { state, dispatch } = useDemo();
  const { isAuthenticated, isAuthRequired } = useAuth();
  const [showDashboard, setShowDashboard] = useState(true);

  const dashboardEnabled = state.config?.settings?.dashboard?.enabled === true;

  // Keyboard shortcuts - only active when not on dashboard
  const handleNext = useCallback(() => dispatch({ type: 'NEXT_STEP' }), [dispatch]);
  const handlePrev = useCallback(() => dispatch({ type: 'PREV_STEP' }), [dispatch]);
  const handleReset = useCallback(() => dispatch({ type: 'RESET' }), [dispatch]);

  useKeyboardNavigation({
    onNext: handleNext,
    onPrev: handlePrev,
    onReset: handleReset,
    enabled: !(dashboardEnabled && showDashboard),
  });

  // Show login screen if auth is required and user is not authenticated
  if (isAuthRequired && !isAuthenticated) {
    return <LoginScreen />;
  }

  // Show dashboard if enabled and not started
  if (dashboardEnabled && showDashboard && state.config) {
    return (
      <Dashboard
        config={state.config}
        onStart={() => setShowDashboard(false)}
      />
    );
  }

  const sidebarEnabled = state.config?.settings?.sidebar?.enabled === true;
  const sidebarCollapsed = state.sidebarCollapsed;

  const handleStepClick = (index: number) => {
    dispatch({ type: 'SET_STEP', payload: index });
  };

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      {/* Sidebar */}
      {state.config && sidebarEnabled && (
        <Sidebar
          steps={state.config.steps}
          onStepClick={handleStepClick}
        />
      )}

      {/* Main content with sidebar offset */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarEnabled ? (sidebarCollapsed ? 'ml-14' : 'ml-72') : ''
        }`}
      >
        <Header />
        <main className="flex-1 mx-auto px-4 py-6 xl:px-8 max-w-5xl xl:max-w-[85vw] 2xl:max-w-[80vw]">
          <Stepper />
          <div className="mt-6">
            <StepViewer />
          </div>
          <div className="mt-6">
            <Controls />
          </div>
        </main>
        <KeyboardHelp />
      </div>
    </div>
  );
}

export function DemoRunner() {
  const { state, dispatch } = useDemo();
  const { setTheme } = useTheme();
  const [authSettings, setAuthSettings] = useState<AuthSettings | undefined>(undefined);

  // Apply theme colors and mode from config
  useEffect(() => {
    if (state.config?.settings?.theme) {
      const themeSettings = state.config.settings.theme;

      // Apply color scheme (pass preset for conditional styling)
      const colors = getThemeColors(themeSettings);
      applyThemeColors(colors, themeSettings.preset);

      // Apply forced mode if specified
      if (themeSettings.mode === 'light' || themeSettings.mode === 'dark') {
        setTheme(themeSettings.mode);
      }
    }
  }, [state.config?.settings?.theme, setTheme]);

  useEffect(() => {
    async function loadDemo() {
      // Check if config is embedded (static build or cloud)
      if (window.DEMO_CONFIG) {
        const config = normalizeConfig(window.DEMO_CONFIG);
        dispatch({ type: 'SET_CONFIG', payload: config });
        setAuthSettings(config.settings?.auth);
        if (window.DEMO_RECORDINGS) {
          dispatch({ type: 'SET_RECORDINGS', payload: window.DEMO_RECORDINGS as never });
        }
        // Cloud mode: check DEMO_MODE for live execution
        if (isCloudMode() && window.DEMO_MODE === 'live') {
          dispatch({ type: 'SET_LIVE_AVAILABLE', payload: true });
          dispatch({ type: 'SET_MODE', payload: 'live' });
        }
        return;
      }

      // Try to fetch from dev server
      try {
        const response = await fetch('/api/demo', {
          headers: { 'ngrok-skip-browser-warning': 'true' },
        });
        if (response.ok) {
          const data = await response.json();
          const config = normalizeConfig(data.config);
          dispatch({ type: 'SET_CONFIG', payload: config });
          setAuthSettings(config.settings?.auth);
          if (data.recordings) {
            dispatch({ type: 'SET_RECORDINGS', payload: data.recordings });
          }
          dispatch({ type: 'SET_LIVE_AVAILABLE', payload: true });
          dispatch({ type: 'SET_MODE', payload: 'live' });
          return;
        }
      } catch {
        // Dev server not available
      }

      // Try to load example demo for development
      try {
        const response = await fetch('/demo.yaml');
        if (response.ok) {
          const text = await response.text();
          const config = normalizeConfig(yaml.load(text) as DemoConfig);
          dispatch({ type: 'SET_CONFIG', payload: config });
          setAuthSettings(config.settings?.auth);
        }
      } catch {
        console.log('No demo loaded');
      }
    }

    loadDemo();
  }, [dispatch]);

  // WebSocket connection for live reload
  useEffect(() => {
    // Only connect in dev mode (not static builds)
    if (window.DEMO_CONFIG) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws: WebSocket | null = null;
    let reconnectTimeout: number | null = null;

    function connect() {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'reload') {
            console.log('Demo reloaded via WebSocket');
            dispatch({ type: 'SET_CONFIG', payload: normalizeConfig(message.config) });
            if (message.recordings) {
              dispatch({ type: 'SET_RECORDINGS', payload: message.recordings });
            }
          }
        } catch {
          // Ignore invalid messages
        }
      };

      ws.onclose = () => {
        // Attempt to reconnect after a delay
        reconnectTimeout = window.setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      ws?.close();
    };
  }, [dispatch]);

  if (!state.config) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary mx-auto mb-4"></div>
          <p className="text-theme-primary opacity-70">Loading demo...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider authSettings={authSettings}>
      <BackgroundEffects effects={state.config.settings?.effects} />
      <DemoContent />
    </AuthProvider>
  );
}
