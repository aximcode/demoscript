import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getThemeColors, applyThemeColors, type ThemeColors } from '../lib/theme-colors';
import type { ThemeSettings } from '../types/schema';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  colors: ThemeColors;
  isModeLocked: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  themeSettings?: ThemeSettings;
}

export function ThemeProvider({ children, defaultTheme = 'dark', themeSettings }: ThemeProviderProps) {
  // Determine if mode is forced by config
  const forcedMode = themeSettings?.mode;
  const isModeLocked = forcedMode === 'light' || forcedMode === 'dark';

  const [theme, setThemeState] = useState<Theme>(() => {
    // If mode is forced, use it
    if (forcedMode === 'light' || forcedMode === 'dark') {
      return forcedMode;
    }
    // Otherwise check localStorage and system preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('demoscript-theme') as Theme;
      if (saved) return saved;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return defaultTheme;
  });

  // Get theme colors based on settings
  const colors = getThemeColors(themeSettings);

  // Apply CSS variables when colors change
  useEffect(() => {
    applyThemeColors(colors);
  }, [colors.primary, colors.accent, colors.primaryRgb, colors.accentRgb]);

  // Apply dark/light class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Only save to localStorage if mode isn't locked
    if (!isModeLocked) {
      localStorage.setItem('demoscript-theme', theme);
    }
  }, [theme, isModeLocked]);

  const setTheme = (newTheme: Theme) => {
    // Don't allow theme changes if mode is locked
    if (isModeLocked) return;
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    if (isModeLocked) return;
    setThemeState(t => t === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, colors, isModeLocked }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme, isModeLocked } = useTheme();

  // Don't render toggle if mode is locked
  if (isModeLocked) {
    return null;
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative w-14 h-7 rounded-full transition-all duration-300
        ${theme === 'dark'
          ? 'bg-gradient-to-r from-theme-primary to-theme-accent shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)]'
          : 'bg-gray-200 hover:bg-gray-300'
        }
        ${className}
      `}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span
        className={`
          absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center
          ${theme === 'dark'
            ? 'left-7 bg-slate-900'
            : 'left-0.5 bg-white shadow-md'
          }
        `}
      >
        {theme === 'dark' ? (
          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        )}
      </span>
    </button>
  );
}
