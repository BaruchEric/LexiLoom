import type {
  LocalCompletionRecord,
  PlayerProfileState,
} from './storage';

export type PuzzleModeCategory =
  | 'Daily Word Search'
  | 'Themes & Archive'
  | 'Mini Crossword'
  | 'Letter Shift'
  | 'Anagram Forge';

export interface PuzzleAttemptRecord {
  attemptKey: string;
  puzzleId: string;
  modeCategory: PuzzleModeCategory;
  startedAtIso: string;
  outcome: 'in_progress' | 'won' | 'lost';
}

export interface TrendPoint {
  id: string;
  label: string;
  fullTitle: string;
  modeCategory: PuzzleModeCategory;
  durationSeconds: number;
  score: number;
  hintsUsed: number;
  wordsFound: number;
  dateLabel: string;
}

export interface ModeBreakdownItem {
  modeCategory: PuzzleModeCategory;
  solved: number;
  attempted: number;
  winRatePct: number | null;
  avgTimeSeconds: number | null;
  bestTimeSeconds: number | null;
  avgScore: number | null;
}

export interface PerformanceMetrics {
  totalSolved: number;
  totalAttempted: number;
  totalLost: number;
  winRatePct: number | null;
  avgTimeSeconds: number | null;
  fastestTimeSeconds: number | null;
  avgScore: number | null;
  totalWordsFound: number;
  hintFreeSolved: number;
  hintFreeRatePct: number | null;
  currentStreak: number;
  bestStreak: number;
  recentTrend: TrendPoint[];
  modeBreakdown: ModeBreakdownItem[];
}

const ATTEMPTS_STORAGE_KEY = 'lexiloom_puzzle_attempts_v1';
const ATTEMPTS_CHANGED_EVENT = 'lexiloom-attempts-changed';

export const ALL_MODE_CATEGORIES: PuzzleModeCategory[] = [
  'Daily Word Search',
  'Themes & Archive',
  'Mini Crossword',
  'Letter Shift',
  'Anagram Forge',
];

export function classifyPuzzleMode(
  puzzleId: string,
  mode: 'daily' | 'theme',
  themeName: string
): PuzzleModeCategory {
  if (puzzleId.startsWith('cw_') || themeName.startsWith('Mini Crossword')) {
    return 'Mini Crossword';
  }
  if (puzzleId.startsWith('wg_') || themeName.startsWith('Letter Shift')) {
    return 'Letter Shift';
  }
  if (puzzleId.startsWith('ana_') || themeName.startsWith('Anagram Forge')) {
    return 'Anagram Forge';
  }
  if (mode === 'daily') {
    return 'Daily Word Search';
  }
  return 'Themes & Archive';
}

export function loadPuzzleAttempts(): PuzzleAttemptRecord[] {
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PuzzleAttemptRecord =>
        Boolean(item) &&
        typeof item.attemptKey === 'string' &&
        typeof item.puzzleId === 'string' &&
        typeof item.outcome === 'string'
    );
  } catch {
    return [];
  }
}

function savePuzzleAttempts(records: PuzzleAttemptRecord[]): void {
  try {
    // Keep most recent 200 sessions to prevent unbounded localStorage growth
    localStorage.setItem(
      ATTEMPTS_STORAGE_KEY,
      JSON.stringify(records.slice(-200))
    );
  } catch {
    // Ignore storage quota errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ATTEMPTS_CHANGED_EVENT));
  }
}

