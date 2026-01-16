import { DemoProvider } from './context/DemoContext';
import { ThemeProvider } from './context/ThemeContext';
import { SoundProvider } from './components/effects';
import { DemoRunner } from './components/DemoRunner';

function App() {
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
