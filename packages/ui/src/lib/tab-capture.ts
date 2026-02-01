/**
 * Tab capture service using MediaRecorder + getDisplayMedia
 * Captures the current browser tab as a video stream
 *
 * This replaces html2canvas frame capture with native screen recording
 * for perfect visual fidelity.
 */

export interface TabCaptureOptions {
  onProgress?: (percent: number, message: string) => void;
}

export interface TabCaptureResult {
  blob: Blob;
  mimeType: string;
  duration: number;
}

export interface TabCaptureControls {
  /** Stop recording and get the result */
  stop: () => Promise<TabCaptureResult>;
  /** The media stream (for monitoring) */
  stream: MediaStream;
  /** The recorder instance */
  recorder: MediaRecorder;
}

/**
 * Check if tab capture is supported in this browser
 */
export function isTabCaptureSupported(): boolean {
  return !!(navigator.mediaDevices?.getDisplayMedia);
}

/**
 * Get a human-readable reason why tab capture is not supported
 */
export function getTabCaptureUnsupportedReason(): string | null {
  if (!navigator.mediaDevices) {
    return 'Your browser does not support media devices. Try using a modern browser like Chrome or Firefox.';
  }
  if (!navigator.mediaDevices.getDisplayMedia) {
    return 'Your browser does not support screen capture. Try using Chrome, Edge, or Firefox.';
  }
  return null;
}

/**
 * Start recording the current browser tab
 *
 * This will prompt the user to select a tab/window/screen to share.
 * Chrome 107+ supports preferCurrentTab to suggest the current tab.
 *
 * @returns Controls to stop recording and get the video blob
 */
export async function startTabCapture(
  options?: TabCaptureOptions
): Promise<TabCaptureControls> {
  const onProgress = options?.onProgress;

  onProgress?.(0, 'Requesting tab access...');

  // Build display media constraints
  // Using type assertion for Chrome-specific features
  const constraints: DisplayMediaStreamOptions = {
    video: {
      displaySurface: 'browser',
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    } as MediaTrackConstraints,
    audio: false,
  };

  // Add Chrome 107+ features for better UX
  // These are not in the TypeScript types yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extendedConstraints = constraints as any;
  extendedConstraints.preferCurrentTab = true;
  extendedConstraints.selfBrowserSurface = 'include';

  // Request screen/tab capture - this shows browser permission UI
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia(constraints);
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Screen capture was cancelled. Please allow screen sharing to export video.');
      }
      if (err.name === 'NotFoundError') {
        throw new Error('No screen capture source found.');
      }
    }
    throw err;
  }

  onProgress?.(10, 'Starting recording...');

  // Determine best supported codec
  // VP9 has better quality, VP8 is more compatible
  let mimeType = 'video/webm';
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
    mimeType = 'video/webm;codecs=vp9';
  } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
    mimeType = 'video/webm;codecs=vp8';
  }

  // Create MediaRecorder with good quality settings
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 5_000_000, // 5 Mbps for good quality
  });

  const chunks: Blob[] = [];
  const startTime = Date.now();

  // Collect video data chunks
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  // Handle stream ending (user clicks "Stop sharing" in browser UI)
  stream.getVideoTracks()[0]?.addEventListener('ended', () => {
    if (recorder.state === 'recording') {
      recorder.stop();
    }
  });

  // Start recording with 1-second chunks for smoother streaming
  recorder.start(1000);

  onProgress?.(15, 'Recording started');

  return {
    stream,
    recorder,
    stop: () =>
      new Promise((resolve, reject) => {
        recorder.onstop = () => {
          // Stop all tracks to release camera/mic indicators
          stream.getTracks().forEach((track) => track.stop());

          const duration = (Date.now() - startTime) / 1000;
          const blob = new Blob(chunks, { type: mimeType });

          console.log(`[tab-capture] Recording complete: ${(blob.size / 1024 / 1024).toFixed(2)} MB, ${duration.toFixed(1)}s`);

          resolve({
            blob,
            mimeType,
            duration,
          });
        };

        recorder.onerror = () => {
          stream.getTracks().forEach((track) => track.stop());
          reject(new Error('Recording failed'));
        };

        // Stop recording if it's still active
        if (recorder.state === 'recording') {
          recorder.stop();
        } else if (recorder.state === 'inactive') {
          // Already stopped (user clicked stop sharing)
          stream.getTracks().forEach((track) => track.stop());
          const duration = (Date.now() - startTime) / 1000;
          const blob = new Blob(chunks, { type: mimeType });
          resolve({ blob, mimeType, duration });
        }
      }),
  };
}
