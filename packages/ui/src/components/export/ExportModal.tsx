/**
 * Export Modal Component
 * Allows users to export demos as MP4 or GIF videos
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { isFFmpegSupported, getUnsupportedReason, unloadFFmpeg } from '../../lib/ffmpeg-loader';
import { captureAllFrames, getRecommendedDimensions } from '../../lib/frame-capture';
import {
  encodeVideo,
  downloadBlob,
  estimateFileSize,
  type ExportFormat,
  type ExportQuality,
} from '../../lib/video-encoder';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Reference to the demo content element to capture
   */
  captureRef: React.RefObject<HTMLElement | null>;
  /**
   * Total number of steps in the demo
   */
  totalSteps: number;
  /**
   * Demo title for filename
   */
  demoTitle?: string;
  /**
   * Callback to navigate to a specific step
   */
  onNavigate: (stepIndex: number) => Promise<void>;
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

type ExportStage = 'options' | 'capturing' | 'encoding' | 'complete' | 'error';

interface ExportProgress {
  stage: ExportStage;
  percent: number;
  message: string;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'mp4', label: 'MP4 Video', description: 'Best quality, smaller file size' },
  { value: 'gif', label: 'Animated GIF', description: 'Universal compatibility, larger file' },
];

const QUALITY_OPTIONS: { value: ExportQuality; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'Fastest encoding, smaller file' },
  { value: 'medium', label: 'Medium', description: 'Balanced quality and size' },
  { value: 'high', label: 'High', description: 'Best quality, larger file' },
];

const DURATION_OPTIONS = [
  { value: 2000, label: '2 seconds' },
  { value: 3000, label: '3 seconds' },
  { value: 5000, label: '5 seconds' },
];

