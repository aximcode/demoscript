import { DemoProvider } from './context/DemoContext';
import { ThemeProvider } from './context/ThemeContext';
import { SoundProvider } from './components/effects';
import { DemoRunner } from './components/DemoRunner';
import { Builder } from './pages/Builder';

// Check if running in builder mode
const isBuilderRoute = window.location.pathname === '/builder' ||
  (window as unknown as { __DEMOSCRIPT_BUILDER__?: boolean }).__DEMOSCRIPT_BUILDER__;

function App() {
  if (isBuilderRoute) {
    return <Builder />;
  }

  return (
    <ThemeProvider defaultTheme="dark">
      <SoundProvider>
        <DemoProvider>
          <div className="min-h-screen relative light-mode-gradient dark:bg-transparent transition-colors duration-300">
            <DemoRunner />
          </div>
        </DemoProvider>
      </SoundProvider>
    </ThemeProvider>
  );
}

export default App;
