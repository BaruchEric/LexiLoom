import React, { useMemo, useState } from 'react';
import { ArrowDownUp, ArrowRight, Search } from 'lucide-react';
import { useGame } from '../context/GameContext';
import {
  classifyPuzzleMode,
  formatPerformanceTime,
  type PuzzleModeCategory,
} from '../lib/performanceStats';
import type { LocalCompletionRecord } from '../lib/storage';
import {
  getArchiveDailySummary,
  WORD_THEME_PACKS,
} from '../data/wordThemes';
import { CROSSWORD_PUZZLES } from '../data/crosswordPuzzles';
import { ANAGRAM_SETS, WORD_GUESS_ENTRIES } from '../data/wordGamesData';
import { DictionaryTooltip } from './DictionaryTooltip';

interface GameHistorySectionProps {
  onPlayDaily?: () => void;
  maxItems?: number;
}

type HistoryFilter = 'all' | PuzzleModeCategory;
type SortOrder = 'newest' | 'oldest';

const HISTORY_FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'Daily Word Search', label: 'Daily' },
  { id: 'Themes & Archive', label: 'Themes' },
  { id: 'Mini Crossword', label: 'Crossword' },
  { id: 'Letter Shift', label: 'Letter Shift' },
  { id: 'Anagram Forge', label: 'Anagrams' },
];

interface ResolvedPuzzleWords {
  primaryWord: string;
  allWords: string[];
  extraCount: number;
}

function resolveCompletionWords(
  record: LocalCompletionRecord
): ResolvedPuzzleWords {
  if (record.puzzleWord && record.puzzleWord.trim().length > 0) {
    const primary = record.puzzleWord.trim().toUpperCase();
    const list =
      record.puzzleWords && record.puzzleWords.length > 0
        ? record.puzzleWords
        : [primary];
    const totalCount = Math.max(list.length, record.wordsFound || 1);
    return {
      primaryWord: primary,
      allWords: list,
      extraCount: Math.max(0, totalCount - 1),
    };
  }

  // Fallback resolution for older or cloud-synced records without cached puzzleWord
  const wg = WORD_GUESS_ENTRIES.find((e) => e.id === record.puzzleId);
  if (wg) {
    return { primaryWord: wg.word, allWords: [wg.word], extraCount: 0 };
  }

  const cw = CROSSWORD_PUZZLES.find((c) => c.id === record.puzzleId);
  if (cw) {
    const words = [
      ...Object.keys(cw.clues.across),
      ...Object.keys(cw.clues.down),
    ];
    return {
      primaryWord: words[0] || cw.title.toUpperCase(),
      allWords: words,
      extraCount: Math.max(0, words.length - 1),
    };
  }

  const ana = ANAGRAM_SETS.find((s) => s.id === record.puzzleId);
  if (ana) {
    const words = ana.words.map((w) => w.word);
    return {
      primaryWord: words[words.length - 1] || words[0] || ana.title.toUpperCase(),
      allWords: words,
      extraCount: Math.max(0, words.length - 1),
    };
  }

  // Daily or Archive puzzle: extract YYYY-MM-DD from puzzleId
  const dateMatch = record.puzzleId.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    const summary = getArchiveDailySummary(dateMatch[1]);
    const pack = WORD_THEME_PACKS.find((p) => p.id === summary.themeId);
    if (pack && pack.words.length > 0) {
      const words = pack.words.map((w) => w.word);
      const totalCount = Math.max(record.wordsFound || words.length, 1);
      return {
        primaryWord: words[0],
        allWords: words,
        extraCount: Math.max(0, totalCount - 1),
      };
    }
  }

  // Theme puzzle: match by id or title substring
  const packMatch = WORD_THEME_PACKS.find(
    (p) =>
      record.puzzleId.includes(p.id) ||
      record.themeName.toLowerCase().includes(p.title.toLowerCase())
  );
  if (packMatch && packMatch.words.length > 0) {
    const words = packMatch.words.map((w) => w.word);
    const totalCount = Math.max(record.wordsFound || words.length, 1);
    return {
      primaryWord: words[0],
      allWords: words,
      extraCount: Math.max(0, totalCount - 1),
    };
  }

  const fallbackLabel = record.themeName
    .replace(/^(Daily Challenge|Archive|Mini Crossword|Letter Shift|Anagram Forge)\s*[:·-]\s*/i, '')
    .replace(/\s*\((Easy|Standard|Challenge)\)\s*$/i, '')
    .trim()
    .toUpperCase();

  return {
    primaryWord: fallbackLabel || 'PUZZLE',
    allWords: fallbackLabel ? [fallbackLabel] : [],
    extraCount: Math.max(0, (record.wordsFound || 1) - 1),
  };
}

