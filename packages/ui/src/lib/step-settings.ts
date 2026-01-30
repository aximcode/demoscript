/**
 * Step Settings Resolution Utility
 *
 * Provides a DRY approach to resolving step settings with inheritance:
 * step-level > global > default
 */

import type { DemoSettings, Step } from '../types/schema';
import type { StepEffectsOverride } from '@demoscript/shared/types';

/**
 * Resolved step settings combining global and step-level overrides
 */
export interface ResolvedStepSettings {
  show_curl: boolean;
  results_position: 'left' | 'right' | 'auto';
  effects: {
    confetti: boolean;
    sounds: boolean;
    counters: boolean;
  };
}

/**
 * Safely get a property from a step object
 */
function getStepProp<T>(step: Step, key: string): T | undefined {
  return key in step ? (step as unknown as Record<string, unknown>)[key] as T : undefined;
}

/**
 * Resolve step settings by merging global defaults with step-level overrides.
 * Step-level settings take precedence over global settings.
 *
 * Pattern: step.setting ?? globalSettings?.setting ?? default
 */
export function resolveStepSettings(
  step: Step,
  globalSettings?: DemoSettings
): ResolvedStepSettings {
  const globalEffects = globalSettings?.effects ?? {};
  const stepEffects = getStepProp<StepEffectsOverride>(step, 'effects');

  return {
    show_curl:
      getStepProp<boolean>(step, 'show_curl') ??
      globalSettings?.show_curl ??
      false,

    results_position:
      getStepProp<'left' | 'right' | 'auto'>(step, 'results_position') ??
      globalSettings?.results_position ??
      'auto',

    effects: {
      confetti: stepEffects?.confetti ?? globalEffects.confetti ?? true,
      sounds: stepEffects?.sounds ?? globalEffects.sounds ?? true,
      counters: stepEffects?.counters ?? globalEffects.counters ?? true,
    },
  };
}

/**
 * Compute actual results position from 'auto' mode.
 * 'auto' mode: left when no form fields, right when form fields exist.
 */
export function computeResultsPosition(
  position: 'left' | 'right' | 'auto',
  hasFormFields: boolean
): 'left' | 'right' {
  if (position === 'auto') {
    return hasFormFields ? 'right' : 'left';
  }
  return position;
}
