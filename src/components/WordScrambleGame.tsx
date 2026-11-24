import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Lightbulb,
  PlayCircle,
  RotateCcw,
  Shuffle,
  Trophy,
} from 'lucide-react';
import { ANAGRAM_SETS, scrambleWord } from '../data/wordGamesData';
import { useGame } from '../context/GameContext';
import {
  playHintReveal,
  playInvalidWord,
  playRewardClaimed,
  playTileTap,
  playVictoryFanfare,
  playWordFound,
} from '../lib/sound';
import {
  loadHapticsEnabled,
  subscribeHapticsEnabled,
  vibrateHintReveal,
  vibrateTileTap,
  vibrateVictory,
  vibrateWordError,
  vibrateWordSuccess,
} from '../lib/haptics';
import {
  recordPuzzleAttempt,
  recordPuzzleOutcome,
} from '../lib/performanceStats';
import { RewardedAdModal } from './RewardedAdModal';
import { ConfettiBurst } from './ConfettiBurst';
import { LetterRevealHintBar } from './LetterRevealHintBar';
import { DictionaryTooltip } from './DictionaryTooltip';
import { ShareResultButton } from './ShareResultButton';
import { WordEtymologyButton } from './WordEtymologyButton';

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

interface WordScrambleGameProps {
  onGoToLeaderboard: () => void;
}

