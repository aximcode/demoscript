import { useDemo } from '../context/DemoContext';
import {
  isSlideStep,
  isRestStep,
  isShellStep,
  isBrowserStep,
  isCodeStep,
  isWaitStep,
  isAssertStep,
  isGraphQLStep,
  isDatabaseStep,
  isFormStep,
  isTerminalStep,
  isPollStep,
} from '../types/schema';
import { SlideStep } from './SlideStep';
import { RestStep } from './RestStep';
import { ShellStep } from './ShellStep';
import { BrowserStep } from './BrowserStep';
import { CodeStep } from './CodeStep';
import { WaitStep } from './WaitStep';
import { AssertStep } from './AssertStep';
import { GraphQLStep } from './GraphQLStep';
import { DatabaseStep } from './DatabaseStep';
import { FormStep } from './FormStep';
import { TerminalStep } from './TerminalStep';
import { PollStep } from './PollStep';
import { StepTransition } from './effects';
import { useStepEffects } from '../hooks/useStepEffects';

export function StepViewer() {
  const { currentStepConfig, state } = useDemo();

  // Centralized effect triggering for ALL step types
  useStepEffects();

  // Get transitions config (defaults to enabled)
  const transitionsEnabled = state.config?.settings?.effects?.transitions ?? true;

  if (!currentStepConfig) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        No step selected
      </div>
    );
  }

  const renderStepContent = () => {
    if (isSlideStep(currentStepConfig)) {
      return <SlideStep step={currentStepConfig} />;
    }

    if (isRestStep(currentStepConfig)) {
      return <RestStep step={currentStepConfig} />;
    }

    if (isShellStep(currentStepConfig)) {
      return <ShellStep step={currentStepConfig} />;
    }

    if (isBrowserStep(currentStepConfig)) {
      return <BrowserStep step={currentStepConfig} />;
    }

    if (isCodeStep(currentStepConfig)) {
      return <CodeStep step={currentStepConfig} />;
    }

    if (isWaitStep(currentStepConfig)) {
      return <WaitStep step={currentStepConfig} />;
    }

    if (isAssertStep(currentStepConfig)) {
      return <AssertStep step={currentStepConfig} />;
    }

    if (isGraphQLStep(currentStepConfig)) {
      return <GraphQLStep step={currentStepConfig} />;
    }

    if (isDatabaseStep(currentStepConfig)) {
      return <DatabaseStep step={currentStepConfig} />;
    }

    if (isFormStep(currentStepConfig)) {
      return <FormStep step={currentStepConfig} />;
    }

    if (isTerminalStep(currentStepConfig)) {
      return <TerminalStep step={currentStepConfig} />;
    }

    if (isPollStep(currentStepConfig)) {
      return <PollStep step={currentStepConfig} />;
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        Unknown step type
      </div>
    );
  };

  const content = renderStepContent();

  // Wrap in transition if enabled
  if (transitionsEnabled) {
    return (
      <StepTransition key={state.currentStep} direction="right" duration={300}>
        {content}
      </StepTransition>
    );
  }

  return content;
}
