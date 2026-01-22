import { useState, useCallback, useRef, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  boundToWindow?: boolean;
}

interface UseDraggableReturn {
  position: Position;
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  resetPosition: () => void;
}

/**
 * Hook to make an element draggable by its header
 * Use handleMouseDown on the drag handle (e.g., modal header)
 * Apply position via transform: translate(x, y) on the modal
 */
export function useDraggable(options: UseDraggableOptions = {}): UseDraggableReturn {
  const { initialPosition = { x: 0, y: 0 }, boundToWindow = true } = options;

  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<Position>({ x: 0, y: 0 });
  const elementSize = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only allow dragging from left mouse button
    if (e.button !== 0) return;

    // Prevent text selection while dragging
    e.preventDefault();

    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    // Get the modal element size for boundary calculations
    const modal = (e.target as HTMLElement).closest('[data-draggable-modal]');
    if (modal) {
      const rect = modal.getBoundingClientRect();
      elementSize.current = { width: rect.width, height: rect.height };
    }
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      let newX = e.clientX - dragStart.current.x;
      let newY = e.clientY - dragStart.current.y;

      // Bound to window if enabled
      if (boundToWindow) {
        const maxX = window.innerWidth - elementSize.current.width / 2;
        const maxY = window.innerHeight - elementSize.current.height / 2;
        const minX = -elementSize.current.width / 2;
        const minY = -elementSize.current.height / 2;

        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));
      }

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, boundToWindow]);

  const resetPosition = useCallback(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  return {
    position,
    isDragging,
    handleMouseDown,
    resetPosition,
  };
}