export function subscribeAttemptsChanged(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(ATTEMPTS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(ATTEMPTS_CHANGED_EVENT, listener);
}

/**
 * Records that the player actively started a puzzle (first move/interaction).
 * Deduplicated by attemptKey so refreshing or multiple moves in one run count once.
 */
export function recordPuzzleAttempt(
  attemptKey: string,
  puzzleId: string,
  modeCategory: PuzzleModeCategory
): void {
  const existing = loadPuzzleAttempts();
  if (existing.some((r) => r.attemptKey === attemptKey)) {
    return;
  }
  existing.push({
    attemptKey,
    puzzleId,
    modeCategory,
    startedAtIso: new Date().toISOString(),
    outcome: 'in_progress',
  });
  savePuzzleAttempts(existing);
}

/**
 * Updates an active puzzle attempt with its final outcome ('won' or 'lost').
 * If no prior attempt existed (e.g., solved via instant hint), creates one cleanly.
 */
export function recordPuzzleOutcome(
  attemptKey: string,
  puzzleId: string,
  modeCategory: PuzzleModeCategory,
  outcome: 'won' | 'lost'
): void {
  const existing = loadPuzzleAttempts();
  const idx = existing.findIndex((r) => r.attemptKey === attemptKey);
  if (idx >= 0) {
    existing[idx] = { ...existing[idx], outcome };
  } else {
    existing.push({
      attemptKey,
      puzzleId,
      modeCategory,
      startedAtIso: new Date().toISOString(),
      outcome,
    });
  }
  savePuzzleAttempts(existing);
}

export function formatPerformanceTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—';
  const rounded = Math.max(0, Math.round(seconds));
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function shortDateLabel(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function shortPuzzleLabel(themeName: string, index: number): string {
  const cleaned = themeName
    .replace(/^Daily Challenge:\s*/i, '')
    .replace(/^Archive\s*·\s*/i, '')
    .replace(/^Mini Crossword:\s*/i, '')
    .replace(/^Letter Shift:\s*/i, '')
    .replace(/^Anagram Forge:\s*/i, '')
    .replace(/\s*\((Easy|Standard|Challenge)\)\s*$/i, '')
    .trim();
  if (!cleaned) return `#${index + 1}`;
  const firstWord = cleaned.split(/\s+/)[0];
  return firstWord.length > 9 ? `${firstWord.slice(0, 8)}…` : firstWord;
}

export function computePerformanceMetrics(
  completions: LocalCompletionRecord[],
  profile: PlayerProfileState,
  attempts: PuzzleAttemptRecord[] = loadPuzzleAttempts()
): PerformanceMetrics {
  const totalSolved = Math.max(profile.puzzlesSolved, completions.length);

  // Count distinct recorded attempts that ended in loss or remain unresolved
  const recordedLosses = attempts.filter((a) => a.outcome === 'lost').length;
  const recordedWins = attempts.filter((a) => a.outcome === 'won').length;
  const completedPuzzleIds = new Set(completions.map((c) => c.puzzleId));
  const unresolvedAttempts = attempts.filter(
    (a) => a.outcome === 'in_progress' && !completedPuzzleIds.has(a.puzzleId)
  ).length;

  const totalAttempted = Math.max(
    totalSolved + recordedLosses + unresolvedAttempts,
    recordedWins + recordedLosses + unresolvedAttempts
  );

  const winRatePct =
    totalAttempted > 0
      ? Math.min(100, Math.round((totalSolved / totalAttempted) * 100))
      : null;

  const timedRecords = completions.filter(
    (c) => typeof c.durationSeconds === 'number' && c.durationSeconds >= 0
  );
  const avgTimeSeconds =
    timedRecords.length > 0
      ? Math.round(
          timedRecords.reduce((sum, r) => sum + r.durationSeconds, 0) /
            timedRecords.length
        )
      : null;
  const fastestTimeSeconds =
    timedRecords.length > 0
      ? Math.min(...timedRecords.map((r) => r.durationSeconds))
      : null;

  const avgScore =
    completions.length > 0
      ? Math.round(
          completions.reduce((sum, r) => sum + r.score, 0) / completions.length
        )
      : null;

  const totalWordsFound = completions.reduce(
    (sum, r) => sum + (r.wordsFound || 0),
    0
  );
  const hintFreeSolved = completions.filter((r) => r.hintsUsed === 0).length;
  const hintFreeRatePct =
    completions.length > 0
      ? Math.round((hintFreeSolved / completions.length) * 100)
      : null;

  // Chronological order (oldest -> newest) for the last 10 solved puzzles
  const sortedByTime = [...completions].sort((a, b) =>
    a.completedAtIso.localeCompare(b.completedAtIso)
  );
  const lastTen = sortedByTime.slice(-10);
  const recentTrend: TrendPoint[] = lastTen.map((rec, idx) => ({
    id: `${rec.puzzleId}-${idx}`,
    label: shortPuzzleLabel(rec.themeName, idx),
    fullTitle: rec.themeName,
    modeCategory: classifyPuzzleMode(rec.puzzleId, rec.mode, rec.themeName),
    durationSeconds: rec.durationSeconds,
    score: rec.score,
    hintsUsed: rec.hintsUsed,
    wordsFound: rec.wordsFound,
    dateLabel: shortDateLabel(rec.completedAtIso),
  }));

  // Mode breakdown
  const modeBreakdown: ModeBreakdownItem[] = ALL_MODE_CATEGORIES.map(
    (category) => {
      const modeCompletions = completions.filter(
        (c) => classifyPuzzleMode(c.puzzleId, c.mode, c.themeName) === category
      );
      const modeAttempts = attempts.filter(
        (a) => a.modeCategory === category
      );
      const modeLosses = modeAttempts.filter((a) => a.outcome === 'lost').length;
      const modeUnresolved = modeAttempts.filter(
        (a) => a.outcome === 'in_progress' && !completedPuzzleIds.has(a.puzzleId)
      ).length;

      const solved = modeCompletions.length;
      const attempted = Math.max(
        solved + modeLosses + modeUnresolved,
        modeAttempts.length
      );
      const modeWinRate =
        attempted > 0
          ? Math.min(100, Math.round((solved / attempted) * 100))
          : null;
      const modeAvgTime =
        solved > 0
          ? Math.round(
              modeCompletions.reduce((s, r) => s + r.durationSeconds, 0) / solved
            )
          : null;
      const modeBestTime =
        solved > 0
          ? Math.min(...modeCompletions.map((r) => r.durationSeconds))
          : null;
      const modeAvgScore =
        solved > 0
          ? Math.round(
              modeCompletions.reduce((s, r) => s + r.score, 0) / solved
            )
          : null;

      return {
        modeCategory: category,
        solved,
        attempted,
        winRatePct: modeWinRate,
        avgTimeSeconds: modeAvgTime,
        bestTimeSeconds: modeBestTime,
        avgScore: modeAvgScore,
      };
    }
  );

  return {
    totalSolved,
    totalAttempted,
    totalLost: recordedLosses,
    winRatePct,
    avgTimeSeconds,
    fastestTimeSeconds,
    avgScore,
    totalWordsFound,
    hintFreeSolved,
    hintFreeRatePct,
    currentStreak: profile.currentStreak,
    bestStreak: profile.bestStreak,
    recentTrend,
    modeBreakdown,
  };
}
