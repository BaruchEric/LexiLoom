import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import {
  copyTextToClipboard,
  formatSocialHeadline,
  formatVictoryShareText,
  type ShareSummaryParams,
} from '../lib/shareSummary';
import { loadHapticsEnabled, vibrateWordSuccess } from '../lib/haptics';

interface ShareResultButtonProps {
  summary: ShareSummaryParams;
  className?: string;
  compact?: boolean;
}

export const ShareResultButton: React.FC<ShareResultButtonProps> = ({
  summary,
  className = '',
  compact = false,
}) => {
  const [status, setStatus] = useState<'idle' | 'copied' | 'fallback'>('idle');
  const [previewText, setPreviewText] = useState<string>('');
  const resetTimerRef = useRef<number | null>(null);

  const socialHeadline = useMemo(
    () => formatSocialHeadline(summary),
    [summary]
  );

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleShare = async () => {
    const formatted = formatVictoryShareText(summary);
    setPreviewText(formatted);
    const ok = await copyTextToClipboard(formatted);
    vibrateWordSuccess(loadHapticsEnabled());

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }

    if (ok) {
      setStatus('copied');
      resetTimerRef.current = window.setTimeout(() => {
        setStatus('idle');
      }, 3000);
    } else {
      setStatus('fallback');
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void handleShare()}
        aria-label={`Share result: ${socialHeadline}`}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52] ${className}`}
      >
        {status === 'copied' ? (
          <>
            <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Share2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Share</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => void handleShare()}
        aria-label={`Share result: ${socialHeadline}`}
        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] text-sm font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52] ${className}`}
      >
        {status === 'copied' ? (
          <>
            <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Copied to Clipboard</span>
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Share</span>
          </>
        )}
      </button>

      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F6F7F5] dark:bg-[#0F1721] border border-[#E2E6E1] dark:border-[#263342]">
        <span className="font-mono tabular-nums text-[11px] text-[#52606D] dark:text-[#CBD5E1] truncate">
          {socialHeadline}
        </span>
        <span className="text-[11px] font-medium text-[#176B52] dark:text-[#2EB88A] whitespace-nowrap shrink-0">
          {status === 'copied' ? 'Ready to paste' : 'Social format'}
        </span>
      </div>

      <div className="sr-only" aria-live="polite">
        {status === 'copied'
          ? `Copied to clipboard: ${socialHeadline}`
          : status === 'fallback'
          ? 'Clipboard access is unavailable; summary shown below for manual copying.'
          : ''}
      </div>

      {status === 'fallback' && previewText && (
        <div className="space-y-1.5">
          <p className="text-xs text-[#52606D] dark:text-[#94A3B8]">
            Copy your summary below:
          </p>
          <textarea
            readOnly
            rows={4}
            value={previewText}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-lg p-2.5 bg-[#F6F7F5] dark:bg-[#0F1721] border border-[#D4DDD6] dark:border-[#2E3D4F] font-mono text-xs text-[#131B23] dark:text-[#F1F5F9]"
          />
        </div>
      )}
    </div>
  );
};
