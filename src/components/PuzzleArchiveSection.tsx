import React, { useMemo, useState } from 'react';
import { Calendar, Check, Clock } from 'lucide-react';
import {
  DIFFICULTY_CONFIGS,
  getArchiveDailySummary,
  getPastDailyDates,
  getTodayDateString,
  type DifficultyLevel,
} from '../data/wordThemes';
import { useGame } from '../context/GameContext';

interface PuzzleArchiveSectionProps {
  difficulty: DifficultyLevel;
  onPlayArchiveDate: (dateStr: string) => void;
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export const PuzzleArchiveSection: React.FC<PuzzleArchiveSectionProps> = ({
  difficulty,
  onPlayArchiveDate,
}) => {
  const { completions } = useGame();
  const [filter, setFilter] = useState<'all' | 'unsolved' | 'solved'>('all');

  const todayStr = getTodayDateString();

  // Map dateStr -> best completion record across any difficulty for that date
  const completionByDate = useMemo(() => {
    const map = new Map<
      string,
      { score: number; durationSeconds: number; puzzleId: string }
    >();
    for (const c of completions) {
      const match = /^daily-(\d{4}-\d{2}-\d{2})/.exec(c.puzzleId);
      if (!match) continue;
      const dateStr = match[1];
      const existing = map.get(dateStr);
      if (!existing || c.score > existing.score) {
        map.set(dateStr, {
          score: c.score,
          durationSeconds: c.durationSeconds,
          puzzleId: c.puzzleId,
        });
      }
    }
    return map;
  }, [completions]);

  const archiveEntries = useMemo(() => {
    const dates = getPastDailyDates(30, todayStr);
    return dates.map((dateStr) => {
      const summary = getArchiveDailySummary(dateStr, difficulty, todayStr);
      const record = completionByDate.get(dateStr) ?? null;
      return { summary, record };
    });
  }, [todayStr, difficulty, completionByDate]);

  const solvedCount = useMemo(
    () => archiveEntries.filter((e) => e.record !== null).length,
    [archiveEntries]
  );

  const visibleEntries = useMemo(() => {
    return archiveEntries.filter((entry) => {
      if (filter === 'solved') return entry.record !== null;
      if (filter === 'unsolved') return entry.record === null;
      return true;
    });
  }, [archiveEntries, filter]);

  return (
    <div className="space-y-6">
      {/* Sub-header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#52606D] dark:text-[#94A3B8]">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#131B23] dark:text-[#F1F5F9]">
            <Calendar className="w-3.5 h-3.5 text-[#176B52] dark:text-[#2EB88A]" aria-hidden="true" />
            Last 30 Daily Editions
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {solvedCount}/30 Solved
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Playing in {DIFFICULTY_CONFIGS[difficulty].label} (
            {DIFFICULTY_CONFIGS[difficulty].gridSize}×
            {DIFFICULTY_CONFIGS[difficulty].gridSize})
          </span>
        </div>

        <div
          role="group"
          aria-label="Filter archived daily puzzles"
          className="inline-flex items-center p-1 rounded-lg bg-[#E9EDE8] dark:bg-[#161F2A] border border-[#D4DDD6] dark:border-[#263342] self-start sm:self-auto"
        >
          {(
            [
              { id: 'all', label: 'All Days' },
              { id: 'unsolved', label: 'Unsolved' },
              { id: 'solved', label: 'Completed' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                  : 'text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {visibleEntries.length === 0 ? (
        <div className="rounded-2xl p-10 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] text-center space-y-2">
          <p className="font-editorial text-lg font-semibold text-[#131B23] dark:text-[#F1F5F9]">
            {filter === 'solved'
              ? 'No archived daily puzzles completed yet.'
              : 'You have solved all 30 archived daily puzzles!'}
          </p>
          <p className="text-sm text-[#52606D] dark:text-[#94A3B8]">
            {filter === 'solved'
              ? 'Pick any past edition to earn points and fill out your archive log.'
              : 'Try switching to Challenge difficulty (10×10) to replay past editions.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleEntries.map(({ summary, record }) => (
            <article
              key={summary.dateStr}
              className="rounded-2xl p-5 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] flex flex-col justify-between gap-5"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-[#52606D] dark:text-[#94A3B8]">
                  <span className="font-mono tabular-nums font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                    {summary.displayDate}
                  </span>
                  <span>
                    {summary.isToday ? 'Today’s Edition' : summary.weekday}
                  </span>
                </div>

                <h2 className="font-editorial text-lg font-bold text-[#131B23] dark:text-[#F1F5F9]">
                  {summary.themeTitle}
                </h2>
                <p className="text-xs leading-relaxed text-[#52606D] dark:text-[#94A3B8]">
                  {summary.themeSubtitle}
                </p>
              </div>

              <div className="pt-3.5 border-t border-[#ECEFEA] dark:border-[#223040] flex items-center justify-between gap-3">
                {record ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-[#176B52] dark:text-[#2EB88A] font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      {record.score} pts
                    </span>
                    <span aria-hidden="true" className="opacity-50">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#52606D] dark:text-[#94A3B8] font-normal">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {formatDuration(record.durationSeconds)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-mono tabular-nums text-[#52606D] dark:text-[#94A3B8]">
                    {summary.wordCount} hidden words
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => onPlayArchiveDate(summary.dateStr)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    record
                      ? 'border border-[#D4DDD6] dark:border-[#2E3D4F] text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38]'
                      : 'bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410]'
                  }`}
                >
                  {record ? 'Replay' : summary.isToday ? 'Play Today' : 'Play Archive'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
