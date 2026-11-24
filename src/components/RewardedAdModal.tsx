import React, { useEffect, useState } from 'react';
import { CheckCircle2, Play, Volume2, VolumeX, X } from 'lucide-react';

interface SponsorSpotlight {
  brand: string;
  headline: string;
  copy: string;
  tagline: string;
  accentHex: string;
}

const SPONSOR_SPOTS: SponsorSpotlight[] = [
  {
    brand: 'Meridian Book Club',
    headline: 'Curated literary editions delivered every season.',
    copy: 'Discover independent fiction, archival essays, and reading notes curated for curious minds.',
    tagline: 'First month complimentary for puzzle readers',
    accentHex: '#176B52',
  },
  {
    brand: 'Northwind Roasters',
    headline: 'Small-batch morning blends roasted to order.',
    copy: 'Single-origin beans sourced from highland farms, crafted for unhurried morning rituals.',
    tagline: 'Freshly sealed in compostable tins',
    accentHex: '#9A5B13',
  },
  {
    brand: 'Timberline Stationery',
    headline: 'Fountain-friendly notebooks built to endure.',
    copy: 'Lay-flat stitched bindings and archival cream paper designed for daily journaling and wordplay.',
    tagline: 'Crafted in Portland since 2014',
    accentHex: '#1E4E79',
  },
];

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardClaimed: () => void;
}

const AD_DURATION_SECONDS = 5;

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  isOpen,
  onClose,
  onRewardClaimed,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(AD_DURATION_SECONDS);
  const [muted, setMuted] = useState(false);
  const [spotIndex, setSpotIndex] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSecondsLeft(AD_DURATION_SECONDS);
    setConfirmExit(false);
    setSpotIndex((prev) => (prev + 1) % SPONSOR_SPOTS.length);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, secondsLeft]);

  if (!isOpen) return null;

  const spot = SPONSOR_SPOTS[spotIndex];
  const isComplete = secondsLeft === 0;
  const progressPct =
    ((AD_DURATION_SECONDS - secondsLeft) / AD_DURATION_SECONDS) * 100;

  const handleCloseAttempt = () => {
    if (isComplete) {
      onRewardClaimed();
      onClose();
    } else if (!confirmExit) {
      setConfirmExit(true);
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reward-ad-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] overflow-hidden">
        {/* Top progress bar */}
        <div className="h-1.5 w-full bg-[#E2E6E1] dark:bg-[#223040]">
          <div
            className="h-full bg-[#176B52] dark:bg-[#2EB88A] transition-transform duration-1000 ease-linear origin-left"
            style={{ transform: `scaleX(${progressPct / 100})` }}
          />
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-[#52606D] dark:text-[#94A3B8]">
              <span>Sponsored Message</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                {isComplete ? 'Reward Ready' : `${secondsLeft}s remaining`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? 'Unmute sponsor preview' : 'Mute sponsor preview'}
                className="p-2 rounded-lg text-[#52606D] dark:text-[#94A3B8] hover:bg-[#F1F4F1] dark:hover:bg-[#1E2A38] transition-colors"
              >
                {muted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={handleCloseAttempt}
                aria-label="Close sponsor showcase"
                className="p-2 rounded-lg text-[#52606D] dark:text-[#94A3B8] hover:bg-[#F1F4F1] dark:hover:bg-[#1E2A38] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Editorial sponsor showcase canvas */}
          <div
            className="rounded-xl p-6 sm:p-7 text-white space-y-3"
            style={{ backgroundColor: spot.accentHex }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide text-white/80">
                {spot.brand}
              </span>
              <Play className="w-4 h-4 text-white/75" aria-hidden="true" />
            </div>
            <h3
              id="reward-ad-title"
              className="font-editorial text-2xl font-semibold leading-snug text-white"
            >
              {spot.headline}
            </h3>
            <p className="text-sm leading-relaxed text-white/90">{spot.copy}</p>
            <p className="pt-2 text-xs font-medium text-white/80">
              {spot.tagline}
            </p>
          </div>

          {/* Warning if trying to skip early */}
          {confirmExit && !isComplete && (
            <div className="rounded-lg bg-[#FEF3C7] dark:bg-[#3A2910] border border-[#F59E0B]/40 p-3.5 flex items-center justify-between gap-4">
              <p className="text-xs font-medium text-[#78350F] dark:text-[#FDE68A]">
                Closing early forfeits your +2 Hint Credits reward.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-[#92400E] dark:text-[#FCD34D] underline whitespace-nowrap shrink-0"
              >
                Leave Anyway
              </button>
            </div>
          )}

          {/* Action footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
            <p className="text-sm text-[#52606D] dark:text-[#94A3B8]">
              {isComplete
                ? 'Thank you for supporting free casual play.'
                : 'Watch until the timer finishes to unlock +2 Hint Credits.'}
            </p>
            <button
              type="button"
              disabled={!isComplete}
              onClick={() => {
                onRewardClaimed();
                onClose();
              }}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                isComplete
                  ? 'bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410]'
                  : 'bg-[#E2E6E1] dark:bg-[#223040] text-[#7B8794] dark:text-[#64748B] cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              {isComplete
                ? 'Claim +2 Hint Credits'
                : `Unlocking in ${secondsLeft}s`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
