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

    onProgress?.(0, 'Loading ffmpeg.wasm (~25MB)...');

    // Load from unpkg CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

    try {
      // Convert CDN URLs to blob URLs to avoid CORS issues
      const coreURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        'text/javascript'
      );
      onProgress?.(15, 'Loading ffmpeg.wasm (~25MB)...');

      const wasmURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      );
      onProgress?.(40, 'Initializing ffmpeg...');

      await ffmpeg.load({
        coreURL,
        wasmURL,
      });

      onProgress?.(50, 'Ready to encode');

      ffmpegInstance = ffmpeg;
      return ffmpeg;
    } catch (error) {
      loadingPromise = null;
      throw new Error(
        `Failed to load ffmpeg.wasm: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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
