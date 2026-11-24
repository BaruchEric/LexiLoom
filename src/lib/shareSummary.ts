import type { LetterEvaluation } from '../data/wordGamesData';
import { getTodayDateString } from '../data/wordThemes';

export interface ShareSummaryParams {
  gameTitle: string;
  subtitle?: string;
  dateStr?: string;
  isDaily?: boolean;
  score: number;
  durationSeconds: number;
  streakDays: number;
  hintsUsed?: number;
  wordsFound?: number;
  totalWords?: number;
  /** Optional Letter Shift guess evaluation rows for a spoiler-free visual grid */
  guessEvaluations?: LetterEvaluation[][];
  maxAttempts?: number;
}

// Fixed epoch (2025-08-25) so daily puzzle numbers increment deterministically by +1 each calendar day
const DAILY_EPOCH_UTC = Date.UTC(2025, 7, 25);

export function getDailyPuzzleNumber(dateStr?: string): number {
  const target = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? dateStr
    : getTodayDateString();
  const [y, m, d] = target.split('-').map(Number);
  const targetUtc = Date.UTC(y, (m || 1) - 1, d || 1);
  const diffDays = Math.round((targetUtc - DAILY_EPOCH_UTC) / 86_400_000);
  return Math.max(1, diffDays);
}

/** Formats elapsed time strictly as zero-padded MM:SS (e.g., 02:30) for social sharing */
export function formatShareDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatSocialHeadline(params: ShareSummaryParams): string {
  const duration = formatShareDuration(params.durationSeconds);

  let modeTag: string;
  const isDailyPuzzle =
    params.isDaily ||
    Boolean(params.dateStr) ||
    /^Daily/i.test(params.gameTitle);

  if (isDailyPuzzle) {
    const num = getDailyPuzzleNumber(params.dateStr);
    modeTag = `Daily ${num}`;
  } else if (/^Letter Shift/i.test(params.gameTitle)) {
    modeTag = 'Letter Shift';
  } else if (/^Mini Crossword/i.test(params.gameTitle)) {
    modeTag = 'Mini Crossword';
  } else if (/^Anagram Forge/i.test(params.gameTitle)) {
    modeTag = 'Anagram Forge';
  } else {
    const cleanTitle = params.gameTitle
      .replace(/^Archive\s*·\s*/i, '')
      .trim();
    modeTag = cleanTitle || 'Puzzle';
  }

  let ratioPart: string | null = null;
  if (params.guessEvaluations && params.guessEvaluations.length > 0) {
    ratioPart = `${params.guessEvaluations.length}/${params.maxAttempts ?? 6}`;
  } else if (
    typeof params.wordsFound === 'number' &&
    params.wordsFound > 0
  ) {
    const total = params.totalWords ?? params.wordsFound;
    ratioPart = `${params.wordsFound}/${total}`;
  }

  return ratioPart
    ? `#WordQuest ${modeTag} - ${ratioPart} - ${duration}`
    : `#WordQuest ${modeTag} - ${duration}`;
}

export function formatVictoryShareText(params: ShareSummaryParams): string {
  const lines: string[] = [];

  // Line 1: Crisp social-media headline (e.g. "#WordQuest Daily 452 - 6/6 - 02:30")
  lines.push(formatSocialHeadline(params));

  // Optional clean theme/difficulty line
  const cleanedTheme = params.gameTitle
    .replace(/^Daily Challenge:\s*/i, '')
    .replace(/^Letter Shift\s*·\s*/i, '')
    .replace(/^Mini Crossword:\s*/i, '')
    .replace(/^Anagram Forge:\s*/i, '')
    .trim();
  const contextParts: string[] = [];
  if (cleanedTheme) contextParts.push(cleanedTheme);
  if (params.subtitle) contextParts.push(params.subtitle);
  if (contextParts.length > 0) {
    lines.push(contextParts.join(' · '));
  }

  // Visual progress grid (spoiler-free)
  if (params.guessEvaluations && params.guessEvaluations.length > 0) {
    for (const row of params.guessEvaluations) {
      const cells = row
        .map((ev) =>
          ev === 'correct' ? '🟩' : ev === 'present' ? '🟨' : '⬜'
        )
        .join('');
      lines.push(cells);
    }
  } else if (
    typeof params.wordsFound === 'number' &&
    params.wordsFound > 0
  ) {
    const tileCount = Math.min(10, Math.max(1, params.wordsFound));
    lines.push('🟩'.repeat(tileCount));
  }

  // Stats & streak footer
  const statSegments = [
    `🔥 ${params.streakDays}d streak`,
    `${params.score.toLocaleString()} pts`,
  ];
  if (typeof params.hintsUsed === 'number') {
    statSegments.push(
      params.hintsUsed === 0
        ? 'No hints'
        : `${params.hintsUsed} ${params.hintsUsed === 1 ? 'hint' : 'hints'}`
    );
  }
  lines.push(statSegments.join(' · '));

  return lines.join('\n');
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback for restricted iframe contexts
    }
  }

  if (typeof document === 'undefined') return false;

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}
