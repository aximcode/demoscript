/**
 * Export Modal Component
 * Allows users to export demos as WebM, MP4, or GIF videos
 *
 * Uses MediaRecorder + getDisplayMedia for perfect visual fidelity.
 * This captures exactly what's displayed on screen, unlike html2canvas.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { isTabCaptureSupported, getTabCaptureUnsupportedReason, startTabCapture, type TabCaptureControls } from '../../lib/tab-capture';
import { isFFmpegSupported } from '../../lib/ffmpeg-loader';
import { downloadBlob, convertWebMToMP4, convertWebMToGIF, type ExportQuality } from '../../lib/video-encoder';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Reference to the demo content element (kept for compatibility)
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
   */
  isExecutableStep?: (stepIndex: number) => boolean;
  /**
   * Trigger execution for a step (clicks the Execute button)
   */
  onExecute?: (stepIndex: number) => Promise<void>;
}

type ExportFormat = 'webm' | 'mp4' | 'gif';
type ExportStage = 'options' | 'recording' | 'converting' | 'complete' | 'error';

interface ExportProgress {
  stage: ExportStage;
  percent: number;
  message: string;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string; warning?: string }[] = [
  { value: 'webm', label: 'WebM', description: 'Instant, native quality' },
  { value: 'mp4', label: 'MP4', description: 'Universal compatibility', warning: 'Slow conversion' },
  { value: 'gif', label: 'GIF', description: 'Animated image', warning: 'Slow conversion' },
];

const DURATION_OPTIONS = [
  { value: 2000, label: '2 seconds' },
  { value: 3000, label: '3 seconds' },
  { value: 5000, label: '5 seconds' },
];

