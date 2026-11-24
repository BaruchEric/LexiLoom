import React, { useEffect, useRef } from 'react';
import { Keyboard, Compass, Sparkles, X } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  onClose,
}) => {
  const startBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    startBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lexiloom-modal-in my-auto w-full max-w-2xl rounded-2xl bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#ECEFEA] dark:border-[#223040]">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#52606D] dark:text-[#94A3B8]">
              Welcome to LexiLoom · Quick Guide
            </p>
            <h2
              id="how-to-play-title"
              className="font-editorial text-2xl sm:text-3xl font-bold text-[#131B23] dark:text-[#F1F5F9]"
            >
              How to Play
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close How to Play guide"
            className="p-2 rounded-lg text-[#52606D] dark:text-[#94A3B8] hover:bg-[#F1F4F1] dark:hover:bg-[#1E2A38] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Clear Editorial Sections */}
        <div className="space-y-5 text-sm leading-relaxed text-[#52606D] dark:text-[#CBD5E1]">
          {/* Section 1: Core Daily Mechanics */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 font-semibold text-[#131B23] dark:text-[#F1F5F9]">
              <Sparkles
                className="w-4 h-4 text-[#176B52] dark:text-[#2EB88A] shrink-0"
                aria-hidden="true"
              />
              <span>01. Trace Hidden Words & Build Your Daily Streak</span>
            </h3>
            <p>
              Drag smoothly across letters in a straight line — or tap the first
              letter, then tap the last letter — to claim each hidden word. Play
              in <strong>Smart Clues</strong> mode for extra points or switch to{' '}
              <strong>Word List</strong> for relaxed casual play. Choose{' '}
              <strong>Easy</strong> (7×7), <strong>Standard</strong> (8×8), or{' '}
              <strong>Challenge</strong> (10×10 with reversed words) anytime,
              and use 4-tier <strong>Smart Hints</strong> whenever you need a
              nudge.
            </p>
          </div>

          {/* Section 2: Keyboard Support */}
          <div className="pt-4 border-t border-[#ECEFEA] dark:border-[#223040] space-y-2.5">
            <h3 className="flex items-center gap-2 font-semibold text-[#131B23] dark:text-[#F1F5F9]">
              <Keyboard
                className="w-4 h-4 text-[#176B52] dark:text-[#2EB88A] shrink-0"
                aria-hidden="true"
              />
              <span>02. Full Keyboard Navigation</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-lg bg-[#F6F7F5] dark:bg-[#0F1721] border border-[#E2E6E1] dark:border-[#223040]">
                <span className="text-[#52606D] dark:text-[#94A3B8]">
                  Move across tiles
                </span>
                <kbd className="font-mono font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                  Arrow Keys
                </kbd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-lg bg-[#F6F7F5] dark:bg-[#0F1721] border border-[#E2E6E1] dark:border-[#223040]">
                <span className="text-[#52606D] dark:text-[#94A3B8]">
                  Start / submit word
                </span>
                <kbd className="font-mono font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                  Enter / Space
                </kbd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-lg bg-[#F6F7F5] dark:bg-[#0F1721] border border-[#E2E6E1] dark:border-[#223040]">
                <span className="text-[#52606D] dark:text-[#94A3B8]">
                  Anchor & trace live
                </span>
                <kbd className="font-mono font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                  Shift + Arrows
                </kbd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-lg bg-[#F6F7F5] dark:bg-[#0F1721] border border-[#E2E6E1] dark:border-[#223040]">
                <span className="text-[#52606D] dark:text-[#94A3B8]">
                  Clear · Hint · Guide
                </span>
                <kbd className="font-mono font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                  Esc · H · ?
                </kbd>
              </div>
            </div>
          </div>

          {/* Section 3: App Navigation */}
          <div className="pt-4 border-t border-[#ECEFEA] dark:border-[#223040] space-y-2">
            <h3 className="flex items-center gap-2 font-semibold text-[#131B23] dark:text-[#F1F5F9]">
              <Compass
                className="w-4 h-4 text-[#176B52] dark:text-[#2EB88A] shrink-0"
                aria-hidden="true"
              />
              <span>03. Navigating the App</span>
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
              <li>
                <strong className="text-[#131B23] dark:text-[#F1F5F9]">
                  Daily:
                </strong>{' '}
                Today’s worldwide word search and streak tracker.
              </li>
              <li>
                <strong className="text-[#131B23] dark:text-[#F1F5F9]">
                  Games:
                </strong>{' '}
                Mini Crosswords, Letter Shift & Anagram Forge.
              </li>
              <li>
                <strong className="text-[#131B23] dark:text-[#F1F5F9]">
                  Themes:
                </strong>{' '}
                Offline curated word packs & seasonal updates.
              </li>
              <li>
                <strong className="text-[#131B23] dark:text-[#F1F5F9]">
                  Leaderboard & Profile:
                </strong>{' '}
                Global standings, avatars, reminders & settings.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="pt-4 border-t border-[#ECEFEA] dark:border-[#223040] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-[#52606D] dark:text-[#94A3B8]">
            You can reopen this guide anytime by pressing <kbd className="font-mono font-semibold">?</kbd> or clicking Help.
          </span>
          <button
            ref={startBtnRef}
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
          >
            Start Playing
          </button>
        </div>
      </div>
    </div>
  );
};
