import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Lightbulb,
  PlayCircle,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import {
  evaluateWordGuess,
  WORD_GUESS_ENTRIES,
  type LetterEvaluation,
} from '../data/wordGamesData';
import { useGame } from '../context/GameContext';
import {
  playHintReveal,
  playInvalidWord,
  playRewardClaimed,
  playTileTap,
  playVictoryFanfare,
  playWordFound,
} from '../lib/sound';
import {
  loadHapticsEnabled,
  subscribeHapticsEnabled,
  vibrateHintReveal,
  vibrateTileTap,
  vibrateVictory,
  vibrateWordError,
  vibrateWordSuccess,
} from '../lib/haptics';
import {
  recordPuzzleAttempt,
  recordPuzzleOutcome,
} from '../lib/performanceStats';
import { RewardedAdModal } from './RewardedAdModal';
import { ConfettiBurst } from './ConfettiBurst';
import { LetterRevealHintBar } from './LetterRevealHintBar';
import { DictionaryTooltip } from './DictionaryTooltip';
import { ShareResultButton } from './ShareResultButton';
import { WordEtymologyButton } from './WordEtymologyButton';

const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 5;

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

const EVAL_PRIORITY: Record<LetterEvaluation, number> = {
  absent: 1,
  present: 2,
  correct: 3,
};

interface WordGuessGameProps {
  onGoToLeaderboard: () => void;
}