const QUALITY_OPTIONS: { value: ExportQuality; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ExportModal({
  isOpen,
  onClose,
  totalSteps,
  demoTitle,
  onNavigate,
  isExecutableStep,
  onExecute,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('webm');
  const [stepDuration, setStepDuration] = useState(3000);
  const [gifQuality, setGifQuality] = useState<ExportQuality>('medium');
  const [progress, setProgress] = useState<ExportProgress>({
    stage: 'options',
    percent: 0,
    message: '',
  });
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef(false);
  const captureRef = useRef<TabCaptureControls | null>(null);
  const originalTitleRef = useRef<string>('');

  // Check browser support
  const isSupported = isTabCaptureSupported();
  const unsupportedReason = getTabCaptureUnsupportedReason();

  // MP4/GIF conversion requires ffmpeg.wasm which needs SharedArrayBuffer
  const canConvert = isFFmpegSupported();

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
      if (captureRef.current) {
        captureRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Update document title during recording (shows in browser tab, not in capture)
  useEffect(() => {
    if (progress.stage === 'recording') {
      // Save original title on first recording state
      if (!originalTitleRef.current) {
        originalTitleRef.current = document.title;
      }
      // Extract step info from message (e.g., "Recording step 3/7...")
      const stepMatch = progress.message.match(/step (\d+)\/(\d+)/);
      if (stepMatch) {
        document.title = `🔴 Recording ${stepMatch[1]}/${stepMatch[2]} | ${originalTitleRef.current}`;
      } else {
        document.title = `🔴 Recording... | ${originalTitleRef.current}`;
      }
    } else if (progress.stage === 'converting') {
      document.title = `⏳ Converting... | ${originalTitleRef.current}`;
    } else if (progress.stage === 'complete') {
      document.title = `✅ Export ready! | ${originalTitleRef.current}`;
      // Restore after a delay
      setTimeout(() => {
        if (originalTitleRef.current) {
          document.title = originalTitleRef.current;
        }
      }, 3000);
    } else if (originalTitleRef.current && progress.stage === 'options') {
      // Restore original title when back to options
      document.title = originalTitleRef.current;
      originalTitleRef.current = '';
    }
  }, [progress.stage, progress.message]);

  const handleExport = useCallback(async () => {
    if (!isSupported) return;

    abortRef.current = false;
    setError(null);
    setResultBlob(null);

    try {
      // Stage 1: Start tab capture (user sees browser permission prompt)
      setProgress({ stage: 'recording', percent: 0, message: 'Select this tab to share...' });

      const capture = await startTabCapture({
        onProgress: (percent, message) => {
          setProgress({ stage: 'recording', percent, message });
        },
      });

      captureRef.current = capture;

      // Check if user cancelled
      if (abortRef.current) {
        capture.stream.getTracks().forEach((t) => t.stop());
        throw new Error('Export cancelled');
      }

      setProgress({ stage: 'recording', percent: 20, message: 'Recording started...' });

      // Small delay to let user see recording has started
      await sleep(500);

      // Stage 2: Auto-play through all steps
      for (let step = 0; step < totalSteps; step++) {
        if (abortRef.current) {
          capture.stream.getTracks().forEach((t) => t.stop());
          throw new Error('Export cancelled');
        }

        // Navigate to step
        await onNavigate(step);

        // For executable steps, trigger execution
        if (isExecutableStep?.(step) && onExecute) {
          await sleep(500); // Let step render
          await onExecute(step);
          await sleep(1500); // Show result longer for executable steps
        } else {
          await sleep(stepDuration);
        }

        const percent = 20 + ((step + 1) / totalSteps) * 60;
        setProgress({
          stage: 'recording',
          percent,
          message: `Recording step ${step + 1}/${totalSteps}...`,
        });
      }

      // Hold on last step briefly
      await sleep(1000);

      // Stage 3: Stop recording
      setProgress({ stage: 'recording', percent: 85, message: 'Finalizing recording...' });

      const result = await capture.stop();
      captureRef.current = null;

      console.log(`[export] Recorded ${result.duration.toFixed(1)}s, ${(result.blob.size / 1024 / 1024).toFixed(2)} MB`);

      // Stage 4: Convert if needed
      if (format === 'webm') {
        // No conversion needed
        setResultBlob(result.blob);
        setProgress({ stage: 'complete', percent: 100, message: 'Done!' });
      } else if (format === 'mp4') {
        if (!canConvert) {
          throw new Error('MP4 conversion requires SharedArrayBuffer support. Try WebM format instead.');
        }
        setProgress({ stage: 'converting', percent: 90, message: 'Converting to MP4...' });

        const mp4Blob = await convertWebMToMP4(result.blob, (percent, message) => {
          // Map 0-100 to 90-100
          const mappedPercent = 90 + (percent * 0.1);
          setProgress({ stage: 'converting', percent: mappedPercent, message });
        });

        setResultBlob(mp4Blob);
        setProgress({ stage: 'complete', percent: 100, message: 'Done!' });
      } else if (format === 'gif') {
        if (!canConvert) {
          throw new Error('GIF conversion requires SharedArrayBuffer support. Try WebM format instead.');
        }
        setProgress({ stage: 'converting', percent: 90, message: 'Converting to GIF...' });

        const gifBlob = await convertWebMToGIF(result.blob, (percent, message) => {
          const mappedPercent = 90 + (percent * 0.1);
          setProgress({ stage: 'converting', percent: mappedPercent, message });
        }, { quality: gifQuality });

        setResultBlob(gifBlob);
        setProgress({ stage: 'complete', percent: 100, message: 'Done!' });
      }
    } catch (err) {
      captureRef.current = null;

      if (err instanceof Error && err.message === 'Export cancelled') {
        setProgress({ stage: 'options', percent: 0, message: '' });
        return;
      }

      console.error('[export] Error:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
      setProgress({ stage: 'error', percent: 0, message: '' });
    }
  }, [isSupported, canConvert, format, stepDuration, gifQuality, totalSteps, onNavigate, isExecutableStep, onExecute]);

  const handleDownload = useCallback(() => {
    if (!resultBlob) return;

    const extensions: Record<ExportFormat, string> = {
      webm: 'webm',
      mp4: 'mp4',
      gif: 'gif',
    };
    const filename = `${demoTitle?.toLowerCase().replace(/\s+/g, '-') || 'demo'}.${extensions[format]}`;
    downloadBlob(resultBlob, filename);
  }, [resultBlob, format, demoTitle]);

  const handleCancel = useCallback(() => {
    abortRef.current = true;
    if (captureRef.current) {
      captureRef.current.stream.getTracks().forEach((t) => t.stop());
      captureRef.current = null;
    }
    setProgress({ stage: 'options', percent: 0, message: '' });
  }, []);

  const handleClose = useCallback(() => {
    if (progress.stage === 'recording' || progress.stage === 'converting') {
      if (window.confirm('Cancel the export?')) {
        handleCancel();
        onClose();
      }
    } else {
      onClose();
    }
  }, [progress.stage, handleCancel, onClose]);

  // Allow Escape key to cancel recording even when modal is hidden
  useEffect(() => {
    if (progress.stage !== 'recording') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [progress.stage, handleCancel]);

  if (!isOpen) return null;

  const isExporting = progress.stage === 'recording' || progress.stage === 'converting';
  const isRecording = progress.stage === 'recording';
  const totalDurationSeconds = (stepDuration / 1000) * totalSteps;

  // During recording, hide the modal completely so it doesn't appear in the capture
  // The demo auto-plays through all steps and stops automatically
  if (isRecording) {
    return null;
  }

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
                {progress.stage === 'recording' ? (
                  // Recording indicator
                  <div className="w-full h-full rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-red-500 animate-pulse" />
                  </div>
                ) : (
                  // Spinner for converting
                  <svg className="w-full h-full animate-spin text-theme-primary/20" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      style={{ fill: 'var(--theme-primary)' }}
                    />
                  </svg>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  {progress.stage !== 'recording' && (
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {Math.round(progress.percent)}%
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {progress.stage === 'recording' ? 'Recording...' : 'Converting...'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{progress.message}</p>
            </div>

            <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  progress.stage === 'recording' ? 'bg-red-500' : 'bg-theme-primary'
                }`}
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            {progress.stage === 'recording' && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Keep this tab visible during recording
              </p>
            )}

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
              <div className="grid grid-cols-3 gap-2">
                {FORMAT_OPTIONS.map((option) => {
                  const needsConversion = option.value !== 'webm';
                  const isDisabled = !isSupported || (needsConversion && !canConvert);

                  return (
                    <button
                      key={option.value}
                      onClick={() => setFormat(option.value)}
                      disabled={isDisabled}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        format === option.value
                          ? 'border-theme-primary bg-theme-primary/5'
                          : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-1">
                        {option.label}
                        {option.warning && (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-normal">
                            Slow
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {option.description}
                      </div>
                    </button>
                  );
                })}
              </div>
              {!canConvert && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  MP4/GIF conversion unavailable (requires SharedArrayBuffer)
                </p>
              )}
              {canConvert && format !== 'webm' && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-400">
                  <strong>Note:</strong> {format.toUpperCase()} conversion runs in-browser and may take several minutes. For faster exports, use WebM.
                </div>
              )}
            </div>

            {/* GIF quality (only show for GIF format) */}
            {format === 'gif' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GIF Quality
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {QUALITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setGifQuality(option.value)}
                      className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        gifQuality === option.value
                          ? 'border-theme-primary bg-theme-primary/5 text-theme-primary'
                          : 'border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-slate-500'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                <span className="text-gray-600 dark:text-gray-400">Est. duration</span>
                <span className="font-medium text-gray-900 dark:text-white">~{Math.ceil(totalDurationSeconds)}s</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600 dark:text-gray-400">Resolution</span>
                <span className="font-medium text-gray-900 dark:text-white">Your screen</span>
              </div>
            </div>

            {/* How it works */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>How it works:</strong> Click Start Recording, select "This Tab" in the browser prompt, then the demo will auto-play while recording.
              </p>
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
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
              Start Recording
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
