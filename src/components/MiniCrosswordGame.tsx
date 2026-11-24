import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Lightbulb,
  PlayCircle,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import {
  CROSSWORD_PUZZLES,
  parseCrossword,
  type CrosswordClueEntry,
} from '../data/crosswordPuzzles';
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

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];

function coordKey(r: number, c: number): string {
  return `${r}-${c}`;
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

interface MiniCrosswordGameProps {
  onGoToLeaderboard: () => void;
}

export const MiniCrosswordGame: React.FC<MiniCrosswordGameProps> = ({
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

  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const parsed = useMemo(
    () => parseCrossword(CROSSWORD_PUZZLES[puzzleIndex]),
    [puzzleIndex]
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [checkedErrors, setCheckedErrors] = useState<Set<string>>(new Set());
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>(() => {
    const first = parsed.across[0]?.cells[0] ?? { row: 0, col: 0 };
    return first;
  });
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [showAdModal, setShowAdModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    'Type letters or tap keys below to fill the crossword grid.'
  );
  const [shakeKey, setShakeKey] = useState(0);
  const [poppedCells, setPoppedCells] = useState<Set<string>>(new Set());
  const [victoryScore, setVictoryScore] = useState<number | null>(null);

  const solvedWordsRef = useRef<Set<string>>(new Set());
  const attemptKeyRef = useRef<string>(`${parsed.def.id}-${Date.now()}`);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() =>
    loadHapticsEnabled()
  );

  useEffect(() => subscribeHapticsEnabled(setHapticsEnabled), []);

  const completedIdSet = useMemo(
    () => new Set(completions.map((c) => c.puzzleId)),
    [completions]
  );

  const resetBoard = useCallback(
    (nextParsed = parsed) => {
      setValues({});
      setRevealedCells(new Set());
      setCheckedErrors(new Set());
      setSelectedCell(nextParsed.across[0]?.cells[0] ?? { row: 0, col: 0 });
      setDirection('across');
      setElapsedSeconds(0);
      setHintsUsed(0);
      setIsComplete(false);
      setVictoryScore(null);
      setPoppedCells(new Set());
      solvedWordsRef.current = new Set();
      attemptKeyRef.current = `${nextParsed.def.id}-${Date.now()}`;
      setStatusMessage('Type letters or tap keys below to fill the crossword grid.');
    },
    [parsed]
  );

  const handleSelectPuzzle = (idx: number) => {
    setPuzzleIndex(idx);
    const nextParsed = parseCrossword(CROSSWORD_PUZZLES[idx]);
    resetBoard(nextParsed);
  };

  // Live timer
  useEffect(() => {
    if (isComplete) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isComplete, puzzleIndex]);

  // Find active clue entry for selectedCell + direction
  const activeEntry = useMemo<CrosswordClueEntry | null>(() => {
    const list = direction === 'across' ? parsed.across : parsed.down;
    const exact = list.find((entry) =>
      entry.cells.some(
        (c) => c.row === selectedCell.row && c.col === selectedCell.col
      )
    );
    if (exact) return exact;
    const fallbackList = direction === 'across' ? parsed.down : parsed.across;
    return (
      fallbackList.find((entry) =>
        entry.cells.some(
          (c) => c.row === selectedCell.row && c.col === selectedCell.col
        )
      ) ?? parsed.across[0] ?? null
    );
  }, [parsed, selectedCell, direction]);

  const activeWordKeys = useMemo(() => {
    const set = new Set<string>();
    if (activeEntry) {
      for (const c of activeEntry.cells) {
        set.add(coordKey(c.row, c.col));
      }
    }
    return set;
  }, [activeEntry]);

  const checkSolvedWordsAndVictory = useCallback(
    (nextValues: Record<string, string>) => {
      const allEntries = [...parsed.across, ...parsed.down];
      const newlyPopped = new Set<string>();

      for (const entry of allEntries) {
        const entryId = `${entry.direction}-${entry.number}`;
        if (solvedWordsRef.current.has(entryId)) continue;
        const wordMatches = entry.cells.every(
          (c, i) => nextValues[coordKey(c.row, c.col)] === entry.answer[i]
        );
        if (wordMatches) {
          solvedWordsRef.current.add(entryId);
          entry.cells.forEach((c) => newlyPopped.add(coordKey(c.row, c.col)));
        }
      }

      if (newlyPopped.size > 0) {
        setPoppedCells(newlyPopped);
        window.setTimeout(() => setPoppedCells(new Set()), 450);
      }

      // Check full board completion
      let filledCount = 0;
      let allCorrect = true;
      for (let r = 0; r < parsed.size; r++) {
        for (let c = 0; c < parsed.size; c++) {
          const ch = parsed.def.grid[r][c];
          if (ch === '#') continue;
          const v = nextValues[coordKey(r, c)];
          if (v) filledCount += 1;
          if (v !== ch) allCorrect = false;
        }
      }

      if (allCorrect) {
        setIsComplete(true);
        playVictoryFanfare(profile.soundEnabled);
        vibrateVictory(hapticsEnabled);
        setConfettiTrigger((n) => n + 1);

        const timeBonus = Math.max(0, 200 - elapsedSeconds);
        const finalScore = Math.max(
          150,
          allEntries.length * 110 + timeBonus - hintsUsed * 40
        );
        setVictoryScore(finalScore);
        setStatusMessage(`Crossword solved! Final score: ${finalScore} pts.`);
        recordPuzzleOutcome(
          attemptKeyRef.current,
          parsed.def.id,
          'Mini Crossword',
          'won'
        );

        void recordPuzzleCompletion({
          puzzleId: parsed.def.id,
          mode: 'theme',
          themeId: parsed.def.id,
          themeName: `Mini Crossword: ${parsed.def.title}`,
          puzzleWord: parsed.across[0]?.answer || allEntries[0]?.answer,
          puzzleWords: allEntries.map((entry) => entry.answer),
          score: finalScore,
          durationSeconds: elapsedSeconds,
          hintsUsed,
          wordsFound: allEntries.length,
        });
      } else if (newlyPopped.size > 0) {
        playWordFound(profile.soundEnabled);
        vibrateWordSuccess(hapticsEnabled);
        setStatusMessage('Word completed! Keep going.');
      } else if (filledCount === parsed.totalOpenCells) {
        playInvalidWord(profile.soundEnabled);
        vibrateWordError(hapticsEnabled);
        setShakeKey((k) => k + 1);
        setStatusMessage(
          'Board is full, but at least one letter is off. Use Check to spot errors.'
        );
      }
    },
    [
      parsed,
      profile.soundEnabled,
      hapticsEnabled,
      elapsedSeconds,
      hintsUsed,
      recordPuzzleCompletion,
    ]
  );

  const handleCellClick = (r: number, c: number) => {
    if (parsed.def.grid[r][c] === '#') return;
    playTileTap(profile.soundEnabled);
    vibrateTileTap(hapticsEnabled);

    if (selectedCell.row === r && selectedCell.col === c) {
      const altDir = direction === 'across' ? 'down' : 'across';
      const altList = altDir === 'across' ? parsed.across : parsed.down;
      const hasAlt = altList.some((e) =>
        e.cells.some((cell) => cell.row === r && cell.col === c)
      );
      if (hasAlt) {
        setDirection(altDir);
      }
    } else {
      setSelectedCell({ row: r, col: c });
      // Auto-orient if current direction doesn't cover this cell
      const currentList = direction === 'across' ? parsed.across : parsed.down;
      const inCurrent = currentList.some((e) =>
        e.cells.some((cell) => cell.row === r && cell.col === c)
      );
      if (!inCurrent) {
        setDirection(direction === 'across' ? 'down' : 'across');
      }
    }
  };

  const handleLetterInput = useCallback(
    (letter: string) => {
      if (isComplete) return;
      const key = coordKey(selectedCell.row, selectedCell.col);
      if (parsed.def.grid[selectedCell.row][selectedCell.col] === '#') return;

      recordPuzzleAttempt(
        attemptKeyRef.current,
        parsed.def.id,
        'Mini Crossword'
      );
      playTileTap(profile.soundEnabled);
      vibrateTileTap(hapticsEnabled);

      const nextValues = { ...values, [key]: letter };
      setValues(nextValues);
      setCheckedErrors((prev) => {
        if (!prev.has(key)) return prev;
        const copy = new Set(prev);
        copy.delete(key);
        return copy;
      });

      // Advance to next cell in active word
      if (activeEntry) {
        const idx = activeEntry.cells.findIndex(
          (c) => c.row === selectedCell.row && c.col === selectedCell.col
        );
        if (idx >= 0 && idx < activeEntry.cells.length - 1) {
          setSelectedCell(activeEntry.cells[idx + 1]);
        }
      }

      checkSolvedWordsAndVictory(nextValues);
    },
    [
      isComplete,
      selectedCell,
      parsed.def.grid,
      profile.soundEnabled,
      hapticsEnabled,
      values,
      activeEntry,
      checkSolvedWordsAndVictory,
    ]
  );

  const handleBackspace = useCallback(() => {
    if (isComplete) return;
    vibrateTileTap(hapticsEnabled);
    const key = coordKey(selectedCell.row, selectedCell.col);

    if (values[key] && !revealedCells.has(key)) {
      const nextValues = { ...values };
      delete nextValues[key];
      setValues(nextValues);
      setCheckedErrors((prev) => {
        const copy = new Set(prev);
        copy.delete(key);
        return copy;
      });
      return;
    }

    if (activeEntry) {
      const idx = activeEntry.cells.findIndex(
        (c) => c.row === selectedCell.row && c.col === selectedCell.col
      );
      if (idx > 0) {
        const prevCell = activeEntry.cells[idx - 1];
        const prevKey = coordKey(prevCell.row, prevCell.col);
        setSelectedCell(prevCell);
        if (!revealedCells.has(prevKey)) {
          const nextValues = { ...values };
          delete nextValues[prevKey];
          setValues(nextValues);
        }
      }
    }
  }, [isComplete, hapticsEnabled, selectedCell, values, revealedCells, activeEntry]);

  // Physical keyboard listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showAdModal || isComplete) return;
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

      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleLetterInput(e.key.toUpperCase());
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleBackspace();
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        const altDir = direction === 'across' ? 'down' : 'across';
        const altList = altDir === 'across' ? parsed.across : parsed.down;
        const hasAlt = altList.some((entry) =>
          entry.cells.some(
            (c) => c.row === selectedCell.row && c.col === selectedCell.col
          )
        );
        if (hasAlt) setDirection(altDir);
        return;
      }
      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        e.preventDefault();
        const dr = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        const dc = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        let nr = selectedCell.row + dr;
        let nc = selectedCell.col + dc;
        while (nr >= 0 && nr < parsed.size && nc >= 0 && nc < parsed.size) {
          if (parsed.def.grid[nr][nc] !== '#') {
            setSelectedCell({ row: nr, col: nc });
            if (dr !== 0) {
              const hasDown = parsed.down.some((entry) =>
                entry.cells.some((c) => c.row === nr && c.col === nc)
              );
              if (hasDown) setDirection('down');
            } else {
              const hasAcross = parsed.across.some((entry) =>
                entry.cells.some((c) => c.row === nr && c.col === nc)
              );
              if (hasAcross) setDirection('across');
            }
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    showAdModal,
    isComplete,
    handleLetterInput,
    handleBackspace,
    direction,
    parsed,
    selectedCell,
  ]);

  const handleCheckBoard = () => {
    if (isComplete) return;
    const errors = new Set<string>();
    for (let r = 0; r < parsed.size; r++) {
      for (let c = 0; c < parsed.size; c++) {
        const ch = parsed.def.grid[r][c];
        if (ch === '#') continue;
        const key = coordKey(r, c);
        if (values[key] && values[key] !== ch) {
          errors.add(key);
        }
      }
    }
    setCheckedErrors(errors);
    if (errors.size > 0) {
      playInvalidWord(profile.soundEnabled);
      vibrateWordError(hapticsEnabled);
      setShakeKey((k) => k + 1);
      setStatusMessage(
        `Found ${errors.size} ${errors.size === 1 ? 'letter' : 'letters'} to adjust (marked with ?).`
      );
    } else {
      playTileTap(profile.soundEnabled);
      setStatusMessage('Every letter entered so far is right on track.');
    }
  };

  const handleRevealHint = async () => {
    if (isComplete) return;
    if (profile.hintCredits <= 0) {
      setShowAdModal(true);
      return;
    }

    // Reveal the currently selected cell if wrong/empty, otherwise first unsolved cell
    let targetCell: { row: number; col: number } | null = null;
    const selKey = coordKey(selectedCell.row, selectedCell.col);
    const selAns = parsed.def.grid[selectedCell.row][selectedCell.col];
    if (selAns !== '#' && values[selKey] !== selAns) {
      targetCell = selectedCell;
    } else {
      outer: for (let r = 0; r < parsed.size; r++) {
        for (let c = 0; c < parsed.size; c++) {
          const ch = parsed.def.grid[r][c];
          if (ch !== '#' && values[coordKey(r, c)] !== ch) {
            targetCell = { row: r, col: c };
            break outer;
          }
        }
      }
    }

    if (!targetCell) return;

    const spent = await spendHintCredit();
    if (!spent) {
      setShowAdModal(true);
      return;
    }

    const tKey = coordKey(targetCell.row, targetCell.col);
    const correctLetter = parsed.def.grid[targetCell.row][targetCell.col];
    const nextValues = { ...values, [tKey]: correctLetter };

    setValues(nextValues);
    setRevealedCells((prev) => new Set(prev).add(tKey));
    setCheckedErrors((prev) => {
      const copy = new Set(prev);
      copy.delete(tKey);
      return copy;
    });
    setSelectedCell(targetCell);
    setHintsUsed((h) => h + 1);
    playHintReveal(profile.soundEnabled);
    vibrateHintReveal(hapticsEnabled);
    setStatusMessage(`Revealed letter "${correctLetter}" using 1 Smart Hint.`);

    checkSolvedWordsAndVictory(nextValues);
  };

  const handleRevealSingleLetter = useCallback(
    (method: 'delay' | 'points'): boolean => {
      if (isComplete) return false;
      let targetCell: { row: number; col: number } | null = null;
      const selKey = coordKey(selectedCell.row, selectedCell.col);
      const selAns = parsed.def.grid[selectedCell.row][selectedCell.col];
      if (selAns !== '#' && values[selKey] !== selAns) {
        targetCell = selectedCell;
      } else {
        outer: for (let r = 0; r < parsed.size; r++) {
          for (let c = 0; c < parsed.size; c++) {
            const ch = parsed.def.grid[r][c];
            if (ch !== '#' && values[coordKey(r, c)] !== ch) {
              targetCell = { row: r, col: c };
              break outer;
            }
          }
        }
      }
      if (!targetCell) return false;

      const tKey = coordKey(targetCell.row, targetCell.col);
      const correctLetter = parsed.def.grid[targetCell.row][targetCell.col];
      const nextValues = { ...values, [tKey]: correctLetter };

      setValues(nextValues);
      setRevealedCells((prev) => new Set(prev).add(tKey));
      setCheckedErrors((prev) => {
        const copy = new Set(prev);
        copy.delete(tKey);
        return copy;
      });
      setPoppedCells(new Set([tKey]));
      window.setTimeout(() => setPoppedCells(new Set()), 450);
      setSelectedCell(targetCell);
      setHintsUsed((h) => h + 1);
      playHintReveal(profile.soundEnabled);
      vibrateHintReveal(hapticsEnabled);
      setStatusMessage(
        `Revealed letter "${correctLetter}"${
          method === 'points' ? ' (-50 pts).' : ' (free timed hint).'
        }`
      );
      checkSolvedWordsAndVictory(nextValues);
      return true;
    },
    [
      isComplete,
      selectedCell,
      parsed,
      values,
      profile.soundEnabled,
      hapticsEnabled,
      checkSolvedWordsAndVictory,
    ]
  );

  const solvedWordCount = useMemo(() => {
    const all = [...parsed.across, ...parsed.down];
    return all.filter((entry) =>
      entry.cells.every(
        (c, idx) => values[coordKey(c.row, c.col)] === entry.answer[idx]
      )
    ).length;
  }, [parsed, values]);

  const totalWords = parsed.across.length + parsed.down.length;

  return (
    <div className="space-y-6">
      <ConfettiBurst triggerKey={confettiTrigger} />

      {/* Puzzle Selector Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E2E6E1] dark:border-[#223040]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#52606D] dark:text-[#94A3B8]">
            <span>Mini Crossword · 5×5</span>
            <span aria-hidden="true">·</span>
            <span>{parsed.def.difficulty}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {solvedWordCount}/{totalWords} clues
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
            {parsed.def.title}
          </h2>
          <p className="text-sm text-[#52606D] dark:text-[#94A3B8]">
            {parsed.def.subtitle}
          </p>
        </div>

        {/* Puzzle Picker Buttons */}
        <div
          role="group"
          aria-label="Choose a Mini Crossword puzzle"
          className="flex flex-wrap items-center gap-1.5"
        >
          {CROSSWORD_PUZZLES.map((p, idx) => {
            const active = idx === puzzleIndex;
            const done = completedIdSet.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPuzzle(idx)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
                  active
                    ? 'bg-[#176B52] dark:bg-[#2EB88A] text-white dark:text-[#0B1410] border-[#176B52] dark:border-[#2EB88A]'
                    : 'bg-white dark:bg-[#161F2A] text-[#52606D] dark:text-[#CBD5E1] border-[#D4DDD6] dark:border-[#263342] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38]'
                }`}
              >
                <span>#{idx + 1}</span>
                {done && (
                  <Check
                    className="w-3.5 h-3.5"
                    aria-label="Completed"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Split: Crossword Grid + Clues */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Active Clue Bar + 5x5 Grid + Touch Keyboard */}
        <div className="lg:col-span-7 space-y-4">
          {/* Active Clue Callout */}
          <div
            key={`cw-status-${shakeKey}`}
            className={`rounded-xl px-4 py-3 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-1 ${
              shakeKey > 0 ? 'lexiloom-shake' : ''
            }`}
          >
            {activeEntry ? (
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-xs font-bold text-[#176B52] dark:text-[#2EB88A] whitespace-nowrap shrink-0">
                  {activeEntry.number}{' '}
                  {activeEntry.direction === 'across' ? 'Across' : 'Down'}
                </span>
                <p className="text-sm font-medium text-[#131B23] dark:text-[#F1F5F9]">
                  {activeEntry.clue}
                </p>
              </div>
            ) : null}
            <p className="text-xs text-[#52606D] dark:text-[#94A3B8]" aria-live="polite">
              {statusMessage}
            </p>
          </div>

          {/* 5x5 Editorial Crossword Grid */}
          <div className="relative rounded-2xl p-4 sm:p-6 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] flex justify-center">
            <ConfettiBurst triggerKey={confettiTrigger} scope="board" />
            <div
              role="grid"
              aria-label={`${parsed.def.title} 5 by 5 mini crossword`}
              className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full max-w-[380px]"
            >
              {parsed.def.grid.map((rowStr, rIdx) =>
                rowStr.split('').map((ch, cIdx) => {
                  const key = coordKey(rIdx, cIdx);
                  if (ch === '#') {
                    return (
                      <div
                        key={key}
                        aria-hidden="true"
                        className="aspect-square rounded-lg bg-[#1A2430] dark:bg-[#080D13]"
                      />
                    );
                  }

                  const num = parsed.cellNumbers[key];
                  const val = values[key] ?? '';
                  const isSel =
                    selectedCell.row === rIdx && selectedCell.col === cIdx;
                  const inWord = activeWordKeys.has(key);
                  const isErr = checkedErrors.has(key);
                  const isRev = revealedCells.has(key);
                  const isPop = poppedCells.has(key);

                  let cellClasses =
                    'bg-[#F6F7F5] dark:bg-[#0F1721] text-[#131B23] dark:text-[#F1F5F9] border-[#D4DDD6] dark:border-[#2A3849]';
                  if (isSel) {
                    cellClasses =
                      'bg-[#176B52] dark:bg-[#2EB88A] text-white dark:text-[#0B1410] border-[#176B52] dark:border-[#2EB88A] ring-2 ring-[#176B52]/30 dark:ring-[#2EB88A]/40';
                  } else if (isErr) {
                    cellClasses =
                      'bg-[#FEF2F2] dark:bg-[#3A161A] text-[#B91C1C] dark:text-[#FCA5A5] border-[#DC2626] dark:border-[#EF4444]';
                  } else if (inWord) {
                    cellClasses =
                      'bg-[#E4F2EC] dark:bg-[#15392E] text-[#11533F] dark:text-[#A7F3D0] border-[#9CD0BC] dark:border-[#245E4A]';
                  }

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleCellClick(rIdx, cIdx)}
                      aria-label={`Row ${rIdx + 1}, Column ${cIdx + 1}${
                        num ? `, clue ${num}` : ''
                      }, ${val ? `letter ${val}` : 'empty'}${
                        isErr ? ', needs correction' : ''
                      }`}
                      className={`relative aspect-square rounded-lg border font-bold flex items-center justify-center transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52] ${
                        profile.largePrint ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                      } ${cellClasses} ${isPop ? 'lexiloom-tile-pop' : ''}`}
                    >
                      {num !== undefined && (
                        <span
                          aria-hidden="true"
                          className={`absolute top-1 left-1.5 font-mono text-[10px] leading-none font-semibold ${
                            isSel
                              ? 'text-white/85 dark:text-[#0B1410]/85'
                              : 'text-[#52606D] dark:text-[#94A3B8]'
                          }`}
                        >
                          {num}
                        </span>
                      )}
                      <span>{val}</span>
                      {isErr && !isSel && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-1 right-1.5 text-[10px] font-bold leading-none"
                        >
                          ?
                        </span>
                      )}
                      {isRev && !isSel && !isErr && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-1 right-1.5 text-[9px] font-bold leading-none opacity-65"
                        >
                          ★
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Accessible On-Screen Keyboard (ideal for mobile/tablet & casual clicking) */}
          <div className="rounded-2xl p-3 sm:p-4 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-1.5">
            {KEYBOARD_ROWS.map((row, idx) => (
              <div key={idx} className="flex justify-center gap-1 sm:gap-1.5">
                {row.map((key) => {
                  const isBack = key === 'BACK';
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={isComplete}
                      onClick={() =>
                        isBack ? handleBackspace() : handleLetterInput(key)
                      }
                      aria-label={isBack ? 'Backspace' : `Type letter ${key}`}
                      className={`h-11 rounded-lg font-mono text-xs sm:text-sm font-bold border border-[#D4DDD6] dark:border-[#2A3849] bg-[#F6F7F5] dark:bg-[#0F1721] hover:bg-[#E7ECE8] dark:hover:bg-[#1E2A38] text-[#131B23] dark:text-[#F1F5F9] active:scale-95 transition-transform disabled:opacity-50 ${
                        isBack ? 'px-3 sm:px-4' : 'flex-1 max-w-[40px]'
                      }`}
                    >
                      {isBack ? '⌫' : key}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Controls + Across & Down Clues */}
        <aside className="lg:col-span-5 space-y-6">
          {/* Tools & Smart Hints */}
          <div className="rounded-2xl p-5 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-editorial text-lg font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                  Crossword Assist
                </h3>
                <p className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                  Hint balance:{' '}
                  <strong className="font-mono tabular-nums text-[#131B23] dark:text-[#F1F5F9]">
                    {profile.hintCredits}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => resetBoard(parsed)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9] hover:bg-[#F1F4F1] dark:hover:bg-[#1E2A38] transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isComplete}
                onClick={() => void handleRevealHint()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] disabled:opacity-50 text-white dark:text-[#0B1410] text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
                Reveal (-1)
              </button>
              <button
                type="button"
                disabled={isComplete}
                onClick={handleCheckBoard}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] bg-[#F6F7F5] dark:bg-[#0F1721] hover:bg-[#E9EDE8] dark:hover:bg-[#1E2A38] disabled:opacity-50 text-[#131B23] dark:text-[#F1F5F9] text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                Check
              </button>
              <button
                type="button"
                onClick={() => setShowAdModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] bg-[#F6F7F5] dark:bg-[#0F1721] hover:bg-[#E9EDE8] dark:hover:bg-[#1E2A38] text-[#131B23] dark:text-[#F1F5F9] text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <PlayCircle
                  className="w-3.5 h-3.5 text-[#176B52] dark:text-[#2EB88A]"
                  aria-hidden="true"
                />
                Ad (+2)
              </button>
            </div>

            <LetterRevealHintBar
              disabled={isComplete}
              resetKey={parsed.def.id}
              onRevealLetter={handleRevealSingleLetter}
            />
          </div>

          {/* Across & Down Clue Lists */}
          <div className="rounded-2xl p-5 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-5">
            {(['across', 'down'] as const).map((dir) => {
              const entries = dir === 'across' ? parsed.across : parsed.down;
              return (
                <div key={dir} className="space-y-2.5">
                  <h3 className="font-editorial text-base font-semibold text-[#131B23] dark:text-[#F1F5F9] pb-1.5 border-b border-[#ECEFEA] dark:border-[#223040]">
                    {dir === 'across' ? 'Across' : 'Down'}
                  </h3>
                  <ul className="space-y-1">
                    {entries.map((entry) => {
                      const isCurrent =
                        activeEntry?.direction === entry.direction &&
                        activeEntry?.number === entry.number;
                      const isSolved = entry.cells.every(
                        (c, i) => values[coordKey(c.row, c.col)] === entry.answer[i]
                      );
                      return (
                        <li
                          key={`${dir}-${entry.number}`}
                          className="flex items-start gap-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              vibrateTileTap(hapticsEnabled);
                              setDirection(dir);
                              setSelectedCell(entry.cells[0]);
                            }}
                            className={`flex-1 text-left px-3 py-2 rounded-lg text-sm flex items-start gap-2.5 transition-colors ${
                              isCurrent
                                ? 'bg-[#E4F2EC] dark:bg-[#15392E] text-[#11533F] dark:text-[#D1FAE5]'
                                : 'text-[#52606D] dark:text-[#CBD5E1] hover:bg-[#F6F7F5] dark:hover:bg-[#1E2A38]'
                            }`}
                          >
                            <span className="font-mono text-xs font-bold mt-0.5 shrink-0 w-4">
                              {entry.number}
                            </span>
                            <span
                              className={`flex-1 leading-snug ${
                                isSolved ? 'line-through opacity-65' : ''
                              }`}
                            >
                              {entry.clue}
                            </span>
                            {isSolved && (
                              <Check
                                className="w-4 h-4 text-[#176B52] dark:text-[#2EB88A] shrink-0 mt-0.5"
                                aria-label="Solved"
                              />
                            )}
                          </button>
                          {isSolved && (
                            <span className="pt-2 shrink-0">
                              <DictionaryTooltip
                                word={entry.answer}
                                fallbackClue={entry.clue}
                                align="right"
                              />
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
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
          setStatusMessage('Reward claimed! +2 Smart Hint credits added.');
        }}
      />

      {/* Victory Summary Modal */}
      {isComplete && victoryScore !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cw-victory-title"
        >
          <div className="lexiloom-modal-in w-full max-w-md rounded-2xl bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] p-7 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#176B52] dark:text-[#2EB88A]">
                <Trophy className="w-4 h-4" aria-hidden="true" />
                <span>Mini Crossword Complete</span>
              </div>
              <h3
                id="cw-victory-title"
                className="font-editorial text-2xl font-bold text-[#131B23] dark:text-[#F1F5F9]"
              >
                {parsed.def.title} solved!
              </h3>
              <p className="text-sm text-[#52606D] dark:text-[#94A3B8]">
                Every intersecting Across and Down word is locked in and synced to your profile.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 py-4 border-y border-[#E2E6E1] dark:border-[#223040]">
              <div>
                <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">Score</div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
                  {victoryScore}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">Time</div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
                  {formatDuration(elapsedSeconds)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">Hints</div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
                  {hintsUsed}
                </div>
              </div>
            </div>

            <ShareResultButton
              summary={{
                gameTitle: `Mini Crossword: ${parsed.def.title}`,
                subtitle: `${parsed.def.difficulty} · 5×5 Grid`,
                score: victoryScore,
                durationSeconds: elapsedSeconds,
                streakDays: profile.currentStreak,
                hintsUsed,
                wordsFound: totalWords,
                totalWords,
              }}
            />

            <WordEtymologyButton
              words={[...parsed.across, ...parsed.down].map((entry) => ({
                word: entry.answer,
                clue: entry.clue,
              }))}
              label="Definition & Etymology"
            />

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() =>
                  handleSelectPuzzle((puzzleIndex + 1) % CROSSWORD_PUZZLES.length)
                }
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#F1F4F1] dark:hover:bg-[#1E2A38] text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Next Crossword
              </button>
              <button
                type="button"
                onClick={() => {
                  setVictoryScore(null);
                  onGoToLeaderboard();
                }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#F1F4F1] dark:hover:bg-[#1E2A38] text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Leaderboard
              </button>
            </div>
            <button
              type="button"
              onClick={() => setVictoryScore(null)}
              className="w-full py-1.5 text-xs font-semibold text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9] transition-colors"
            >
              Review Completed Grid
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
