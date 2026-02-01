/**
 * Video encoder service using ffmpeg.wasm
 * Orchestrates frame encoding to MP4 or GIF
 */
import { loadFFmpeg, type ProgressCallback } from './ffmpeg-loader';
import type { FrameWithDuration } from './frame-capture';

export type ExportFormat = 'mp4' | 'gif';
export type ExportQuality = 'low' | 'medium' | 'high';

export interface EncodeOptions {
  /**
   * Output format
   */
  format: ExportFormat;
  /**
   * Frames per second (for output video smoothness)
   */
  fps: number;
  /**
   * Output width (height calculated from frames)
   */
  width: number;
  /**
   * Output height
   */
  height: number;
  /**
   * Quality preset
   */
  quality?: ExportQuality;
  /**
   * Output filename (without extension)
   */
  filename?: string;
}

/**
 * Quality presets for encoding
 */
const QUALITY_PRESETS = {
  mp4: {
    low: { crf: '28', preset: 'ultrafast' },
    medium: { crf: '23', preset: 'fast' },
    high: { crf: '18', preset: 'medium' },
  },
  gif: {
    low: { scale: 0.5, fps: 10 },
    medium: { scale: 0.75, fps: 15 },
    high: { scale: 1, fps: 24 },
  },
};

/**
 * Encode frames to video using ffmpeg.wasm
 * Uses concat demuxer to handle per-frame durations efficiently
 */
export async function encodeVideo(
  frames: FrameWithDuration[],
  options: EncodeOptions,
  onProgress?: ProgressCallback
): Promise<Blob> {
  if (frames.length === 0) {
    throw new Error('No frames to encode');
  }

  const ffmpeg = await loadFFmpeg(onProgress);
  const quality = options.quality ?? 'medium';
  const outputExt = options.format;
  const outputFile = `output.${outputExt}`;

  try {
    // Write all frames to virtual filesystem
    onProgress?.(50, 'Processing frames...');
    const filenames: string[] = [];

    for (let i = 0; i < frames.length; i++) {
      const filename = `frame${i.toString().padStart(6, '0')}.png`;
      filenames.push(filename);
      await ffmpeg.writeFile(filename, frames[i].data);

      const frameProgress = (i / frames.length) * 20;
      onProgress?.(50 + frameProgress, `Processing frame ${i + 1}/${frames.length}`);
    }

    // Create concat demuxer file with frame durations
    const concatContent = frames.map((frame, i) =>
      `file '${filenames[i]}'\nduration ${frame.duration}`
    ).join('\n');
    await ffmpeg.writeFile('concat.txt', concatContent);

    onProgress?.(70, 'Encoding video...');

    // Build ffmpeg command based on format and quality
    if (options.format === 'mp4') {
      const preset = QUALITY_PRESETS.mp4[quality];
      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-crf', preset.crf,
        '-preset', preset.preset,
        '-r', String(options.fps), // Output framerate
        // Ensure dimensions are even (required for libx264)
        '-vf', `scale=trunc(iw/2)*2:trunc(ih/2)*2`,
        '-movflags', '+faststart', // Enable streaming
        outputFile,
      ]);
    } else {
      // GIF with palette optimization for better quality/size
      const preset = QUALITY_PRESETS.gif[quality];
      const scaledWidth = Math.round(options.width * preset.scale);

      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-vf', `fps=${preset.fps},scale=${scaledWidth}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5`,
        '-loop', '0', // Infinite loop
        outputFile,
      ]);
    }

    onProgress?.(90, 'Finalizing...');

    // Read the output file
    const fileData = await ffmpeg.readFile(outputFile);
    // Ensure we have binary data (FileData can be string or Uint8Array)
    // Copy to a new ArrayBuffer to avoid SharedArrayBuffer issues with Blob
    let data: Uint8Array;
    if (typeof fileData === 'string') {
      data = new TextEncoder().encode(fileData);
    } else {
      // Copy to new ArrayBuffer (Blob doesn't accept SharedArrayBuffer)
      data = new Uint8Array(fileData.length);
      data.set(fileData);
    }

    // Cleanup virtual filesystem
    for (const filename of filenames) {
      try {
        await ffmpeg.deleteFile(filename);
      } catch {
        // Ignore cleanup errors
      }
    }
    try {
      await ffmpeg.deleteFile('concat.txt');
      await ffmpeg.deleteFile(outputFile);
    } catch {
      // Ignore cleanup errors
    }

    onProgress?.(100, 'Complete!');

    // Create blob with appropriate MIME type
    const mimeType = options.format === 'mp4' ? 'video/mp4' : 'image/gif';
    return new Blob([data as BlobPart], { type: mimeType });
  } catch (error) {
    throw new Error(
      `Encoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

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
 * Get estimated file size based on options
 */
export function estimateFileSize(
  frameCount: number,
  options: EncodeOptions
): string {
  // Very rough estimates based on typical compression ratios
  const quality = options.quality ?? 'medium';
  const pixelCount = options.width * options.height;

  let bytesPerFrame: number;
  if (options.format === 'mp4') {
    // H.264 compression is very efficient
    const qualityMultiplier = { low: 0.5, medium: 1, high: 2 }[quality];
    bytesPerFrame = (pixelCount * 0.02 * qualityMultiplier) / options.fps;
  } else {
    // GIF is less efficient
    const scaleMultiplier = QUALITY_PRESETS.gif[quality].scale;
    bytesPerFrame = pixelCount * 0.1 * scaleMultiplier * scaleMultiplier;
  }

  const totalBytes = frameCount * bytesPerFrame;

  if (totalBytes < 1024) return `${Math.round(totalBytes)} B`;
  if (totalBytes < 1024 * 1024) return `${Math.round(totalBytes / 1024)} KB`;
  return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
}