export function ExportModal({
  isOpen,
  onClose,
  captureRef,
  totalSteps,
  demoTitle,
  onNavigate,
  isExecutableStep,
  onExecute,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [quality, setQuality] = useState<ExportQuality>('medium');
  const [stepDuration, setStepDuration] = useState(3000);
  const [progress, setProgress] = useState<ExportProgress>({
    stage: 'options',
    percent: 0,
    message: '',
  });
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const isSupported = isFFmpegSupported();
  const unsupportedReason = getUnsupportedReason();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setProgress({ stage: 'options', percent: 0, message: '' });
      setResultBlob(null);
      setError(null);
      abortRef.current = false;
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resultBlob) {
        URL.revokeObjectURL(URL.createObjectURL(resultBlob));
      }
    };
  }, [resultBlob]);

  const handleExport = useCallback(async () => {
    if (!captureRef.current || !isSupported) return;

    abortRef.current = false;
    setError(null);
    setResultBlob(null);

    try {
      // Get dimensions
      const dimensions = getRecommendedDimensions();
      const fps = format === 'gif' ? 15 : 30;

      // Stage 1: Capture frames
      setProgress({ stage: 'capturing', percent: 0, message: 'Preparing capture...' });

      const frames = await captureAllFrames(captureRef.current, {
        ...dimensions,
        fps,
        stepDuration,
        totalSteps,
        onNavigate,
        isExecutableStep,
        onExecute,
        onProgress: (percent, message) => {
          if (abortRef.current) throw new Error('Export cancelled');
          setProgress({ stage: 'capturing', percent: percent * 0.4, message });
        },
      });

      if (abortRef.current) throw new Error('Export cancelled');

      // Stage 2: Encode video
      setProgress({ stage: 'encoding', percent: 40, message: 'Loading encoder...' });

      const blob = await encodeVideo(frames, {
        format,
        fps,
        quality,
        width: dimensions.width,
        height: dimensions.height,
      }, (percent, message) => {
        if (abortRef.current) throw new Error('Export cancelled');
        // Map encoder progress (0-100) to our remaining 60% (40-100)
        const mappedPercent = 40 + (percent * 0.6);
        setProgress({ stage: 'encoding', percent: mappedPercent, message });
      });

      if (abortRef.current) throw new Error('Export cancelled');

      setResultBlob(blob);
      setProgress({ stage: 'complete', percent: 100, message: 'Export complete!' });
    } catch (err) {
      if (err instanceof Error && err.message === 'Export cancelled') {
        setProgress({ stage: 'options', percent: 0, message: '' });
        return;
      }
      setError(err instanceof Error ? err.message : 'Export failed');
      setProgress({ stage: 'error', percent: 0, message: '' });
    }
  }, [captureRef, format, quality, stepDuration, totalSteps, onNavigate, isExecutableStep, onExecute, isSupported]);

  const handleDownload = useCallback(() => {
    if (!resultBlob) return;

    const extension = format === 'mp4' ? 'mp4' : 'gif';
    const filename = `${demoTitle?.toLowerCase().replace(/\s+/g, '-') || 'demo'}.${extension}`;
    downloadBlob(resultBlob, filename);
  }, [resultBlob, format, demoTitle]);

  const handleCancel = useCallback(() => {
    abortRef.current = true;
    unloadFFmpeg();
    onClose();
  }, [onClose]);

  const handleClose = useCallback(() => {
    if (progress.stage === 'capturing' || progress.stage === 'encoding') {
      // Confirm before closing during export
      if (window.confirm('Cancel the export?')) {
        handleCancel();
      }
    } else {
      onClose();
    }
  }, [progress.stage, handleCancel, onClose]);

  if (!isOpen) return null;

  const isExporting = progress.stage === 'capturing' || progress.stage === 'encoding';
  const totalDurationSeconds = (stepDuration / 1000) * totalSteps;
  const fps = format === 'gif' ? 15 : 30;
  const estimatedFrames = Math.ceil(totalDurationSeconds * fps);
  const dimensions = getRecommendedDimensions();
  const estimatedSize = estimateFileSize(estimatedFrames, {
    format,
    fps,
    quality,
    width: dimensions.width,
    height: dimensions.height,
  });

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      data-export-ignore="true"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 id="export-modal-title" className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Export Video
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Unsupported browser warning */}
        {!isSupported && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Browser Not Supported</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{unsupportedReason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Export Failed</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress view */}
        {isExporting && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <svg className="w-full h-full animate-spin text-theme-primary/20" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    style={{ fill: 'var(--theme-primary)' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {Math.round(progress.percent)}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{progress.message}</p>
            </div>

            <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-theme-primary transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <button
              onClick={handleCancel}
              className="w-full py-2 px-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Complete view */}
        {progress.stage === 'complete' && resultBlob && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">Export Complete!</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {(resultBlob.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>

            <button
              onClick={handleDownload}
              className="w-full py-3 px-4 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download {format.toUpperCase()}
            </button>

            <button
              onClick={() => {
                setProgress({ stage: 'options', percent: 0, message: '' });
                setResultBlob(null);
              }}
              className="w-full py-2 px-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Export Again
            </button>
          </div>
        )}

        {/* Options view */}
        {(progress.stage === 'options' || progress.stage === 'error') && (
          <div className="space-y-6">
            {/* Format selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                {FORMAT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFormat(option.value)}
                    disabled={!isSupported}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      format === option.value
                        ? 'border-theme-primary bg-theme-primary/5'
                        : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                    } ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {option.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quality
              </label>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setQuality(option.value)}
                    disabled={!isSupported}
                    className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      quality === option.value
                        ? 'border-theme-primary bg-theme-primary/5 text-theme-primary'
                        : 'border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-slate-500'
                    } ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration per step */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time per step
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStepDuration(option.value)}
                    disabled={!isSupported}
                    className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      stepDuration === option.value
                        ? 'border-theme-primary bg-theme-primary/5 text-theme-primary'
                        : 'border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-slate-500'
                    } ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimate */}
            <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Steps</span>
                <span className="font-medium text-gray-900 dark:text-white">{totalSteps}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600 dark:text-gray-400">Resolution</span>
                <span className="font-medium text-gray-900 dark:text-white">{dimensions.width}×{dimensions.height}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600 dark:text-gray-400">Est. size</span>
                <span className="font-medium text-gray-900 dark:text-white">~{estimatedSize}</span>
              </div>
            </div>

            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={!isSupported}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                isSupported
                  ? 'bg-theme-primary hover:bg-theme-primary/90 text-white'
                  : 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Start Export
            </button>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              First export downloads ~25MB encoder
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
