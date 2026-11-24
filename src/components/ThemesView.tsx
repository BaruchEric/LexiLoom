import React, { useEffect, useState } from 'react';
import { Calendar, Check, Lock, RefreshCw } from 'lucide-react';
import {
  DIFFICULTY_CONFIGS,
  WORD_THEME_PACKS,
  type DifficultyLevel,
} from '../data/wordThemes';
import { useGame } from '../context/GameContext';
import { PuzzleArchiveSection } from './PuzzleArchiveSection';

interface ThemesViewProps {
  difficulty: DifficultyLevel;
  initialSection?: 'themes' | 'archive';
  onChangeDifficulty: (level: DifficultyLevel) => void;
  onPlayTheme: (themeId: string) => void;
  onPlayArchiveDate: (dateStr: string) => void;
}

export const ThemesView: React.FC<ThemesViewProps> = ({
  difficulty,
  initialSection = 'themes',
  onChangeDifficulty,
  onPlayTheme,
  onPlayArchiveDate,
}) => {
  const { profile, unlockPeriodicUpdates } = useGame();
  const [section, setSection] = useState<'themes' | 'archive'>(initialSection);
  const [filter, setFilter] = useState<'all' | 'core' | 'updates'>('all');
  const [updateNotice, setUpdateNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const lockedUpdatesCount = WORD_THEME_PACKS.filter(
    (p) => !profile.unlockedPackIds.includes(p.id)
  ).length;

  const handleCheckUpdates = async () => {
    setChecking(true);
    setUpdateNotice(null);
    const unlockedCount = await unlockPeriodicUpdates();
    window.setTimeout(() => {
      setChecking(false);
      if (unlockedCount > 0) {
        setUpdateNotice(
          `Downloaded ${unlockedCount} new periodic word theme ${
            unlockedCount === 1 ? 'edition' : 'editions'
          } for online & offline play.`
        );
      } else {
        setUpdateNotice(
          'Your theme library is completely up to date and cached for offline play.'
        );
      }
    }, 350);
  };

  const visiblePacks = WORD_THEME_PACKS.filter((pack) => {
    if (filter === 'core') return !pack.isPeriodicUpdate;
    if (filter === 'updates') return pack.isPeriodicUpdate;
    return true;
  });

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#E2E6E1] dark:border-[#223040]">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#52606D] dark:text-[#94A3B8]">
            <span>
              {section === 'archive'
                ? 'Past Daily Challenges'
                : 'Curated Word Editions'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {profile.completedThemeIds.length}/{WORD_THEME_PACKS.length} Themes Solved
            </span>
            <span aria-hidden="true">·</span>
            <span>{DIFFICULTY_CONFIGS[difficulty].description}</span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight text-[#131B23] dark:text-[#F1F5F9]">
            {section === 'archive' ? 'Daily Puzzles Archive' : 'Word Theme Library'}
          </h1>
          <p className="text-sm sm:text-base text-[#52606D] dark:text-[#94A3B8]">
            {section === 'archive'
              ? 'Revisit any daily challenge from the past 30 days at your preferred difficulty level, online or offline.'
              : 'Explore handcrafted vocabulary themes and pull periodic seasonal editions directly into your offline library.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Primary Section Switch: Word Themes vs Daily Archive */}
          <div
            role="tablist"
            aria-label="Browse Word Themes or Daily Archive"
            className="inline-flex items-center p-1 rounded-lg bg-[#E9EDE8] dark:bg-[#161F2A] border border-[#D4DDD6] dark:border-[#263342]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={section === 'themes'}
              onClick={() => setSection('themes')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                section === 'themes'
                  ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                  : 'text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
              }`}
            >
              Word Themes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === 'archive'}
              onClick={() => setSection('archive')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                section === 'archive'
                  ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                  : 'text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              Daily Archive
            </button>
          </div>

          <div
            role="group"
            aria-label="Theme puzzle difficulty"
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

          {section === 'themes' && (
            <>
              <div
                role="group"
                aria-label="Filter word themes"
                className="inline-flex items-center p-1 rounded-lg bg-[#E9EDE8] dark:bg-[#161F2A] border border-[#D4DDD6] dark:border-[#263342]"
              >
                {(
                  [
                    { id: 'all', label: 'All Packs' },
                    { id: 'core', label: 'Core' },
                    { id: 'updates', label: 'Periodic Updates' },
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

              <button
                type="button"
                onClick={() => void handleCheckUpdates()}
                disabled={checking}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw
                  className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {lockedUpdatesCount > 0
                  ? `Download ${lockedUpdatesCount} New Editions`
                  : 'Check Theme Updates'}
              </button>
            </>
          )}
        </div>
      </div>

      {section === 'archive' ? (
        <PuzzleArchiveSection
          difficulty={difficulty}
          onPlayArchiveDate={onPlayArchiveDate}
        />
      ) : (
        <>
          {updateNotice && (
            <div
              role="status"
              className="rounded-xl px-4 py-3 bg-[#E4F2EC] dark:bg-[#15392E] border border-[#A7D7C5] dark:border-[#25634F] text-sm font-medium text-[#11533F] dark:text-[#A7F3D0]"
            >
              {updateNotice}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visiblePacks.map((pack) => {
          const isUnlocked = profile.unlockedPackIds.includes(pack.id);
          const isSolved = profile.completedThemeIds.includes(pack.id);

          return (
            <article
              key={pack.id}
              className="rounded-2xl p-6 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] flex flex-col justify-between gap-6"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs text-[#52606D] dark:text-[#94A3B8]">
                  <span>{pack.edition}</span>
                  <span>{pack.difficulty}</span>
                </div>
                <h2 className="font-editorial text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
                  {pack.title}
                </h2>
                <p className="text-sm leading-relaxed text-[#52606D] dark:text-[#94A3B8]">
                  {pack.subtitle}
                </p>
                <div className="pt-1 flex items-center gap-2 text-xs text-[#52606D] dark:text-[#94A3B8]">
                  <span className="font-mono tabular-nums">
                    {pack.words.length} curated words
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{pack.releaseMonth}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#ECEFEA] dark:border-[#223040] flex items-center justify-between gap-4">
                {isSolved ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#176B52] dark:text-[#2EB88A]">
                    <Check className="w-4 h-4" aria-hidden="true" />
                    Completed
                  </span>
                ) : isUnlocked ? (
                  <span className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                    Ready Offline
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#52606D] dark:text-[#94A3B8]">
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    Periodic Release
                  </span>
                )}

                {isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => onPlayTheme(pack.id)}
                    className="px-4 py-2 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    {isSolved ? 'Replay' : 'Play Theme'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleCheckUpdates()}
                    className="px-4 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    Download Pack
                  </button>
                )}
              </div>
            </article>
          );
        })}
          </div>
        </>
      )}
    </section>
  );
};
