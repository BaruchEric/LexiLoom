import React from 'react';
import { ArrowRight, Check, Flame } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface DailyStreakTrackerProps {
  onPlayDaily?: () => void;
}

export const DailyStreakTracker: React.FC<DailyStreakTrackerProps> = ({
  onPlayDaily,
}) => {
  const { dailyStreak } = useGame();
  const { currentStreak, bestStreak, completedToday, completedDates, lastSevenDays } =
    dailyStreak;

  const statusLabel = completedToday
    ? 'Played today · Streak secured'
    : currentStreak > 0
    ? 'Active · Play a puzzle today to extend'
    : 'Play today to start your streak';

  return (
    <section
      aria-labelledby="daily-streak-tracker-heading"
      className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342]"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Current Streak Figure & Non-Hue-Only Status */}
        <div className="flex items-start sm:items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              completedToday
                ? 'bg-[#FEF3C7] dark:bg-[#2A2112] border-[#D97706]/40 text-[#9A5B13] dark:text-[#F59E0B]'
                : currentStreak > 0
                ? 'bg-[#FFFBEB] dark:bg-[#241D11] border-[#D97706]/30 text-[#B45309] dark:text-[#FBBF24]'
                : 'bg-[#F6F7F5] dark:bg-[#0F1721] border-[#E2E6E1] dark:border-[#263342] text-[#52606D] dark:text-[#94A3B8]'
            }`}
            aria-hidden="true"
          >
            <Flame
              className={`w-6 h-6 ${completedToday ? 'fill-current' : ''}`}
            />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#52606D] dark:text-[#94A3B8]">
              <h2
                id="daily-streak-tracker-heading"
                className="font-semibold text-[#131B23] dark:text-[#F1F5F9]"
              >
                Daily Streak Tracker
              </h2>
              <span aria-hidden="true">·</span>
              <span
                className={
                  completedToday
                    ? 'font-medium text-[#176B52] dark:text-[#2EB88A]'
                    : 'text-[#52606D] dark:text-[#94A3B8]'
                }
              >
                {statusLabel}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono tabular-nums text-3xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
                  {currentStreak}
                </span>
                <span className="text-sm font-medium text-[#52606D] dark:text-[#94A3B8]">
                  consecutive {currentStreak === 1 ? 'day' : 'days'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-[#52606D] dark:text-[#94A3B8]">
                <span>
                  Best{' '}
                  <strong className="text-[#131B23] dark:text-[#F1F5F9]">
                    {bestStreak}d
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Total active{' '}
                  <strong className="text-[#131B23] dark:text-[#F1F5F9]">
                    {completedDates.length}d
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: 7-Day Consecutive Play Strip + Optional Quick Play CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-5">
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-[#52606D] dark:text-[#94A3B8]">
              Last 7 Days
            </div>
            <div
              className="grid grid-cols-7 gap-2"
              role="list"
              aria-label="Last 7 days puzzle streak activity"
            >
              {lastSevenDays.map((day) => (
                <div
                  key={day.dateStr}
                  role="listitem"
                  title={`${day.dateStr}: ${
                    day.completed ? 'Puzzle played' : 'No puzzle completed'
                  }`}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-semibold ${
                      day.completed
                        ? 'bg-[#176B52] dark:bg-[#2EB88A] border-[#176B52] dark:border-[#2EB88A] text-white dark:text-[#0B1410]'
                        : day.isToday
                        ? 'bg-[#FFFBEB] dark:bg-[#2A2112] border-[#D97706] dark:border-[#F59E0B] text-[#92400E] dark:text-[#FCD34D]'
                        : 'bg-[#F6F7F5] dark:bg-[#0F1721] border-[#E2E6E1] dark:border-[#263342] text-[#94A3B8]'
                    }`}
                  >
                    {day.completed ? (
                      <Check className="w-4 h-4" aria-label="Completed" />
                    ) : (
                      <span aria-label="Not completed">·</span>
                    )}
                  </div>
                  <span
                    className={`font-mono text-[10px] ${
                      day.isToday
                        ? 'font-bold text-[#131B23] dark:text-[#F1F5F9]'
                        : 'text-[#52606D] dark:text-[#94A3B8]'
                    }`}
                  >
                    {day.shortDay}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {!completedToday && onPlayDaily && (
            <button
              type="button"
              onClick={onPlayDaily}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
            >
              <span>Play Today</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
