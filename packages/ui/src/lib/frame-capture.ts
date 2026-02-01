/**
 * Frame capture service for video export
 * Captures demo frames as images using html2canvas
 */
import html2canvas from 'html2canvas';

export interface CaptureOptions {
  width: number;
  height: number;
  scale?: number; // Device pixel ratio, default 1
  backgroundColor?: string;
}

export interface FrameCaptureResult {
  data: Uint8Array;
  width: number;
  height: number;
}

/**
 * Capture a single frame from an HTML element
 */
export async function captureFrame(
  element: HTMLElement,
  options: CaptureOptions
): Promise<FrameCaptureResult> {
  const scale = options.scale ?? 1;

  const canvas = await html2canvas(element, {
    width: options.width,
    height: options.height,
    scale,
    backgroundColor: options.backgroundColor ?? '#0f172a', // Dark slate background
    useCORS: true,
    allowTaint: false,
    logging: false,
    // Ignore elements that shouldn't be in the export
    ignoreElements: (el) => {
      // Ignore export modal itself
      if (el.getAttribute('data-export-ignore') === 'true') return true;
      // Ignore any hidden elements
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return true;
      return false;
    },
  });

  // Convert canvas to PNG blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to convert canvas to blob'));
      },
      'image/png',
      1.0
    );
  });

  const arrayBuffer = await blob.arrayBuffer();
  return {
    data: new Uint8Array(arrayBuffer),
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Wait for a specific duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Capture frames for video export
 * For executable steps (REST/shell), captures before and after execution
 */
export interface MultiFrameCaptureOptions extends CaptureOptions {
  /**
   * Frames per second (for video output, not capture rate)
   */
  fps: number;
  /**
   * Duration each step is shown (in ms)
   */
  stepDuration: number;
  /**
   * Callback to navigate to next step
   */
  onNavigate: (stepIndex: number) => Promise<void>;
  /**
   * Total number of steps
   */
  totalSteps: number;
  /**
   * Progress callback
   */
  onProgress?: (progress: number, message: string) => void;
  /**
   * Check if step has an execute action (REST/shell steps)
   * If provided, these steps get before/after captures
   */
  isExecutableStep?: (stepIndex: number) => boolean;
  /**
   * Trigger execution for a step (clicks the Execute button)
   * Required if isExecutableStep is provided
   */
  onExecute?: (stepIndex: number) => Promise<void>;
}

/**
 * Frame with duration metadata for efficient encoding
 */
export interface FrameWithDuration extends FrameCaptureResult {
  /** Duration in seconds this frame should be shown */
  duration: number;
}

/**
 * Capture frames for a demo video
 * For executable steps, captures before (form) and after (response)
 * Returns frames with duration metadata for efficient encoding
 */
export async function captureAllFrames(
  element: HTMLElement,
  options: MultiFrameCaptureOptions
): Promise<FrameWithDuration[]> {
  const {
    stepDuration,
    onNavigate,
    totalSteps,
    onProgress,
    isExecutableStep,
    onExecute,
    ...captureOptions
  } = options;

  const frames: FrameWithDuration[] = [];
  const durationSeconds = stepDuration / 1000;
  // For executable steps, split duration: 1/3 before, 2/3 after
  const beforeDuration = durationSeconds / 3;
  const afterDuration = (durationSeconds * 2) / 3;

  for (let step = 0; step < totalSteps; step++) {
    // Navigate to step
    await onNavigate(step);

    // Wait for animations/rendering to settle
    await sleep(500);

    const progressPercent = (step / totalSteps) * 100;
    onProgress?.(progressPercent, `Capturing step ${step + 1}/${totalSteps}...`);

    const hasExecution = isExecutableStep?.(step) && onExecute;

    if (hasExecution) {
      // Capture "before" state (form ready to execute)
      const beforeFrame = await captureFrame(element, captureOptions);
      frames.push({
        ...beforeFrame,
        duration: beforeDuration,
      });

      // Trigger execution
      await onExecute(step);

      // Wait for execution animation to complete
      await sleep(800);

      // Capture "after" state (with response)
      const afterFrame = await captureFrame(element, captureOptions);
      frames.push({
        ...afterFrame,
        duration: afterDuration,
      });
    } else {
      // Non-executable step: single capture
      const frame = await captureFrame(element, captureOptions);
      frames.push({
        ...frame,
        duration: durationSeconds,
      });
    }
  }

  onProgress?.(100, `Captured ${frames.length} frames`);
  return frames;
}

/**
 * Get recommended export dimensions based on viewport
 */
export function getRecommendedDimensions(): { width: number; height: number } {
  // Standard 16:9 aspect ratio options
  const options = [
    { width: 1920, height: 1080 }, // 1080p
    { width: 1280, height: 720 },  // 720p
    { width: 854, height: 480 },   // 480p
  ];

  // Pick based on viewport (don't upscale)
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  for (const option of options) {
    if (viewportWidth >= option.width && viewportHeight >= option.height) {
      return option;
    }
  }

  // Default to viewport size with 16:9 aspect ratio
  const aspectRatio = 16 / 9;
  const width = Math.min(viewportWidth, 1280);
  const height = Math.round(width / aspectRatio);

  return { width, height };
}
