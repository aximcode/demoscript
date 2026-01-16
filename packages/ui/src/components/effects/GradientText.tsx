import { ReactNode } from 'react';

interface GradientTextProps {
  children: ReactNode;
  variant?: 'primary' | 'success' | 'warning';
}

export function GradientText({ children, variant = 'primary' }: GradientTextProps) {
  // Primary variant uses theme colors via CSS variables
  if (variant === 'primary') {
    return (
      <span
        className="bg-clip-text text-transparent"
        style={{
          backgroundImage: 'linear-gradient(to right, var(--color-primary), var(--color-accent))',
        }}
      >
        {children}
      </span>
    );
  }

  const gradients = {
    success: 'from-green-500 via-emerald-400 to-teal-400',
    warning: 'from-orange-500 via-amber-400 to-yellow-400',
  };

  return (
    <span className={`bg-gradient-to-r ${gradients[variant]} bg-clip-text text-transparent`}>
      {children}
    </span>
  );
}
