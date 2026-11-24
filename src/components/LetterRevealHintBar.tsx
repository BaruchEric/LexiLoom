import React, { useEffect, useRef, useState } from 'react';
import { Clock, Coins, Sparkles, X } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface LetterRevealHintBarProps {
  disabled?: boolean;
  pointsCost?: number;
  delaySeconds?: number;
  resetKey?: string | number;
  onRevealLetter: (method: 'delay' | 'points') => boolean;
}

export const LetterRevealHintBar: React.FC<LetterRevealHintBarProps> = ({
  disabled = false,
  pointsCost = 50,
  delaySeconds = 3,
  resetKey,
  onRevealLetter,
}) => {
  const { profile, spendPoints } = useGame();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [spending, setSpending] = useState(false);
  const revealCallbackRef = useRef(onRevealLetter);
  revealCallbackRef.current = onRevealLetter;

  // Cancel any in-flight countdown whenever the puzzle changes or finishes
  useEffect(() => {
    setCountdown(null);
  }, [resetKey, disabled]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      revealCallbackRef.current('delay');
      return;
    }
    const timer = window.setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const canAffordPoints = profile.totalScore >= pointsCost;

  const handleStartDelayReveal = () => {
    if (disabled || countdown !== null) return;
    setCountdown(delaySeconds);
  };

  const handleInstantPointsReveal = async () => {
    if (disabled || spending || !canAffordPoints) return;
    setSpending(true);
    try {
      const revealed = revealCallbackRef.current('points');
      if (revealed) {
        await spendPoints(pointsCost);
      }
    } finally {
      setSpending(false);
    }
  };

  return (
    <div className="pt-3.5 border-t border-[#ECEFEA] dark:border-[#223040] space-y-2.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-[#131B23] dark:text-[#F1F5F9]">
          Reveal Single Letter
        </span>
        <span className="font-mono tabular-nums text-[#52606D] dark:text-[#94A3B8]">
          Bank: {profile.totalScore.toLocaleString()} pts
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {countdown !== null ? (
          <button
            type="button"
            onClick={() => setCountdown(null)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#D97706]/50 bg-[#FFFBEB] dark:bg-[#2A2112] text-[#92400E] dark:text-[#FCD34D] text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="font-mono tabular-nums">
              Revealing in {countdown}s
            </span>
            <X className="w-3.5 h-3.5 ml-0.5 shrink-0" aria-label="Cancel" />
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={handleStartDelayReveal}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] bg-[#F6F7F5] dark:bg-[#0F1721] hover:bg-[#E9EDE8] dark:hover:bg-[#1E2A38] disabled:opacity-50 text-[#131B23] dark:text-[#F1F5F9] text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <Sparkles
              className="w-3.5 h-3.5 text-[#176B52] dark:text-[#2EB88A] shrink-0"
              aria-hidden="true"
            />
            <span>Reveal Letter ({delaySeconds}s)</span>
          </button>
        )}

        <button
          type="button"
          disabled={disabled || !canAffordPoints || spending || countdown !== null}
          onClick={() => void handleInstantPointsReveal()}
          title={
            canAffordPoints
              ? `Spend ${pointsCost} points to reveal one letter immediately`
              : `Earn ${pointsCost} points to unlock instant letter reveals (or use the free ${delaySeconds}s delay)`
          }
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] bg-[#F6F7F5] dark:bg-[#0F1721] hover:bg-[#E9EDE8] dark:hover:bg-[#1E2A38] disabled:opacity-45 text-[#131B23] dark:text-[#F1F5F9] text-xs font-semibold transition-colors whitespace-nowrap"
        >
          <Coins
            className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F59E0B] shrink-0"
            aria-hidden="true"
          />
          <span className="font-mono tabular-nums">
            Instant (-{pointsCost} pts)
          </span>
        </button>
      </div>
    </div>
  );
};
