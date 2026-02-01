import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { FlowDiagramPanel } from './diagram';
import { GridBackground, GlowOrbs } from './effects';
import { PoweredByBadge } from './PoweredByBadge';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { normalizeConfig } from '../lib/normalize-config';
import { isCloudMode } from '../lib/execute-adapter';
import { getThemeColors, applyThemeColors } from '../lib/theme-colors';
import { getStepTitle } from '../types/schema';
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
  const { state, dispatch, hasDiagram, toggleDiagram, currentDiagramPath, currentStepConfig } = useDemo();
  const { isAuthenticated, isAuthRequired } = useAuth();
  const [showDashboard, setShowDashboard] = useState(true);

  const dashboardEnabled = state.config?.settings?.dashboard?.enabled === true;
  const diagramSettings = state.config?.settings?.diagram;
  const diagramPosition = diagramSettings?.position || 'toggle';

  // Get current step title for diagram edge label
  const stepTitle = currentStepConfig ? getStepTitle(currentStepConfig, state.currentStep) : '';

  // Build step list for diagram sidebar (only steps with diagram paths)
  const diagramStepList = useMemo(() => {
    return state.flatSteps
      .map((step, index) => {
        if (!('diagram' in step) || !step.diagram) return null;
        return {
          index,
          title: getStepTitle(step, index),
          path: step.diagram as string,
        };
      })
      .filter((item): item is { index: number; title: string; path: string } => item !== null);
  }, [state.flatSteps]);

  // Find current step's position in the diagram step list
  const currentDiagramStepIndex = useMemo(() => {
    return diagramStepList.findIndex((item) => item.index === state.currentStep);
  }, [diagramStepList, state.currentStep]);

  // Keyboard shortcuts - only active when not on dashboard
  const handleNext = useCallback(() => dispatch({ type: 'NEXT_STEP' }), [dispatch]);
  const handlePrev = useCallback(() => dispatch({ type: 'PREV_STEP' }), [dispatch]);
  const handleReset = useCallback(() => dispatch({ type: 'RESET' }), [dispatch]);

  // Handle node click in diagram - navigate to first step with that node
  // NOTE: This must be before early returns to satisfy React's rules of hooks
  const handleDiagramNodeClick = useCallback((nodeId: string) => {
    // Find first step that references this node in its diagram path
    const stepIndex = state.flatSteps.findIndex((step) => {
      if (!('diagram' in step) || !step.diagram) return false;
      const path = step.diagram as string;
      // Match "NodeA->NodeB" or just "NodeA"
      return path.includes(nodeId);
    });
    if (stepIndex >= 0) {
      dispatch({ type: 'SET_STEP', payload: stepIndex });
    }
  }, [state.flatSteps, dispatch]);

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

        {/* Diagram panel in sidebar mode - integrated with header */}
        {/* Mobile: Full-screen overlay, Desktop: Fixed sidebar */}
        {hasDiagram && diagramSettings && diagramPosition === 'sidebar' && state.diagramVisible && (
          <>
            {/* Mobile: Full-screen overlay */}
            <div className="md:hidden fixed inset-0 z-30 bg-white/95 dark:bg-slate-900/98 backdrop-blur-md">
              {/* Header with close button */}
              <div className="h-14 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-4">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Flow Diagram</span>
                <button
                  onClick={toggleDiagram}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 transition-colors touch-manipulation"
                  title="Close Diagram"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Diagram content */}
              <div className="h-[calc(100%-56px)] p-4 overflow-auto">
                <FlowDiagramPanel
                  settings={diagramSettings}
                  steps={state.flatSteps}
                  currentPath={currentDiagramPath}
                  completedPaths={state.completedDiagramPaths}
                  stepTitle={stepTitle}
                  currentStepIndex={currentDiagramStepIndex >= 0 ? currentDiagramStepIndex : 0}
                  stepList={diagramStepList}
                  isVisible={state.diagramVisible}
                  onToggle={toggleDiagram}
                  onNodeClick={handleDiagramNodeClick}
                  onStepClick={handleStepClick}
                />
              </div>
            </div>

            {/* Desktop: Fixed sidebar */}
            <div className="hidden md:block fixed right-0 top-0 bottom-0 w-[320px] z-20 bg-white/80 dark:bg-slate-900/95 backdrop-blur-md border-l border-gray-200 dark:border-slate-700 shadow-xl">
              {/* Sidebar header area that aligns with main header */}
              <div className="h-[73px] border-b border-gray-200 dark:border-slate-700 flex items-center justify-center px-4">
                <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Flow Diagram</span>
              </div>
              {/* Diagram content - fills remaining height */}
              <div className="h-[calc(100%-73px)] p-2 pb-12 flex flex-col">
                <FlowDiagramPanel
                  settings={diagramSettings}
                  steps={state.flatSteps}
                  currentPath={currentDiagramPath}
                  completedPaths={state.completedDiagramPaths}
                  stepTitle={stepTitle}
                  currentStepIndex={currentDiagramStepIndex >= 0 ? currentDiagramStepIndex : 0}
                  stepList={diagramStepList}
                  isVisible={state.diagramVisible}
                  onToggle={toggleDiagram}
                  onNodeClick={handleDiagramNodeClick}
                  onStepClick={handleStepClick}
                />
              </div>
            </div>
          </>
        )}

        <main className={`flex-1 px-4 py-6 xl:px-8 transition-all duration-300 ${
          hasDiagram && diagramPosition === 'sidebar' && state.diagramVisible ? 'md:mr-[320px]' : ''
        }`}>
          {/* Diagram panel in top position (replaces stepper) */}
          {hasDiagram && diagramSettings && diagramPosition === 'top' && (
            <FlowDiagramPanel
              settings={diagramSettings}
              steps={state.flatSteps}
              currentPath={currentDiagramPath}
              completedPaths={state.completedDiagramPaths}
              stepTitle={stepTitle}
              currentStepIndex={currentDiagramStepIndex >= 0 ? currentDiagramStepIndex : 0}
              stepList={diagramStepList}
              isVisible={state.diagramVisible}
              onToggle={toggleDiagram}
              onNodeClick={handleDiagramNodeClick}
              onStepClick={handleStepClick}
              totalSteps={state.flatSteps.length}
              currentStepNumber={state.currentStep + 1}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          )}

          {/* Diagram panel in sticky mode */}
          {hasDiagram && diagramSettings && diagramPosition === 'sticky' && (
            <FlowDiagramPanel
              settings={diagramSettings}
              steps={state.flatSteps}
              currentPath={currentDiagramPath}
              completedPaths={state.completedDiagramPaths}
              stepTitle={stepTitle}
              currentStepIndex={currentDiagramStepIndex >= 0 ? currentDiagramStepIndex : 0}
              stepList={diagramStepList}
              isVisible={state.diagramVisible}
              onToggle={toggleDiagram}
              onNodeClick={handleDiagramNodeClick}
              onStepClick={handleStepClick}
            />
          )}

          {/* Hide stepper when diagram replaces it (sticky/top position) */}
          {!(hasDiagram && (diagramPosition === 'sticky' || diagramPosition === 'top')) && (
            <Stepper />
          )}
          <div className="mt-6">
            <StepViewer />
          </div>

          {/* Diagram panel in bottom position */}
          {hasDiagram && diagramSettings && diagramPosition === 'bottom' && (
            <FlowDiagramPanel
              settings={diagramSettings}
              steps={state.flatSteps}
              currentPath={currentDiagramPath}
              completedPaths={state.completedDiagramPaths}
              stepTitle={stepTitle}
              currentStepIndex={currentDiagramStepIndex >= 0 ? currentDiagramStepIndex : 0}
              stepList={diagramStepList}
              isVisible={state.diagramVisible}
              onToggle={toggleDiagram}
              onNodeClick={handleDiagramNodeClick}
              onStepClick={handleStepClick}
              totalSteps={state.flatSteps.length}
              currentStepNumber={state.currentStep + 1}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          )}

          <div className="mt-6">
            <Controls />
          </div>
          <PoweredByBadge />
        </main>
        <KeyboardHelp />
      </div>

      {/* Diagram panel in toggle mode (floating) */}
      {hasDiagram && diagramSettings && diagramPosition === 'toggle' && (
        <FlowDiagramPanel
          settings={diagramSettings}
          steps={state.flatSteps}
          currentPath={currentDiagramPath}
          completedPaths={state.completedDiagramPaths}
          stepTitle={stepTitle}
          currentStepIndex={currentDiagramStepIndex >= 0 ? currentDiagramStepIndex : 0}
          stepList={diagramStepList}
          isVisible={state.diagramVisible}
          onToggle={toggleDiagram}
          onNodeClick={handleDiagramNodeClick}
          onStepClick={handleStepClick}
        />
      )}
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
