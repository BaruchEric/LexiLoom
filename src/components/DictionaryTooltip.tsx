import React, { useEffect, useId, useRef, useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { lookupDictionaryEntry } from '../data/dictionaryData';
import { loadHapticsEnabled, vibrateTileTap } from '../lib/haptics';

interface DictionaryTooltipProps {
  word: string;
  fallbackClue?: string;
  /** Optional custom trigger text; defaults to showing a subtle "Define" button */
  triggerLabel?: string;
  /** Controls popover horizontal anchor so tooltips near right edges stay inside viewport */
  align?: 'left' | 'right';
}

export const DictionaryTooltip: React.FC<DictionaryTooltipProps> = ({
  word,
  fallbackClue,
  triggerLabel,
  align = 'right',
}) => {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const hoverCloseTimer = useRef<number | null>(null);
  const tooltipId = useId();

  const entry = lookupDictionaryEntry(word, fallbackClue);

  const clearHoverTimer = () => {
    if (hoverCloseTimer.current !== null) {
      window.clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setPinned(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setPinned(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => () => clearHoverTimer(), []);

  const handleMouseEnter = () => {
    clearHoverTimer();
    setOpen(true);
  };

  const handleMouseLeave = () => {
    if (pinned) return;
    clearHoverTimer();
    hoverCloseTimer.current = window.setTimeout(() => {
      setOpen(false);
    }, 140);
  };

  const handleToggleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    vibrateTileTap(loadHapticsEnabled());
    if (open && pinned) {
      setOpen(false);
      setPinned(false);
    } else {
      setOpen(true);
      setPinned(true);
    }
  };

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleToggleClick}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (
            !pinned &&
            wrapperRef.current &&
            !wrapperRef.current.contains(e.relatedTarget as Node | null)
          ) {
            setOpen(false);
          }
        }}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        aria-label={`Dictionary definition for ${entry.word}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-[#176B52] dark:text-[#2EB88A] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52] dark:focus-visible:outline-[#2EB88A] rounded px-1 py-0.5 whitespace-nowrap shrink-0 cursor-pointer"
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{triggerLabel ?? 'Define'}</span>
      </button>

      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-full mb-2 z-50 w-72 sm:w-80 rounded-xl p-4 bg-white dark:bg-[#1B2635] border border-[#D4DDD6] dark:border-[#2E3D4F] shadow-xl text-left space-y-2.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-editorial text-base font-bold text-[#131B23] dark:text-[#F1F5F9] tracking-tight">
                  {entry.word.charAt(0) + entry.word.slice(1).toLowerCase()}
                </span>
                <span className="font-mono text-xs text-[#52606D] dark:text-[#94A3B8]">
                  /{entry.phonetic}/
                </span>
              </div>
              <div className="text-xs italic text-[#176B52] dark:text-[#2EB88A]">
                {entry.partOfSpeech}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                setPinned(false);
              }}
              aria-label={`Close definition for ${entry.word}`}
              className="p-1 rounded-md text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9] hover:bg-[#EDF1EE] dark:hover:bg-[#263547] transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <p className="text-xs sm:text-sm leading-relaxed text-[#131B23] dark:text-[#E2E8F0]">
            {entry.definition}
          </p>

          <p className="text-xs leading-relaxed text-[#52606D] dark:text-[#94A3B8] pt-2 border-t border-[#ECEFEA] dark:border-[#2A3849] italic">
            “{entry.example}”
          </p>
        </div>
      )}
    </span>
  );
};
