import { ReactNode } from 'react';

interface GlowingCardProps {
  children: ReactNode;
  isActive?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'yellow' | 'pink' | 'red' | 'emerald' | 'primary';
  intensity?: 'subtle' | 'medium' | 'strong';
}

const glowColors = {
  blue: {
    subtle: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]',
    medium: 'shadow-[0_0_25px_rgba(59,130,246,0.3)]',
    strong: 'shadow-[0_0_40px_rgba(59,130,246,0.4)]',
    border: 'border-blue-400/50',
    ring: 'ring-blue-400/30',
  },
  green: {
    subtle: 'shadow-[0_0_15px_rgba(34,197,94,0.2)]',
    medium: 'shadow-[0_0_25px_rgba(34,197,94,0.3)]',
    strong: 'shadow-[0_0_40px_rgba(34,197,94,0.4)]',
    border: 'border-green-400/50',
    ring: 'ring-green-400/30',
  },
  purple: {
    subtle: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]',
    medium: 'shadow-[0_0_25px_rgba(168,85,247,0.3)]',
    strong: 'shadow-[0_0_40px_rgba(168,85,247,0.4)]',
    border: 'border-purple-400/50',
    ring: 'ring-purple-400/30',
  },
  orange: {
    subtle: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]',
    medium: 'shadow-[0_0_25px_rgba(249,115,22,0.3)]',
    strong: 'shadow-[0_0_40px_rgba(249,115,22,0.4)]',
    border: 'border-orange-400/50',
    ring: 'ring-orange-400/30',
  },
  cyan: {
    subtle: 'shadow-[0_0_15px_rgba(6,182,212,0.2)]',
    medium: 'shadow-[0_0_25px_rgba(6,182,212,0.3)]',
    strong: 'shadow-[0_0_40px_rgba(6,182,212,0.4)]',
    border: 'border-cyan-400/50',
    ring: 'ring-cyan-400/30',
  },
  yellow: {
    subtle: 'shadow-[0_0_15px_rgba(234,179,8,0.2)]',
    medium: 'shadow-[0_0_25px_rgba(234,179,8,0.3)]',
    strong: 'shadow-[0_0_40px_rgba(234,179,8,0.4)]',
    border: 'border-yellow-400/50',
    ring: 'ring-yellow-400/30',
  },
  pink: {
    subtle: 'shadow-[0_0_15px_rgba(236,72,153,0.2)]',
    medium: 'shadow-[0_0_25px_rgba(236,72,153,0.3)]',
    strong: 'shadow-[0_0_40px_rgba(236,72,153,0.4)]',
    border: 'border-pink-400/50',
    ring: 'ring-pink-400/30',
  },
  red: {
    subtle: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]',
    medium: 'shadow-[0_0_25px_rgba(239,68,68,0.3)]',
    strong: 'shadow-[0_0_40px_rgba(239,68,68,0.4)]',
    border: 'border-red-400/50',
    ring: 'ring-red-400/30',
  },
  emerald: {
    subtle: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    medium: 'shadow-[0_0_25px_rgba(16,185,129,0.3)]',
    strong: 'shadow-[0_0_40px_rgba(16,185,129,0.4)]',
    border: 'border-emerald-400/50',
    ring: 'ring-emerald-400/30',
  },
  // Theme-aware color using CSS variables
  primary: {
    subtle: 'shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.2)]',
    medium: 'shadow-[0_0_25px_rgba(var(--color-primary-rgb),0.3)]',
    strong: 'shadow-[0_0_40px_rgba(var(--color-primary-rgb),0.4)]',
    border: 'border-[rgba(var(--color-primary-rgb),0.5)]',
    ring: 'ring-[rgba(var(--color-primary-rgb),0.3)]',
  },
};

export function GlowingCard({
  children,
  isActive = false,
  color = 'blue',
  intensity = 'medium',
}: GlowingCardProps) {
  const colors = glowColors[color];

  return (
    <div
      className={`
        rounded-xl transition-all duration-500 ease-out
        ${isActive ? `${colors[intensity]} ${colors.border} ring-2 ${colors.ring} border` : 'shadow-sm'}
      `}
    >
      {children}
    </div>
  );
}