function formatHistoryDate(iso: string): { date: string; time: string } {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) {
    return { date: 'Unknown date', time: '' };
  }
  return {
    date: dt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: dt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
}

export const GameHistorySection: React.FC<GameHistorySectionProps> = ({
  onPlayDaily,
  maxItems = 30,
}) => {
  const { completions } = useGame();
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  const fastestTimeSeconds = useMemo<number | null>(() => {
    const valid = completions
      .map((c) => c.durationSeconds)
      .filter((s) => typeof s === 'number' && s > 0);
    if (valid.length === 0) return null;
    return Math.min(...valid);
  }, [completions]);

  const enrichedRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const rows = completions.map((rec) => {
      const modeCategory = classifyPuzzleMode(
        rec.puzzleId,
        rec.mode,
        rec.themeName
      );
      const resolved = resolveCompletionWords(rec);
      const formattedDate = formatHistoryDate(rec.completedAtIso);
      return {
        record: rec,
        modeCategory,
        resolved,
        formattedDate,
      };
    });

    const filtered = rows.filter((row) => {
      if (filter !== 'all' && row.modeCategory !== filter) return false;
      if (!normalizedQuery) return true;
      const haystack = [
        row.resolved.primaryWord,
        ...row.resolved.allWords,
        row.record.themeName,
        row.modeCategory,
        row.formattedDate.date,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    filtered.sort((a, b) => {
      const cmp = a.record.completedAtIso.localeCompare(b.record.completedAtIso);
      return sortOrder === 'newest' ? -cmp : cmp;
    });

    return filtered.slice(0, maxItems);
  }, [completions, filter, sortOrder, searchQuery, maxItems]);

  return (
    <section
      aria-labelledby="game-history-heading"
      className="rounded-2xl p-6 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-5"
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-[#ECEFEA] dark:border-[#223040]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#52606D] dark:text-[#94A3B8]">
            <span className="font-mono tabular-nums">
              {completions.length}{' '}
              {completions.length === 1 ? 'Completed Puzzle' : 'Completed Puzzles'}
            </span>
            {fastestTimeSeconds !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Fastest {formatPerformanceTime(fastestTimeSeconds)}
                </span>
              </>
            )}
          </div>
          <h2
            id="game-history-heading"
            className="font-editorial text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]"
          >
            Game History
          </h2>
          <p className="text-xs text-[#52606D] dark:text-[#94A3B8]">
            Chronological log of recently completed puzzles, target words, and
            final elapsed times.
          </p>
        </div>

        {/* Search + Chronological Sort Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-initial sm:w-56">
            <Search
              className="w-3.5 h-3.5 text-[#52606D] dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search word or date…"
              aria-label="Search game history by word, theme, or date"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#F6F7F5] dark:bg-[#0F1721] border border-[#D4DDD6] dark:border-[#2E3D4F] text-xs text-[#131B23] dark:text-[#F1F5F9] placeholder:text-[#64748B] focus-visible:outline-2 focus-visible:outline-[#176B52] dark:focus-visible:outline-[#2EB88A]"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
            }
            aria-label={`Sort chronology: currently ${
              sortOrder === 'newest' ? 'newest first' : 'oldest first'
            }`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] bg-[#F6F7F5] dark:bg-[#0F1721] hover:bg-[#E9EDE8] dark:hover:bg-[#1E2A38] text-xs font-semibold text-[#131B23] dark:text-[#F1F5F9] transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowDownUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Mode Filter Bar */}
      <div
        role="group"
        aria-label="Filter game history by puzzle mode"
        className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#E9EDE8] dark:bg-[#0F1721] border border-[#D4DDD6] dark:border-[#263342] w-fit"
      >
        {HISTORY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              filter === f.id
                ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                : 'text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Empty, Filtered-Empty, or Populated Table */}
      {completions.length === 0 ? (
        <div className="py-10 px-4 text-center border border-dashed border-[#D4DDD6] dark:border-[#2A3849] rounded-xl space-y-3">
          <p className="text-sm font-semibold text-[#131B23] dark:text-[#F1F5F9]">
            No completed puzzles recorded yet
          </p>
          <p className="text-xs text-[#52606D] dark:text-[#94A3B8] max-w-sm mx-auto">
            Finish today&apos;s Daily Challenge or any Word Game to start
            building your chronological game history with dates, puzzle words,
            and solve times.
          </p>
          {onPlayDaily && (
            <button
              type="button"
              onClick={onPlayDaily}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <span>Play Today&apos;s Daily Puzzle</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      ) : enrichedRows.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <p className="text-sm text-[#52606D] dark:text-[#94A3B8]">
            No completed puzzles match your current filter or search.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilter('all');
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-[#176B52] dark:text-[#2EB88A] hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E2E6E1] dark:border-[#223040] text-xs font-medium text-[#52606D] dark:text-[#94A3B8]">
                <th className="py-2.5 pr-4 font-medium whitespace-nowrap">
                  Date
                </th>
                <th className="py-2.5 px-3 font-medium">Puzzle Word</th>
                <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">
                  Elapsed Time
                </th>
                <th className="py-2.5 pl-3 font-medium text-right whitespace-nowrap">
                  Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEFEA] dark:divide-[#223040]">
              {enrichedRows.map(
                ({ record, modeCategory, resolved, formattedDate }, idx) => {
                  const isFastest =
                    fastestTimeSeconds !== null &&
                    record.durationSeconds > 0 &&
                    record.durationSeconds === fastestTimeSeconds;

                  return (
                    <tr
                      key={`${record.puzzleId}-${record.completedAtIso}-${idx}`}
                      className="hover:bg-[#F6F7F5] dark:hover:bg-[#1B2635] transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3.5 pr-4 align-top whitespace-nowrap">
                        <div className="font-mono tabular-nums text-xs font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                          {formattedDate.date}
                        </div>
                        {formattedDate.time && (
                          <div className="font-mono tabular-nums text-[11px] text-[#52606D] dark:text-[#94A3B8]">
                            {formattedDate.time}
                          </div>
                        )}
                      </td>

                      {/* Puzzle Word + quiet unboxed theme/mode metadata */}
                      <td className="py-3.5 px-3 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold tracking-wider text-[#131B23] dark:text-[#F1F5F9]">
                            {resolved.primaryWord}
                          </span>
                          {resolved.extraCount > 0 && (
                            <span className="text-xs font-mono tabular-nums text-[#52606D] dark:text-[#94A3B8]">
                              +{resolved.extraCount} more
                            </span>
                          )}
                          {/^[A-Z]{3,}$/.test(resolved.primaryWord) && (
                            <DictionaryTooltip
                              word={resolved.primaryWord}
                              fallbackClue={record.themeName}
                              align="left"
                            />
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-[#52606D] dark:text-[#94A3B8]">
                          <span>{record.themeName}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{modeCategory}</span>
                        </div>
                      </td>

                      {/* Final Elapsed Time */}
                      <td className="py-3.5 px-3 align-top text-right whitespace-nowrap">
                        <div className="font-mono tabular-nums text-sm font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                          {formatPerformanceTime(record.durationSeconds)}
                        </div>
                        {isFastest && (
                          <div className="text-[11px] font-semibold text-[#176B52] dark:text-[#2EB88A]">
                            Fastest
                          </div>
                        )}
                      </td>

                      {/* Score & hints */}
                      <td className="py-3.5 pl-3 align-top text-right whitespace-nowrap">
                        <div className="font-mono tabular-nums text-sm font-bold text-[#176B52] dark:text-[#2EB88A]">
                          {record.score.toLocaleString()} pts
                        </div>
                        <div className="font-mono tabular-nums text-[11px] text-[#52606D] dark:text-[#94A3B8]">
                          {record.hintsUsed === 0
                            ? 'No hints'
                            : `${record.hintsUsed} ${
                                record.hintsUsed === 1 ? 'hint' : 'hints'
                              }`}
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