export const WordScrambleGame: React.FC<WordScrambleGameProps> = ({
  onGoToLeaderboard,
}) => {
  const {
    profile,
    completions,
    spendHintCredit,
    grantAdRewardHints,
    recordPuzzleCompletion,
    showTimer,
  } = useGame();

  const [setIndex, setSetIndex] = useState(0);
  const activeSet = ANAGRAM_SETS[setIndex];

  const [roundIndex, setRoundIndex] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [solvedWords, setSolvedWords] = useState<string[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [victoryScore, setVictoryScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState(
    'Tap letter tiles or type on your keyboard to unscramble the word.'
  );
  const [shakeKey, setShakeKey] = useState(0);
  const [popWin, setPopWin] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [showAdModal, setShowAdModal] = useState(false);

  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() =>
    loadHapticsEnabled()
  );
  const attemptKeyRef = useRef<string>(`${activeSet.id}-${Date.now()}`);
  const currentItem = activeSet.words[roundIndex] ?? activeSet.words[0];

  useEffect(() => subscribeHapticsEnabled(setHapticsEnabled), []);

  const scrambledLetters = useMemo(
    () => scrambleWord(currentItem.word, shuffleSeed + roundIndex * 7),
    [currentItem.word, shuffleSeed, roundIndex]
  );

  const completedIds = useMemo(
    () => new Set(completions.map((c) => c.puzzleId)),
    [completions]
  );

  const startSet = useCallback((nextIdx: number) => {
    setSetIndex(nextIdx);
    setRoundIndex(0);
    setShuffleSeed(0);
    setSelectedIndices([]);
    setSolvedWords([]);
    setElapsedSeconds(0);
    setHintsUsed(0);
    setIsComplete(false);
    setVictoryScore(null);
    setPopWin(false);
    attemptKeyRef.current = `${ANAGRAM_SETS[nextIdx].id}-${Date.now()}`;
    setFeedback(
      'Tap letter tiles or type on your keyboard to unscramble the word.'
    );
  }, []);

  // Timer
  useEffect(() => {
    if (isComplete) return;
    const id = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isComplete, setIndex]);

  const assembledWord = useMemo(
    () => selectedIndices.map((idx) => scrambledLetters[idx]).join(''),
    [selectedIndices, scrambledLetters]
  );

  const evaluateAssembled = useCallback(
    (nextIndices: number[]) => {
      const candidate = nextIndices.map((i) => scrambledLetters[i]).join('');
      if (candidate.length < currentItem.word.length) return;

      if (candidate === currentItem.word) {
        const nextSolved = [...solvedWords, currentItem.word];
        setSolvedWords(nextSolved);
        setPopWin(true);

        if (roundIndex + 1 >= activeSet.words.length) {
          setIsComplete(true);
          playVictoryFanfare(profile.soundEnabled);
          vibrateVictory(hapticsEnabled);
          setConfettiTrigger((n) => n + 1);

          const timeBonus = Math.max(0, 180 - elapsedSeconds);
          const score = Math.max(
            180,
            activeSet.words.length * 100 + timeBonus - hintsUsed * 35
          );
          setVictoryScore(score);
          setFeedback(`All ${activeSet.words.length} anagrams solved! Score: ${score} pts.`);
          recordPuzzleOutcome(
            attemptKeyRef.current,
            activeSet.id,
            'Anagram Forge',
            'won'
          );

          void recordPuzzleCompletion({
            puzzleId: activeSet.id,
            mode: 'theme',
            themeId: activeSet.id,
            themeName: `Anagram Forge: ${activeSet.title}`,
            puzzleWord:
              activeSet.words[activeSet.words.length - 1]?.word ||
              activeSet.words[0]?.word,
            puzzleWords: activeSet.words.map((item) => item.word),
            score,
            durationSeconds: elapsedSeconds,
            hintsUsed,
            wordsFound: activeSet.words.length,
          });
        } else {
          playWordFound(profile.soundEnabled);
          vibrateWordSuccess(hapticsEnabled);
          setFeedback(`Unscrambled "${currentItem.word}"! Next word coming up…`);
          window.setTimeout(() => {
            setPopWin(false);
            setRoundIndex((r) => r + 1);
            setSelectedIndices([]);
            setShuffleSeed(0);
          }, 520);
        }
      } else {
        playInvalidWord(profile.soundEnabled);
        vibrateWordError(hapticsEnabled);
        setShakeKey((k) => k + 1);
        setFeedback(`"${candidate}" isn't quite right — clear or tap a letter to adjust.`);
      }
    },
    [
      scrambledLetters,
      currentItem.word,
      solvedWords,
      roundIndex,
      activeSet,
      profile.soundEnabled,
      hapticsEnabled,
      elapsedSeconds,
      hintsUsed,
      recordPuzzleCompletion,
    ]
  );

  const handlePickTile = useCallback(
    (tileIdx: number) => {
      if (isComplete || popWin) return;
      if (selectedIndices.includes(tileIdx)) return;

      recordPuzzleAttempt(
        attemptKeyRef.current,
        activeSet.id,
        'Anagram Forge'
      );
      playTileTap(profile.soundEnabled);
      vibrateTileTap(hapticsEnabled);
      const next = [...selectedIndices, tileIdx];
      setSelectedIndices(next);
      evaluateAssembled(next);
    },
    [
      isComplete,
      popWin,
      selectedIndices,
      activeSet.id,
      profile.soundEnabled,
      hapticsEnabled,
      evaluateAssembled,
    ]
  );

  const handleRemoveSlot = (slotPos: number) => {
    if (isComplete || popWin) return;
    playTileTap(profile.soundEnabled);
    vibrateTileTap(hapticsEnabled);
    setSelectedIndices((prev) => prev.filter((_, idx) => idx !== slotPos));
  };

  const handleBackspace = useCallback(() => {
    if (isComplete || popWin || selectedIndices.length === 0) return;
    vibrateTileTap(hapticsEnabled);
    setSelectedIndices((prev) => prev.slice(0, -1));
  }, [isComplete, popWin, selectedIndices.length, hapticsEnabled]);

  const handleShuffle = () => {
    if (isComplete || popWin) return;
    playTileTap(profile.soundEnabled);
    vibrateTileTap(hapticsEnabled);
    setSelectedIndices([]);
    setShuffleSeed((s) => s + 1);
  };

  // Physical keyboard support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showAdModal || isComplete || popWin) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        const upper = e.key.toUpperCase();
        const availableIdx = scrambledLetters.findIndex(
          (ch, idx) => ch === upper && !selectedIndices.includes(idx)
        );
        if (availableIdx !== -1) {
          e.preventDefault();
          handlePickTile(availableIdx);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    showAdModal,
    isComplete,
    popWin,
    handleBackspace,
    scrambledLetters,
    selectedIndices,
    handlePickTile,
  ]);

  const handleRevealNextLetter = async () => {
    if (isComplete || popWin) return;
    if (profile.hintCredits <= 0) {
      setShowAdModal(true);
      return;
    }

    const spent = await spendHintCredit();
    if (!spent) {
      setShowAdModal(true);
      return;
    }

    setHintsUsed((h) => h + 1);
    playHintReveal(profile.soundEnabled);
    vibrateHintReveal(hapticsEnabled);

    // Keep valid prefix of selectedIndices, then lock the next correct letter
    let prefixLen = 0;
    while (
      prefixLen < selectedIndices.length &&
      scrambledLetters[selectedIndices[prefixLen]] === currentItem.word[prefixLen]
    ) {
      prefixLen++;
    }
    const validPrefix = selectedIndices.slice(0, prefixLen);
    const neededLetter = currentItem.word[prefixLen];
    const matchIdx = scrambledLetters.findIndex(
      (ch, idx) => ch === neededLetter && !validPrefix.includes(idx)
    );
    if (matchIdx !== -1) {
      const next = [...validPrefix, matchIdx];
      setSelectedIndices(next);
      setFeedback(`Locked letter #${prefixLen + 1} ("${neededLetter}") with 1 Smart Hint.`);
      evaluateAssembled(next);
    }
  };

  const handleRevealSingleLetter = useCallback(
    (method: 'delay' | 'points'): boolean => {
      if (isComplete || popWin) return false;
      let prefixLen = 0;
      while (
        prefixLen < selectedIndices.length &&
        scrambledLetters[selectedIndices[prefixLen]] ===
          currentItem.word[prefixLen]
      ) {
        prefixLen++;
      }
      if (prefixLen >= currentItem.word.length) return false;

      const validPrefix = selectedIndices.slice(0, prefixLen);
      const neededLetter = currentItem.word[prefixLen];
      const matchIdx = scrambledLetters.findIndex(
        (ch, idx) => ch === neededLetter && !validPrefix.includes(idx)
      );
      if (matchIdx === -1) return false;

      const next = [...validPrefix, matchIdx];
      setSelectedIndices(next);
      setHintsUsed((h) => h + 1);
      playHintReveal(profile.soundEnabled);
      vibrateHintReveal(hapticsEnabled);
      setFeedback(
        `Locked letter #${prefixLen + 1} ("${neededLetter}")${
          method === 'points' ? ' (-50 pts).' : ' (free timed hint).'
        }`
      );
      evaluateAssembled(next);
      return true;
    },
    [
      isComplete,
      popWin,
      selectedIndices,
      scrambledLetters,
      currentItem.word,
      profile.soundEnabled,
      hapticsEnabled,
      evaluateAssembled,
    ]
  );

  return (
    <div className="space-y-6">
      <ConfettiBurst triggerKey={confettiTrigger} />

      {/* Top Header & Set Picker */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E2E6E1] dark:border-[#223040]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#52606D] dark:text-[#94A3B8]">
            <span>Anagram Forge</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Word {Math.min(roundIndex + 1, activeSet.words.length)} of{' '}
              {activeSet.words.length}
            </span>
            {showTimer && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                  <Clock className="w-3.5 h-3.5 opacity-75" aria-hidden="true" />
                  <span key={elapsedSeconds} className="lexiloom-timer-tick">
                    {formatDuration(elapsedSeconds)}
                  </span>
                </span>
              </>
            )}
          </div>
          <h2 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-[#131B23] dark:text-[#F1F5F9]">
            {activeSet.title}
          </h2>
          <p className="text-sm text-[#52606D] dark:text-[#94A3B8]">
            {activeSet.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {ANAGRAM_SETS.map((s, idx) => {
            const active = idx === setIndex;
            const done = completedIds.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => startSet(idx)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
                  active
                    ? 'bg-[#176B52] dark:bg-[#2EB88A] text-white dark:text-[#0B1410] border-[#176B52] dark:border-[#2EB88A]'
                    : 'bg-white dark:bg-[#161F2A] text-[#52606D] dark:text-[#CBD5E1] border-[#D4DDD6] dark:border-[#263342] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38]'
                }`}
              >
                <span>{s.title}</span>
                {done && <Check className="w-3.5 h-3.5" aria-label="Completed" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Scramble Board */}
        <div className="lg:col-span-7 space-y-5">
          <div className="relative rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-7">
            <ConfettiBurst triggerKey={confettiTrigger} scope="board" />
            {/* Clue */}
            <div className="space-y-1.5 text-center">
              <p className="text-xs font-medium text-[#52606D] dark:text-[#94A3B8]">
                Clue · {currentItem.word.length} letters
              </p>
              <p
                className={`font-editorial font-semibold text-[#131B23] dark:text-[#F1F5F9] ${
                  profile.largePrint ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
                }`}
              >
                {currentItem.clue}
              </p>
            </div>

            {/* Answer Slots */}
            <div
              key={`ans-${shakeKey}`}
              className={`flex justify-center flex-wrap gap-2 sm:gap-2.5 ${
                shakeKey > 0 ? 'lexiloom-shake' : ''
              }`}
            >
              {Array.from({ length: currentItem.word.length }).map((_, slotIdx) => {
                const tileIdx = selectedIndices[slotIdx];
                const letter =
                  tileIdx !== undefined ? scrambledLetters[tileIdx] : '';

                return (
                  <button
                    key={slotIdx}
                    type="button"
                    disabled={!letter || isComplete || popWin}
                    onClick={() => handleRemoveSlot(slotIdx)}
                    aria-label={
                      letter
                        ? `Slot ${slotIdx + 1}, letter ${letter}. Activate to remove.`
                        : `Empty slot ${slotIdx + 1}`
                    }
                    style={
                      popWin
                        ? { animationDelay: `${slotIdx * 45}ms` }
                        : undefined
                    }
                    className={`w-12 h-14 sm:w-14 sm:h-16 rounded-xl border-2 font-bold flex items-center justify-center transition-colors ${
                      profile.largePrint ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                    } ${
                      popWin
                        ? 'bg-[#176B52] dark:bg-[#2EB88A] text-white dark:text-[#0B1410] border-[#176B52] dark:border-[#2EB88A] lexiloom-tile-pop'
                        : letter
                        ? 'bg-[#E4F2EC] dark:bg-[#15392E] text-[#11533F] dark:text-[#A7F3D0] border-[#176B52] dark:border-[#2EB88A]'
                        : 'bg-[#F6F7F5] dark:bg-[#0F1721] border-dashed border-[#CBD5CE] dark:border-[#2E3D4F] text-transparent'
                    }`}
                  >
                    {letter || '_'}
                  </button>
                );
              })}
            </div>

            {/* Scrambled Tile Bank */}
            <div className="flex justify-center flex-wrap gap-2 sm:gap-2.5 pt-2">
              {scrambledLetters.map((letter, idx) => {
                const used = selectedIndices.includes(idx);
                return (
                  <button
                    key={`${roundIndex}-${shuffleSeed}-${idx}`}
                    type="button"
                    disabled={used || isComplete || popWin}
                    onClick={() => handlePickTile(idx)}
                    aria-label={`Letter ${letter}${used ? ', already placed' : ''}`}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border font-bold flex items-center justify-center transition-transform active:scale-95 ${
                      profile.largePrint ? 'text-2xl' : 'text-xl'
                    } ${
                      used
                        ? 'opacity-25 bg-[#ECEFEA] dark:bg-[#0B1118] border-[#DFE4DE] dark:border-[#1E2A38] text-[#52606D]'
                        : 'bg-[#F6F7F5] dark:bg-[#0F1721] hover:bg-[#E4F2EC] dark:hover:bg-[#18352B] text-[#131B23] dark:text-[#F1F5F9] border-[#CBD5CE] dark:border-[#2E3D4F]'
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>

            {/* Action Row */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={isComplete || popWin}
                onClick={handleShuffle}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] bg-[#F6F7F5] dark:bg-[#0F1721] hover:bg-[#E9EDE8] dark:hover:bg-[#1E2A38] text-xs font-semibold text-[#131B23] dark:text-[#F1F5F9] transition-colors disabled:opacity-50"
              >
                <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
                Shuffle
              </button>
              <button
                type="button"
                disabled={selectedIndices.length === 0 || isComplete || popWin}
                onClick={handleBackspace}
                className="px-3.5 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] bg-[#F6F7F5] dark:bg-[#0F1721] hover:bg-[#E9EDE8] dark:hover:bg-[#1E2A38] text-xs font-semibold text-[#131B23] dark:text-[#F1F5F9] transition-colors disabled:opacity-50"
              >
                Backspace
              </button>
              <button
                type="button"
                disabled={selectedIndices.length === 0 || isComplete || popWin}
                onClick={() => {
                  vibrateTileTap(hapticsEnabled);
                  setSelectedIndices([]);
                }}
                className="px-3.5 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] bg-[#F6F7F5] dark:bg-[#0F1721] hover:bg-[#E9EDE8] dark:hover:bg-[#1E2A38] text-xs font-semibold text-[#52606D] dark:text-[#CBD5E1] transition-colors disabled:opacity-50"
              >
                Clear
              </button>
            </div>

            <p
              className="text-center text-xs text-[#52606D] dark:text-[#94A3B8]"
              aria-live="polite"
            >
              {assembledWord.length > 0 && !popWin
                ? `Building: ${assembledWord}`
                : feedback}
            </p>
          </div>
        </div>

        {/* Right Sidebar: Hints + Round Progress */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl p-5 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-editorial text-lg font-semibold text-[#131B23] dark:text-[#F1F5F9]">
                  Smart Hints
                </h3>
                <p className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                  Lock the next letter in place · Balance:{' '}
                  <strong className="font-mono tabular-nums text-[#131B23] dark:text-[#F1F5F9]">
                    {profile.hintCredits}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => startSet(setIndex)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9] hover:bg-[#F1F4F1] dark:hover:bg-[#1E2A38] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isComplete || popWin}
                onClick={() => void handleRevealNextLetter()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] disabled:opacity-50 text-white dark:text-[#0B1410] text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <Lightbulb className="w-4 h-4" aria-hidden="true" />
                Next Letter (-1)
              </button>
              <button
                type="button"
                onClick={() => setShowAdModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] bg-[#F6F7F5] dark:bg-[#0F1721] hover:bg-[#E9EDE8] dark:hover:bg-[#1E2A38] text-[#131B23] dark:text-[#F1F5F9] text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <PlayCircle
                  className="w-4 h-4 text-[#176B52] dark:text-[#2EB88A]"
                  aria-hidden="true"
                />
                Watch Ad (+2)
              </button>
            </div>

            <LetterRevealHintBar
              disabled={isComplete || popWin}
              resetKey={`${activeSet.id}-${roundIndex}`}
              onRevealLetter={handleRevealSingleLetter}
            />
          </div>

          <div className="rounded-2xl p-5 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-3">
            <h3 className="font-editorial text-base font-semibold text-[#131B23] dark:text-[#F1F5F9]">
              Set Progress
            </h3>
            <ul className="divide-y divide-[#ECEFEA] dark:divide-[#223040]">
              {activeSet.words.map((item, idx) => {
                const isDone = solvedWords.includes(item.word);
                const isCurrent = idx === roundIndex && !isComplete;
                return (
                  <li
                    key={item.word}
                    className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-sm"
                  >
                    <span
                      className={`font-mono font-semibold tracking-wider ${
                        isDone
                          ? 'text-[#176B52] dark:text-[#2EB88A]'
                          : isCurrent
                          ? 'text-[#131B23] dark:text-[#F1F5F9]'
                          : 'text-[#94A3B8] dark:text-[#64748B]'
                      }`}
                    >
                      {isDone
                        ? item.word
                        : isCurrent
                        ? `Word ${idx + 1} · Active`
                        : `Word ${idx + 1} · ${item.word.length} letters`}
                    </span>
                    {isDone && (
                      <div className="flex items-center gap-2 shrink-0">
                        <DictionaryTooltip
                          word={item.word}
                          fallbackClue={item.clue}
                          align="right"
                        />
                        <Check
                          className="w-4 h-4 text-[#176B52] dark:text-[#2EB88A] shrink-0"
                          aria-label="Solved"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>

      {/* Rewarded Ad Modal */}
      <RewardedAdModal
        isOpen={showAdModal}
        onClose={() => setShowAdModal(false)}
        onRewardClaimed={() => {
          playRewardClaimed(profile.soundEnabled);
          vibrateWordSuccess(hapticsEnabled);
          void grantAdRewardHints(2);
          setFeedback('Reward claimed! +2 Smart Hint credits added.');
        }}
      />

      {/* Victory Modal */}
      {isComplete && victoryScore !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ana-victory-title"
        >
          <div className="lexiloom-modal-in w-full max-w-md rounded-2xl bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] p-7 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#176B52] dark:text-[#2EB88A]">
                <Trophy className="w-4 h-4" aria-hidden="true" />
                <span>Anagram Set Complete</span>
              </div>
              <h3
                id="ana-victory-title"
                className="font-editorial text-2xl font-bold text-[#131B23] dark:text-[#F1F5F9]"
              >
                {activeSet.title} cleared!
              </h3>
              <p className="text-sm text-[#52606D] dark:text-[#94A3B8]">
                You unscrambled all {activeSet.words.length} words cleanly.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 py-4 border-y border-[#E2E6E1] dark:border-[#223040]">
              <div>
                <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">Score</div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
                  {victoryScore}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">Time</div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
                  {formatDuration(elapsedSeconds)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">Words</div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
                  {activeSet.words.length}
                </div>
              </div>
            </div>

            <ShareResultButton
              summary={{
                gameTitle: `Anagram Forge: ${activeSet.title}`,
                score: victoryScore,
                durationSeconds: elapsedSeconds,
                streakDays: profile.currentStreak,
                hintsUsed,
                wordsFound: activeSet.words.length,
                totalWords: activeSet.words.length,
              }}
            />

            <WordEtymologyButton
              words={activeSet.words.map((item) => ({
                word: item.word,
                clue: item.clue,
              }))}
              label="Definition & Etymology"
            />

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => startSet((setIndex + 1) % ANAGRAM_SETS.length)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#F1F4F1] dark:hover:bg-[#1E2A38] text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Next Set
              </button>
              <button
                type="button"
                onClick={() => {
                  setVictoryScore(null);
                  onGoToLeaderboard();
                }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#F1F4F1] dark:hover:bg-[#1E2A38] text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Leaderboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
