import React, { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  Cloud,
  CloudOff,
  LogOut,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { ILLUSTRATED_AVATARS, MONOGRAM_PALETTES } from '../data/avatars';
import { AvatarDisplay } from './AvatarDisplay';
import { PWAInstallButton } from './PWAInstallButton';
import { useNotifications } from '../hooks/useNotifications';
import {
  loadHapticsEnabled,
  saveHapticsEnabled,
  subscribeHapticsEnabled,
  supportsVibration,
  vibrateWordSuccess,
} from '../lib/haptics';
import { playWordFound } from '../lib/sound';
import { PerformanceDashboard } from './PerformanceDashboard';
import { GameHistorySection } from './GameHistorySection';
import { DailyStreakTracker } from './DailyStreakTracker';

interface ProfileViewProps {
  initialSection?: 'dashboard' | 'history' | 'settings';
  onPlayDaily?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  initialSection = 'dashboard',
  onPlayDaily,
}) => {
  const {
    user,
    authError,
    isOnline,
    syncStatus,
    profile,
    signInWithGoogle,
    signOutUser,
    updateIdentity,
    updatePreferences,
    showTimer,
    setShowTimer,
    bestDailyTimeSeconds,
    themePreference,
    setThemePreference,
  } = useGame();

  const [section, setSection] = useState<'dashboard' | 'history' | 'settings'>(
    initialSection
  );
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [avatarType, setAvatarType] = useState<'illustrated' | 'monogram'>(
    profile.avatarType
  );
  const [avatarId, setAvatarId] = useState(profile.avatarId);
  const [avatarInitials, setAvatarInitials] = useState(profile.avatarInitials);
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor);
  const [savedNotice, setSavedNotice] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() =>
    loadHapticsEnabled()
  );
  const [hapticsTestNote, setHapticsTestNote] = useState<string | null>(null);
  const vibrationSupported = supportsVibration();

  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);
  const { permission, requestPermission, sendTestReminder } = useNotifications(
    profile.notificationsEnabled,
    profile.reminderTime,
    profile.lastDailyDate
  );

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => subscribeHapticsEnabled(setHapticsEnabled), []);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setAvatarType(profile.avatarType);
    setAvatarId(profile.avatarId);
    setAvatarInitials(profile.avatarInitials);
    setAvatarColor(profile.avatarColor);
  }, [
    profile.displayName,
    profile.avatarType,
    profile.avatarId,
    profile.avatarInitials,
    profile.avatarColor,
  ]);

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateIdentity({
      displayName,
      avatarType,
      avatarId,
      avatarInitials,
      avatarColor,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleToggleNotifications = async () => {
    const turningOn = !profile.notificationsEnabled;
    if (turningOn && permission === 'default') {
      const result = await requestPermission();
      if (result !== 'granted') {
        setNotifFeedback(
          'Notification permission was not granted. You can enable it in browser settings.'
        );
        return;
      }
    }
    await updatePreferences({ notificationsEnabled: turningOn });
    setNotifFeedback(
      turningOn
        ? `Daily challenge reminders scheduled for ${profile.reminderTime}.`
        : 'Daily challenge reminders turned off.'
    );
  };

  const handleTestNotification = async () => {
    const res = await sendTestReminder();
    setNotifFeedback(res.message);
  };

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Profile Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E2E6E1] dark:border-[#223040]">
        <div className="flex items-center gap-5">
          <AvatarDisplay
            avatarType={avatarType}
            avatarId={avatarId}
            avatarInitials={avatarInitials}
            avatarColor={avatarColor}
            displayName={displayName}
            size="xl"
          />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#52606D] dark:text-[#94A3B8]">
              <span className="font-mono">{profile.friendCode}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {profile.totalScore.toLocaleString()} pts
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Best Streak {profile.bestStreak}d
              </span>
            </div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
              {profile.displayName}
            </h1>
            <p className="text-xs text-[#52606D] dark:text-[#94A3B8]">
              {user
                ? syncStatus === 'synced'
                  ? 'Synced across your devices via Google Account'
                  : syncStatus === 'offline-queued'
                  ? 'Offline — changes queued for automatic sync'
                  : 'Syncing profile…'
                : 'Playing in local offline mode — sign in to sync across devices'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] text-sm font-semibold text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] transition-colors whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="px-5 py-2.5 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Sign In to Sync Devices
            </button>
          )}
        </div>
      </div>

      {authError && (
        <p className="text-sm text-[#B91C1C] dark:text-[#F87171]">{authError}</p>
      )}

      {/* Daily Streak Tracker (Consecutive Days Played) */}
      <DailyStreakTracker onPlayDaily={onPlayDaily} />

      {/* Section Switcher: Performance Dashboard, Game History, Account & Settings */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Profile sections"
          className="inline-flex items-center p-1 rounded-lg bg-[#E9EDE8] dark:bg-[#161F2A] border border-[#D4DDD6] dark:border-[#263342]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={section === 'dashboard'}
            onClick={() => setSection('dashboard')}
            className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              section === 'dashboard'
                ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                : 'text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
            }`}
          >
            Performance Dashboard
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={section === 'history'}
            onClick={() => setSection('history')}
            className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              section === 'history'
                ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                : 'text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
            }`}
          >
            Game History
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={section === 'settings'}
            onClick={() => setSection('settings')}
            className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              section === 'settings'
                ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                : 'text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
            }`}
          >
            Account & Settings
          </button>
        </div>

        <p className="text-xs text-[#52606D] dark:text-[#94A3B8]">
          {section === 'dashboard'
            ? 'Win rate, average solve time, and recent game history'
            : section === 'history'
            ? 'Chronological list of completed puzzles, target words, and final elapsed times'
            : 'Avatar studio, daily reminders, haptics, and accessibility'}
        </p>
      </div>

      {section === 'dashboard' ? (
        <div className="space-y-8">
          <PerformanceDashboard onPlayDaily={onPlayDaily} />
          <GameHistorySection onPlayDaily={onPlayDaily} maxItems={20} />
        </div>
      ) : section === 'history' ? (
        <GameHistorySection onPlayDaily={onPlayDaily} maxItems={60} />
      ) : (
        <>
          {/* 2-Column Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Custom Avatar & Identity Studio */}
        <form
          onSubmit={(e) => void handleSaveIdentity(e)}
          className="lg:col-span-7 rounded-2xl p-6 sm:p-7 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-6"
        >
          <div className="space-y-1">
            <h2 className="font-editorial text-xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
              Custom Avatar & Player Identity
            </h2>
            <p className="text-sm text-[#52606D] dark:text-[#94A3B8]">
              Choose an illustrated editorial emblem or craft a bespoke monogram for the leaderboard.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="player-display-name"
              className="block text-xs font-semibold text-[#131B23] dark:text-[#E2E8F0]"
            >
              Display Name
            </label>
            <input
              id="player-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-[#F6F7F5] dark:bg-[#0F1721] border border-[#D4DDD6] dark:border-[#2E3D4F] text-sm text-[#131B23] dark:text-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-[#176B52]"
            />
          </div>

          {/* Avatar Style Toggle */}
          <div className="space-y-3">
            <div
              role="group"
              aria-label="Avatar style"
              className="inline-flex items-center p-1 rounded-lg bg-[#E9EDE8] dark:bg-[#0F1721] border border-[#D4DDD6] dark:border-[#263342]"
            >
              <button
                type="button"
                onClick={() => setAvatarType('illustrated')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  avatarType === 'illustrated'
                    ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                    : 'text-[#52606D] dark:text-[#94A3B8]'
                }`}
              >
                Illustrated Emblems
              </button>
              <button
                type="button"
                onClick={() => setAvatarType('monogram')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  avatarType === 'monogram'
                    ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                    : 'text-[#52606D] dark:text-[#94A3B8]'
                }`}
              >
                Custom Monogram
              </button>
            </div>

            {avatarType === 'illustrated' ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {ILLUSTRATED_AVATARS.map((item) => {
                  const selected = avatarId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAvatarId(item.id)}
                      className={`p-2 rounded-xl border text-center space-y-2 transition-colors ${
                        selected
                          ? 'border-[#176B52] dark:border-[#2EB88A] bg-[#E4F2EC]/60 dark:bg-[#15392E]/60'
                          : 'border-[#E2E6E1] dark:border-[#263342] hover:bg-[#F6F7F5] dark:hover:bg-[#1E2A38]'
                      }`}
                    >
                      <AvatarDisplay
                        avatarType="illustrated"
                        avatarId={item.id}
                        avatarInitials={avatarInitials}
                        avatarColor={avatarColor}
                        displayName={item.label}
                        size="lg"
                        className="mx-auto"
                      />
                      <span className="block text-xs font-medium text-[#131B23] dark:text-[#E2E8F0] truncate">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="avatar-initials"
                    className="block text-xs font-semibold text-[#131B23] dark:text-[#E2E8F0]"
                  >
                    Monogram Letters (1–2 characters)
                  </label>
                  <input
                    id="avatar-initials"
                    type="text"
                    value={avatarInitials}
                    onChange={(e) =>
                      setAvatarInitials(
                        e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2)
                      )
                    }
                    maxLength={2}
                    className="w-28 px-4 py-2 rounded-lg bg-[#F6F7F5] dark:bg-[#0F1721] border border-[#D4DDD6] dark:border-[#2E3D4F] font-mono text-center text-base font-bold text-[#131B23] dark:text-[#F1F5F9]"
                  />
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {MONOGRAM_PALETTES.map((pal) => {
                    const active = avatarColor === pal.bgHex;
                    return (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => setAvatarColor(pal.bgHex)}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                          active
                            ? 'border-[#176B52] dark:border-[#2EB88A] bg-[#E4F2EC]/50 dark:bg-[#15392E]/50 text-[#131B23] dark:text-[#F1F5F9]'
                            : 'border-[#E2E6E1] dark:border-[#263342] text-[#52606D] dark:text-[#94A3B8]'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: pal.bgHex }}
                          aria-hidden="true"
                        />
                        {pal.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#ECEFEA] dark:border-[#223040]">
            <span className="text-xs font-medium text-[#176B52] dark:text-[#2EB88A]">
              {savedNotice ? 'Profile & avatar saved.' : ''}
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              Save Profile
            </button>
          </div>
        </form>

        {/* Right: Notifications, Display Accessibility & Offline PWA */}
        <div className="lg:col-span-5 space-y-6">
          {/* Push Notifications for Daily Challenges */}
          <div className="rounded-2xl p-6 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="font-editorial text-lg font-bold text-[#131B23] dark:text-[#F1F5F9]">
                  Daily Challenge Reminders
                </h2>
                <p className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                  Receive a gentle daily push notification so you never lose your streak.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={profile.notificationsEnabled}
                onClick={() => void handleToggleNotifications()}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                  profile.notificationsEnabled
                    ? 'bg-[#176B52] dark:bg-[#2EB88A]'
                    : 'bg-[#CBD5E1] dark:bg-[#334155]'
                }`}
              >
                <span className="sr-only">Enable daily challenge notifications</span>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    profile.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <label
                htmlFor="reminder-time"
                className="text-xs font-semibold text-[#131B23] dark:text-[#E2E8F0]"
              >
                Reminder Time
              </label>
              <input
                id="reminder-time"
                type="time"
                value={profile.reminderTime}
                onChange={(e) =>
                  void updatePreferences({ reminderTime: e.target.value })
                }
                className="px-3 py-1.5 rounded-lg bg-[#F6F7F5] dark:bg-[#0F1721] border border-[#D4DDD6] dark:border-[#2E3D4F] font-mono text-xs text-[#131B23] dark:text-[#F1F5F9]"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleTestNotification()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] text-xs font-semibold text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] transition-colors whitespace-nowrap"
            >
              <Bell className="w-3.5 h-3.5" aria-hidden="true" />
              Send Test Reminder
            </button>

            {notifFeedback && (
              <p className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                {notifFeedback}
              </p>
            )}
          </div>

          {/* Display, Dark Mode & Accessibility */}
          <div className="rounded-2xl p-6 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-4">
            <h2 className="font-editorial text-lg font-bold text-[#131B23] dark:text-[#F1F5F9]">
              Comfort & Accessibility
            </h2>

            <div className="space-y-3 text-sm">
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-[#131B23] dark:text-[#F1F5F9]">
                      Appearance Theme
                    </div>
                    <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                      {themePreference === 'system'
                        ? `Following system preference (currently ${
                            profile.darkMode ? 'Dark' : 'Light'
                          })`
                        : themePreference === 'dark'
                        ? 'Forced Dark mode · saved in local storage'
                        : 'Forced Light mode · saved in local storage'}
                    </div>
                  </div>
                </div>
                <div
                  role="group"
                  aria-label="Choose appearance theme"
                  className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#E9EDE8] dark:bg-[#0F1721] border border-[#D4DDD6] dark:border-[#263342]"
                >
                  {(
                    [
                      { id: 'light', label: 'Light', Icon: Sun },
                      { id: 'dark', label: 'Dark', Icon: Moon },
                      { id: 'system', label: 'System', Icon: Monitor },
                    ] as const
                  ).map(({ id, label, Icon }) => {
                    const active = themePreference === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setThemePreference(id)}
                        className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                            : 'text-[#52606D] dark:text-[#94A3B8] hover:text-[#131B23] dark:hover:text-[#F1F5F9]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#ECEFEA] dark:border-[#223040]">
                <div>
                  <div className="font-medium text-[#131B23] dark:text-[#F1F5F9]">
                    Large Print Tiles
                  </div>
                  <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                    Enlarged grid letters and clue prose
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.largePrint}
                  onClick={() =>
                    void updatePreferences({ largePrint: !profile.largePrint })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    profile.largePrint
                      ? 'bg-[#176B52] dark:bg-[#2EB88A]'
                      : 'bg-[#CBD5E1] dark:bg-[#334155]'
                  }`}
                >
                  <span className="sr-only">Toggle large print tiles</span>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      profile.largePrint ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#ECEFEA] dark:border-[#223040]">
                <div>
                  <div className="font-medium text-[#131B23] dark:text-[#F1F5F9]">
                    High-Contrast Borders
                  </div>
                  <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                    Crisper grid frames for visual clarity
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.highContrast}
                  onClick={() =>
                    void updatePreferences({
                      highContrast: !profile.highContrast,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    profile.highContrast
                      ? 'bg-[#176B52] dark:bg-[#2EB88A]'
                      : 'bg-[#CBD5E1] dark:bg-[#334155]'
                  }`}
                >
                  <span className="sr-only">Toggle high contrast borders</span>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      profile.highContrast ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#ECEFEA] dark:border-[#223040]">
                <div>
                  <div className="font-medium text-[#131B23] dark:text-[#F1F5F9]">
                    Sound Effects
                  </div>
                  <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                    Musical chimes for tile sweeps, words, and victories
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.soundEnabled}
                  onClick={() => {
                    const next = !profile.soundEnabled;
                    void updatePreferences({ soundEnabled: next });
                    if (next) playWordFound(true);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    profile.soundEnabled
                      ? 'bg-[#176B52] dark:bg-[#2EB88A]'
                      : 'bg-[#CBD5E1] dark:bg-[#334155]'
                  }`}
                >
                  <span className="sr-only">Toggle sound effects</span>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      profile.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-2 pt-3 border-t border-[#ECEFEA] dark:border-[#223040]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-[#131B23] dark:text-[#F1F5F9]">
                      Haptic Vibration
                    </div>
                    <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                      Short pulses on tile selection and word completion ·{' '}
                      {vibrationSupported
                        ? 'Supported on this device'
                        : 'Not supported by this browser'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={!hapticsEnabled}
                      onClick={() => {
                        vibrateWordSuccess(true);
                        setHapticsTestNote(
                          vibrationSupported
                            ? 'Sent word-completion vibration pulse.'
                            : 'This browser does not expose navigator.vibrate().'
                        );
                        window.setTimeout(() => setHapticsTestNote(null), 2600);
                      }}
                      className="px-2.5 py-1 rounded-md border border-[#D4DDD6] dark:border-[#2E3D4F] text-xs font-semibold text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] disabled:opacity-45 transition-colors whitespace-nowrap"
                    >
                      Test
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hapticsEnabled}
                      onClick={() => {
                        const next = !hapticsEnabled;
                        setHapticsEnabled(next);
                        saveHapticsEnabled(next);
                        if (next) vibrateWordSuccess(true);
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                        hapticsEnabled
                          ? 'bg-[#176B52] dark:bg-[#2EB88A]'
                          : 'bg-[#CBD5E1] dark:bg-[#334155]'
                      }`}
                    >
                      <span className="sr-only">Toggle haptic vibration</span>
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          hapticsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {hapticsTestNote && (
                  <p className="text-xs text-[#176B52] dark:text-[#2EB88A]">
                    {hapticsTestNote}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#ECEFEA] dark:border-[#223040]">
                <div>
                  <div className="font-medium text-[#131B23] dark:text-[#F1F5F9]">
                    Gameplay Timer
                  </div>
                  <div className="text-xs text-[#52606D] dark:text-[#94A3B8]">
                    Show a subtle elapsed timer during puzzles
                    {bestDailyTimeSeconds !== null
                      ? ` · Daily best ${Math.floor(bestDailyTimeSeconds / 60)}:${String(
                          bestDailyTimeSeconds % 60
                        ).padStart(2, '0')}`
                      : ''}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showTimer}
                  onClick={() => setShowTimer(!showTimer)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    showTimer
                      ? 'bg-[#176B52] dark:bg-[#2EB88A]'
                      : 'bg-[#CBD5E1] dark:bg-[#334155]'
                  }`}
                >
                  <span className="sr-only">Toggle optional gameplay timer</span>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showTimer ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Offline Play & Installable App */}
          <div className="rounded-2xl p-6 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-editorial text-lg font-bold text-[#131B23] dark:text-[#F1F5F9]">
                Offline Play & Sync
              </h2>
              {isOnline ? (
                <Cloud className="w-4 h-4 text-[#176B52] dark:text-[#2EB88A]" aria-hidden="true" />
              ) : (
                <CloudOff className="w-4 h-4 text-[#B45309] dark:text-[#F59E0B]" aria-hidden="true" />
              )}
            </div>
            <p className="text-xs leading-relaxed text-[#52606D] dark:text-[#94A3B8]">
              LexiLoom caches every unlocked word pack on your device. Puzzles solved offline are automatically synced to your cloud account when you reconnect.
            </p>
            <PWAInstallButton />
          </div>
        </div>
      </div>

        </>
      )}
    </section>
  );
};
