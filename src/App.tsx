import React, { useEffect, useMemo, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { GameProvider, useGame } from './context/GameContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header, type AppTab } from './components/Header';
import { PuzzleWorkspace } from './components/PuzzleWorkspace';
import { GamesView } from './components/GamesView';
import { ThemesView } from './components/ThemesView';
import { LeaderboardView } from './components/LeaderboardView';
import { ProfileView } from './components/ProfileView';
import { HowToPlayModal } from './components/HowToPlayModal';
import {
  generateArchivePuzzle,
  generateDailyPuzzle,
  generateThemePuzzle,
  getTodayDateString,
  type DifficultyLevel,
} from './data/wordThemes';
import { useNotifications } from './hooks/useNotifications';

const DIFFICULTY_STORAGE_KEY = 'lexiloom_difficulty_v1';
const ONBOARDING_SEEN_KEY = 'lexiloom_onboarding_seen_v1';

function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function loadSavedDifficulty(): DifficultyLevel {
  try {
    const val = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (val === 'easy' || val === 'standard' || val === 'challenge') {
      return val;
    }
  } catch {
    // Ignore storage errors
  }
  return 'standard';
}

const OfflineBanner: React.FC = () => {
  const { isOnline } = useGame();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-lg bg-[#92400E] px-3.5 py-2 text-xs font-semibold text-white shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Offline Mode — Playing locally, progress will sync when online</span>
    </div>
  );
};

const LexiLoomShell: React.FC = () => {
  const { profile } = useGame();
  const [activeTab, setActiveTab] = useState<AppTab>('daily');
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [activeArchiveDate, setActiveArchiveDate] = useState<string | null>(
    null
  );
  const [themesInitialSection, setThemesInitialSection] = useState<
    'themes' | 'archive'
  >('themes');
  const [profileInitialSection, setProfileInitialSection] = useState<
    'dashboard' | 'settings'
  >('dashboard');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(() =>
    loadSavedDifficulty()
  );
  const [replayNonce, setReplayNonce] = useState(0);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(
    () => !hasSeenOnboarding()
  );

  const handleCloseHowToPlay = () => {
    setShowHowToPlay(false);
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    } catch {
      // Ignore storage errors
    }
  };

  // Global '?' shortcut to open or toggle How to Play guide
  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isTypingField) return;

      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShowHowToPlay((open) => !open);
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, []);

  // Run daily notification reminder scheduler across all views
  useNotifications(
    profile.notificationsEnabled,
    profile.reminderTime,
    profile.lastDailyDate
  );

  const todayStr = getTodayDateString();

  const handleChangeDifficulty = (level: DifficultyLevel) => {
    setDifficulty(level);
    try {
      localStorage.setItem(DIFFICULTY_STORAGE_KEY, level);
    } catch {
      // Ignore
    }
  };

  const currentPuzzle = useMemo(() => {
    if (activeThemeId) {
      return generateThemePuzzle(activeThemeId, replayNonce, difficulty);
    }
    if (activeArchiveDate) {
      return generateArchivePuzzle(activeArchiveDate, difficulty);
    }
    return generateDailyPuzzle(todayStr, difficulty);
  }, [activeThemeId, activeArchiveDate, replayNonce, todayStr, difficulty]);

  const handleSelectTab = (tab: AppTab) => {
    if (tab === 'daily') {
      setActiveThemeId(null);
      setActiveArchiveDate(null);
    }
    if (tab === 'themes') {
      setThemesInitialSection('themes');
    }
    if (tab === 'profile') {
      setProfileInitialSection('dashboard');
    }
    setActiveTab(tab);
  };

  const handleOpenArchive = () => {
    setThemesInitialSection('archive');
    setActiveTab('themes');
  };

  const handleOpenPreferences = () => {
    setProfileInitialSection('settings');
    setActiveTab('profile');
  };

  const handlePlayTheme = (themeId: string) => {
    setActiveThemeId(themeId);
    setActiveArchiveDate(null);
    setReplayNonce(0);
    setActiveTab('daily');
  };

  const handlePlayArchiveDate = (dateStr: string) => {
    setActiveThemeId(null);
    setActiveArchiveDate(dateStr === todayStr ? null : dateStr);
    setReplayNonce(0);
    setActiveTab('daily');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F5] dark:bg-[#0D131A] text-[#131B23] dark:text-[#F1F5F9]">
      <Header activeTab={activeTab} onSelectTab={handleSelectTab} />

      <main className="flex-1">
        {activeTab === 'daily' && (
          <PuzzleWorkspace
            key={`${currentPuzzle.id}-${replayNonce}`}
            puzzle={currentPuzzle}
            difficulty={difficulty}
            isArchiveMode={activeArchiveDate !== null}
            onChangeDifficulty={handleChangeDifficulty}
            onReplayPuzzle={() => setReplayNonce((n) => n + 1)}
            onGoToThemes={() => {
              setThemesInitialSection('themes');
              setActiveTab('themes');
            }}
            onOpenArchive={handleOpenArchive}
            onReturnToToday={() => {
              setActiveArchiveDate(null);
              setActiveThemeId(null);
              setReplayNonce(0);
            }}
            onGoToLeaderboard={() => setActiveTab('leaderboard')}
            onOpenHowToPlay={() => setShowHowToPlay(true)}
          />
        )}
        {activeTab === 'games' && (
          <GamesView onGoToLeaderboard={() => setActiveTab('leaderboard')} />
        )}
        {activeTab === 'themes' && (
          <ThemesView
            difficulty={difficulty}
            initialSection={themesInitialSection}
            onChangeDifficulty={handleChangeDifficulty}
            onPlayTheme={handlePlayTheme}
            onPlayArchiveDate={handlePlayArchiveDate}
          />
        )}
        {activeTab === 'leaderboard' && <LeaderboardView />}
        {activeTab === 'profile' && (
          <ProfileView
            initialSection={profileInitialSection}
            onPlayDaily={() => handleSelectTab('daily')}
          />
        )}
      </main>

      <footer className="mt-12 border-t border-[#E2E6E1] dark:border-[#223040] py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#52606D] dark:text-[#94A3B8]">
          <span>LexiLoom — Smart Daily Word Puzzles</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowHowToPlay(true)}
              className="hover:text-[#131B23] dark:hover:text-[#F1F5F9] transition-colors"
            >
              How to Play
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('daily')}
              className="hover:text-[#131B23] dark:hover:text-[#F1F5F9] transition-colors"
            >
              Daily Challenge
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('games')}
              className="hover:text-[#131B23] dark:hover:text-[#F1F5F9] transition-colors"
            >
              Word Games
            </button>
            <button
              type="button"
              onClick={handleOpenArchive}
              className="hover:text-[#131B23] dark:hover:text-[#F1F5F9] transition-colors"
            >
              Puzzle Archive
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('themes')}
              className="hover:text-[#131B23] dark:hover:text-[#F1F5F9] transition-colors"
            >
              Word Themes
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('profile')}
              className="hover:text-[#131B23] dark:hover:text-[#F1F5F9] transition-colors"
            >
              Performance
            </button>
            <button
              type="button"
              onClick={handleOpenPreferences}
              className="hover:text-[#131B23] dark:hover:text-[#F1F5F9] transition-colors"
            >
              Preferences
            </button>
          </div>
        </div>
      </footer>

      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={handleCloseHowToPlay}
      />

      <OfflineBanner />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <LexiLoomShell />
      </GameProvider>
    </ErrorBoundary>
  );
}
