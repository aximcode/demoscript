import { DemoProvider } from './context/DemoContext';
import { ThemeProvider } from './context/ThemeContext';
import { SoundProvider } from './components/effects';
import { DemoRunner } from './components/DemoRunner';
import { Builder } from './pages/Builder';
import { DemoEditor } from './pages/DemoEditor';

function App() {
  // Check if we're on the builder route (legacy)
  const isBuilderRoute = window.location.pathname === '/builder' ||
    (window as unknown as { __DEMOSCRIPT_BUILDER__?: boolean }).__DEMOSCRIPT_BUILDER__;

  // Check if we're on the editor route (new unified editor)
  const isEditorRoute = window.location.pathname === '/editor' ||
    (window as unknown as { __DEMOSCRIPT_EDITOR__?: boolean }).__DEMOSCRIPT_EDITOR__;

  if (isEditorRoute) {
    return (
      <ThemeProvider defaultTheme="light">
        <SoundProvider>
          <DemoProvider>
            <DemoEditor />
          </DemoProvider>
        </SoundProvider>
      </ThemeProvider>
    );
  }

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
