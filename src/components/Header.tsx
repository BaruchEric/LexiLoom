import React, { useEffect, useRef, useState } from 'react';
import { Check, Flame, X } from 'lucide-react';
import { AvatarDisplay } from './AvatarDisplay';
import { useGame } from '../context/GameContext';
import { loadHapticsEnabled, vibrateTileTap } from '../lib/haptics';

export type AppTab = 'daily' | 'games' | 'themes' | 'leaderboard' | 'profile';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

const NAV_ITEMS: { id: AppTab; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'games', label: 'Games' },
  { id: 'themes', label: 'Themes' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'profile', label: 'Profile' },
];

export const Header: React.FC<HeaderProps> = ({ activeTab, onSelectTab }) => {
  const { user, profile, dailyStreak, signInWithGoogle } = useGame();
  const [streakOpen, setStreakOpen] = useState(false);
  const streakMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!streakOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        streakMenuRef.current &&
        !streakMenuRef.current.contains(e.target as Node)
      ) {
        setStreakOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setStreakOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [streakOpen]);

  const streakCount = dailyStreak.currentStreak;
  const isCompletedToday = dailyStreak.completedToday;
  const isActiveStreak = streakCount > 0;

  return (
    <header className="sticky top-0 z-30 bg-[#F6F7F5]/95 dark:bg-[#0D131A]/95 backdrop-blur-sm border-b border-[#E2E6E1] dark:border-[#223040]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single text element Brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('daily')}
          className="font-editorial text-xl sm:text-2xl font-bold tracking-tight text-[#131B23] dark:text-[#F1F5F9] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#176B52] rounded"
        >
          LexiLoom
        </button>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#176B52] rounded ${
                  isActive
                    ? 'text-[#131B23] dark:text-[#F1F5F9]'
                    : 'text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[13px] h-0.5 bg-[#176B52] dark:bg-[#2EB88A]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Daily Streak Indicator + Primary Account Action */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Interactive Daily Streak Indicator */}
          <div ref={streakMenuRef} className="relative">
            <button
              type="button"
              onClick={() => {
                vibrateTileTap(loadHapticsEnabled());
                setStreakOpen((open) => !open);
              }}
              aria-expanded={streakOpen}
              aria-haspopup="dialog"
              aria-label={`Daily streak badge: ${streakCount} consecutive ${
                streakCount === 1 ? 'day' : 'days'
              }${isCompletedToday ? ', played today' : ', play a puzzle today to extend'}`}
              title={
                isCompletedToday
                  ? `${streakCount}-day daily streak secured today`
                  : isActiveStreak
                  ? `${streakCount}-day streak active — play a puzzle today to keep it going`
                  : 'Play a puzzle today to start a daily streak'
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52] ${
                isCompletedToday
                  ? 'bg-[#FEF3C7]/75 dark:bg-[#2A2112] border-[#D97706]/45 text-[#9A5B13] dark:text-[#F59E0B] hover:bg-[#FEF3C7] dark:hover:bg-[#362916]'
                  : isActiveStreak
                  ? 'bg-[#FFFBEB] dark:bg-[#241D11] border-[#D97706]/30 text-[#B45309] dark:text-[#FBBF24] hover:bg-[#FEF3C7]/70 dark:hover:bg-[#2E2414]'
                  : 'bg-white dark:bg-[#161F2A] border-[#D4DDD6] dark:border-[#2A394A] text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38]'
              }`}
            >
              <Flame
                key={`flame-${streakCount}-${isCompletedToday}`}
                className={`w-4 h-4 shrink-0 ${
                  isCompletedToday ? 'fill-current lexiloom-tile-pop' : ''
                }`}
                aria-hidden="true"
              />
              <span className="font-mono tabular-nums leading-none">
                {streakCount}d
              </span>
              {isCompletedToday && (
                <Check
                  className="w-3.5 h-3.5 text-[#176B52] dark:text-[#2EB88A] shrink-0"
                  aria-hidden="true"
                />
              )}
            </button>

            {streakOpen && (
              <div
                role="dialog"
                aria-label="Daily streak summary"
                className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#161F2A] border border-[#D4DDD6] dark:border-[#2E3D4F] shadow-xl space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-[#52606D] dark:text-[#94A3B8]">
                      Daily Streak
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="font-mono tabular-nums text-2xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
                        {streakCount}{' '}
                        <span className="font-sans text-sm font-medium text-[#52606D] dark:text-[#94A3B8]">
                          {streakCount === 1 ? 'day' : 'days'}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-xs text-[#94A3B8]"
                      >
                        ·
                      </span>
                      <span className="font-mono tabular-nums text-xs text-[#52606D] dark:text-[#94A3B8]">
                        Best {dailyStreak.bestStreak}d
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStreakOpen(false)}
                    aria-label="Close daily streak panel"
                    className="p-1 rounded-md text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] transition-colors"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <p className="text-xs leading-relaxed text-[#52606D] dark:text-[#CBD5E1]">
                  {isCompletedToday
                    ? 'You played a puzzle today! Return tomorrow to extend your consecutive streak.'
                    : isActiveStreak
                    ? `Complete any puzzle today to extend your streak to ${
                        streakCount + 1
                      } consecutive days.`
                    : 'Complete any puzzle today to start tracking your consecutive daily streak.'}
                </p>

                {/* Last 7 Days Consecutive Completion Strip */}
                <div className="space-y-2 pt-2 border-t border-[#ECEFEA] dark:border-[#223040]">
                  <div className="text-xs font-medium text-[#52606D] dark:text-[#94A3B8]">
                    Last 7 Days
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {dailyStreak.lastSevenDays.map((day) => (
                      <div
                        key={day.dateStr}
                        className="flex flex-col items-center gap-1"
                        title={`${day.dateStr}: ${
                          day.completed ? 'Completed' : 'Not completed'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center border text-xs font-semibold ${
                            day.completed
                              ? 'bg-[#176B52] dark:bg-[#2EB88A] border-[#176B52] dark:border-[#2EB88A] text-white dark:text-[#0B1410]'
                              : day.isToday
                              ? 'bg-[#FFFBEB] dark:bg-[#2A2112] border-[#D97706] dark:border-[#F59E0B] text-[#92400E] dark:text-[#FCD34D]'
                              : 'bg-[#F6F7F5] dark:bg-[#0F1721] border-[#E2E6E1] dark:border-[#263342] text-[#94A3B8]'
                          }`}
                        >
                          {day.completed ? (
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <span aria-hidden="true">·</span>
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

                <button
                  type="button"
                  onClick={() => {
                    setStreakOpen(false);
                    onSelectTab(isCompletedToday ? 'profile' : 'daily');
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  {isCompletedToday
                    ? 'View Performance Dashboard'
                    : 'Play Today’s Daily Puzzle'}
                </button>
              </div>
            )}
          </div>

          {user ? (
            <button
              type="button"
              onClick={() => onSelectTab('profile')}
              className="flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-lg border border-[#D4DDD6] dark:border-[#2A394A] bg-white dark:bg-[#161F2A] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
            >
              <AvatarDisplay
                avatarType={profile.avatarType}
                avatarId={profile.avatarId}
                avatarInitials={profile.avatarInitials}
                avatarColor={profile.avatarColor}
                displayName={profile.displayName}
                size="sm"
              />
              <span className="text-sm font-medium text-[#131B23] dark:text-[#F1F5F9] max-w-[120px] truncate hidden sm:inline">
                {profile.displayName}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="px-4 py-2 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Compact single-line mobile nav row (< md) keeping sticky chrome well under 15% */}
      <nav
        aria-label="Mobile navigation"
        className="flex md:hidden items-center justify-around border-t border-[#E2E6E1] dark:border-[#223040] px-2 h-11"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                isActive
                  ? 'border-[#176B52] dark:border-[#2EB88A] text-[#131B23] dark:text-[#F1F5F9]'
                  : 'border-transparent text-[#52606D] dark:text-[#94A3B8]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
