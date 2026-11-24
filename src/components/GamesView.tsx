import React, { useMemo, useState } from 'react';
import { Grid3X3, Hash, Shuffle } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { CROSSWORD_PUZZLES } from '../data/crosswordPuzzles';
import { ANAGRAM_SETS, WORD_GUESS_ENTRIES } from '../data/wordGamesData';
import { MiniCrosswordGame } from './MiniCrosswordGame';
import { WordGuessGame } from './WordGuessGame';
import { WordScrambleGame } from './WordScrambleGame';

export type MiniGameId = 'crossword' | 'lettershift' | 'anagram';

interface GamesViewProps {
  onGoToLeaderboard: () => void;
}

export const GamesView: React.FC<GamesViewProps> = ({ onGoToLeaderboard }) => {
  const { completions } = useGame();
  const [activeGame, setActiveGame] = useState<MiniGameId>('crossword');

  const stats = useMemo(() => {
    const ids = new Set(completions.map((c) => c.puzzleId));
    return {
      crossword: CROSSWORD_PUZZLES.filter((p) => ids.has(p.id)).length,
      lettershift: WORD_GUESS_ENTRIES.filter((e) => ids.has(e.id)).length,
      anagram: ANAGRAM_SETS.filter((s) => ids.has(s.id)).length,
    };
  }, [completions]);

  const gameTabs: {
    id: MiniGameId;
    label: string;
    detail: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'crossword',
      label: 'Mini Crossword',
      detail: `${stats.crossword}/${CROSSWORD_PUZZLES.length} solved`,
      icon: <Grid3X3 className="w-4 h-4 shrink-0" aria-hidden="true" />,
    },
    {
      id: 'lettershift',
      label: 'Letter Shift',
      detail: `${stats.lettershift}/${WORD_GUESS_ENTRIES.length} solved`,
      icon: <Hash className="w-4 h-4 shrink-0" aria-hidden="true" />,
    },
    {
      id: 'anagram',
      label: 'Anagram Forge',
      detail: `${stats.anagram}/${ANAGRAM_SETS.length} solved`,
      icon: <Shuffle className="w-4 h-4 shrink-0" aria-hidden="true" />,
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      {/* Editorial Header & Clean Segmented Game Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#52606D] dark:text-[#94A3B8]">
            Word Games Collection · Offline Ready · Synced to Leaderboard
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight text-[#131B23] dark:text-[#F1F5F9]">
            Classic Word Games
          </h1>
        </div>

        <div
          role="tablist"
          aria-label="Choose a word game"
          className="inline-flex flex-wrap sm:flex-nowrap items-center gap-1 p-1 rounded-xl border border-[#D4DDD6] dark:border-[#263342] bg-[#ECEFEA] dark:bg-[#111922]"
        >
          {gameTabs.map((tab) => {
            const isSelected = activeGame === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveGame(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-white dark:bg-[#1E2A38] text-[#131B23] dark:text-[#F1F5F9] shadow-sm'
                    : 'text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className="hidden sm:inline font-mono tabular-nums text-[11px] opacity-70">
                  {tab.detail}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Word Game Workspace */}
      <div>
        {activeGame === 'crossword' && (
          <MiniCrosswordGame onGoToLeaderboard={onGoToLeaderboard} />
        )}
        {activeGame === 'lettershift' && (
          <WordGuessGame onGoToLeaderboard={onGoToLeaderboard} />
        )}
        {activeGame === 'anagram' && (
          <WordScrambleGame onGoToLeaderboard={onGoToLeaderboard} />
        )}
      </div>
    </section>
  );
};
