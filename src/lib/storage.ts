import { getTodayDateString, getYesterdayDateString } from '../data/wordThemes';
import { normalizeEffectiveStreak } from './dailyStreak';

export interface PlayerProfileState {
  displayName: string;
  avatarType: 'illustrated' | 'monogram';
  avatarId: string;
  avatarInitials: string;
  avatarColor: string;
  friendCode: string;
  currentStreak: number;
  bestStreak: number;
  totalScore: number;
  puzzlesSolved: number;
  hintCredits: number;
  adsWatched: number;
  lastDailyDate: string;
  lastDailyScore: number;
  completedThemeIds: string[];
  unlockedPackIds: string[];
  friendUids: string[];
  notificationsEnabled: boolean;
  reminderTime: string;
  darkMode: boolean;
  largePrint: boolean;
  highContrast: boolean;
  soundEnabled: boolean;
}

export interface LocalCompletionRecord {
  puzzleId: string;
  mode: 'daily' | 'theme';
  themeName: string;
  puzzleWord?: string;
  puzzleWords?: string[];
  score: number;
  durationSeconds: number;
  hintsUsed: number;
  wordsFound: number;
  completedAtIso: string;
  syncedToCloud: boolean;
}

const PROFILE_KEY = 'lexiloom_profile_v1';
const COMPLETIONS_KEY = 'lexiloom_completions_v1';
const COMPLETION_WORDS_KEY = 'lexiloom_completion_words_v1';
const DIRTY_SYNC_KEY = 'lexiloom_needs_sync_v1';

export function generateFriendCode(seed?: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  if (seed && seed.length >= 4) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    for (let i = 0; i < 4; i++) {
      suffix += chars[(hash >> (i * 5)) % chars.length];
    }
  } else {
    for (let i = 0; i < 4; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return `LEXI-${suffix}`;
}

export function sanitizeDisplayName(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, ' ').slice(0, 40);
  return cleaned.length > 0 ? cleaned : 'Word Explorer';
}

export function sanitizeInitials(initials: string, fallbackName: string): string {
  const alpha = initials.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2);
  if (alpha.length >= 1) return alpha;
  const fromName = fallbackName
    .split(/\s+/)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 2);
  return fromName.length >= 1 ? fromName : 'LL';
}

export function sanitizeStringArray(arr: string[], maxLen = 50): string[] {
  const unique = Array.from(
    new Set(
      arr
        .filter((v) => typeof v === 'string' && v.trim().length > 0)
        .map((v) => v.trim().slice(0, 128))
    )
  );
  return unique.slice(0, maxLen);
}

export function clampInt(val: number, min: number, max: number): number {
  const n = Math.round(Number.isFinite(val) ? val : min);
  return Math.max(min, Math.min(max, n));
}

export function getDefaultProfile(): PlayerProfileState {
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;

  return {
    displayName: 'Word Explorer',
    avatarType: 'illustrated',
    avatarId: 'owl',
    avatarInitials: 'WE',
    avatarColor: '#176B52',
    friendCode: generateFriendCode(),
    currentStreak: 0,
    bestStreak: 0,
    totalScore: 0,
    puzzlesSolved: 0,
    hintCredits: 3,
    adsWatched: 0,
    lastDailyDate: '',
    lastDailyScore: 0,
    completedThemeIds: [],
    unlockedPackIds: [
      'botanical-conservatory',
      'coastal-voyages',
      'artisan-kitchen',
      'midnight-observatory',
    ],
    friendUids: [],
    notificationsEnabled: false,
    reminderTime: '09:00',
    darkMode: Boolean(prefersDark),
    largePrint: false,
    highContrast: false,
    soundEnabled: true,
  };
}

