import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, RefreshCw, X } from 'lucide-react';
import { loadHapticsEnabled, vibrateTileTap } from '../lib/haptics';

export interface WordInsightResult {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  etymology: string;
  originLanguage: string;
  era: string;
  exampleSentence: string;
  relatedRoots: string[];
}

export interface SolutionWordOption {
  word: string;
  clue?: string;
}

interface WordEtymologyButtonProps {
  /** Primary solution word (and optional full list of words in the completed puzzle) */
  words: SolutionWordOption[];
  label?: string;
  compact?: boolean;
  className?: string;
}

const sessionInsightCache = new Map<string, WordInsightResult>();

export const WordEtymologyButton: React.FC<WordEtymologyButtonProps> = ({
  words,
  label = 'Word Origin & Definition',
  compact = false,
  className = '',
}) => {
  const validWords = words.filter((w) => w.word && w.word.trim().length >= 2);
  const defaultWord = validWords[0]?.word.toUpperCase() || '';

  const [isOpen, setIsOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState(defaultWord);
  const [insight, setInsight] = useState<WordInsightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (defaultWord && !validWords.some((w) => w.word.toUpperCase() === selectedWord)) {
      setSelectedWord(defaultWord);
    }
  }, [defaultWord, selectedWord, validWords]);

  const fetchWordInsight = useCallback(
    async (targetWord: string, bypassCache = false) => {
      const normalized = targetWord.trim().toUpperCase();
      if (!normalized) return;

      if (!bypassCache && sessionInsightCache.has(normalized)) {
        setInsight(sessionInsightCache.get(normalized) || null);
        setError(null);
        setLoading(false);
        return;
      }

      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setInsight(null);

      const matchedEntry = validWords.find(
        (w) => w.word.toUpperCase() === normalized
      );

      try {
        const response = await fetch('/api/word-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word: normalized,
            context: matchedEntry?.clue,
          }),
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => ({}))) as Partial<
          WordInsightResult & { error?: string }
        >;

        if (!response.ok) {
          throw new Error(
            payload.error ||
              'Could not fetch definition and etymology right now.'
          );
        }

        const result: WordInsightResult = {
          word: payload.word || normalized,
          phonetic: payload.phonetic || '',
          partOfSpeech: payload.partOfSpeech || 'word',
          definition: payload.definition || '',
          etymology: payload.etymology || '',
          originLanguage: payload.originLanguage || '',
          era: payload.era || '',
          exampleSentence: payload.exampleSentence || '',
          relatedRoots: Array.isArray(payload.relatedRoots)
            ? payload.relatedRoots
            : [],
        };

        sessionInsightCache.set(normalized, result);
        setInsight(result);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load word definition and etymology.'
        );
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
        }
      }
    },
    [validWords]
  );

  useEffect(() => {
    if (!isOpen || !selectedWord) return;
    void fetchWordInsight(selectedWord);
  }, [isOpen, selectedWord, fetchWordInsight]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  if (validWords.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          vibrateTileTap(loadHapticsEnabled());
          setIsOpen(true);
        }}
        className={
          compact
            ? `inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] bg-white dark:bg-[#161F2A] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] text-[#131B23] dark:text-[#F1F5F9] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52] ${className}`
            : `w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] bg-[#F6F7F5] dark:bg-[#0F1721] hover:bg-[#E9EDE8] dark:hover:bg-[#1E2A38] text-[#131B23] dark:text-[#F1F5F9] text-sm font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52] ${className}`
        }
      >
        <BookOpen
          className={compact ? 'w-3.5 h-3.5 text-[#176B52] dark:text-[#2EB88A] shrink-0' : 'w-4 h-4 text-[#176B52] dark:text-[#2EB88A] shrink-0'}
          aria-hidden="true"
        />
        <span>{compact ? 'Word Origin' : label}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="word-etymology-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div className="lexiloom-modal-in w-full max-w-lg rounded-2xl bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#ECEFEA] dark:border-[#223040]">
              <div className="space-y-1 min-w-0">
                <div className="text-xs font-medium text-[#176B52] dark:text-[#2EB88A]">
                  Solution Lexicon &amp; Etymology
                </div>
                <h3
                  id="word-etymology-modal-title"
                  className="font-editorial text-2xl font-bold tracking-tight text-[#131B23] dark:text-[#F1F5F9]"
                >
                  {selectedWord}
                </h3>
                {insight && (insight.phonetic || insight.partOfSpeech) && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#52606D] dark:text-[#94A3B8]">
                    {insight.phonetic && (
                      <span className="font-mono">/{insight.phonetic}/</span>
                    )}
                    {insight.phonetic && insight.partOfSpeech && (
                      <span aria-hidden="true">·</span>
                    )}
                    {insight.partOfSpeech && (
                      <span className="italic">{insight.partOfSpeech}</span>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close definition and etymology modal"
                className="p-1.5 rounded-lg text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] transition-colors shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Optional Word Picker for Multi-Word Puzzles */}
            {validWords.length > 1 && (
              <div className="px-6 py-3 bg-[#F6F7F5] dark:bg-[#0F1721] border-b border-[#ECEFEA] dark:border-[#223040]">
                <div
                  role="tablist"
                  aria-label="Select a solution word to inspect"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  {validWords.slice(0, 8).map((item) => {
                    const upper = item.word.toUpperCase();
                    const active = upper === selectedWord;
                    return (
                      <button
                        key={upper}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setSelectedWord(upper)}
                        className={`px-2.5 py-1 rounded-md font-mono text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[#176B52] dark:bg-[#2EB88A] text-white dark:text-[#0B1410]'
                            : 'bg-white dark:bg-[#161F2A] text-[#52606D] dark:text-[#94A3B8] border border-[#D4DDD6] dark:border-[#263342] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
                        }`}
                      >
                        {upper}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Body: Loading Skeleton, Error State, or Editorial Definition + Etymology */}
            <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
              {loading ? (
                <div className="space-y-4 animate-pulse" aria-busy="true">
                  <div className="space-y-2">
                    <div className="h-3 w-20 rounded bg-[#E2E6E1] dark:bg-[#223040]" />
                    <div className="h-4 w-full rounded bg-[#E9EDE8] dark:bg-[#1E2A38]" />
                    <div className="h-4 w-5/6 rounded bg-[#E9EDE8] dark:bg-[#1E2A38]" />
                  </div>
                  <div className="pt-4 border-t border-[#ECEFEA] dark:border-[#223040] space-y-2">
                    <div className="h-3 w-28 rounded bg-[#E2E6E1] dark:bg-[#223040]" />
                    <div className="h-4 w-full rounded bg-[#E9EDE8] dark:bg-[#1E2A38]" />
                    <div className="h-4 w-full rounded bg-[#E9EDE8] dark:bg-[#1E2A38]" />
                    <div className="h-4 w-2/3 rounded bg-[#E9EDE8] dark:bg-[#1E2A38]" />
                  </div>
                </div>
              ) : error ? (
                <div className="py-4 space-y-3">
                  <p className="text-sm text-[#B91C1C] dark:text-[#F87171] leading-relaxed">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={() => void fetchWordInsight(selectedWord, true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] text-xs font-semibold text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] transition-colors whitespace-nowrap"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Try Again</span>
                  </button>
                </div>
              ) : insight ? (
                <>
                  {/* Definition */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-[#52606D] dark:text-[#94A3B8]">
                      Definition
                    </div>
                    <p className="text-sm sm:text-[15px] leading-relaxed text-[#131B23] dark:text-[#F1F5F9]">
                      {insight.definition}
                    </p>
                    {insight.exampleSentence && (
                      <p className="pt-1 text-xs sm:text-sm italic leading-relaxed text-[#52606D] dark:text-[#94A3B8]">
                        “{insight.exampleSentence}”
                      </p>
                    )}
                  </div>

                  {/* Etymology */}
                  <div className="pt-4 border-t border-[#ECEFEA] dark:border-[#223040] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#52606D] dark:text-[#94A3B8]">
                        Etymology
                      </span>
                      {(insight.originLanguage || insight.era) && (
                        <span className="text-[#52606D] dark:text-[#94A3B8]">
                          {[insight.originLanguage, insight.era]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-[#131B23] dark:text-[#E2E8F0]">
                      {insight.etymology}
                    </p>
                  </div>

                  {/* Related Roots */}
                  {insight.relatedRoots.length > 0 && (
                    <div className="pt-4 border-t border-[#ECEFEA] dark:border-[#223040] flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-[#52606D] dark:text-[#94A3B8]">
                        Related Roots:
                      </span>
                      <span className="font-mono text-[#176B52] dark:text-[#2EB88A]">
                        {insight.relatedRoots.join(' · ')}
                      </span>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-6 py-3.5 bg-[#F6F7F5] dark:bg-[#0F1721] border-t border-[#ECEFEA] dark:border-[#223040]">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] text-xs font-semibold transition-colors whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
