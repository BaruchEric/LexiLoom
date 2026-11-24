import React, { useEffect, useState } from 'react';
import { Clock, Eye, EyeOff, Pause, Play } from 'lucide-react';

interface PuzzleStopwatchProps {
  elapsedSeconds: number;
  onTick: () => void;
  isComplete: boolean;
  resetKey: string;
  bestTimeSeconds?: number | null;
  isPausedExternal?: boolean;
  visible: boolean;
  onToggleVisible?: () => void;
}

function formatStopwatch(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(
      2,
      '0'
    )}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const PuzzleStopwatch: React.FC<PuzzleStopwatchProps> = ({
  elapsedSeconds,
  onTick,
  isComplete,
  resetKey,
  bestTimeSeconds = null,
  isPausedExternal = false,
  visible,
  onToggleVisible,
}) => {
  const [manualPaused, setManualPaused] = useState(false);
  const [autoPaused, setAutoPaused] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return document.hidden || !document.hasFocus();
  });

  // Reset manual pause whenever the puzzle changes
  useEffect(() => {
    setManualPaused(false);
  }, [resetKey]);

  // Automatically pause when user switches tabs or window loses focus
  useEffect(() => {
    const syncFocusState = () => {
      const hidden = document.hidden;
      const focused = document.hasFocus();
      setAutoPaused(hidden || !focused);
    };

    const handleBlur = () => setAutoPaused(true);
    const handleFocus = () => {
      if (!document.hidden) {
        setAutoPaused(false);
      }
    };

    document.addEventListener('visibilitychange', syncFocusState);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', syncFocusState);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const isRunning =
    !isComplete && !manualPaused && !autoPaused && !isPausedExternal;

  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => {
      onTick();
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRunning, onTick]);

  const statusLabel = isComplete
    ? 'Completed'
    : manualPaused
    ? 'Paused'
    : autoPaused
    ? 'Auto-paused (away)'
    : isPausedExternal
    ? 'Paused'
    : 'Running';

  if (!visible) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] text-xs text-[#52606D] dark:text-[#94A3B8]">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>
            Stopwatch hidden · Auto-pauses when you switch tabs or focus
          </span>
        </div>
        {onToggleVisible && (
          <button
            type="button"
            onClick={onToggleVisible}
            className="inline-flex items-center gap-1.5 font-semibold text-[#176B52] dark:text-[#2EB88A] hover:underline whitespace-nowrap shrink-0"
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            Show Stopwatch
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Puzzle stopwatch"
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342]"
    >
      <div className="flex flex-wrap items-center gap-3 min-w-0">
        <div className="inline-flex items-center gap-2">
          <Clock
            className={`w-4 h-4 shrink-0 ${
              isRunning
                ? 'text-[#176B52] dark:text-[#2EB88A]'
                : 'text-[#9A5B13] dark:text-[#F59E0B]'
            }`}
            aria-hidden="true"
          />
          <span
            key={elapsedSeconds}
            aria-label={`Elapsed time ${formatStopwatch(elapsedSeconds)}`}
            className="font-mono tabular-nums text-base sm:text-lg font-bold tracking-tight text-[#131B23] dark:text-[#F1F5F9] lexiloom-timer-tick"
          >
            {formatStopwatch(elapsedSeconds)}
          </span>
        </div>

        <span
          aria-hidden="true"
          className="text-xs text-[#CBD5E1] dark:text-[#334155]"
        >
          ·
        </span>

        <span
          aria-live="polite"
          className={`text-xs font-medium ${
            isRunning
              ? 'text-[#176B52] dark:text-[#2EB88A]'
              : isComplete
              ? 'text-[#52606D] dark:text-[#94A3B8]'
              : 'text-[#9A5B13] dark:text-[#F59E0B]'
          }`}
        >
          {statusLabel}
        </span>

        {bestTimeSeconds !== null && (
          <>
            <span
              aria-hidden="true"
              className="hidden sm:inline text-xs text-[#CBD5E1] dark:text-[#334155]"
            >
              ·
            </span>
            <span className="hidden sm:inline font-mono tabular-nums text-xs text-[#52606D] dark:text-[#94A3B8]">
              Daily Best {formatStopwatch(bestTimeSeconds)}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden md:inline text-xs text-[#52606D] dark:text-[#94A3B8]">
          Auto-pauses on tab switch
        </span>

        {!isComplete && (
          <button
            type="button"
            onClick={() => setManualPaused((p) => !p)}
            aria-pressed={manualPaused}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] bg-[#F6F7F5] dark:bg-[#0F1721] hover:bg-[#E9EDE8] dark:hover:bg-[#1E2A38] text-xs font-semibold text-[#131B23] dark:text-[#F1F5F9] transition-colors whitespace-nowrap shrink-0"
          >
            {manualPaused ? (
              <>
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Pause</span>
              </>
            )}
          </button>
        )}

        {onToggleVisible && (
          <button
            type="button"
            onClick={onToggleVisible}
            aria-label="Hide stopwatch"
            title="Hide stopwatch"
            className="p-1.5 rounded-lg text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] transition-colors shrink-0"
          >
            <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};