export const WordGuessGame: React.FC<WordGuessGameProps> = ({
  onGoToLeaderboard,
}) => {
  const {
    profile,
    completions,
    spendHintCredit,
    grantAdRewardHints,
    recordPuzzleCompletion,
    showTimer,
  } = useGame();

  const [entryIndex, setEntryIndex] = useState(0);
  const entry = WORD_GUESS_ENTRIES[entryIndex];

  const [guesses, setGuesses] = useState<string[]>([]);
  const [evaluations, setEvaluations] = useState<LetterEvaluation[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [clueUnlocked, setClueUnlocked] = useState(false);
  const [revealedPosition, setRevealedPosition] = useState<{
    index: number;
    letter: string;
  } | null>(null);
  const [feedback, setFeedback] = useState(
    'Guess the hidden 5-letter word in 6 attempts.'
  );
  const [shakeRow, setShakeRow] = useState(0);
  const [popRowIndex, setPopRowIndex] = useState<number | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [showAdModal, setShowAdModal] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() =>
    loadHapticsEnabled()
  );
  const attemptKeyRef = useRef<string>(`${entry.id}-${Date.now()}`);

  useEffect(() => subscribeHapticsEnabled(setHapticsEnabled), []);

  const completedIds = useMemo(
    () => new Set(completions.map((c) => c.puzzleId)),
    [completions]
  );

  const startRound = useCallback((nextIdx: number) => {
    setEntryIndex(nextIdx);
    setGuesses([]);
    setEvaluations([]);
    setCurrentGuess('');
    setStatus('playing');
    setElapsedSeconds(0);
    setHintsUsed(0);
    setClueUnlocked(false);
    setRevealedPosition(null);
    setFeedback('Guess the hidden 5-letter word in 6 attempts.');
    setPopRowIndex(null);
    setFinalScore(null);
    attemptKeyRef.current = `${WORD_GUESS_ENTRIES[nextIdx].id}-${Date.now()}`;
  }, []);

  // Timer while playing
  useEffect(() => {
    if (status !== 'playing') return;
    const id = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [status, entryIndex]);

  // Aggregate best letter status per alphabet key
  const keyStates = useMemo<Record<string, LetterEvaluation>>(() => {
    const map: Record<string, LetterEvaluation> = {};
    guesses.forEach((word, rowIdx) => {
      const evRow = evaluations[rowIdx];
      if (!evRow) return;
      for (let i = 0; i < word.length; i++) {
        const ch = word[i];
        const nextEv = evRow[i];
        if (!map[ch] || EVAL_PRIORITY[nextEv] > EVAL_PRIORITY[map[ch]]) {
          map[ch] = nextEv;
        }
      }
    });
    return map;
  }, [guesses, evaluations]);

  const handleSubmitGuess = useCallback(() => {
    if (status !== 'playing') return;
    if (currentGuess.length < WORD_LENGTH) {
      playInvalidWord(profile.soundEnabled);
      vibrateWordError(hapticsEnabled);
      setShakeRow((n) => n + 1);
      setFeedback('Enter all 5 letters before submitting.');
      return;
    }

    recordPuzzleAttempt(attemptKeyRef.current, entry.id, 'Letter Shift');
    const ev = evaluateWordGuess(currentGuess, entry.word);
    const nextGuesses = [...guesses, currentGuess];
    const nextEvals = [...evaluations, ev];
    const submittedRowIdx = guesses.length;

    setGuesses(nextGuesses);
    setEvaluations(nextEvals);
    setCurrentGuess('');
    setPopRowIndex(submittedRowIdx);
    window.setTimeout(() => setPopRowIndex(null), 500);

    if (currentGuess === entry.word) {
      setStatus('won');
      playVictoryFanfare(profile.soundEnabled);
      vibrateVictory(hapticsEnabled);
      setConfettiTrigger((n) => n + 1);
      recordPuzzleOutcome(
        attemptKeyRef.current,
        entry.id,
        'Letter Shift',
        'won'
      );

      const attemptBonus = (MAX_ATTEMPTS - submittedRowIdx) * 100;
      const timeBonus = Math.max(0, 120 - elapsedSeconds);
      const score = Math.max(150, 250 + attemptBonus + timeBonus - hintsUsed * 45);
      setFinalScore(score);
      setFeedback(
        `Solved in ${nextGuesses.length} ${
          nextGuesses.length === 1 ? 'try' : 'tries'
        }! Score: ${score} pts.`
      );

      void recordPuzzleCompletion({
        puzzleId: entry.id,
        mode: 'theme',
        themeId: entry.id,
        themeName: `Letter Shift: ${entry.category}`,
        puzzleWord: entry.word,
        puzzleWords: [entry.word],
        score,
        durationSeconds: elapsedSeconds,
        hintsUsed,
        wordsFound: 1,
      });
    } else if (nextGuesses.length >= MAX_ATTEMPTS) {
      setStatus('lost');
      playInvalidWord(profile.soundEnabled);
      vibrateWordError(hapticsEnabled);
      recordPuzzleOutcome(
        attemptKeyRef.current,
        entry.id,
        'Letter Shift',
        'lost'
      );
      setFeedback(`Out of tries! The hidden word was ${entry.word}.`);
    } else {
      const exactCount = ev.filter((e) => e === 'correct').length;
      const presentCount = ev.filter((e) => e === 'present').length;
      if (exactCount > 0 || presentCount > 0) {
        playWordFound(profile.soundEnabled);
        vibrateWordSuccess(hapticsEnabled);
      } else {
        playTileTap(profile.soundEnabled);
        vibrateTileTap(hapticsEnabled);
      }
      setFeedback(
        `${exactCount} exact spot, ${presentCount} in word elsewhere. ${
          MAX_ATTEMPTS - nextGuesses.length
        } tries left.`
      );
    }
  }, [
    status,
    currentGuess,
    entry,
    guesses,
    evaluations,
    profile.soundEnabled,
    hapticsEnabled,
    elapsedSeconds,
    hintsUsed,
    recordPuzzleCompletion,
  ]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (status !== 'playing') return;
      if (key === 'ENTER') {
        handleSubmitGuess();
        return;
      }
      if (key === 'BACK') {
        vibrateTileTap(hapticsEnabled);
        setCurrentGuess((prev) => prev.slice(0, -1));
        return;
      }
      if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
        playTileTap(profile.soundEnabled);
        vibrateTileTap(hapticsEnabled);
        setCurrentGuess((prev) => prev + key);
      }
    },
    [status, handleSubmitGuess, currentGuess.length, profile.soundEnabled, hapticsEnabled]
  );

  // Physical keyboard support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showAdModal || status !== 'playing') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleKeyPress('ENTER');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyPress('BACK');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showAdModal, status, handleKeyPress]);

  const handleUseSmartHint = async () => {
    if (status !== 'playing') return;
    if (clueUnlocked && revealedPosition) {
      setFeedback(
        `Clue: "${entry.clue}" · Position ${revealedPosition.index + 1} is "${revealedPosition.letter}".`
      );
      return;
    }
    if (profile.hintCredits <= 0) {
      setShowAdModal(true);
      return;
    }

    const spent = await spendHintCredit();
    if (!spent) {
      setShowAdModal(true);
      return;
    }

    setHintsUsed((h) => h + 1);
    playHintReveal(profile.soundEnabled);
    vibrateHintReveal(hapticsEnabled);

    if (!clueUnlocked) {
      setClueUnlocked(true);
      setFeedback(`Clue unlocked: ${entry.clue}`);
    } else {
      // Find a position not yet green in previous guesses
      const solvedIdx = new Set<number>();
      evaluations.forEach((row) =>
        row.forEach((ev, i) => {
          if (ev === 'correct') solvedIdx.add(i);
        })
      );
      let pick = 0;
      for (let i = 0; i < WORD_LENGTH; i++) {
        if (!solvedIdx.has(i)) {
          pick = i;
          break;
        }
      }
      setRevealedPosition({ index: pick, letter: entry.word[pick] });
      setFeedback(
        `Letter revealed: Position ${pick + 1} is "${entry.word[pick]}".`
      );
    }
  };

  const handleRevealSingleLetter = useCallback(
    (method: 'delay' | 'points'): boolean => {
      if (status !== 'playing') return false;
      const solvedIdx = new Set<number>();
      evaluations.forEach((row) =>
        row.forEach((ev, i) => {
          if (ev === 'correct') solvedIdx.add(i);
        })
      );
      if (revealedPosition) solvedIdx.add(revealedPosition.index);

      let pick = -1;
      for (let i = 0; i < WORD_LENGTH; i++) {
        if (!solvedIdx.has(i)) {
          pick = i;
          break;
        }
      }
      if (pick === -1) {
        pick = 0;
      }

      setRevealedPosition({ index: pick, letter: entry.word[pick] });
      setHintsUsed((h) => h + 1);
      playHintReveal(profile.soundEnabled);
      vibrateHintReveal(hapticsEnabled);
      setFeedback(
        `Revealed letter #${pick + 1}: "${entry.word[pick]}"${
          method === 'points' ? ' (-50 pts).' : ' (free timed hint).'
        }`
      );
      return true;
    },
    [
      status,
      evaluations,
      revealedPosition,
      entry.word,
      profile.soundEnabled,
      hapticsEnabled,
    ]
  );

  return (
    <div className="space-y-6">
      <ConfettiBurst triggerKey={confettiTrigger} />

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E2E6E1] dark:border-[#223040]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#52606D] dark:text-[#94A3B8]">
            <span>Letter Shift · 5-Letter Deduction</span>
            <span aria-hidden="true">·</span>
            <span>Category: {entry.category}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Puzzle {entryIndex + 1} of {WORD_GUESS_ENTRIES.length}
            </span>
            {showTimer && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                  <Clock className="w-3.5 h-3.5 opacity-75" aria-hidden="true" />
                  <span key={elapsedSeconds} className="lexiloom-timer-tick">
                    {formatDuration(elapsedSeconds)}
                  </span>
                </span>
              </>
            )}
          </div>
          <h2 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-[#131B23] dark:text-[#F1F5F9]">
            Letter Shift
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              startRound((entryIndex + 1) % WORD_GUESS_ENTRIES.length)
            }
            className="px-3.5 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#263342] bg-white dark:bg-[#161F2A] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] text-xs font-semibold text-[#131B23] dark:text-[#F1F5F9] transition-colors whitespace-nowrap shrink-0"
          >
            Next Word
          </button>
          <button
            type="button"
            onClick={() => startRound(entryIndex)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#263342] bg-white dark:bg-[#161F2A] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] text-xs font-semibold text-[#52606D] dark:text-[#CBD5E1] transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 6x5 Deduction Grid + Keyboard */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl px-4 py-2.5 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] flex items-center justify-between gap-3">
            <p className="text-sm text-[#52606D] dark:text-[#CBD5E1]" aria-live="polite">
              {feedback}
            </p>
            {completedIds.has(entry.id) && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B52] dark:text-[#2EB88A] whitespace-nowrap shrink-0">
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Solved
              </span>
            )}
          </div>

          <div className="relative rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] flex justify-center">
            <ConfettiBurst triggerKey={confettiTrigger} scope="board" />
            <div className="grid grid-rows-6 gap-2 w-full max-w-[340px]">
              {Array.from({ length: MAX_ATTEMPTS }).map((_, rIdx) => {
                const isSubmitted = rIdx < guesses.length;
                const isCurrent = rIdx === guesses.length && status === 'playing';
                const rowWord = isSubmitted
                  ? guesses[rIdx]
                  : isCurrent
                  ? currentGuess
                  : '';
                const rowEv = isSubmitted ? evaluations[rIdx] : null;

                return (
                  <div
                    key={isCurrent ? `row-${rIdx}-s${shakeRow}` : `row-${rIdx}`}
                    className={`grid grid-cols-5 gap-2 ${
                      isCurrent && shakeRow > 0 ? 'lexiloom-shake' : ''
                    }`}
                  >
                    {Array.from({ length: WORD_LENGTH }).map((__, cIdx) => {
                      const ch = rowWord[cIdx] ?? '';
                      const ev = rowEv ? rowEv[cIdx] : null;
                      const isPop = popRowIndex === rIdx;

                      let tileClasses =
                        'bg-[#F6F7F5] dark:bg-[#0F1721] text-[#131B23] dark:text-[#F1F5F9] border-[#D4DDD6] dark:border-[#2A3849]';
                      let symbol = '';

                      if (ev === 'correct') {
                        tileClasses =
                          'bg-[#176B52] dark:bg-[#2EB88A] text-white dark:text-[#0B1410] border-[#176B52] dark:border-[#2EB88A]';
                        symbol = '✓';
                      } else if (ev === 'present') {
                        tileClasses =
                          'bg-[#B45309] dark:bg-[#D97706] text-white dark:text-[#0B1410] border-[#B45309] dark:border-[#D97706]';
                        symbol = '↔';
                      } else if (ev === 'absent') {
                        tileClasses =
                          'bg-[#64748B] dark:bg-[#334155] text-white dark:text-[#E2E8F0] border-[#64748B] dark:border-[#334155]';
                        symbol = '×';
                      } else if (ch) {
                        tileClasses =
                          'bg-white dark:bg-[#1B2635] text-[#131B23] dark:text-[#F1F5F9] border-[#176B52] dark:border-[#2EB88A]';
                      }

                      return (
                        <div
                          key={cIdx}
                          style={
                            isPop
                              ? { animationDelay: `${cIdx * 55}ms` }
                              : undefined
                          }
                          aria-label={
                            ch
                              ? `${ch}, ${
                                  ev === 'correct'
                                    ? 'correct position'
                                    : ev === 'present'
                                    ? 'in word, wrong position'
                                    : ev === 'absent'
                                    ? 'not in word'
                                    : 'entered'
                                }`
                              : 'empty slot'
                          }
                          className={`relative aspect-square rounded-xl border-2 font-bold flex items-center justify-center ${
                            profile.largePrint ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                          } ${tileClasses} ${isPop ? 'lexiloom-tile-pop' : ''}`}
                        >
                          <span>{ch}</span>
                          {symbol && (
                            <span
                              aria-hidden="true"
                              className="absolute top-1 right-1.5 text-[9px] font-bold leading-none opacity-85"
                            >
                              {symbol}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* On-Screen QWERTY Keyboard with Live Status */}
          <div className="rounded-2xl p-3 sm:p-4 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-1.5">
            {KEYBOARD_ROWS.map((row, idx) => (
              <div key={idx} className="flex justify-center gap-1 sm:gap-1.5">
                {row.map((key) => {
                  const isWide = key === 'ENTER' || key === 'BACK';
                  const ev = keyStates[key];
                  let keyColors =
                    'bg-[#F6F7F5] dark:bg-[#0F1721] text-[#131B23] dark:text-[#F1F5F9] border-[#D4DDD6] dark:border-[#2A3849] hover:bg-[#E7ECE8] dark:hover:bg-[#1E2A38]';
                  if (ev === 'correct') {
                    keyColors =
                      'bg-[#176B52] dark:bg-[#2EB88A] text-white dark:text-[#0B1410] border-[#176B52] dark:border-[#2EB88A]';
                  } else if (ev === 'present') {
                    keyColors =
                      'bg-[#B45309] dark:bg-[#D97706] text-white dark:text-[#0B1410] border-[#B45309] dark:border-[#D97706]';
                  } else if (ev === 'absent') {
                    keyColors =
                      'bg-[#94A3B8]/40 dark:bg-[#1E293B] text-[#64748B] dark:text-[#64748B] border-[#CBD5E1] dark:border-[#263342]';
                  }

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={status !== 'playing'}
                      onClick={() => handleKeyPress(key)}
                      className={`h-11 rounded-lg font-mono text-xs sm:text-sm font-bold border active:scale-95 transition-transform disabled:opacity-50 ${keyColors} ${
                        isWide ? 'px-2.5 sm:px-3.5 text-[11px]' : 'flex-1 max-w-[40px]'
                      }`}
                    >
                      {key === 'BACK' ? '⌫' : key}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Legend + Smart Hints */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl p-5 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-4">
            <div>
              <h3 className="font-editorial text-lg font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                Smart Hints
              </h3>
              <p className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                Unlock a definition clue, then reveal an exact letter · Balance:{' '}
                <strong className="font-mono tabular-nums text-[#131B23] dark:text-[#F1F5F9]">
                  {profile.hintCredits}
                </strong>
              </p>
            </div>

            {(clueUnlocked || revealedPosition) && (
              <div className="rounded-xl p-3.5 bg-[#FFFBEB] dark:bg-[#2A2112] border border-[#F59E0B]/40 space-y-1.5 text-sm">
                {clueUnlocked && (
                  <p className="text-[#131B23] dark:text-[#F8FAFC]">
                    <span className="font-semibold text-[#92400E] dark:text-[#FCD34D]">
                      Clue:{' '}
                    </span>
                    {entry.clue}
                  </p>
                )}
                {revealedPosition && (
                  <p className="text-xs font-mono text-[#78350F] dark:text-[#FDE68A]">
                    Position {revealedPosition.index + 1} is{' '}
                    <strong>{revealedPosition.letter}</strong>
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={status !== 'playing'}
                onClick={() => void handleUseSmartHint()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] disabled:opacity-50 text-white dark:text-[#0B1410] text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <Lightbulb className="w-4 h-4" aria-hidden="true" />
                {!clueUnlocked
                  ? 'Unlock Clue (-1)'
                  : 'Reveal Letter (-1)'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] bg-[#F6F7F5] dark:bg-[#0F1721] hover:bg-[#E9EDE8] dark:hover:bg-[#1E2A38] text-[#131B23] dark:text-[#F1F5F9] text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <PlayCircle
                  className="w-4 h-4 text-[#176B52] dark:text-[#2EB88A]"
                  aria-hidden="true"
                />
                Watch Ad (+2)
              </button>
            </div>

            <LetterRevealHintBar
              disabled={status !== 'playing'}
              resetKey={entry.id}
              onRevealLetter={handleRevealSingleLetter}
            />
          </div>

          {/* Non-Hue-Only Symbol Key */}
          <div className="rounded-2xl p-5 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-3">
            <h3 className="font-editorial text-base font-semibold text-[#131B23] dark:text-[#F1F5F9]">
              Tile Guide
            </h3>
            <div className="space-y-2.5 text-sm text-[#52606D] dark:text-[#CBD5E1]">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#176B52] dark:bg-[#2EB88A] text-white dark:text-[#0B1410] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  ✓
                </span>
                <span>Letter is in the word and in the exact right spot.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#B45309] dark:bg-[#D97706] text-white dark:text-[#0B1410] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  ↔
                </span>
                <span>Letter is in the word, but belongs in a different spot.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#64748B] dark:bg-[#334155] text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  ×
                </span>
                <span>Letter does not appear in today&apos;s hidden word.</span>
              </div>
            </div>

            {status === 'lost' && (
              <div className="pt-3 border-t border-[#ECEFEA] dark:border-[#223040] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                    Answer:{' '}
                    <strong className="font-mono tracking-widest text-[#176B52] dark:text-[#2EB88A]">
                      {entry.word}
                    </strong>
                  </span>
                  <DictionaryTooltip
                    word={entry.word}
                    fallbackClue={entry.clue}
                    align="left"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    startRound((entryIndex + 1) % WORD_GUESS_ENTRIES.length)
                  }
                  className="px-3.5 py-2 rounded-lg bg-[#176B52] dark:bg-[#2EB88A] text-white dark:text-[#0B1410] text-xs font-semibold whitespace-nowrap"
                >
                  Try Next Word
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Rewarded Ad Modal */}
      <RewardedAdModal
        isOpen={showAdModal}
        onClose={() => setShowAdModal(false)}
        onRewardClaimed={() => {
          playRewardClaimed(profile.soundEnabled);
          vibrateWordSuccess(hapticsEnabled);
          void grantAdRewardHints(2);
          setFeedback('Reward claimed! +2 Smart Hint credits added.');
        }}
      />

      {/* Victory Modal */}
      {status === 'won' && finalScore !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wg-victory-title"
        >
          <div className="lexiloom-modal-in w-full max-w-md rounded-2xl bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] p-7 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#176B52] dark:text-[#2EB88A]">
                <Trophy className="w-4 h-4" aria-hidden="true" />
                <span>Letter Shift Solved</span>
              </div>
              <h3
                id="wg-victory-title"
                className="font-editorial text-2xl font-bold text-[#131B23] dark:text-[#F1F5F9]"
              >
                {entry.word} — nailed it!
              </h3>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-[#52606D] dark:text-[#94A3B8]">
                  {entry.clue}.
                </p>
                <DictionaryTooltip
                  word={entry.word}
                  fallbackClue={entry.clue}
                  align="right"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 py-4 border-y border-[#E2E6E1] dark:border-[#223040]">
              <div>
                <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">Score</div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
                  {finalScore}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">Tries</div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
                  {guesses.length}/{MAX_ATTEMPTS}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">Time</div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
                  {formatDuration(elapsedSeconds)}
                </div>
              </div>
            </div>

            <ShareResultButton
              summary={{
                gameTitle: `Letter Shift · ${entry.category}`,
                score: finalScore,
                durationSeconds: elapsedSeconds,
                streakDays: profile.currentStreak,
                hintsUsed,
                guessEvaluations: evaluations,
                maxAttempts: MAX_ATTEMPTS,
              }}
            />

            <WordEtymologyButton
              words={[{ word: entry.word, clue: entry.clue }]}
              label={`Definition & Etymology of ${entry.word}`}
            />

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() =>
                  startRound((entryIndex + 1) % WORD_GUESS_ENTRIES.length)
                }
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#F1F4F1] dark:hover:bg-[#1E2A38] text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Next Puzzle
              </button>
              <button
                type="button"
                onClick={() => {
                  setFinalScore(null);
                  onGoToLeaderboard();
                }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#F1F4F1] dark:hover:bg-[#1E2A38] text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Leaderboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
