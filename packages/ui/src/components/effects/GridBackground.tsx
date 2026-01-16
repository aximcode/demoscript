import { useTheme } from '../../context/ThemeContext';

interface GridBackgroundProps {
  enabled?: boolean;
  color?: string;
  opacity?: number;
  gridSize?: number;
}

export function GridBackground({
  enabled = true,
  color = 'rgba(var(--color-primary-rgb), 0.3)',
  opacity = 0.2,
  gridSize = 50,
}: GridBackgroundProps) {
  const { theme } = useTheme();

  if (!enabled || theme !== 'dark') return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-300"
      style={{ opacity }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${color} 1px, transparent 1px),
                           linear-gradient(90deg, ${color} 1px, transparent 1px)`,
          backgroundSize: `${gridSize}px ${gridSize}px`,
        }}
      />
    </div>
  );
}