export function loadLocalProfile(): PlayerProfileState {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return getDefaultProfile();
    const parsed = JSON.parse(raw) as Partial<PlayerProfileState>;
    const defaults = getDefaultProfile();
    const lastDailyDate =
      typeof parsed.lastDailyDate === 'string' ? parsed.lastDailyDate : '';
    const effectiveStreak = normalizeEffectiveStreak(
      typeof parsed.currentStreak === 'number' ? parsed.currentStreak : 0,
      lastDailyDate
    );
    const bestStreak = Math.max(
      typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0,
      effectiveStreak
    );
    return {
      ...defaults,
      ...parsed,
      currentStreak: effectiveStreak,
      bestStreak,
      lastDailyDate,
      displayName: sanitizeDisplayName(parsed.displayName || defaults.displayName),
      avatarInitials: sanitizeInitials(
        parsed.avatarInitials || '',
        parsed.displayName || defaults.displayName
      ),
      completedThemeIds: sanitizeStringArray(parsed.completedThemeIds || [], 50),
      unlockedPackIds: sanitizeStringArray(
        parsed.unlockedPackIds && parsed.unlockedPackIds.length > 0
          ? parsed.unlockedPackIds
          : defaults.unlockedPackIds,
        50
      ),
      friendUids: sanitizeStringArray(parsed.friendUids || [], 50),
    };
  } catch {
    return getDefaultProfile();
  }
}

export function saveLocalProfile(profile: PlayerProfileState) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadLocalCompletions(): LocalCompletionRecord[] {
  try {
    const raw = localStorage.getItem(COMPLETIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 60) : [];
  } catch {
    return [];
  }
}

export function saveLocalCompletions(records: LocalCompletionRecord[]) {
  try {
    localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(records.slice(0, 60)));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export interface StoredCompletionWordMeta {
  puzzleWord: string;
  puzzleWords?: string[];
}

export function loadCompletionWordMap(): Record<string, StoredCompletionWordMeta> {
  try {
    const raw = localStorage.getItem(COMPLETION_WORDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCompletionWordMeta(
  puzzleId: string,
  puzzleWord?: string,
  puzzleWords?: string[]
): void {
  const cleanWord = puzzleWord?.trim().toUpperCase().slice(0, 32);
  if (!cleanWord) return;
  try {
    const current = loadCompletionWordMap();
    const cleanWords = Array.isArray(puzzleWords)
      ? puzzleWords
          .map((w) => w.trim().toUpperCase().slice(0, 32))
          .filter(Boolean)
          .slice(0, 16)
      : undefined;
    current[puzzleId] = {
      puzzleWord: cleanWord,
      ...(cleanWords && cleanWords.length > 0 ? { puzzleWords: cleanWords } : {}),
    };
    const keys = Object.keys(current);
    if (keys.length > 120) {
      for (const oldKey of keys.slice(0, keys.length - 120)) {
        delete current[oldKey];
      }
    }
    localStorage.setItem(COMPLETION_WORDS_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function setNeedsCloudSync(flag: boolean) {
  try {
    localStorage.setItem(DIRTY_SYNC_KEY, flag ? '1' : '0');
  } catch {
    // Ignore
  }
}

export function getNeedsCloudSync(): boolean {
  try {
    return localStorage.getItem(DIRTY_SYNC_KEY) === '1';
  } catch {
    return false;
  }
}

export function computeNextDailyStreak(
  currentStreak: number,
  bestStreak: number,
  lastDailyDate: string,
  todayStr: string = getTodayDateString()
): { currentStreak: number; bestStreak: number; alreadySolvedToday: boolean } {
  if (lastDailyDate === todayStr) {
    return {
      currentStreak: Math.max(1, currentStreak),
      bestStreak: Math.max(bestStreak, currentStreak, 1),
      alreadySolvedToday: true,
    };
  }
  const yesterday = getYesterdayDateString(todayStr);
  const nextCurrent = lastDailyDate === yesterday ? currentStreak + 1 : 1;
  return {
    currentStreak: nextCurrent,
    bestStreak: Math.max(bestStreak, nextCurrent),
    alreadySolvedToday: false,
  };
}
