/**
 * Lazy loader for ffmpeg.wasm
 * Loads the ~25MB WASM core from CDN only when needed
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;
let currentProgressCallback: ProgressCallback | null = null;

export type ProgressCallback = (progress: number, message: string) => void;

/**
 * Set the current progress callback for encoding operations
 * This allows updating the callback after ffmpeg is already loaded
 */
export function setProgressCallback(callback: ProgressCallback | undefined): void {
  currentProgressCallback = callback ?? null;
}

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

// CDN options - Cloudflare R2 primary, external CDNs as fallback
interface CDNOption {
  name: string;
  coreURL: string;
  wasmURL: string;
}

function getCDNOptions(): CDNOption[] {
  return [
    // Primary: Our own Cloudflare R2 (fast, reliable)
    {
      name: 'cloudflare',
      coreURL: 'https://demoscript.app/assets/ffmpeg/ffmpeg-core.js',
      wasmURL: 'https://demoscript.app/assets/ffmpeg/ffmpeg-core.wasm',
    },
    // Fallback: External CDNs
    {
      name: 'unpkg',
      coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
      wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
    },
    {
      name: 'jsdelivr',
      coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
      wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
    },
  ];
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

    // Track encoding progress - uses mutable callback so it can be updated later
    // Note: During transcoding (WebM→MP4), ffmpeg reports garbage progress values
    // (negative numbers, values > 1). We filter these out to prevent UI issues.
    ffmpeg.on('progress', ({ progress }) => {
      // Skip invalid progress values (common during transcoding)
      if (progress < 0 || progress > 1 || !isFinite(progress)) {
        return;
      }
      const percent = Math.round(70 + progress * 25); // 70-95% during encoding
      currentProgressCallback?.(percent, `Encoding: ${Math.round(progress * 100)}%`);
    });

    // Log loading events for debugging
    ffmpeg.on('log', ({ message }) => {
      console.log('[ffmpeg]', message);
    });

    // Set initial callback for loading progress
    currentProgressCallback = onProgress ?? null;
    onProgress?.(0, 'Downloading ffmpeg.wasm (~25MB)...');

    const cdnOptions = getCDNOptions();
    let lastError: Error | null = null;

    for (let i = 0; i < cdnOptions.length; i++) {
      const cdn = cdnOptions[i];
      const isLastOption = i === cdnOptions.length - 1;

      try {
        console.log(`[ffmpeg] Trying ${cdn.name}...`);

        // Download and convert to blob URLs
        onProgress?.(5, `Downloading ffmpeg (${cdn.name})...`);
        const coreURL = await withTimeout(
          toBlobURL(cdn.coreURL, 'text/javascript'),
          60000, // 1 minute for core JS
          `Timeout downloading ffmpeg core from ${cdn.name}`
        );

        onProgress?.(20, 'Downloading WASM (~25MB)...');
        const wasmURL = await withTimeout(
          toBlobURL(cdn.wasmURL, 'application/wasm'),
          180000, // 3 minutes for WASM
          'Timeout downloading WASM. Check your connection.'
        );

        onProgress?.(40, 'Compiling WASM (may take 1-2 min)...');
        console.log('[ffmpeg] WASM downloaded, compiling...');
        const startTime = Date.now();

        // Load ffmpeg - WASM compilation can be very slow
        await withTimeout(
          ffmpeg.load({ coreURL, wasmURL }),
          300000, // 5 minutes for compilation
          'WASM compilation timeout. Try using CLI: demoscript export-video'
        );

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[ffmpeg] Loaded from ${cdn.name} in ${elapsed}s`);
        onProgress?.(50, 'Encoder ready');

        ffmpegInstance = ffmpeg;
        return ffmpeg;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`[ffmpeg] ${cdn.name} failed:`, lastError.message);

        if (!isLastOption) {
          onProgress?.(5, 'Trying next CDN...');
          continue;
        }
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

/**
 * Preload ffmpeg in the background (no UI feedback)
 * Call this when the export button becomes visible to start loading early
 */
export function preloadFFmpeg(): void {
  if (ffmpegInstance?.loaded || loadingPromise || !isFFmpegSupported()) {
    return;
  }

  console.log('[ffmpeg] Preloading in background...');
  loadFFmpeg().catch((err) => {
    console.warn('[ffmpeg] Background preload failed:', err.message);
  });
}
