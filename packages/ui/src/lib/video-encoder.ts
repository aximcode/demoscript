/**
 * Video encoder service using ffmpeg.wasm
 *
 * Used for converting WebM (from tab capture) to MP4 or GIF formats.
 * The actual recording is done by MediaRecorder in tab-capture.ts.
 */
import { loadFFmpeg, setProgressCallback, type ProgressCallback } from './ffmpeg-loader';

export type ExportFormat = 'webm' | 'mp4' | 'gif';
export type ExportQuality = 'low' | 'medium' | 'high';

/**
 * Quality presets for GIF encoding
 */
const GIF_QUALITY_PRESETS = {
  low: { scale: 0.5, fps: 10 },
  medium: { scale: 0.75, fps: 15 },
  high: { scale: 1, fps: 24 },
};

/**
 * Trigger browser download of the encoded video
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert WebM blob to MP4 using ffmpeg.wasm
 *
 * This is used after MediaRecorder captures a WebM video from tab capture.
 * The conversion is much faster than encoding from frames since the video
 * is already compressed - we're just remuxing/transcoding.
 */
export async function convertWebMToMP4(
  webmBlob: Blob,
  onProgress?: ProgressCallback
): Promise<Blob> {
  console.log(`[video-encoder] Converting WebM (${(webmBlob.size / 1024 / 1024).toFixed(2)} MB) to MP4...`);

  const ffmpeg = await loadFFmpeg(onProgress);

  // Clear the progress callback - ffmpeg's internal progress events report
  // garbage values during transcoding (it's designed for frame encoding)
  setProgressCallback(undefined);

  try {
    // Write WebM to virtual filesystem
    onProgress?.(30, 'Loading video...');
    const webmData = new Uint8Array(await webmBlob.arrayBuffer());
    await ffmpeg.writeFile('input.webm', webmData);

    onProgress?.(50, 'Converting to MP4...');

    // Transcode WebM (VP8/VP9) to MP4 (H.264)
    // This is relatively fast since we're not re-encoding at a different quality
    await ffmpeg.exec([
      '-i', 'input.webm',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      // Ensure even dimensions (required for H.264)
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-movflags', '+faststart', // Enable progressive download
      'output.mp4',
    ]);

    onProgress?.(90, 'Finalizing...');

    // Read output file
    const fileData = await ffmpeg.readFile('output.mp4');

    // Cleanup virtual filesystem
    try {
      await ffmpeg.deleteFile('input.webm');
      await ffmpeg.deleteFile('output.mp4');
    } catch {
      // Ignore cleanup errors
    }

    // Handle SharedArrayBuffer issue - copy to regular ArrayBuffer
    let mp4Data: Uint8Array;
    if (typeof fileData === 'string') {
      mp4Data = new TextEncoder().encode(fileData);
    } else {
      mp4Data = new Uint8Array(fileData.length);
      mp4Data.set(fileData);
    }

    onProgress?.(100, 'Conversion complete!');

    console.log(`[video-encoder] MP4 created: ${(mp4Data.length / 1024 / 1024).toFixed(2)} MB`);

    return new Blob([mp4Data as BlobPart], { type: 'video/mp4' });
  } catch (error) {
    throw new Error(
      `MP4 conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Convert WebM blob to GIF using ffmpeg.wasm
 *
 * Creates an optimized GIF with palette generation for smaller file sizes.
 */
export async function convertWebMToGIF(
  webmBlob: Blob,
  onProgress?: ProgressCallback,
  options?: { fps?: number; width?: number; quality?: ExportQuality }
): Promise<Blob> {
  const quality = options?.quality ?? 'medium';
  const preset = GIF_QUALITY_PRESETS[quality];

  console.log(`[video-encoder] Converting WebM to GIF (${preset.fps}fps, quality: ${quality})...`);

  const ffmpeg = await loadFFmpeg(onProgress);

  // Clear the progress callback - ffmpeg's internal progress events report
  // garbage values during transcoding (it's designed for frame encoding)
  setProgressCallback(undefined);

  try {
    onProgress?.(30, 'Loading video...');
    const webmData = new Uint8Array(await webmBlob.arrayBuffer());
    await ffmpeg.writeFile('input.webm', webmData);

    onProgress?.(50, 'Creating GIF...');

    // Calculate scaled width based on input video
    // We'll use a filter to scale proportionally
    const scaleFilter = preset.scale < 1
      ? `scale=iw*${preset.scale}:-1:flags=lanczos`
      : 'scale=iw:-1:flags=lanczos';

    // GIF with palette optimization for better quality/size
    await ffmpeg.exec([
      '-i', 'input.webm',
      '-vf', `fps=${preset.fps},${scaleFilter},split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5`,
      '-loop', '0', // Infinite loop
      'output.gif',
    ]);

    onProgress?.(90, 'Finalizing...');

    const fileData = await ffmpeg.readFile('output.gif');

    try {
      await ffmpeg.deleteFile('input.webm');
      await ffmpeg.deleteFile('output.gif');
    } catch {
      // Ignore cleanup errors
    }

    let gifData: Uint8Array;
    if (typeof fileData === 'string') {
      gifData = new TextEncoder().encode(fileData);
    } else {
      gifData = new Uint8Array(fileData.length);
      gifData.set(fileData);
    }

    onProgress?.(100, 'GIF created!');

    console.log(`[video-encoder] GIF created: ${(gifData.length / 1024 / 1024).toFixed(2)} MB`);

    return new Blob([gifData as BlobPart], { type: 'image/gif' });
  } catch (error) {
    throw new Error(
      `GIF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
