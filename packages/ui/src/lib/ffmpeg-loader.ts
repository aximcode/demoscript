/**
 * Lazy loader for ffmpeg.wasm
 * Loads the ~25MB WASM core from CDN only when needed
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;

export type ProgressCallback = (progress: number, message: string) => void;

/**
 * Check if the browser supports SharedArrayBuffer (required for ffmpeg.wasm)
 */
export function isFFmpegSupported(): boolean {
  return typeof SharedArrayBuffer !== 'undefined';
}

/**
 * Get a human-readable reason why ffmpeg is not supported
 */
export function getUnsupportedReason(): string | null {
  if (typeof SharedArrayBuffer === 'undefined') {
    return 'Your browser does not support SharedArrayBuffer. This is required for video export. Try using Chrome or Firefox with cross-origin isolation enabled.';
  }
  return null;
}

/**
 * Create a timeout promise
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

/**
 * Load ffmpeg.wasm from CDN
 * Returns cached instance if already loaded
 */
export async function loadFFmpeg(
  onProgress?: ProgressCallback
): Promise<FFmpeg> {
  // Return cached instance
  if (ffmpegInstance?.loaded) {
    return ffmpegInstance;
  }

  // Return existing loading promise to avoid duplicate loads
  if (loadingPromise) {
    return loadingPromise;
  }

  // Check browser support
  const unsupportedReason = getUnsupportedReason();
  if (unsupportedReason) {
    throw new Error(unsupportedReason);
  }

  loadingPromise = (async () => {
    const ffmpeg = new FFmpeg();

    // Track encoding progress
    ffmpeg.on('progress', ({ progress }) => {
      onProgress?.(50 + progress * 50, 'Encoding video...');
    });

    onProgress?.(0, 'Downloading ffmpeg.wasm (~25MB)...');

    // Load from unpkg CDN (jsdelivr as fallback)
    const cdnOptions = [
      'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm',
      'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm',
    ];

    let lastError: Error | null = null;

    for (const baseURL of cdnOptions) {
      try {
        // Convert CDN URLs to blob URLs to avoid CORS issues
        onProgress?.(5, 'Downloading ffmpeg core...');
        const coreURL = await withTimeout(
          toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          30000,
          'Timeout downloading ffmpeg core JS'
        );
        onProgress?.(15, 'Downloading WASM module (~25MB)...');

        const wasmURL = await withTimeout(
          toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          120000, // 2 minutes for the large WASM file
          'Timeout downloading WASM module. Check your internet connection.'
        );
        onProgress?.(40, 'Initializing encoder...');

        // ffmpeg.load can also hang, add timeout
        await withTimeout(
          ffmpeg.load({ coreURL, wasmURL }),
          60000, // 1 minute to initialize
          'Timeout initializing ffmpeg. Try refreshing the page.'
        );

        onProgress?.(50, 'Ready to encode');

        ffmpegInstance = ffmpeg;
        return ffmpeg;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Failed to load from ${baseURL}:`, lastError.message);
        // Try next CDN
        continue;
      }
    }

    loadingPromise = null;
    throw new Error(
      `Failed to load ffmpeg.wasm: ${lastError?.message || 'All CDNs failed'}`
    );
  })();

  return loadingPromise;
}

/**
 * Unload ffmpeg to free memory
 */
export function unloadFFmpeg(): void {
  if (ffmpegInstance) {
    ffmpegInstance.terminate();
    ffmpegInstance = null;
    loadingPromise = null;
  }
}

/**
 * Check if ffmpeg is currently loaded
 */
export function isFFmpegLoaded(): boolean {
  return ffmpegInstance?.loaded ?? false;
}
