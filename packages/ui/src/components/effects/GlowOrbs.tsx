import { useTheme } from '../../context/ThemeContext';

interface GlowOrbsProps {
  enabled?: boolean;
}

export function GlowOrbs({ enabled = true }: GlowOrbsProps) {
  const { theme } = useTheme();

  if (!enabled || theme !== 'dark') return null;

  return (
    <>
      <div
        className="fixed top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none z-0 transition-all duration-500"
        style={{
          background: 'radial-gradient(circle, rgba(var(--color-primary-rgb), 0.3) 0%, transparent 70%)',
        }}
      />
      <div
        className="fixed bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none z-0 transition-all duration-500"
        style={{
          background: 'radial-gradient(circle, rgba(var(--color-accent-rgb), 0.3) 0%, transparent 70%)',
        }}
      />
    </>
  );
}
