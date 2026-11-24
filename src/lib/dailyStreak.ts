import { getTodayDateString, getYesterdayDateString } from '../data/wordThemes';

export const DAILY_STREAK_STORAGE_KEY = 'lexiloom_daily_streak_v1';

export type DailyStreakStatus = 'completed_today' | 'active_pending' | 'inactive';

export interface DailyStreakDayCell {
  dateStr: string;
  shortDay: string;
  completed: boolean;
  isToday: boolean;
}

export interface StoredDailyStreak {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string;
  completedDates: string[];
}

export interface DailyStreakSnapshot extends StoredDailyStreak {
  completedToday: boolean;
  status: DailyStreakStatus;
  lastSevenDays: DailyStreakDayCell[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateStr(value: unknown): value is string {
  return typeof value === 'string' && DATE_RE.test(value);
}

function sanitizeDates(dates: unknown): string[] {
  if (!Array.isArray(dates)) return [];
  const unique = Array.from(new Set(dates.filter(isValidDateStr)));
  unique.sort();
  return unique.slice(-365);
}

function parseDateParts(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDateObj(dt: Date): string {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(dt.getDate()).padStart(2, '0')}`;
}

/**
 * Counts consecutive calendar days ending at `anchorDate` present in `dateSet`.
 */
function countConsecutiveDaysEndingAt(
  dateSet: Set<string>,
  anchorDate: string
): number {
  let count = 0;
  let cursor = anchorDate;
  while (dateSet.has(cursor) && count < 10000) {
    count += 1;
    cursor = getYesterdayDateString(cursor);
  }
  return count;
}

/**
 * Normalizes a persisted streak count against today's local date.
 * If the player's last daily completion was neither today nor yesterday,
 * the active streak resets to 0.
 */
export function normalizeEffectiveStreak(
  storedStreak: number,
  lastDailyDate: string,
  todayStr: string = getTodayDateString()
): number {
  const safeStored = Math.max(0, Math.round(Number.isFinite(storedStreak) ? storedStreak : 0));
  if (!isValidDateStr(lastDailyDate)) return 0;
  const yesterdayStr = getYesterdayDateString(todayStr);
  if (lastDailyDate === todayStr || lastDailyDate === yesterdayStr) {
    return Math.max(1, safeStored);
  }
  return 0;
}

function buildLastSevenDays(
  dateSet: Set<string>,
  todayStr: string
): DailyStreakDayCell[] {
  const todayObj = parseDateParts(todayStr);
  const cells: DailyStreakDayCell[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const dt = new Date(
      todayObj.getFullYear(),
      todayObj.getMonth(),
      todayObj.getDate() - offset
    );
    const dateStr = formatDateObj(dt);
    const shortDay = dt.toLocaleDateString('en-US', { weekday: 'narrow' });
    cells.push({
      dateStr,
      shortDay,
      completed: dateSet.has(dateStr),
      isToday: offset === 0,
    });
  }
  return cells;
}

function buildSnapshot(
  stored: StoredDailyStreak,
  todayStr: string = getTodayDateString()
): DailyStreakSnapshot {
  const yesterdayStr = getYesterdayDateString(todayStr);
  const dates = sanitizeDates(stored.completedDates);
  const dateSet = new Set(dates);

  const latestFromDates = dates.length > 0 ? dates[dates.length - 1] : '';
  const lastCompletedDate =
    isValidDateStr(stored.lastCompletedDate) &&
    stored.lastCompletedDate >= latestFromDates
      ? stored.lastCompletedDate
      : latestFromDates;

  // Ensure lastCompletedDate is reflected in dateSet when active
  if (isValidDateStr(lastCompletedDate)) {
    dateSet.add(lastCompletedDate);
  }

  const completedToday = lastCompletedDate === todayStr;
  const completedYesterday = lastCompletedDate === yesterdayStr;

  let currentStreak = 0;
  let status: DailyStreakStatus = 'inactive';

  if (completedToday) {
    const fromHistory = countConsecutiveDaysEndingAt(dateSet, todayStr);
    const fromStored = normalizeEffectiveStreak(
      stored.currentStreak,
      lastCompletedDate,
      todayStr
    );
    currentStreak = Math.max(fromHistory, fromStored, 1);
    status = 'completed_today';
  } else if (completedYesterday) {
    const fromHistory = countConsecutiveDaysEndingAt(dateSet, yesterdayStr);
    const fromStored = normalizeEffectiveStreak(
      stored.currentStreak,
      lastCompletedDate,
      todayStr
    );
    currentStreak = Math.max(fromHistory, fromStored, 1);
    status = 'active_pending';
  }

  const bestStreak = Math.max(
    0,
    Math.round(Number.isFinite(stored.bestStreak) ? stored.bestStreak : 0),
    currentStreak
  );

  // Backfill consecutive recent days in the 7-day strip if a user synced a multi-day streak
  if (currentStreak > 1 && isValidDateStr(lastCompletedDate)) {
    let cursor = lastCompletedDate;
    const backfillLimit = Math.min(currentStreak, 7);
    for (let i = 0; i < backfillLimit; i++) {
      dateSet.add(cursor);
      cursor = getYesterdayDateString(cursor);
    }
  }

  return {
    currentStreak,
    bestStreak,
    lastCompletedDate,
    completedDates: sanitizeDates(Array.from(dateSet)),
    completedToday,
    status,
    lastSevenDays: buildLastSevenDays(dateSet, todayStr),
  };
}

function readRawStorage(): StoredDailyStreak | null {
  try {
    const raw = localStorage.getItem(DAILY_STREAK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDailyStreak>;
    return {
      currentStreak:
        typeof parsed.currentStreak === 'number' ? parsed.currentStreak : 0,
      bestStreak: typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0,
      lastCompletedDate: isValidDateStr(parsed.lastCompletedDate)
        ? parsed.lastCompletedDate
        : '',
      completedDates: sanitizeDates(parsed.completedDates),
    };
  } catch {
    return null;
  }
}

function writeRawStorage(data: StoredDailyStreak): void {
  try {
    localStorage.setItem(
      DAILY_STREAK_STORAGE_KEY,
      JSON.stringify({
        currentStreak: data.currentStreak,
        bestStreak: data.bestStreak,
        lastCompletedDate: data.lastCompletedDate,
        completedDates: sanitizeDates(data.completedDates),
      })
    );
  } catch {
    // Ignore storage quota errors gracefully
  }
}

/**
 * Loads the normalized daily streak snapshot from localStorage, reconciling with
 * optional profile fields (for upgrades or cross-device sync).
 */
export function loadDailyStreakSnapshot(
  seedProfile?: {
    currentStreak: number;
    bestStreak: number;
    lastDailyDate: string;
  },
  todayStr: string = getTodayDateString()
): DailyStreakSnapshot {
  const existing = readRawStorage();
  const baseDates = existing ? [...existing.completedDates] : [];

  if (seedProfile && isValidDateStr(seedProfile.lastDailyDate)) {
    baseDates.push(seedProfile.lastDailyDate);
  }

  const candidateLastDate =
    seedProfile &&
    isValidDateStr(seedProfile.lastDailyDate) &&
    seedProfile.lastDailyDate > (existing?.lastCompletedDate || '')
      ? seedProfile.lastDailyDate
      : existing?.lastCompletedDate || '';

  const seedEffective = seedProfile
    ? normalizeEffectiveStreak(
        seedProfile.currentStreak,
        seedProfile.lastDailyDate,
        todayStr
      )
    : 0;
  const existingEffective = existing
    ? normalizeEffectiveStreak(
        existing.currentStreak,
        existing.lastCompletedDate,
        todayStr
      )
    : 0;

  const merged: StoredDailyStreak = {
    currentStreak: Math.max(seedEffective, existingEffective),
    bestStreak: Math.max(
      existing?.bestStreak || 0,
      seedProfile?.bestStreak || 0,
      seedEffective,
      existingEffective
    ),
    lastCompletedDate: candidateLastDate,
    completedDates: sanitizeDates(baseDates),
  };

  const snapshot = buildSnapshot(merged, todayStr);
  writeRawStorage(snapshot);
  return snapshot;
}

/**
 * Records a completed daily game in localStorage, incrementing consecutive
 * calendar-day streaks and preserving personal best.
 */
export function recordDailyCompletionInStorage(
  todayStr: string = getTodayDateString(),
  profileSeed?: {
    currentStreak: number;
    bestStreak: number;
    lastDailyDate: string;
  }
): { snapshot: DailyStreakSnapshot; alreadySolvedToday: boolean } {
  const prior = loadDailyStreakSnapshot(profileSeed, todayStr);
  const alreadySolvedToday = prior.completedToday;

  const updatedDates = sanitizeDates([...prior.completedDates, todayStr]);
  const yesterdayStr = getYesterdayDateString(todayStr);

  let nextCurrent: number;
  if (alreadySolvedToday) {
    nextCurrent = Math.max(1, prior.currentStreak);
  } else if (prior.lastCompletedDate === yesterdayStr) {
    nextCurrent = Math.max(1, prior.currentStreak) + 1;
  } else {
    nextCurrent = 1;
  }

  const nextBest = Math.max(prior.bestStreak, nextCurrent);

  const snapshot = buildSnapshot(
    {
      currentStreak: nextCurrent,
      bestStreak: nextBest,
      lastCompletedDate: todayStr,
      completedDates: updatedDates,
    },
    todayStr
  );

  writeRawStorage(snapshot);
  return { snapshot, alreadySolvedToday };
}
