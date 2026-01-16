// Theme color system for DemoScript
// Provides preset themes and utilities for dynamic color customization

export interface ThemeColors {
  primary: string;      // Main brand color (buttons, links, active states)
  accent: string;       // Secondary accent (gradients, highlights)
  primaryRgb: string;   // RGB values for rgba() usage (e.g., "139, 92, 246")
  accentRgb: string;    // RGB values for rgba() usage
}

export type ThemePreset = 'purple' | 'blue' | 'green' | 'teal' | 'orange' | 'rose';

// Convert hex color to RGB string (e.g., "#8b5cf6" -> "139, 92, 246")
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '139, 92, 246'; // Default to purple
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

// Theme presets - carefully chosen color combinations
export const THEME_PRESETS: Record<ThemePreset, Omit<ThemeColors, 'primaryRgb' | 'accentRgb'>> = {
  purple: {
    primary: '#8b5cf6',  // Violet-500
    accent: '#06b6d4',   // Cyan-500
  },
  blue: {
    primary: '#3b82f6',  // Blue-500
    accent: '#8b5cf6',   // Violet-500
  },
  green: {
    primary: '#10b981',  // Emerald-500
    accent: '#059669',   // Emerald-600 (darker green for cohesive look)
  },
  teal: {
    primary: '#14b8a6',  // Teal-500
    accent: '#f59e0b',   // Amber-500
  },
  orange: {
    primary: '#f97316',  // Orange-500
    accent: '#8b5cf6',   // Violet-500
  },
  rose: {
    primary: '#f43f5e',  // Rose-500
    accent: '#8b5cf6',   // Violet-500
  },
};

// Default theme (purple/cyan - the original DemoScript look)
export const DEFAULT_THEME: ThemeColors = {
  primary: THEME_PRESETS.purple.primary,
  accent: THEME_PRESETS.purple.accent,
  primaryRgb: hexToRgb(THEME_PRESETS.purple.primary),
  accentRgb: hexToRgb(THEME_PRESETS.purple.accent),
};

export interface ThemeConfig {
  preset?: ThemePreset;
  primary?: string;
  accent?: string;
  mode?: 'auto' | 'light' | 'dark';
}

// Get theme colors from config, with fallback to defaults
export function getThemeColors(config?: ThemeConfig): ThemeColors {
  if (!config) {
    return DEFAULT_THEME;
  }

  // Start with preset or default
  let primary = DEFAULT_THEME.primary;
  let accent = DEFAULT_THEME.accent;

  // Apply preset if specified
  if (config.preset && THEME_PRESETS[config.preset]) {
    primary = THEME_PRESETS[config.preset].primary;
    accent = THEME_PRESETS[config.preset].accent;
  }

  // Custom colors override preset
  if (config.primary && isValidHex(config.primary)) {
    primary = config.primary;
  }
  if (config.accent && isValidHex(config.accent)) {
    accent = config.accent;
  }

  return {
    primary,
    accent,
    primaryRgb: hexToRgb(primary),
    accentRgb: hexToRgb(accent),
  };
}

// Validate hex color format
function isValidHex(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

// Apply theme colors to document as CSS variables
export function applyThemeColors(colors: ThemeColors, preset?: ThemePreset): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', colors.primary);
  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--color-primary-rgb', colors.primaryRgb);
  root.style.setProperty('--color-accent-rgb', colors.accentRgb);

  // Set preset attribute for conditional styling (e.g., green theme tints)
  if (preset) {
    root.setAttribute('data-theme-preset', preset);
  } else {
    root.removeAttribute('data-theme-preset');
  }
}
