import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  Clock,
  Eye,
  Flame,
  HelpCircle,
  Lightbulb,
  Moon,
  PlayCircle,
  RotateCcw,
  Sun,
  Trophy,
  Type,
  Vibrate,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  DIFFICULTY_CONFIGS,
  type DifficultyLevel,
  type GeneratedPuzzle,
  type GridCoord,
  type PlacedWord,
} from '../data/wordThemes';
import { useGame } from '../context/GameContext';
import {
  playHintReveal,
  playInvalidWord,
  playRewardClaimed,
  playSelectionClear,
  playTileSweep,
  playTileTap,
  playVictoryFanfare,
  playWordFound,
} from '../lib/sound';
import {
  loadHapticsEnabled,
  saveHapticsEnabled,
  subscribeHapticsEnabled,
  vibrateHintReveal,
  vibrateTileSweep,
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
import { PuzzleStopwatch } from './PuzzleStopwatch';
import { PuzzleKeyboard, type PuzzleKeyState } from './PuzzleKeyboard';
import { WordEtymologyButton } from './WordEtymologyButton';

interface PuzzleWorkspaceProps {
  puzzle: GeneratedPuzzle;
  difficulty: DifficultyLevel;
  isArchiveMode?: boolean;
  onChangeDifficulty: (level: DifficultyLevel) => void;
  onReplayPuzzle: () => void;
  onGoToThemes: () => void;
  onOpenArchive: () => void;
  onReturnToToday?: () => void;
  onGoToLeaderboard: () => void;
  onOpenHowToPlay: () => void;
}

interface ActiveHintState {
  targetWord: string;
  tier: 1 | 2 | 3 | 4;
}

function coordKey(r: number, c: number): string {
  return `${r}-${c}`;
}

function computeStraightPath(
  start: GridCoord,
  end: GridCoord,
  gridSize: number
): GridCoord[] {
  const dr = end.row - start.row;
  const dc = end.col - start.col;
  if (dr === 0 && dc === 0) return [start];

  const absR = Math.abs(dr);
  const absC = Math.abs(dc);

  // Valid straight line: horizontal, vertical, or exact 45-degree diagonal
  if (dr !== 0 && dc !== 0 && absR !== absC) {
    // Snap to closest valid axis for forgiving touch/senior play
    const angle = Math.atan2(dr, dc);
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const stepR = Math.round(Math.sin(snapped));
    const stepC = Math.round(Math.cos(snapped));
    const steps = Math.max(absR, absC);
    const path: GridCoord[] = [];
    for (let i = 0; i <= steps; i++) {
      const nr = start.row + stepR * i;
      const nc = start.col + stepC * i;
      if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) break;
      path.push({ row: nr, col: nc });
    }
    return path;
  }

  const steps = Math.max(absR, absC);
  const stepR = dr === 0 ? 0 : dr / absR;
  const stepC = dc === 0 ? 0 : dc / absC;
  const path: GridCoord[] = [];
  for (let i = 0; i <= steps; i++) {
    path.push({ row: start.row + stepR * i, col: start.col + stepC * i });
  }
  return path;
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

const GET_HINT_SCORE_COST = 25;
const GET_HINT_COOLDOWN_SECONDS = 15;

function maskWord(word: string): string {
  if (word.length <= 2) return word;
  return `${word[0]} ${'_ '.repeat(word.length - 2)}${word[word.length - 1]}`;
}

function formatRevealedTargetWord(
  word: string,
  revealedIndices: number[]
): string {
  const revealedSet = new Set(revealedIndices);
  return word
    .split('')
    .map((ch, idx) => (revealedSet.has(idx) ? ch : '_'))
    .join(' ');
}

export const PuzzleWorkspace: React.FC<PuzzleWorkspaceProps> = ({
  puzzle,
  difficulty,
  isArchiveMode = false,
  onChangeDifficulty,
  onReplayPuzzle,
  onGoToThemes,
  onOpenArchive,
  onReturnToToday,
  onGoToLeaderboard,
  onOpenHowToPlay,
}) => {
  const {
    profile,
    updatePreferences,
    spendHintCredit,
    grantAdRewardHints,
    recordPuzzleCompletion,
    showTimer,
    setShowTimer,
    bestDailyTimeSeconds,
  } = useGame();

  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [clueMode, setClueMode] = useState<'clues' | 'words'>('clues');
  const [hintsUsedCount, setHintsUsedCount] = useState(0);
  const [activeHint, setActiveHint] = useState<ActiveHintState | null>(null);
  const [revealedLetterKeys, setRevealedLetterKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [revealedTargetPositions, setRevealedTargetPositions] = useState<
    Record<string, number[]>
  >({});
  const [targetHintWord, setTargetHintWord] = useState<string | null>(null);
  const [getHintCooldown, setGetHintCooldown] = useState(0);
  const [getHintPenalty, setGetHintPenalty] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [typedWord, setTypedWord] = useState('');
  const [probedPresentLetters, setProbedPresentLetters] = useState<Set<string>>(
    () => new Set()
  );
  const [probedAbsentLetters, setProbedAbsentLetters] = useState<Set<string>>(
    () => new Set()
  );
  const [keyboardCollapsed, setKeyboardCollapsed] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string>(
    'Drag across letters, tap start & end tiles, or use the on-screen keyboard.'
  );
  const [showAdModal, setShowAdModal] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() =>
    loadHapticsEnabled()
  );
  const [recentPopOrder, setRecentPopOrder] = useState<Map<string, number>>(
    () => new Map()
  );
  const [invalidShakeKey, setInvalidShakeKey] = useState(0);
  const [summaryData, setSummaryData] = useState<{
    score: number;
    durationSeconds: number;
    hintsUsed: number;
    streakUpdated: boolean;
    newStreak: number;
  } | null>(null);

  // Drag, 2-tap & keyboard selection state
  const [isDragging, setIsDragging] = useState(false);
  const [anchorCoord, setAnchorCoord] = useState<GridCoord | null>(null);
  const [selectionPath, setSelectionPath] = useState<GridCoord[]>([]);
  const [tapStartCoord, setTapStartCoord] = useState<GridCoord | null>(null);
  const [focusedCoord, setFocusedCoord] = useState<GridCoord>({ row: 0, col: 0 });
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const hasRecordedRef = useRef(false);
  const lastSweepKeyRef = useRef<string>('');
  const attemptKeyRef = useRef<string>(`${puzzle.id}-${Date.now()}`);
  const modeCategory =
    puzzle.mode === 'daily' ? 'Daily Word Search' : 'Themes & Archive';

  useEffect(() => subscribeHapticsEnabled(setHapticsEnabled), []);

  // Reset board cleanly whenever puzzle changes
  useEffect(() => {
    setFoundWords([]);
    setHintsUsedCount(0);
    setActiveHint(null);
    setRevealedLetterKeys(new Set());
    setRevealedTargetPositions({});
    setTargetHintWord(null);
    setGetHintCooldown(0);
    setGetHintPenalty(0);
    setElapsedSeconds(0);
    setTypedWord('');
    setProbedPresentLetters(new Set());
    setProbedAbsentLetters(new Set());
    setSummaryData(null);
    setSelectionPath([]);
    setAnchorCoord(null);
    setTapStartCoord(null);
    setIsDragging(false);
    hasRecordedRef.current = false;
    attemptKeyRef.current = `${puzzle.id}-${Date.now()}`;
    setFeedbackMessage(
      'Drag across letters, tap start & end tiles, or use the on-screen keyboard.'
    );
  }, [puzzle]);

  // Puzzle completion flag & stopwatch tick callback
  const isComplete =
    puzzle.placedWords.length > 0 &&
    foundWords.length === puzzle.placedWords.length;

  // Tick down the Get Hint cooldown timer once per second
  useEffect(() => {
    if (getHintCooldown <= 0 || isComplete) return;
    const timerId = window.setTimeout(() => {
      setGetHintCooldown((sec) => Math.max(0, sec - 1));
    }, 1000);
    return () => window.clearTimeout(timerId);
  }, [getHintCooldown, isComplete]);

  const handleStopwatchTick = useCallback(() => {
    setElapsedSeconds((s) => s + 1);
  }, []);

  // Map found cell keys for fast O(1) tile styling
  const foundCellKeys = useMemo(() => {
    const set = new Set<string>();
    for (const pw of puzzle.placedWords) {
      if (foundWords.includes(pw.word)) {
        for (const coord of pw.coords) {
          set.add(coordKey(coord.row, coord.col));
        }
      }
    }
    return set;
  }, [puzzle.placedWords, foundWords]);

  const activeSelectionKeys = useMemo(() => {
    const set = new Set<string>();
    for (const c of selectionPath) {
      set.add(coordKey(c.row, c.col));
    }
    return set;
  }, [selectionPath]);

  const activeHintWordObj: PlacedWord | null = useMemo(() => {
    if (!activeHint) return null;
    return (
      puzzle.placedWords.find((w) => w.word === activeHint.targetWord) || null
    );
  }, [activeHint, puzzle.placedWords]);

  const hintTileKeys = useMemo(() => {
    const set = new Set<string>(revealedLetterKeys);
    if (activeHint && activeHintWordObj) {
      if (activeHint.tier === 3) {
        set.add(coordKey(activeHintWordObj.startRow, activeHintWordObj.startCol));
      } else if (activeHint.tier === 4) {
        for (const c of activeHintWordObj.coords) {
          set.add(coordKey(c.row, c.col));
        }
      }
    }
    return set;
  }, [activeHint, activeHintWordObj, revealedLetterKeys]);

  const diffCfg = DIFFICULTY_CONFIGS[puzzle.difficulty];

  const liveScore = useMemo(() => {
    const baseWordPoints =
      foundWords.length * (clueMode === 'clues' ? 180 : 140);
    const speedBonus = Math.max(0, 300 - elapsedSeconds);
    const smartHintCount = Math.max(
      0,
      hintsUsedCount - Math.round(getHintPenalty / GET_HINT_SCORE_COST)
    );
    const hintPenalty = smartHintCount * 40 + getHintPenalty;
    const raw = Math.max(
      0,
      baseWordPoints + (isComplete ? speedBonus : 0) - hintPenalty
    );
    return Math.round(raw * diffCfg.scoreMultiplier);
  }, [
    foundWords.length,
    clueMode,
    elapsedSeconds,
    hintsUsedCount,
    getHintPenalty,
    isComplete,
    diffCfg.scoreMultiplier,
  ]);

  // Trigger completion flow, confetti, sound & victory haptics once all words are discovered
  useEffect(() => {
    if (!isComplete || hasRecordedRef.current) return;
    hasRecordedRef.current = true;
    playVictoryFanfare(profile.soundEnabled);
    vibrateVictory(hapticsEnabled);
    setConfettiTrigger((k) => k + 1);

    const smartHintCount = Math.max(
      0,
      hintsUsedCount - Math.round(getHintPenalty / GET_HINT_SCORE_COST)
    );
    const rawScore = Math.max(
      100,
      puzzle.placedWords.length * (clueMode === 'clues' ? 180 : 140) +
        Math.max(0, 320 - elapsedSeconds) -
        smartHintCount * 35 -
        getHintPenalty
    );
    const finalScore = Math.round(rawScore * diffCfg.scoreMultiplier);
    recordPuzzleOutcome(attemptKeyRef.current, puzzle.id, modeCategory, 'won');

    void recordPuzzleCompletion({
      puzzleId: puzzle.id,
      mode: puzzle.mode,
      themeId: puzzle.themeId,
      themeName: `${puzzle.title} (${diffCfg.label})`.slice(0, 60),
      puzzleWord: puzzle.placedWords[0]?.word,
      puzzleWords: puzzle.placedWords.map((pw) => pw.word),
      score: finalScore,
      durationSeconds: elapsedSeconds,
      hintsUsed: hintsUsedCount,
      wordsFound: puzzle.placedWords.length,
    }).then((res) => {
      setSummaryData({
        score: finalScore,
        durationSeconds: elapsedSeconds,
        hintsUsed: hintsUsedCount,
        streakUpdated: res.streakUpdated,
        newStreak: res.newStreak,
      });
    });
  }, [
    isComplete,
    puzzle,
    clueMode,
    elapsedSeconds,
    hintsUsedCount,
    getHintPenalty,
    modeCategory,
    profile.soundEnabled,
    hapticsEnabled,
    recordPuzzleCompletion,
    diffCfg.scoreMultiplier,
    diffCfg.label,
  ]);

  const evaluatePath = useCallback(
    (path: GridCoord[]) => {
      if (path.length < 2) return;
      const forward = path.map((c) => puzzle.grid[c.row][c.col]).join('');
      const backward = forward.split('').reverse().join('');

      const match = puzzle.placedWords.find(
        (pw) =>
          !foundWords.includes(pw.word) &&
          (pw.word === forward || pw.word === backward)
      );

      if (match) {
        playWordFound(profile.soundEnabled);
        vibrateWordSuccess(hapticsEnabled);
        setFoundWords((prev) => [...prev, match.word]);
        const popMap = new Map<string, number>();
        match.coords.forEach((coord, idx) => {
          popMap.set(coordKey(coord.row, coord.col), idx);
        });
        setRecentPopOrder(popMap);
        window.setTimeout(() => {
          setRecentPopOrder((current) => (current === popMap ? new Map() : current));
        }, 550);
        setFeedbackMessage(`Found "${match.word}" — ${match.clue}.`);
        if (activeHint?.targetWord === match.word) {
          setActiveHint(null);
        }
      } else {
        playInvalidWord(profile.soundEnabled);
        vibrateWordError(hapticsEnabled);
        setInvalidShakeKey((k) => k + 1);

        // Record probed letter states for the on-screen keyboard
        const remainingTargets = puzzle.placedWords.filter(
          (pw) => !foundWords.includes(pw.word)
        );
        const remainingLetters = new Set<string>();
        for (const pw of remainingTargets) {
          for (const ch of pw.word) remainingLetters.add(ch);
        }
        const nextPresent = new Set(probedPresentLetters);
        const nextAbsent = new Set(probedAbsentLetters);
        for (const ch of forward) {
          if (remainingLetters.has(ch)) {
            nextPresent.add(ch);
          } else {
            nextAbsent.add(ch);
          }
        }
        setProbedPresentLetters(nextPresent);
        setProbedAbsentLetters(nextAbsent);

        setFeedbackMessage(
          `"${forward}" is not on today’s list. Try another line or check highlighted keys below.`
        );
      }
    },
    [
      puzzle,
      foundWords,
      profile.soundEnabled,
      hapticsEnabled,
      activeHint,
      probedPresentLetters,
      probedAbsentLetters,
    ]
  );

  // Compute A–Z key states (correct / present / absent / idle) for the on-screen keyboard
  const keyboardStates = useMemo<Record<string, PuzzleKeyState>>(() => {
    const gridLetters = new Set<string>();
    for (const row of puzzle.grid) {
      for (const ch of row) gridLetters.add(ch);
    }

    const foundLetters = new Set<string>();
    for (const word of foundWords) {
      for (const ch of word) foundLetters.add(ch);
    }

    const remainingTargetLetters = new Set<string>();
    for (const pw of puzzle.placedWords) {
      if (!foundWords.includes(pw.word)) {
        for (const ch of pw.word) remainingTargetLetters.add(ch);
      }
    }

    const hintedLetters = new Set<string>();
    hintTileKeys.forEach((coordStr) => {
      const [rStr, cStr] = coordStr.split('-');
      const r = Number(rStr);
      const c = Number(cStr);
      const ch = puzzle.grid[r]?.[c];
      if (ch) hintedLetters.add(ch);
    });

    const selectedLetters = new Set<string>();
    for (const c of selectionPath) {
      const ch = puzzle.grid[c.row]?.[c.col];
      if (ch) selectedLetters.add(ch);
    }

    const states: Record<string, PuzzleKeyState> = {};
    for (let code = 65; code <= 90; code++) {
      const ch = String.fromCharCode(code);
      if (
        !gridLetters.has(ch) ||
        (probedAbsentLetters.has(ch) &&
          !remainingTargetLetters.has(ch) &&
          !foundLetters.has(ch))
      ) {
        states[ch] = 'absent';
      } else if (foundLetters.has(ch)) {
        states[ch] = 'correct';
      } else if (
        hintedLetters.has(ch) ||
        probedPresentLetters.has(ch) ||
        selectedLetters.has(ch)
      ) {
        states[ch] = 'present';
      } else {
        states[ch] = 'idle';
      }
    }
    return states;
  }, [
    puzzle.grid,
    puzzle.placedWords,
    foundWords,
    hintTileKeys,
    selectionPath,
    probedPresentLetters,
    probedAbsentLetters,
  ]);

  const handleSubmitTypedWord = useCallback(() => {
    if (isComplete) return;
    const candidate = typedWord.trim().toUpperCase();
    if (candidate.length < 2) {
      playInvalidWord(profile.soundEnabled);
      vibrateWordError(hapticsEnabled);
      setInvalidShakeKey((k) => k + 1);
      setFeedbackMessage('Type at least 2 letters before pressing Enter.');
      return;
    }

    recordPuzzleAttempt(attemptKeyRef.current, puzzle.id, modeCategory);
    const match = puzzle.placedWords.find(
      (pw) => !foundWords.includes(pw.word) && pw.word === candidate
    );

    if (match) {
      playWordFound(profile.soundEnabled);
      vibrateWordSuccess(hapticsEnabled);
      setFoundWords((prev) => [...prev, match.word]);
      const popMap = new Map<string, number>();
      match.coords.forEach((coord, idx) => {
        popMap.set(coordKey(coord.row, coord.col), idx);
      });
      setRecentPopOrder(popMap);
      window.setTimeout(() => {
        setRecentPopOrder((current) =>
          current === popMap ? new Map() : current
        );
      }, 550);
      setFeedbackMessage(`Found "${match.word}" — ${match.clue}.`);
      if (activeHint?.targetWord === match.word) {
        setActiveHint(null);
      }
      setTypedWord('');
    } else {
      playInvalidWord(profile.soundEnabled);
      vibrateWordError(hapticsEnabled);
      setInvalidShakeKey((k) => k + 1);

      const remainingTargets = puzzle.placedWords.filter(
        (pw) => !foundWords.includes(pw.word)
      );
      const remainingLetters = new Set<string>();
      for (const pw of remainingTargets) {
        for (const ch of pw.word) remainingLetters.add(ch);
      }

      const nextPresent = new Set(probedPresentLetters);
      const nextAbsent = new Set(probedAbsentLetters);
      let presentHits = 0;
      const seen = new Set<string>();

      for (const ch of candidate) {
        if (seen.has(ch)) continue;
        seen.add(ch);
        if (remainingLetters.has(ch)) {
          nextPresent.add(ch);
          presentHits += 1;
        } else {
          nextAbsent.add(ch);
        }
      }

      setProbedPresentLetters(nextPresent);
      setProbedAbsentLetters(nextAbsent);
      setTypedWord('');
      setFeedbackMessage(
        `"${candidate}" is not a remaining target word (${presentHits} ${
          presentHits === 1 ? 'letter' : 'letters'
        } marked present on the keyboard).`
      );
    }
  }, [
    isComplete,
    typedWord,
    profile.soundEnabled,
    hapticsEnabled,
    puzzle.id,
    puzzle.placedWords,
    modeCategory,
    foundWords,
    activeHint,
    probedPresentLetters,
    probedAbsentLetters,
  ]);

  const handleOnScreenKeyPress = useCallback(
    (key: string) => {
      if (isComplete) return;
      if (key === 'ENTER') {
        handleSubmitTypedWord();
        return;
      }
      if (key === 'BACK') {
        if (typedWord.length > 0) {
          playTileTap(profile.soundEnabled);
          vibrateTileTap(hapticsEnabled);
          setTypedWord((prev) => prev.slice(0, -1));
        }
        return;
      }
      if (/^[A-Z]$/.test(key) && typedWord.length < 12) {
        recordPuzzleAttempt(attemptKeyRef.current, puzzle.id, modeCategory);
        playTileTap(profile.soundEnabled);
        vibrateTileTap(hapticsEnabled);
        setTypedWord((prev) => prev + key);
      }
    },
    [
      isComplete,
      handleSubmitTypedWord,
      typedWord.length,
      profile.soundEnabled,
      hapticsEnabled,
      puzzle.id,
      modeCategory,
    ]
  );

  // Pointer drag handlers
  const handleTilePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    row: number,
    col: number
  ) => {
    if (isComplete) return;
    e.preventDefault();
    recordPuzzleAttempt(attemptKeyRef.current, puzzle.id, modeCategory);
    playTileTap(profile.soundEnabled);
    vibrateTileTap(hapticsEnabled);
    lastSweepKeyRef.current = coordKey(row, col);
    setIsDragging(true);
    setAnchorCoord({ row, col });
    setSelectionPath([{ row, col }]);
  };

  const handleGridPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !anchorCoord || isComplete) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const tileBtn = el?.closest('[data-row][data-col]') as HTMLElement | null;
    if (!tileBtn) return;

    const r = Number(tileBtn.dataset.row);
    const c = Number(tileBtn.dataset.col);
    if (!Number.isFinite(r) || !Number.isFinite(c)) return;

    const nextPath = computeStraightPath(
      anchorCoord,
      { row: r, col: c },
      puzzle.size
    );
    const tip = nextPath[nextPath.length - 1];
    const tipKey = tip ? coordKey(tip.row, tip.col) : '';
    if (tipKey && tipKey !== lastSweepKeyRef.current) {
      lastSweepKeyRef.current = tipKey;
      playTileSweep(profile.soundEnabled, nextPath.length - 1);
      vibrateTileSweep(hapticsEnabled);
    }
    setSelectionPath(nextPath);
  };

  const finalizeDragOrTap = useCallback(() => {
    if (!isDragging || !anchorCoord) return;
    setIsDragging(false);

    if (selectionPath.length >= 2) {
      // Completed a drag selection
      evaluatePath(selectionPath);
      setTapStartCoord(null);
      setSelectionPath([]);
      setAnchorCoord(null);
      return;
    }

    // Single tile tap -> support accessible 2-tap start/end word tracing!
    const clicked = anchorCoord;
    if (!tapStartCoord) {
      setTapStartCoord(clicked);
      setSelectionPath([clicked]);
      setFeedbackMessage(
        `Start letter "${puzzle.grid[clicked.row][clicked.col]}" selected. Tap the ending letter of the word.`
      );
    } else if (
      tapStartCoord.row === clicked.row &&
      tapStartCoord.col === clicked.col
    ) {
      playSelectionClear(profile.soundEnabled);
      vibrateTileTap(hapticsEnabled);
      setTapStartCoord(null);
      setSelectionPath([]);
      setFeedbackMessage('Selection cleared.');
    } else {
      const path = computeStraightPath(tapStartCoord, clicked, puzzle.size);
      evaluatePath(path);
      setTapStartCoord(null);
      setSelectionPath([]);
    }
    setAnchorCoord(null);
  }, [
    isDragging,
    anchorCoord,
    selectionPath,
    tapStartCoord,
    evaluatePath,
    puzzle.grid,
    puzzle.size,
    profile.soundEnabled,
    hapticsEnabled,
  ]);

  useEffect(() => {
    if (!isDragging) return;
    const onWindowUp = () => finalizeDragOrTap();
    window.addEventListener('pointerup', onWindowUp);
    window.addEventListener('pointercancel', onWindowUp);
    return () => {
      window.removeEventListener('pointerup', onWindowUp);
      window.removeEventListener('pointercancel', onWindowUp);
    };
  }, [isDragging, finalizeDragOrTap]);

  // 4-Tier Smart Hint Handler
  const handleUseSmartHint = useCallback(async () => {
    if (isComplete) return;
    const remaining = puzzle.placedWords.filter(
      (w) => !foundWords.includes(w.word)
    );
    if (remaining.length === 0) return;

    if (profile.hintCredits <= 0) {
      setShowAdModal(true);
      return;
    }

    const spent = await spendHintCredit();
    if (!spent) {
      setShowAdModal(true);
      return;
    }

    playHintReveal(profile.soundEnabled);
    vibrateHintReveal(hapticsEnabled);
    setHintsUsedCount((c) => c + 1);

    if (activeHint && remaining.some((r) => r.word === activeHint.targetWord)) {
      const nextTier = Math.min(4, activeHint.tier + 1) as 1 | 2 | 3 | 4;
      setActiveHint({ targetWord: activeHint.targetWord, tier: nextTier });
    } else {
      setActiveHint({ targetWord: remaining[0].word, tier: 1 });
    }
  }, [
    isComplete,
    puzzle.placedWords,
    foundWords,
    profile.hintCredits,
    profile.soundEnabled,
    spendHintCredit,
    hapticsEnabled,
    activeHint,
  ]);

  // Reveal a single unrevealed letter tile on the grid (via 3s delay or 50 points)
  const handleRevealSingleLetter = useCallback(
    (method: 'delay' | 'points'): boolean => {
      if (isComplete) return false;
      const remaining = puzzle.placedWords.filter(
        (pw) => !foundWords.includes(pw.word)
      );
      if (remaining.length === 0) return false;

      // Prefer the current activeHint word if any, otherwise first unfound word
      const prioritized = activeHint
        ? [
            ...remaining.filter((r) => r.word === activeHint.targetWord),
            ...remaining.filter((r) => r.word !== activeHint.targetWord),
          ]
        : remaining;

      let chosen: { row: number; col: number; letter: string } | null = null;
      for (const pw of prioritized) {
        for (let i = 0; i < pw.coords.length; i++) {
          const c = pw.coords[i];
          const k = coordKey(c.row, c.col);
          if (!foundCellKeys.has(k) && !revealedLetterKeys.has(k)) {
            chosen = { row: c.row, col: c.col, letter: puzzle.grid[c.row][c.col] };
            break;
          }
        }
        if (chosen) break;
      }

      if (!chosen) {
        setFeedbackMessage('All remaining word letters are already highlighted on the board!');
        return false;
      }

      const key = coordKey(chosen.row, chosen.col);
      setRevealedLetterKeys((prev) => new Set(prev).add(key));
      setRecentPopOrder(new Map([[key, 0]]));
      window.setTimeout(() => setRecentPopOrder(new Map()), 450);

      playHintReveal(profile.soundEnabled);
      vibrateHintReveal(hapticsEnabled);
      setHintsUsedCount((c) => c + 1);
      setFeedbackMessage(
        `Revealed letter "${chosen.letter}" at Row ${chosen.row + 1}, Column ${
          chosen.col + 1
        }${method === 'points' ? ' (-50 pts).' : ' (free timed hint).'}`
      );
      return true;
    },
    [
      isComplete,
      puzzle.placedWords,
      puzzle.grid,
      foundWords,
      activeHint,
      foundCellKeys,
      revealedLetterKeys,
      profile.soundEnabled,
      hapticsEnabled,
    ]
  );

  // Target word currently prioritized for 'Get Hint'
  const activeTargetHintWordObj: PlacedWord | null = useMemo(() => {
    const remaining = puzzle.placedWords.filter(
      (pw) => !foundWords.includes(pw.word)
    );
    if (remaining.length === 0) return null;
    if (targetHintWord) {
      const matched = remaining.find((pw) => pw.word === targetHintWord);
      if (matched) return matched;
    }
    if (activeHint) {
      const matched = remaining.find((pw) => pw.word === activeHint.targetWord);
      if (matched) return matched;
    }
    return remaining[0];
  }, [puzzle.placedWords, foundWords, targetHintWord, activeHint]);

  const hasUnrevealedTargetLetters = useMemo(() => {
    const remaining = puzzle.placedWords.filter(
      (pw) => !foundWords.includes(pw.word)
    );
    return remaining.some((pw) => {
      const revealed = revealedTargetPositions[pw.word] || [];
      return revealed.length < pw.word.length;
    });
  }, [puzzle.placedWords, foundWords, revealedTargetPositions]);

  // 'Get Hint' button handler: reveals 1 correct letter in the target word, deducts score (-25 pts), and triggers 15s cooldown
  const handleGetTargetLetterHint = useCallback(() => {
    if (isComplete || getHintCooldown > 0) return;

    const remaining = puzzle.placedWords.filter(
      (pw) => !foundWords.includes(pw.word)
    );
    if (remaining.length === 0) return;

    // Pick the active target word if it still has unrevealed slots, otherwise pick next word with unrevealed slots
    const prioritized = activeTargetHintWordObj
      ? [
          activeTargetHintWordObj,
          ...remaining.filter((pw) => pw.word !== activeTargetHintWordObj.word),
        ]
      : remaining;

    let chosenWord: PlacedWord | null = null;
    let chosenIdx = -1;

    for (const pw of prioritized) {
      const alreadyRevealed = new Set(revealedTargetPositions[pw.word] || []);
      for (let i = 0; i < pw.word.length; i++) {
        if (!alreadyRevealed.has(i)) {
          chosenWord = pw;
          chosenIdx = i;
          break;
        }
      }
      if (chosenWord) break;
    }

    if (!chosenWord || chosenIdx < 0) {
      setFeedbackMessage(
        'Every letter of the remaining target words has already been revealed.'
      );
      return;
    }

    const letter = chosenWord.word[chosenIdx];
    const coord = chosenWord.coords[chosenIdx];
    const tileKey = coord ? coordKey(coord.row, coord.col) : null;

    setTargetHintWord(chosenWord.word);
    setRevealedTargetPositions((prev) => {
      const existing = prev[chosenWord.word] || [];
      if (existing.includes(chosenIdx)) return prev;
      return {
        ...prev,
        [chosenWord.word]: [...existing, chosenIdx].sort((a, b) => a - b),
      };
    });

    if (tileKey) {
      setRevealedLetterKeys((prev) => new Set(prev).add(tileKey));
      setRecentPopOrder(new Map([[tileKey, 0]]));
      window.setTimeout(() => setRecentPopOrder(new Map()), 450);
    }

    setProbedPresentLetters((prev) => new Set(prev).add(letter));
    setHintsUsedCount((c) => c + 1);
    setGetHintPenalty((p) => p + GET_HINT_SCORE_COST);
    setGetHintCooldown(GET_HINT_COOLDOWN_SECONDS);

    playHintReveal(profile.soundEnabled);
    vibrateHintReveal(hapticsEnabled);
    recordPuzzleAttempt(attemptKeyRef.current, puzzle.id, modeCategory);

    setFeedbackMessage(
      `Hint: Letter #${chosenIdx + 1} of the target word is "${letter}"${
        coord ? ` (Row ${coord.row + 1}, Col ${coord.col + 1})` : ''
      } · -${GET_HINT_SCORE_COST} pts · ${GET_HINT_COOLDOWN_SECONDS}s cooldown.`
    );
  }, [
    isComplete,
    getHintCooldown,
    puzzle.placedWords,
    puzzle.id,
    foundWords,
    activeTargetHintWordObj,
    revealedTargetPositions,
    profile.soundEnabled,
    hapticsEnabled,
    modeCategory,
  ]);

  // Focus helper for keyboard grid navigation
  const focusGridCell = useCallback((row: number, col: number) => {
    setFocusedCoord({ row, col });
    const btn = gridContainerRef.current?.querySelector<HTMLButtonElement>(
      `[data-row="${row}"][data-col="${col}"]`
    );
    btn?.focus();
  }, []);

  // Full keyboard navigation & word tracing on the letter grid
  const handleTileKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    row: number,
    col: number
  ) => {
    if (isComplete) return;

    let nextR = row;
    let nextC = col;
    let moved = false;

    if (e.key === 'ArrowUp') {
      nextR = Math.max(0, row - 1);
      moved = true;
    } else if (e.key === 'ArrowDown') {
      nextR = Math.min(puzzle.size - 1, row + 1);
      moved = true;
    } else if (e.key === 'ArrowLeft') {
      nextC = Math.max(0, col - 1);
      moved = true;
    } else if (e.key === 'ArrowRight') {
      nextC = Math.min(puzzle.size - 1, col + 1);
      moved = true;
    } else if (e.key === 'Home') {
      nextC = 0;
      moved = true;
    } else if (e.key === 'End') {
      nextC = puzzle.size - 1;
      moved = true;
    }

    if (moved) {
      e.preventDefault();
      focusGridCell(nextR, nextC);

      if (e.shiftKey && !tapStartCoord) {
        const anchor = { row, col };
        const path = computeStraightPath(
          anchor,
          { row: nextR, col: nextC },
          puzzle.size
        );
        setTapStartCoord(anchor);
        setSelectionPath(path);
        playTileSweep(profile.soundEnabled, path.length - 1);
        vibrateTileSweep(hapticsEnabled);
      } else if (tapStartCoord) {
        const path = computeStraightPath(
          tapStartCoord,
          { row: nextR, col: nextC },
          puzzle.size
        );
        setSelectionPath(path);
        playTileSweep(profile.soundEnabled, path.length - 1);
        vibrateTileSweep(hapticsEnabled);
      } else {
        vibrateTileSweep(hapticsEnabled);
      }
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const current = { row, col };
      if (!tapStartCoord) {
        recordPuzzleAttempt(attemptKeyRef.current, puzzle.id, modeCategory);
        playTileTap(profile.soundEnabled);
        vibrateTileTap(hapticsEnabled);
        setTapStartCoord(current);
        setSelectionPath([current]);
        setFeedbackMessage(
          `Start letter "${puzzle.grid[row][col]}" anchored. Move with Arrow keys and press Enter to submit.`
        );
      } else if (
        tapStartCoord.row === row &&
        tapStartCoord.col === col
      ) {
        playSelectionClear(profile.soundEnabled);
        vibrateTileTap(hapticsEnabled);
        setTapStartCoord(null);
        setSelectionPath([]);
        setFeedbackMessage('Selection cleared.');
      } else {
        const path = computeStraightPath(tapStartCoord, current, puzzle.size);
        evaluatePath(path);
        setTapStartCoord(null);
        setSelectionPath([]);
      }
      return;
    }

    if (e.key === 'Escape' && (tapStartCoord || selectionPath.length > 0)) {
      e.preventDefault();
      playSelectionClear(profile.soundEnabled);
      vibrateTileTap(hapticsEnabled);
      setTapStartCoord(null);
      setSelectionPath([]);
      setFeedbackMessage('Selection cleared.');
    }
  };

  // Global keyboard shortcuts (H = Hint when idle, Escape = clear selection / typed word, Backspace/Enter for typed word)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isTypingField) return;

      if (e.key === 'Escape') {
        if (summaryData) {
          setSummaryData(null);
          return;
        }
        if (typedWord.length > 0) {
          playSelectionClear(profile.soundEnabled);
          vibrateTileTap(hapticsEnabled);
          setTypedWord('');
          setFeedbackMessage('Typed word cleared.');
          return;
        }
        if (tapStartCoord || selectionPath.length > 0) {
          playSelectionClear(profile.soundEnabled);
          setTapStartCoord(null);
          setSelectionPath([]);
          setFeedbackMessage('Selection cleared.');
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey || showAdModal || summaryData) {
        return;
      }

      if (typedWord.length > 0 && e.key === 'Backspace') {
        e.preventDefault();
        handleOnScreenKeyPress('BACK');
        return;
      }

      if (typedWord.length > 0 && e.key === 'Enter') {
        e.preventDefault();
        handleOnScreenKeyPress('ENTER');
        return;
      }

      if (
        (e.key === 'h' || e.key === 'H') &&
        typedWord.length === 0
      ) {
        e.preventDefault();
        void handleUseSmartHint();
        return;
      }

      if (typedWord.length > 0 && /^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleOnScreenKeyPress(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleUseSmartHint,
    handleOnScreenKeyPress,
    profile.soundEnabled,
    hapticsEnabled,
    selectionPath.length,
    showAdModal,
    summaryData,
    tapStartCoord,
    typedWord.length,
  ]);

  const selectedPreviewText = selectionPath
    .map((c) => puzzle.grid[c.row][c.col])
    .join('');

  const gridColClass =
    puzzle.size === 7
      ? 'grid-cols-7 gap-2 sm:gap-2.5'
      : puzzle.size === 10
      ? 'grid-cols-10 gap-1 sm:gap-1.5'
      : 'grid-cols-8 gap-1.5 sm:gap-2';

  const tileSizingClass =
    puzzle.size === 7
      ? profile.largePrint
        ? 'min-h-[46px] sm:min-h-[60px] text-2xl sm:text-3xl'
        : 'min-h-[46px] sm:min-h-[60px] text-lg sm:text-2xl'
      : puzzle.size === 10
      ? profile.largePrint
        ? 'min-h-[34px] sm:min-h-[46px] text-base sm:text-xl'
        : 'min-h-[34px] sm:min-h-[46px] text-sm sm:text-base'
      : profile.largePrint
      ? 'min-h-[42px] sm:min-h-[54px] text-xl sm:text-2xl'
      : 'min-h-[42px] sm:min-h-[54px] text-base sm:text-xl';

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <ConfettiBurst triggerKey={confettiTrigger} />

      {/* Top Auto-Pausing Stopwatch Strip */}
      <PuzzleStopwatch
        elapsedSeconds={elapsedSeconds}
        onTick={handleStopwatchTick}
        isComplete={isComplete}
        resetKey={puzzle.id}
        bestTimeSeconds={puzzle.mode === 'daily' ? bestDailyTimeSeconds : null}
        isPausedExternal={showAdModal}
        visible={showTimer}
        onToggleVisible={() => setShowTimer(!showTimer)}
      />

      {/* Editorial Puzzle Title + Unboxed Metadata & Workspace Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-5 border-b border-[#E2E6E1] dark:border-[#223040]">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#52606D] dark:text-[#94A3B8]">
            <span>{puzzle.edition}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {foundWords.length}/{puzzle.placedWords.length} Words
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[#9A5B13] dark:text-[#F59E0B] font-semibold">
              <Flame className="w-3.5 h-3.5" aria-hidden="true" />
              {profile.currentStreak} Day Streak
            </span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-[#131B23] dark:text-[#F1F5F9]">
            {puzzle.title}
          </h1>
          <p className="text-sm text-[#52606D] dark:text-[#94A3B8]">
            {puzzle.subtitle} · {diffCfg.description}
          </p>
        </div>

        {/* Functional Workspace Toolbar: Difficulty + Mode + Accessibility + Dark Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Difficulty level segmented control */}
          <div
            role="group"
            aria-label="Puzzle difficulty level"
            className="inline-flex items-center p-1 rounded-lg bg-[#E9EDE8] dark:bg-[#161F2A] border border-[#D4DDD6] dark:border-[#263342]"
          >
            {(['easy', 'standard', 'challenge'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onChangeDifficulty(level)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  difficulty === level
                    ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                    : 'text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
                }`}
              >
                {DIFFICULTY_CONFIGS[level].label}
              </button>
            ))}
          </div>

          {/* Clue vs Word List segmented control */}
          <div
            role="group"
            aria-label="Puzzle clue mode"
            className="inline-flex items-center p-1 rounded-lg bg-[#E9EDE8] dark:bg-[#161F2A] border border-[#D4DDD6] dark:border-[#263342]"
          >
            <button
              type="button"
              onClick={() => setClueMode('clues')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                clueMode === 'clues'
                  ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                  : 'text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
              }`}
            >
              Smart Clues
            </button>
            <button
              type="button"
              onClick={() => setClueMode('words')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                clueMode === 'words'
                  ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                  : 'text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
              }`}
            >
              Word List
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              void updatePreferences({ largePrint: !profile.largePrint })
            }
            aria-pressed={profile.largePrint}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              profile.largePrint
                ? 'bg-[#176B52] dark:bg-[#2EB88A] text-white dark:text-[#0B1410] border-transparent'
                : 'bg-white dark:bg-[#161F2A] text-[#131B23] dark:text-[#E2E8F0] border-[#D4DDD6] dark:border-[#263342] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38]'
            }`}
          >
            <Type className="w-3.5 h-3.5" aria-hidden="true" />
            Large Print
          </button>

          <button
            type="button"
            onClick={() =>
              void updatePreferences({ darkMode: !profile.darkMode })
            }
            aria-label={
              profile.darkMode ? 'Switch to light mode' : 'Switch to dark mode'
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-[#D4DDD6] dark:border-[#263342] bg-white dark:bg-[#161F2A] text-[#131B23] dark:text-[#E2E8F0] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] transition-colors whitespace-nowrap shrink-0"
          >
            {profile.darkMode ? (
              <>
                <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                Light
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                Dark
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !profile.soundEnabled;
              void updatePreferences({ soundEnabled: next });
              if (next) playTileTap(true);
            }}
            aria-pressed={profile.soundEnabled}
            aria-label={
              profile.soundEnabled
                ? 'Mute sound effects'
                : 'Enable sound effects'
            }
            className={`p-2 rounded-lg border transition-colors shrink-0 ${
              profile.soundEnabled
                ? 'border-[#D4DDD6] dark:border-[#263342] bg-white dark:bg-[#161F2A] text-[#176B52] dark:text-[#2EB88A] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38]'
                : 'border-[#D4DDD6] dark:border-[#263342] bg-white dark:bg-[#161F2A] text-[#52606D] dark:text-[#94A3B8]'
            }`}
          >
            {profile.soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !hapticsEnabled;
              setHapticsEnabled(next);
              saveHapticsEnabled(next);
              if (next) vibrateTileTap(true);
            }}
            aria-pressed={hapticsEnabled}
            aria-label={
              hapticsEnabled
                ? 'Disable haptic vibration'
                : 'Enable haptic vibration'
            }
            className={`p-2 rounded-lg border transition-colors shrink-0 ${
              hapticsEnabled
                ? 'border-[#D4DDD6] dark:border-[#263342] bg-white dark:bg-[#161F2A] text-[#176B52] dark:text-[#2EB88A] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38]'
                : 'border-[#D4DDD6] dark:border-[#263342] bg-white dark:bg-[#161F2A] text-[#52606D] dark:text-[#94A3B8] opacity-60'
            }`}
          >
            <Vibrate className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenArchive}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-[#D4DDD6] dark:border-[#263342] bg-white dark:bg-[#161F2A] text-[#131B23] dark:text-[#E2E8F0] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] transition-colors whitespace-nowrap shrink-0"
          >
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            Archive
          </button>

          {isArchiveMode && onReturnToToday && (
            <button
              type="button"
              onClick={onReturnToToday}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] transition-colors whitespace-nowrap shrink-0"
            >
              Today’s Puzzle
            </button>
          )}

          <button
            type="button"
            onClick={onOpenHowToPlay}
            aria-label="How to Play"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-[#D4DDD6] dark:border-[#263342] bg-white dark:bg-[#161F2A] text-[#131B23] dark:text-[#E2E8F0] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] transition-colors whitespace-nowrap shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            Help
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Dominant Interactive Puzzle Grid + Clues & Smart Hints Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Dominant Focal Anchor: 8x8 Smart Word Grid */}
        <div className="lg:col-span-7 space-y-4">
          {/* Active Word Tracing Bar + Direct 'Get Hint' Action */}
          <div className="flex flex-col sm:flex-row sm:items-stretch gap-2.5">
            <div
              key={`trace-bar-${invalidShakeKey}`}
              className={`flex-1 flex items-center justify-between gap-4 min-h-[44px] px-4 py-2 rounded-xl bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] ${
                invalidShakeKey > 0 ? 'lexiloom-shake' : ''
              }`}
            >
              <p
                className="text-sm text-[#52606D] dark:text-[#CBD5E1] truncate"
                aria-live="polite"
              >
                {selectedPreviewText.length > 0 ? (
                  <span>
                    Tracing:{' '}
                    <strong className="font-mono tracking-widest text-[#176B52] dark:text-[#2EB88A]">
                      {selectedPreviewText}
                    </strong>
                  </span>
                ) : typedWord.length > 0 ? (
                  <span>
                    Typed:{' '}
                    <strong className="font-mono tracking-widest text-[#176B52] dark:text-[#2EB88A]">
                      {typedWord}
                    </strong>{' '}
                    <span className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                      (Press Enter to check)
                    </span>
                  </span>
                ) : (
                  feedbackMessage
                )}
              </p>
              <span className="font-mono tabular-nums text-xs font-semibold text-[#131B23] dark:text-[#F1F5F9] whitespace-nowrap shrink-0">
                {liveScore} pts
              </span>
            </div>

            <button
              type="button"
              disabled={
                isComplete || getHintCooldown > 0 || !hasUnrevealedTargetLetters
              }
              onClick={handleGetTargetLetterHint}
              aria-label={
                getHintCooldown > 0
                  ? `Get Hint cooling down, available in ${getHintCooldown} seconds`
                  : `Get Hint: reveal one correct letter in the target word for minus ${GET_HINT_SCORE_COST} points`
              }
              title={
                getHintCooldown > 0
                  ? `Cooldown active (${getHintCooldown}s remaining)`
                  : `Reveal 1 correct letter in the target word (-${GET_HINT_SCORE_COST} pts · ${GET_HINT_COOLDOWN_SECONDS}s cooldown)`
              }
              className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52] dark:focus-visible:outline-[#2EB88A] ${
                getHintCooldown > 0
                  ? 'bg-[#FFFBEB] dark:bg-[#2A2112] text-[#92400E] dark:text-[#FCD34D] border-[#D97706]/50 cursor-not-allowed'
                  : 'bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] border-transparent disabled:opacity-45 disabled:cursor-not-allowed'
              }`}
            >
              {getHintCooldown > 0 ? (
                <>
                  <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="font-mono tabular-nums">
                    Cooldown {getHintCooldown}s
                  </span>
                </>
              ) : (
                <>
                  <Lightbulb className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Get Hint</span>
                  <span className="font-mono tabular-nums opacity-85">
                    (-{GET_HINT_SCORE_COST} pts)
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Inline Revealed Target Word Progress Strip (shown once Get Hint reveals a letter) */}
          {activeTargetHintWordObj &&
            (revealedTargetPositions[activeTargetHintWordObj.word]?.length || 0) >
              0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#FFFBEB] dark:bg-[#2A2112] border border-[#D97706]/35">
                <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                  <span className="text-xs font-semibold text-[#92400E] dark:text-[#FCD34D] whitespace-nowrap">
                    Target Word Hint
                  </span>
                  <span
                    className="font-mono text-sm sm:text-base font-bold tracking-[0.2em] text-[#131B23] dark:text-[#F8FAFC]"
                    aria-label={`Revealed target letters: ${formatRevealedTargetWord(
                      activeTargetHintWordObj.word,
                      revealedTargetPositions[activeTargetHintWordObj.word] || []
                    )}`}
                  >
                    {formatRevealedTargetWord(
                      activeTargetHintWordObj.word,
                      revealedTargetPositions[activeTargetHintWordObj.word] || []
                    )}
                  </span>
                  <span className="text-xs text-[#78350F] dark:text-[#FDE68A] truncate">
                    · {activeTargetHintWordObj.clue}
                  </span>
                </div>
                <span className="font-mono tabular-nums text-xs text-[#92400E] dark:text-[#FCD34D] whitespace-nowrap shrink-0">
                  {revealedTargetPositions[activeTargetHintWordObj.word]?.length ||
                    0}
                  /{activeTargetHintWordObj.word.length} revealed
                  {getHintPenalty > 0 ? ` · -${getHintPenalty} pts` : ''}
                </span>
              </div>
            )}

          {/* Inline Completion Share Strip (remains accessible even after closing the victory modal) */}
          {isComplete && !summaryData && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#E4F2EC]/75 dark:bg-[#15392E]/70 border border-[#A7D7C5] dark:border-[#25634F]">
              <div className="flex items-center gap-2 min-w-0">
                <Trophy
                  className="w-4 h-4 text-[#176B52] dark:text-[#2EB88A] shrink-0"
                  aria-hidden="true"
                />
                <span className="text-xs sm:text-sm font-semibold text-[#11533F] dark:text-[#6EE7B7] truncate">
                  Puzzle complete · {liveScore.toLocaleString()} pts ·{' '}
                  {formatDuration(elapsedSeconds)}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <WordEtymologyButton
                  compact
                  words={puzzle.placedWords.map((pw) => ({
                    word: pw.word,
                    clue: pw.clue,
                  }))}
                />
                <ShareResultButton
                  compact
                  summary={{
                    gameTitle: puzzle.title,
                    subtitle: `${diffCfg.label} (${puzzle.size}×${puzzle.size})`,
                    dateStr: puzzle.dateStr,
                    isDaily: puzzle.mode === 'daily',
                    score: liveScore,
                    durationSeconds: elapsedSeconds,
                    streakDays: profile.currentStreak,
                    hintsUsed: hintsUsedCount,
                    wordsFound: puzzle.placedWords.length,
                    totalWords: puzzle.placedWords.length,
                  }}
                />
              </div>
            </div>
          )}

          {/* Dynamic Grid Board Surface (7x7 / 8x8 / 10x10) */}
          <div
            ref={gridContainerRef}
            className={`relative puzzle-grid-surface rounded-2xl p-2.5 sm:p-5 bg-white dark:bg-[#161F2A] border ${
              profile.highContrast
                ? 'border-2 border-[#131B23] dark:border-[#F1F5F9]'
                : 'border-[#E2E6E1] dark:border-[#263342]'
            }`}
            onPointerMove={handleGridPointerMove}
            role="grid"
            aria-label={`${puzzle.title} letter grid. Use arrow keys to navigate and Enter or Space to select words.`}
          >
            <ConfettiBurst triggerKey={confettiTrigger} scope="board" />
            <div className={`grid ${gridColClass}`}>
              {puzzle.grid.map((rowArr, rIdx) =>
                rowArr.map((letter, cIdx) => {
                  const key = coordKey(rIdx, cIdx);
                  const isSelected = activeSelectionKeys.has(key);
                  const isFound = foundCellKeys.has(key);
                  const isHinted = hintTileKeys.has(key);
                  const popIndex = recentPopOrder.get(key);
                  const isTapAnchor =
                    tapStartCoord?.row === rIdx && tapStartCoord?.col === cIdx;
                  const isRovingFocus =
                    focusedCoord.row === rIdx && focusedCoord.col === cIdx;

                  let tileStyle =
                    'bg-[#F6F7F5] dark:bg-[#0F1721] text-[#131B23] dark:text-[#F1F5F9] border-[#DFE4DE] dark:border-[#263342] hover:bg-[#EBF0EC] dark:hover:bg-[#1D2A3A]';

                  if (isSelected || isTapAnchor) {
                    tileStyle =
                      'bg-[#176B52] dark:bg-[#2EB88A] text-white dark:text-[#0B1410] border-[#176B52] dark:border-[#2EB88A] scale-[1.04]';
                  } else if (isHinted) {
                    tileStyle =
                      'bg-[#FEF3C7] dark:bg-[#422D0D] text-[#78350F] dark:text-[#FDE68A] border-[#D97706] dark:border-[#F59E0B] ring-2 ring-[#F59E0B]/60';
                  } else if (isFound) {
                    tileStyle =
                      'bg-[#E4F2EC] dark:bg-[#15392E] text-[#11533F] dark:text-[#6EE7B7] border-[#A7D7C5] dark:border-[#25634F]';
                  }

                  return (
                    <button
                      key={key}
                      type="button"
                      tabIndex={isRovingFocus ? 0 : -1}
                      data-row={rIdx}
                      data-col={cIdx}
                      onFocus={() => setFocusedCoord({ row: rIdx, col: cIdx })}
                      onPointerDown={(e) => {
                        setFocusedCoord({ row: rIdx, col: cIdx });
                        handleTilePointerDown(e, rIdx, cIdx);
                      }}
                      onKeyDown={(e) => handleTileKeyDown(e, rIdx, cIdx)}
                      aria-label={`Row ${rIdx + 1}, Column ${cIdx + 1}, letter ${letter}${
                        isFound ? ', found' : ''
                      }${isHinted ? ', hinted' : ''}${
                        isTapAnchor ? ', start anchor' : ''
                      }`}
                      style={
                        popIndex !== undefined
                          ? { animationDelay: `${popIndex * 35}ms` }
                          : undefined
                      }
                      className={`relative aspect-square w-full rounded-xl border font-bold flex items-center justify-center transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52] dark:focus-visible:outline-[#2EB88A] ${tileSizingClass} ${tileStyle} ${
                        popIndex !== undefined ? 'lexiloom-tile-pop' : ''
                      }`}
                    >
                      <span>{letter}</span>
                      {isFound && !isSelected && (
                        <span
                          aria-hidden="true"
                          className="absolute top-1 right-1 text-[9px] leading-none font-bold opacity-70"
                        >
                          ✓
                        </span>
                      )}
                      {isHinted && !isSelected && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-1 right-1 text-[9px] leading-none font-bold"
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

          {/* State-Highlighted Accessible On-Screen Keyboard */}
          <PuzzleKeyboard
            keyStates={keyboardStates}
            typedWord={typedWord}
            disabled={isComplete}
            collapsed={keyboardCollapsed}
            onToggleCollapsed={() => setKeyboardCollapsed((c) => !c)}
            onKeyPress={handleOnScreenKeyPress}
            onClearTyped={() => {
              playSelectionClear(profile.soundEnabled);
              vibrateTileTap(hapticsEnabled);
              setTypedWord('');
            }}
          />

          {/* 4-Tier Active Smart Hint Callout */}
          {activeHint && activeHintWordObj && (
            <div className="rounded-xl p-4 sm:p-5 bg-[#FFFBEB] dark:bg-[#2A2112] border border-[#F59E0B]/40 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-[#92400E] dark:text-[#FCD34D]">
                  Smart Hint · Tier {activeHint.tier} of 4
                </span>
                <span className="font-mono text-xs text-[#78350F] dark:text-[#FDE68A]">
                  {activeHintWordObj.word.length} letters
                </span>
              </div>
              <p className="text-sm font-medium text-[#131B23] dark:text-[#F8FAFC]">
                Clue: {activeHintWordObj.clue} ({maskWord(activeHintWordObj.word)})
              </p>
              {activeHint.tier >= 2 && (
                <p className="text-xs text-[#78350F] dark:text-[#FDE68A]">
                  Placement: <strong>{activeHintWordObj.orientation}</strong> starting at{' '}
                  <strong>
                    Row {activeHintWordObj.startRow + 1}, Column{' '}
                    {activeHintWordObj.startCol + 1}
                  </strong>
                  .
                </p>
              )}
              {activeHint.tier === 3 && (
                <p className="text-xs text-[#78350F] dark:text-[#FDE68A]">
                  The starting tile is marked with a star (★) on the board.
                </p>
              )}
              {activeHint.tier === 4 && (
                <p className="text-xs text-[#78350F] dark:text-[#FDE68A]">
                  Full word path is highlighted on the board — trace it to collect!
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Clues / Word Bank + Rewarded Hint System */}
        <aside className="lg:col-span-5 space-y-6">
          {/* Smart Hint & Rewarded Ad Panel */}
          <div className="rounded-2xl p-5 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-editorial text-lg font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                  Smart Hints
                </h2>
                <p className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                  4 progressive tiers · Balance:{' '}
                  <strong className="font-mono tabular-nums text-[#131B23] dark:text-[#F1F5F9]">
                    {profile.hintCredits}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={onReplayPuzzle}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9] hover:bg-[#F1F4F1] dark:hover:bg-[#1E2A38] transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isComplete}
                onClick={() => void handleUseSmartHint()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] disabled:opacity-50 text-white dark:text-[#0B1410] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Lightbulb className="w-4 h-4" aria-hidden="true" />
                {profile.hintCredits > 0 ? 'Use Hint (-1)' : 'Unlock Hints'}
              </button>

              <button
                type="button"
                onClick={() => setShowAdModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] bg-[#F6F7F5] dark:bg-[#0F1721] hover:bg-[#E9EDE8] dark:hover:bg-[#1E2A38] text-[#131B23] dark:text-[#F1F5F9] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <PlayCircle className="w-4 h-4 text-[#176B52] dark:text-[#2EB88A]" aria-hidden="true" />
                Watch Ad (+2)
              </button>
            </div>

            <LetterRevealHintBar
              disabled={isComplete}
              resetKey={puzzle.id}
              onRevealLetter={handleRevealSingleLetter}
            />
          </div>

          {/* Target Clues / Word List */}
          <div className="rounded-2xl p-5 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-editorial text-lg font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                {clueMode === 'clues' ? 'Hidden Word Clues' : 'Words to Find'}
              </h2>
              <button
                type="button"
                onClick={() =>
                  setClueMode((m) => (m === 'clues' ? 'words' : 'clues'))
                }
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#176B52] dark:text-[#2EB88A] hover:underline whitespace-nowrap shrink-0"
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                {clueMode === 'clues' ? 'Show Words' : 'Hide Words'}
              </button>
            </div>

            <ul className="divide-y divide-[#ECEFEA] dark:divide-[#223040]">
              {puzzle.placedWords.map((item) => {
                const isFound = foundWords.includes(item.word);
                const revealedIndices = revealedTargetPositions[item.word] || [];
                const hasRevealedLetters = revealedIndices.length > 0;
                const isHintTarget =
                  activeHint?.targetWord === item.word ||
                  (!isFound && hasRevealedLetters);
                return (
                  <li
                    key={item.word}
                    className={`py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-3 ${
                      isFound ? 'opacity-65' : ''
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`font-mono text-sm font-semibold tracking-wider ${
                              isFound
                                ? 'line-through text-[#176B52] dark:text-[#2EB88A]'
                                : isHintTarget
                                ? 'text-[#B45309] dark:text-[#F59E0B]'
                                : 'text-[#131B23] dark:text-[#F1F5F9]'
                            }`}
                          >
                            {isFound || clueMode === 'words'
                              ? item.word
                              : hasRevealedLetters
                              ? formatRevealedTargetWord(
                                  item.word,
                                  revealedIndices
                                )
                              : `${item.word.length} LETTERS`}
                          </span>
                          {isFound && (
                            <Check
                              className="w-4 h-4 text-[#176B52] dark:text-[#2EB88A] shrink-0"
                              aria-label="Found"
                            />
                          )}
                        </div>
                        {isFound && (
                          <DictionaryTooltip
                            word={item.word}
                            fallbackClue={item.clue}
                            align="right"
                          />
                        )}
                      </div>
                      <p
                        className={`leading-snug text-[#52606D] dark:text-[#94A3B8] ${
                          profile.largePrint ? 'text-base' : 'text-sm'
                        }`}
                      >
                        {item.clue}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
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
          setFeedbackMessage('Reward claimed! +2 Smart Hint credits added.');
        }}
      />

      {/* Victory / Round Summary Modal */}
      {summaryData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="victory-title"
        >
          <div className="lexiloom-modal-in w-full max-w-md rounded-2xl bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] p-7 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#176B52] dark:text-[#2EB88A]">
                <Trophy className="w-4 h-4" aria-hidden="true" />
                <span>
                  {puzzle.mode === 'daily'
                    ? 'Daily Challenge Complete'
                    : 'Theme Pack Complete'}
                </span>
              </div>
              <h2
                id="victory-title"
                className="font-editorial text-2xl font-bold text-[#131B23] dark:text-[#F1F5F9]"
              >
                Well played!
              </h2>
              <p className="text-sm text-[#52606D] dark:text-[#94A3B8]">
                {summaryData.streakUpdated
                  ? `Your daily streak is now ${summaryData.newStreak} ${
                      summaryData.newStreak === 1 ? 'day' : 'days'
                    } strong.`
                  : `You uncovered all ${puzzle.placedWords.length} words in ${puzzle.title}.`}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 py-4 border-y border-[#E2E6E1] dark:border-[#223040]">
              <div>
                <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                  Score
                </div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
                  {summaryData.score}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                  Time
                </div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
                  {formatDuration(summaryData.durationSeconds)}
                </div>
                {puzzle.mode === 'daily' &&
                  bestDailyTimeSeconds !== null &&
                  summaryData.durationSeconds <= bestDailyTimeSeconds && (
                    <div className="mt-0.5 text-[11px] font-semibold text-[#176B52] dark:text-[#2EB88A]">
                      Personal best
                    </div>
                  )}
              </div>
              <div>
                <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                  Streak
                </div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold text-[#9A5B13] dark:text-[#F59E0B]">
                  {summaryData.newStreak}d
                </div>
              </div>
            </div>

            <ShareResultButton
              summary={{
                gameTitle: puzzle.title,
                subtitle: `${diffCfg.label} (${puzzle.size}×${puzzle.size})`,
                dateStr: puzzle.dateStr,
                isDaily: puzzle.mode === 'daily',
                score: summaryData.score,
                durationSeconds: summaryData.durationSeconds,
                streakDays: summaryData.newStreak,
                hintsUsed: summaryData.hintsUsed,
                wordsFound: puzzle.placedWords.length,
                totalWords: puzzle.placedWords.length,
              }}
            />

            <WordEtymologyButton
              words={puzzle.placedWords.map((pw) => ({
                word: pw.word,
                clue: pw.clue,
              }))}
              label="Definition & Etymology"
            />

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSummaryData(null);
                  onGoToThemes();
                }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#F1F4F1] dark:hover:bg-[#1E2A38] text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Explore Themes
              </button>
              <button
                type="button"
                onClick={() => {
                  setSummaryData(null);
                  onGoToLeaderboard();
                }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#F1F4F1] dark:hover:bg-[#1E2A38] text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Leaderboard
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setSummaryData(null);
                onReplayPuzzle();
              }}
              className="w-full py-2 text-xs font-semibold text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9] transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
