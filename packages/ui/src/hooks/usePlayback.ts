import { useState, useCallback, useRef, useEffect } from 'react';

export interface PlaybackState {
  isPlaying: boolean;
  currentStep: number;
  speed: number; // 1 = normal, 0.5 = half speed, 2 = double speed
}

interface UsePlaybackProps {
  totalSteps: number;
  onStepChange?: (step: number) => void;
  onStepExecute?: (step: number) => Promise<void>;
  defaultSpeed?: number;
  autoAdvanceDelay?: number; // ms to wait after step completion before advancing
}

interface UsePlaybackReturn {
  playbackState: PlaybackState;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setSpeed: (speed: number) => void;
  reset: () => void;
}

export function usePlayback({
  totalSteps,
  onStepChange,
  onStepExecute,
  defaultSpeed = 1,
  autoAdvanceDelay = 1500,
}: UsePlaybackProps): UsePlaybackReturn {
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentStep: 0,
    speed: defaultSpeed,
  });

  const isExecutingRef = useRef(false);
  const abortRef = useRef(false);

  // Execute current step and advance
  const executeAndAdvance = useCallback(async () => {
    if (isExecutingRef.current || abortRef.current) return;
    if (playbackState.currentStep >= totalSteps) {
      setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
      return;
    }

    isExecutingRef.current = true;

    try {
      // Execute the step if handler provided
      if (onStepExecute) {
        await onStepExecute(playbackState.currentStep);
      }

      // Wait for auto-advance delay (adjusted by speed)
      const delay = autoAdvanceDelay / playbackState.speed;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Check if still playing and not aborted
      if (!abortRef.current) {
        setPlaybackState((prev) => {
          if (!prev.isPlaying) return prev;

          const nextStep = prev.currentStep + 1;
          if (nextStep >= totalSteps) {
            return { ...prev, isPlaying: false };
          }

          onStepChange?.(nextStep);
          return { ...prev, currentStep: nextStep };
        });
      }
    } finally {
      isExecutingRef.current = false;
    }
  }, [playbackState.currentStep, playbackState.speed, totalSteps, onStepChange, onStepExecute, autoAdvanceDelay]);

  // Auto-play effect
  useEffect(() => {
    if (playbackState.isPlaying && !isExecutingRef.current) {
      executeAndAdvance();
    }
  }, [playbackState.isPlaying, playbackState.currentStep, executeAndAdvance]);

  const play = useCallback(() => {
    abortRef.current = false;
    setPlaybackState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    abortRef.current = true;
    setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const toggle = useCallback(() => {
    if (playbackState.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [playbackState.isPlaying, play, pause]);

  const goToStep = useCallback((step: number) => {
    const clampedStep = Math.max(0, Math.min(step, totalSteps - 1));
    setPlaybackState((prev) => ({ ...prev, currentStep: clampedStep }));
    onStepChange?.(clampedStep);
  }, [totalSteps, onStepChange]);

  const nextStep = useCallback(() => {
    goToStep(playbackState.currentStep + 1);
  }, [playbackState.currentStep, goToStep]);

  const prevStep = useCallback(() => {
    goToStep(playbackState.currentStep - 1);
  }, [playbackState.currentStep, goToStep]);

  const setSpeed = useCallback((speed: number) => {
    setPlaybackState((prev) => ({ ...prev, speed }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setPlaybackState({
      isPlaying: false,
      currentStep: 0,
      speed: defaultSpeed,
    });
    onStepChange?.(0);
  }, [defaultSpeed, onStepChange]);

  return {
    playbackState,
    play,
    pause,
    toggle,
    goToStep,
    nextStep,
    prevStep,
    setSpeed,
    reset,
  };
}
