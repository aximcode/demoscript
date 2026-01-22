import { useEffect, useCallback } from 'react';

export interface KeyboardNavigationOptions {
  onNext?: () => void;
  onPrev?: () => void;
  onReset?: () => void;
  enabled?: boolean;
}

/**
 * Shared keyboard navigation hook for demo viewer and editor
 * Handles Arrow keys for navigation, Space for next, and R for reset
 */
export function useKeyboardNavigation({
  onNext,
  onPrev,
  onReset,
  enabled = true,
}: KeyboardNavigationOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          if (onNext) {
            e.preventDefault();
            onNext();
          }
          break;
        case 'ArrowLeft':
          if (onPrev) {
            e.preventDefault();
            onPrev();
          }
          break;
        case 'r':
          if (onReset) {
            onReset();
          }
          break;
      }
    },
    [onNext, onPrev, onReset]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}
