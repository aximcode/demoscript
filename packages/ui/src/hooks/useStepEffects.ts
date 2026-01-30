import { useEffect, useRef, useMemo } from 'react';
import { useDemo } from '../context/DemoContext';
import { useConfetti, useSoundEffects } from '../components/effects';
import { resolveStepSettings } from '../lib/step-settings';

/**
 * Centralized hook for step completion effects.
 * Handles confetti and sound effects for ALL step types.
 * Respects configuration from demo settings with step-level overrides.
 */
export function useStepEffects() {
  const { state, getStepStatus, currentStepConfig } = useDemo();
  const confetti = useConfetti();
  const { playSuccess, playError, enabled: soundEnabled } = useSoundEffects();
  const prevStatusRef = useRef<Record<number, string>>({});

  // Resolve step settings (step-level > global > default)
  const stepSettings = useMemo(() => {
    if (!currentStepConfig) return null;
    return resolveStepSettings(currentStepConfig, state.config?.settings);
  }, [currentStepConfig, state.config?.settings]);

  // Get resolved effects (with step-level overrides)
  const confettiEnabled = stepSettings?.effects.confetti ?? true;
  const soundsEnabled = stepSettings?.effects.sounds ?? true;

  useEffect(() => {
    const currentStep = state.currentStep;
    const status = getStepStatus(currentStep);
    const prevStatus = prevStatusRef.current[currentStep];

    // Only trigger on status transitions
    if (status === prevStatus) return;

    if (status === 'complete' && prevStatus !== 'complete') {
      // Step completed successfully
      if (confettiEnabled) {
        confetti.fire();
      }
      if (soundsEnabled && soundEnabled) {
        playSuccess();
      }
    } else if (status === 'error' && prevStatus !== 'error') {
      // Step failed
      if (soundsEnabled && soundEnabled) {
        playError();
      }
    }

    // Update previous status
    prevStatusRef.current = {
      ...prevStatusRef.current,
      [currentStep]: status,
    };
  }, [
    state.currentStep,
    state.stepStatuses,
    getStepStatus,
    confetti,
    playSuccess,
    playError,
    confettiEnabled,
    soundsEnabled,
    soundEnabled,
  ]);
}
