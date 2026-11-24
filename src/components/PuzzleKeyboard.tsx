import React from 'react';
import { ChevronDown, ChevronUp, Delete, CornerDownLeft } from 'lucide-react';

export type PuzzleKeyState = 'correct' | 'present' | 'absent' | 'idle';

const KEYBOARD_ROWS: string[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];

interface PuzzleKeyboardProps {
  keyStates: Record<string, PuzzleKeyState>;
  typedWord: string;
  disabled?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onKeyPress: (key: string) => void;
  onClearTyped?: () => void;
}

const STATE_LABEL: Record<PuzzleKeyState, string> = {
  correct: 'correct, used in found words',
  present: 'present in remaining puzzle words',
  absent: 'absent from remaining puzzle words',
  idle: 'available',
};

export const PuzzleKeyboard: React.FC<PuzzleKeyboardProps> = ({
  keyStates,
  typedWord,
  disabled = false,
  collapsed = false,
  onToggleCollapsed,
  onKeyPress,
  onClearTyped,
}) => {
  return (
    <div
      role="region"
      aria-label="On-screen puzzle keyboard"
      className="rounded-2xl p-3.5 sm:p-4 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-3"
    >
      {/* Top Status & Non-Hue-Only Key Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-semibold text-[#131B23] dark:text-[#F1F5F9]">
            On-Screen Keyboard
          </span>
          {typedWord.length > 0 ? (
            <>
              <span aria-hidden="true" className="text-[#94A3B8]">
                ·
              </span>
              <span className="font-mono tracking-widest font-bold text-[#176B52] dark:text-[#2EB88A]">
                {typedWord}
              </span>
              {onClearTyped && (
                <button
                  type="button"
                  onClick={onClearTyped}
                  className="text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9] underline"
                >
                  Clear
                </button>
              )}
            </>
          ) : (
            <span className="text-[#52606D] dark:text-[#94A3B8] hidden sm:inline">
              · Type or tap letters &amp; press Enter to submit a word
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5 text-[11px] text-[#52606D] dark:text-[#94A3B8]">
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span
                aria-hidden="true"
                className="w-4 h-4 rounded bg-[#176B52] dark:bg-[#2EB88A] text-white dark:text-[#0B1410] font-mono text-[9px] font-bold inline-flex items-center justify-center"
              >
                ✓
              </span>
              <span>Correct</span>
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span
                aria-hidden="true"
                className="w-4 h-4 rounded bg-[#B45309] dark:bg-[#D97706] text-white dark:text-[#0B1410] font-mono text-[9px] font-bold inline-flex items-center justify-center"
              >
                ↔
              </span>
              <span>Present</span>
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span
                aria-hidden="true"
                className="w-4 h-4 rounded bg-[#94A3B8]/40 dark:bg-[#1E293B] text-[#64748B] font-mono text-[9px] font-bold inline-flex items-center justify-center"
              >
                ×
              </span>
              <span>Absent</span>
            </span>
          </div>

          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={
                collapsed
                  ? 'Expand on-screen keyboard'
                  : 'Collapse on-screen keyboard'
              }
              className="p-1 rounded-md text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] transition-colors"
            >
              {collapsed ? (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Interactive QWERTY Key Rows */}
      {!collapsed && (
        <div className="space-y-1.5">
          {KEYBOARD_ROWS.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className="flex justify-center gap-1 sm:gap-1.5"
            >
              {row.map((key) => {
                const isEnter = key === 'ENTER';
                const isBack = key === 'BACK';
                const isAction = isEnter || isBack;
                const state: PuzzleKeyState = isAction
                  ? 'idle'
                  : keyStates[key] ?? 'idle';

                let keyClasses =
                  'bg-[#F6F7F5] dark:bg-[#0F1721] text-[#131B23] dark:text-[#F1F5F9] border-[#D4DDD6] dark:border-[#2A3849] hover:bg-[#E7ECE8] dark:hover:bg-[#1E2A38]';
                let symbol = '';

                if (state === 'correct') {
                  keyClasses =
                    'bg-[#176B52] dark:bg-[#2EB88A] text-white dark:text-[#0B1410] border-[#176B52] dark:border-[#2EB88A] hover:brightness-105';
                  symbol = '✓';
                } else if (state === 'present') {
                  keyClasses =
                    'bg-[#B45309] dark:bg-[#D97706] text-white dark:text-[#0B1410] border-[#B45309] dark:border-[#D97706] hover:brightness-105';
                  symbol = '↔';
                } else if (state === 'absent') {
                  keyClasses =
                    'bg-[#E5E9E6] dark:bg-[#121A24] text-[#64748B] dark:text-[#64748B] border-[#D8DFDA] dark:border-[#223040] opacity-70 hover:opacity-90';
                  symbol = '×';
                } else if (isEnter && typedWord.length >= 2) {
                  keyClasses =
                    'bg-[#176B52] dark:bg-[#2EB88A] text-white dark:text-[#0B1410] border-[#176B52] dark:border-[#2EB88A] hover:bg-[#125742] dark:hover:bg-[#3CD19F]';
                }

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => onKeyPress(key)}
                    aria-label={
                      isEnter
                        ? 'Submit typed word'
                        : isBack
                        ? 'Delete last letter'
                        : `Letter ${key}, ${STATE_LABEL[state]}`
                    }
                    className={`relative h-11 rounded-lg font-mono text-xs sm:text-sm font-bold border active:scale-95 transition-transform disabled:opacity-45 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52] dark:focus-visible:outline-[#2EB88A] ${keyClasses} ${
                      isAction
                        ? 'px-2.5 sm:px-3.5 text-[11px] shrink-0'
                        : 'flex-1 max-w-[42px]'
                    }`}
                  >
                    {isEnter ? (
                      <span className="inline-flex items-center gap-1">
                        <CornerDownLeft
                          className="w-3.5 h-3.5"
                          aria-hidden="true"
                        />
                        <span className="hidden sm:inline">ENTER</span>
                      </span>
                    ) : isBack ? (
                      <Delete className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <span>{key}</span>
                    )}
                    {symbol && (
                      <span
                        aria-hidden="true"
                        className="absolute top-0.5 right-1 text-[8px] font-bold leading-none opacity-85"
                      >
                        {symbol}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
