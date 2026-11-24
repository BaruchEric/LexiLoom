import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  clampInt,
  computeNextDailyStreak,
  generateFriendCode,
  getNeedsCloudSync,
  loadCompletionWordMap,
  loadLocalCompletions,
  loadLocalProfile,
  saveCompletionWordMeta,
  saveLocalCompletions,
  saveLocalProfile,
  sanitizeDisplayName,
  sanitizeInitials,
  sanitizeStringArray,
  setNeedsCloudSync,
  type LocalCompletionRecord,
  type PlayerProfileState,
} from '../lib/storage';
import {
  loadDailyStreakSnapshot,
  recordDailyCompletionInStorage,
  type DailyStreakSnapshot,
} from '../lib/dailyStreak';
import {
  applyThemeToDocument,
  loadThemePreference,
  resolveThemeIsDark,
  saveThemePreference,
  type ThemePreference,
} from '../lib/theme';
import { getTodayDateString, WORD_THEME_PACKS } from '../data/wordThemes';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export interface LeaderboardPlayer {
  uid: string;
  displayName: string;
  avatarType: 'illustrated' | 'monogram';
  avatarId: string;
  avatarInitials: string;
  avatarColor: string;
  friendCode: string;
  currentStreak: number;
  bestStreak: number;
  totalScore: number;
  puzzlesSolved: number;
  lastDailyDate: string;
  lastDailyScore: number;
}

interface GameContextValue {
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  isOnline: boolean;
  syncStatus: 'local' | 'syncing' | 'synced' | 'offline-queued';
  profile: PlayerProfileState;
  completions: LocalCompletionRecord[];
  leaderboard: LeaderboardPlayer[];
  leaderboardLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  updateIdentity: (updates: {
    displayName: string;
    avatarType: 'illustrated' | 'monogram';
    avatarId: string;
    avatarInitials: string;
    avatarColor: string;
  }) => Promise<void>;
  updatePreferences: (
    updates: Partial<
      Pick<
        PlayerProfileState,
        | 'darkMode'
        | 'largePrint'
        | 'highContrast'
        | 'soundEnabled'
        | 'notificationsEnabled'
        | 'reminderTime'
      >
    >
  ) => Promise<void>;
  spendHintCredit: () => Promise<boolean>;
  spendPoints: (amount: number) => Promise<boolean>;
  grantAdRewardHints: (amount?: number) => Promise<void>;
  recordPuzzleCompletion: (params: {
    puzzleId: string;
    mode: 'daily' | 'theme';
    themeId: string;
    themeName: string;
    puzzleWord?: string;
    puzzleWords?: string[];
    score: number;
    durationSeconds: number;
    hintsUsed: number;
    wordsFound: number;
  }) => Promise<{ streakUpdated: boolean; newStreak: number }>;
  unlockPeriodicUpdates: () => Promise<number>;
  addFriendByCode: (
    code: string
  ) => Promise<{ ok: boolean; message: string }>;
  removeFriend: (friendUid: string) => Promise<void>;
  showTimer: boolean;
  setShowTimer: (enabled: boolean) => void;
  bestDailyTimeSeconds: number | null;
  dailyStreak: DailyStreakSnapshot;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const isOnline = useOnlineStatus();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfileState>(() =>
    loadLocalProfile()
  );
  const [dailyStreak, setDailyStreak] = useState<DailyStreakSnapshot>(() => {
    const initialProfile = loadLocalProfile();
    return loadDailyStreakSnapshot({
      currentStreak: initialProfile.currentStreak,
      bestStreak: initialProfile.bestStreak,
      lastDailyDate: initialProfile.lastDailyDate,
    });
  });
  const [completions, setCompletions] = useState<LocalCompletionRecord[]>(() =>
    loadLocalCompletions()
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(
    () => loadThemePreference()
  );
  const [showTimer, setShowTimerState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lexiloom_show_timer_v1') !== '0';
    } catch {
      return true;
    }
  });
  const [syncStatus, setSyncStatus] = useState<
    'local' | 'syncing' | 'synced' | 'offline-queued'
  >('local');

  const setShowTimer = useCallback((enabled: boolean) => {
    setShowTimerState(enabled);
    try {
      localStorage.setItem('lexiloom_show_timer_v1', enabled ? '1' : '0');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const bestDailyTimeSeconds = useMemo<number | null>(() => {
    const dailyTimes = completions
      .filter((c) => c.mode === 'daily' && c.durationSeconds > 0)
      .map((c) => c.durationSeconds);
    if (dailyTimes.length === 0) return null;
    return Math.min(...dailyTimes);
  }, [completions]);

  const profileRef = useRef(profile);
  profileRef.current = profile;
  const completionsRef = useRef(completions);
  completionsRef.current = completions;

  // Apply Dark Mode (manual override or live System preference) & High Contrast cleanly to <html>
  useEffect(() => {
    const syncTheme = () => {
      const isDark = resolveThemeIsDark(themePreference);
      applyThemeToDocument(isDark);
      setProfile((prev) =>
        prev.darkMode === isDark ? prev : { ...prev, darkMode: isDark }
      );
    };

    syncTheme();

    if (themePreference !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => syncTheme();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [themePreference]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      'high-contrast',
      profile.highContrast
    );
  }, [profile.highContrast]);

  // Persist locally on every profile/completion change for seamless offline play
  useEffect(() => {
    saveLocalProfile(profile);
  }, [profile]);

  useEffect(() => {
    saveLocalCompletions(completions);
  }, [completions]);

  // Keep dedicated localStorage streak store synchronized with profile & handle midnight rollover
  useEffect(() => {
    const refreshStreak = () => {
      const p = profileRef.current;
      const snap = loadDailyStreakSnapshot({
        currentStreak: p.currentStreak,
        bestStreak: p.bestStreak,
        lastDailyDate: p.lastDailyDate,
      });
      setDailyStreak(snap);
      if (snap.currentStreak !== p.currentStreak || snap.bestStreak !== p.bestStreak) {
        setProfile((prev) =>
          prev.currentStreak === snap.currentStreak &&
          prev.bestStreak === snap.bestStreak
            ? prev
            : {
                ...prev,
                currentStreak: snap.currentStreak,
                bestStreak: snap.bestStreak,
              }
        );
      }
    };

    refreshStreak();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshStreak();
      }
    };
    const intervalId = window.setInterval(refreshStreak, 60_000);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [profile.currentStreak, profile.bestStreak, profile.lastDailyDate]);

  // Helper to ensure an unclaimed friend code before initial user creation
  const resolveUniqueFriendCode = useCallback(
    async (uid: string, preferredCode: string): Promise<string> => {
      const normalized = preferredCode
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '')
        .slice(0, 16);
      const candidate =
        normalized.length >= 4 ? normalized : generateFriendCode(uid);
      try {
        const snap = await getDoc(doc(db, 'friendCodes', candidate));
        if (!snap.exists() || snap.data()?.uid === uid) {
          return candidate;
        }
      } catch {
        // Fall through to random code
      }
      return generateFriendCode(`${uid}-${Date.now()}`);
    },
    []
  );

  // Sync or bootstrap user document in Firestore on sign-in
  const initializeCloudAccount = useCallback(
    async (firebaseUser: User) => {
      const uid = firebaseUser.uid;
      const userPath = `users/${uid}`;
      setSyncStatus('syncing');

      let userSnap;
      try {
        userSnap = await getDoc(doc(db, 'users', uid));
      } catch (error) {
        if (!navigator.onLine) {
          setSyncStatus('offline-queued');
          return;
        }
        handleFirestoreError(error, OperationType.GET, userPath);
      }

      const local = profileRef.current;
      const localCompletions = completionsRef.current;

      if (!userSnap.exists()) {
        const displayName = sanitizeDisplayName(
          local.displayName !== 'Word Explorer'
            ? local.displayName
            : firebaseUser.displayName || 'Word Explorer'
        );
        const initials = sanitizeInitials(local.avatarInitials, displayName);
        const friendCode = await resolveUniqueFriendCode(
          uid,
          local.friendCode || generateFriendCode(uid)
        );

        const mergedProfile: PlayerProfileState = {
          ...local,
          displayName,
          avatarInitials: initials,
          friendCode,
          currentStreak: clampInt(local.currentStreak, 0, 10000),
          bestStreak: clampInt(local.bestStreak, 0, 10000),
          totalScore: clampInt(local.totalScore, 0, 10000000),
          puzzlesSolved: clampInt(local.puzzlesSolved, 0, 100000),
          hintCredits: clampInt(local.hintCredits, 0, 500),
          adsWatched: clampInt(local.adsWatched, 0, 100000),
          lastDailyDate: local.lastDailyDate.slice(0, 10),
          lastDailyScore: clampInt(local.lastDailyScore, 0, 50000),
          completedThemeIds: sanitizeStringArray(local.completedThemeIds, 50),
          unlockedPackIds: sanitizeStringArray(local.unlockedPackIds, 50),
          friendUids: sanitizeStringArray(local.friendUids, 50),
        };

        const batch = writeBatch(db);
        const ts = serverTimestamp();

        batch.set(doc(db, 'users', uid), {
          uid,
          ...mergedProfile,
          createdAt: ts,
          updatedAt: ts,
        });

        batch.set(doc(db, 'leaderboard', uid), {
          uid,
          displayName: mergedProfile.displayName,
          avatarType: mergedProfile.avatarType,
          avatarId: mergedProfile.avatarId,
          avatarInitials: mergedProfile.avatarInitials,
          avatarColor: mergedProfile.avatarColor,
          friendCode: mergedProfile.friendCode,
          isPublic: true,
          currentStreak: mergedProfile.currentStreak,
          bestStreak: mergedProfile.bestStreak,
          totalScore: mergedProfile.totalScore,
          puzzlesSolved: mergedProfile.puzzlesSolved,
          lastDailyDate: mergedProfile.lastDailyDate,
          lastDailyScore: mergedProfile.lastDailyScore,
          createdAt: ts,
          updatedAt: ts,
        });

        batch.set(doc(db, 'friendCodes', friendCode), {
          code: friendCode,
          uid,
          displayName: mergedProfile.displayName,
          createdAt: ts,
          updatedAt: ts,
        });

        // Push any offline completions earned prior to sign-in
        const unsynced = localCompletions.filter((c) => !c.syncedToCloud);
        for (const item of unsynced.slice(0, 15)) {
          const safeId = item.puzzleId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
          if (!safeId) continue;
          batch.set(doc(db, 'users', uid, 'completions', safeId), {
            uid,
            puzzleId: safeId,
            mode: item.mode,
            themeName: item.themeName.slice(0, 60) || 'Word Puzzle',
            score: clampInt(item.score, 0, 50000),
            durationSeconds: clampInt(item.durationSeconds, 0, 86400),
            hintsUsed: clampInt(item.hintsUsed, 0, 50),
            wordsFound: clampInt(item.wordsFound, 0, 50),
            status: 'completed',
            completedAt: ts,
          });
        }

        try {
          await batch.commit();
          setProfile(mergedProfile);
          setCompletions((prev) =>
            prev.map((c) => ({ ...c, syncedToCloud: true }))
          );
          setNeedsCloudSync(false);
          setSyncStatus('synced');
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, userPath);
        }
      } else {
        const cloud = userSnap.data() as PlayerProfileState & {
          uid: string;
          createdAt?: Timestamp;
        };

        // If local had offline changes, merge cleanly and push up
        const hasOfflineQueue =
          getNeedsCloudSync() ||
          localCompletions.some((c) => !c.syncedToCloud);

        if (hasOfflineQueue) {
          const mergedCompletedThemes = sanitizeStringArray(
            [...(cloud.completedThemeIds || []), ...local.completedThemeIds],
            50
          );
          const mergedUnlocked = sanitizeStringArray(
            [...(cloud.unlockedPackIds || []), ...local.unlockedPackIds],
            50
          );
          const mergedFriends = sanitizeStringArray(
            [...(cloud.friendUids || []), ...local.friendUids],
            50
          );
          const latestDailyDate =
            local.lastDailyDate > (cloud.lastDailyDate || '')
              ? local.lastDailyDate
              : cloud.lastDailyDate || '';
          const latestDailyScore =
            local.lastDailyDate > (cloud.lastDailyDate || '')
              ? local.lastDailyScore
              : Math.max(cloud.lastDailyScore || 0, local.lastDailyScore);

          const mergedFields = {
            displayName: sanitizeDisplayName(
              cloud.displayName || local.displayName
            ),
            avatarType: cloud.avatarType || local.avatarType,
            avatarId: cloud.avatarId || local.avatarId,
            avatarInitials: sanitizeInitials(
              cloud.avatarInitials || local.avatarInitials,
              cloud.displayName || local.displayName
            ),
            avatarColor: cloud.avatarColor || local.avatarColor,
            currentStreak: clampInt(
              Math.max(cloud.currentStreak || 0, local.currentStreak),
              0,
              10000
            ),
            bestStreak: clampInt(
              Math.max(cloud.bestStreak || 0, local.bestStreak),
              0,
              10000
            ),
            totalScore: clampInt(
              Math.max(cloud.totalScore || 0, local.totalScore),
              0,
              10000000
            ),
            puzzlesSolved: clampInt(
              Math.max(cloud.puzzlesSolved || 0, local.puzzlesSolved),
              0,
              100000
            ),
            hintCredits: clampInt(
              Math.max(cloud.hintCredits || 0, local.hintCredits),
              0,
              500
            ),
            adsWatched: clampInt(
              Math.max(cloud.adsWatched || 0, local.adsWatched),
              0,
              100000
            ),
            lastDailyDate: latestDailyDate.slice(0, 10),
            lastDailyScore: clampInt(latestDailyScore, 0, 50000),
            completedThemeIds: mergedCompletedThemes,
            unlockedPackIds: mergedUnlocked,
            friendUids: mergedFriends,
            notificationsEnabled: local.notificationsEnabled,
            reminderTime: local.reminderTime,
            darkMode: local.darkMode,
            largePrint: local.largePrint,
            highContrast: local.highContrast,
            soundEnabled: local.soundEnabled,
          };

          const batch = writeBatch(db);
          const ts = serverTimestamp();

          batch.update(doc(db, 'users', uid), {
            ...mergedFields,
            updatedAt: ts,
          });

          batch.update(doc(db, 'leaderboard', uid), {
            displayName: mergedFields.displayName,
            avatarType: mergedFields.avatarType,
            avatarId: mergedFields.avatarId,
            avatarInitials: mergedFields.avatarInitials,
            avatarColor: mergedFields.avatarColor,
            currentStreak: mergedFields.currentStreak,
            bestStreak: mergedFields.bestStreak,
            totalScore: mergedFields.totalScore,
            puzzlesSolved: mergedFields.puzzlesSolved,
            lastDailyDate: mergedFields.lastDailyDate,
            lastDailyScore: mergedFields.lastDailyScore,
            updatedAt: ts,
          });

          const unsynced = localCompletions.filter((c) => !c.syncedToCloud);
          for (const item of unsynced.slice(0, 15)) {
            const safeId = item.puzzleId
              .replace(/[^a-zA-Z0-9_-]/g, '')
              .slice(0, 64);
            if (!safeId) continue;
            const compRef = doc(db, 'users', uid, 'completions', safeId);
            const existingComp = await getDoc(compRef);
            if (!existingComp.exists()) {
              batch.set(compRef, {
                uid,
                puzzleId: safeId,
                mode: item.mode,
                themeName: item.themeName.slice(0, 60) || 'Word Puzzle',
                score: clampInt(item.score, 0, 50000),
                durationSeconds: clampInt(item.durationSeconds, 0, 86400),
                hintsUsed: clampInt(item.hintsUsed, 0, 50),
                wordsFound: clampInt(item.wordsFound, 0, 50),
                status: 'completed',
                completedAt: ts,
              });
            }
          }

          try {
            await batch.commit();
            setCompletions((prev) =>
              prev.map((c) => ({ ...c, syncedToCloud: true }))
            );
            setNeedsCloudSync(false);
            setSyncStatus('synced');
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, userPath);
          }
        } else {
          setSyncStatus('synced');
        }
      }
    },
    [resolveUniqueFriendCode]
  );

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        if (navigator.onLine) {
          void initializeCloudAccount(firebaseUser);
        } else {
          setSyncStatus('offline-queued');
        }
      } else {
        setSyncStatus('local');
        setLeaderboard([]);
      }
    });
    return () => unsub();
  }, [initializeCloudAccount]);

  // Flush offline queue automatically when returning online
  useEffect(() => {
    if (isOnline && user && (getNeedsCloudSync() || syncStatus === 'offline-queued')) {
      void initializeCloudAccount(user);
    } else if (!isOnline) {
      setSyncStatus('offline-queued');
    }
  }, [isOnline, user, syncStatus, initializeCloudAccount]);

  // Real-time Firestore subscriptions (only when authenticated!)
  useEffect(() => {
    if (!user) return;

    const uid = user.uid;
    const userDocRef = doc(db, 'users', uid);

    const unsubProfile = onSnapshot(
      userDocRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as PlayerProfileState;
        setProfile((prev) => ({
          ...prev,
          displayName: data.displayName ?? prev.displayName,
          avatarType: data.avatarType ?? prev.avatarType,
          avatarId: data.avatarId ?? prev.avatarId,
          avatarInitials: data.avatarInitials ?? prev.avatarInitials,
          avatarColor: data.avatarColor ?? prev.avatarColor,
          friendCode: data.friendCode ?? prev.friendCode,
          currentStreak: data.currentStreak ?? prev.currentStreak,
          bestStreak: data.bestStreak ?? prev.bestStreak,
          totalScore: data.totalScore ?? prev.totalScore,
          puzzlesSolved: data.puzzlesSolved ?? prev.puzzlesSolved,
          hintCredits: data.hintCredits ?? prev.hintCredits,
          adsWatched: data.adsWatched ?? prev.adsWatched,
          lastDailyDate: data.lastDailyDate ?? prev.lastDailyDate,
          lastDailyScore: data.lastDailyScore ?? prev.lastDailyScore,
          completedThemeIds: data.completedThemeIds ?? prev.completedThemeIds,
          unlockedPackIds: data.unlockedPackIds ?? prev.unlockedPackIds,
          friendUids: data.friendUids ?? prev.friendUids,
          notificationsEnabled:
            data.notificationsEnabled ?? prev.notificationsEnabled,
          reminderTime: data.reminderTime ?? prev.reminderTime,
          darkMode: data.darkMode ?? prev.darkMode,
          largePrint: data.largePrint ?? prev.largePrint,
          highContrast: data.highContrast ?? prev.highContrast,
          soundEnabled: data.soundEnabled ?? prev.soundEnabled,
        }));
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      }
    );

    setLeaderboardLoading(true);
    const lbQuery = query(
      collection(db, 'leaderboard'),
      where('isPublic', '==', true),
      limit(100)
    );
    const unsubLeaderboard = onSnapshot(
      lbQuery,
      (snapshot) => {
        const items: LeaderboardPlayer[] = snapshot.docs.map((d) => {
          const v = d.data();
          return {
            uid: v.uid,
            displayName: v.displayName,
            avatarType: v.avatarType,
            avatarId: v.avatarId,
            avatarInitials: v.avatarInitials,
            avatarColor: v.avatarColor,
            friendCode: v.friendCode,
            currentStreak: v.currentStreak ?? 0,
            bestStreak: v.bestStreak ?? 0,
            totalScore: v.totalScore ?? 0,
            puzzlesSolved: v.puzzlesSolved ?? 0,
            lastDailyDate: v.lastDailyDate ?? '',
            lastDailyScore: v.lastDailyScore ?? 0,
          };
        });
        setLeaderboard(items);
        setLeaderboardLoading(false);
      },
      (error) => {
        setLeaderboardLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'leaderboard');
      }
    );

    const compQuery = query(
      collection(db, 'users', uid, 'completions'),
      where('uid', '==', uid),
      limit(50)
    );
    const unsubCompletions = onSnapshot(
      compQuery,
      (snapshot) => {
        const wordMap = loadCompletionWordMap();
        const cloudItems: LocalCompletionRecord[] = snapshot.docs.map((d) => {
          const v = d.data();
          const ts = v.completedAt as Timestamp | undefined;
          const cachedMeta = wordMap[v.puzzleId];
          return {
            puzzleId: v.puzzleId,
            mode: v.mode,
            themeName: v.themeName,
            ...(cachedMeta?.puzzleWord ? { puzzleWord: cachedMeta.puzzleWord } : {}),
            ...(cachedMeta?.puzzleWords ? { puzzleWords: cachedMeta.puzzleWords } : {}),
            score: v.score ?? 0,
            durationSeconds: v.durationSeconds ?? 0,
            hintsUsed: v.hintsUsed ?? 0,
            wordsFound: v.wordsFound ?? 0,
            completedAtIso: ts?.toDate
              ? ts.toDate().toISOString()
              : new Date().toISOString(),
            syncedToCloud: true,
          };
        });
        setCompletions((prev) => {
          const map = new Map<string, LocalCompletionRecord>();
          for (const item of prev) map.set(item.puzzleId, item);
          for (const item of cloudItems) {
            const existing = map.get(item.puzzleId);
            map.set(item.puzzleId, {
              ...item,
              puzzleWord: item.puzzleWord || existing?.puzzleWord,
              puzzleWords: item.puzzleWords || existing?.puzzleWords,
            });
          }
          return Array.from(map.values()).sort((a, b) =>
            b.completedAtIso.localeCompare(a.completedAtIso)
          );
        });
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${uid}/completions`
        );
      }
    );

    return () => {
      unsubProfile();
      unsubLeaderboard();
      unsubCompletions();
    };
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Unable to sign in right now.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
  }, []);

  const updateIdentity = useCallback(
    async (updates: {
      displayName: string;
      avatarType: 'illustrated' | 'monogram';
      avatarId: string;
      avatarInitials: string;
      avatarColor: string;
    }) => {
      const cleanName = sanitizeDisplayName(updates.displayName);
      const cleanInitials = sanitizeInitials(updates.avatarInitials, cleanName);
      const cleanPayload = {
        displayName: cleanName,
        avatarType: updates.avatarType,
        avatarId: updates.avatarId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'owl',
        avatarInitials: cleanInitials,
        avatarColor: updates.avatarColor.slice(0, 20) || '#176B52',
      };

      setProfile((prev) => ({ ...prev, ...cleanPayload }));

      if (!user || !isOnline) {
        setNeedsCloudSync(true);
        setSyncStatus(user ? 'offline-queued' : 'local');
        return;
      }

      const batch = writeBatch(db);
      const ts = serverTimestamp();
      batch.update(doc(db, 'users', user.uid), {
        ...cleanPayload,
        updatedAt: ts,
      });
      batch.update(doc(db, 'leaderboard', user.uid), {
        ...cleanPayload,
        updatedAt: ts,
      });
      if (profileRef.current.friendCode) {
        batch.update(doc(db, 'friendCodes', profileRef.current.friendCode), {
          displayName: cleanName,
          updatedAt: ts,
        });
      }

      try {
        await batch.commit();
        setSyncStatus('synced');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    },
    [user, isOnline]
  );

  const updatePreferences = useCallback(
    async (
      updates: Partial<
        Pick<
          PlayerProfileState,
          | 'darkMode'
          | 'largePrint'
          | 'highContrast'
          | 'soundEnabled'
          | 'notificationsEnabled'
          | 'reminderTime'
        >
      >
    ) => {
      if (typeof updates.darkMode === 'boolean') {
        const manualPref: ThemePreference = updates.darkMode ? 'dark' : 'light';
        saveThemePreference(manualPref);
        setThemePreferenceState(manualPref);
        applyThemeToDocument(updates.darkMode);
      }

      const next: PlayerProfileState = { ...profileRef.current, ...updates };
      setProfile(next);

      if (!user || !isOnline) {
        setNeedsCloudSync(true);
        setSyncStatus(user ? 'offline-queued' : 'local');
        return;
      }

      try {
        await updateDoc(doc(db, 'users', user.uid), {
          notificationsEnabled: next.notificationsEnabled,
          reminderTime: next.reminderTime.slice(0, 5),
          darkMode: next.darkMode,
          largePrint: next.largePrint,
          highContrast: next.highContrast,
          soundEnabled: next.soundEnabled,
          updatedAt: serverTimestamp(),
        });
        setSyncStatus('synced');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    },
    [user, isOnline]
  );

  const setThemePreference = useCallback(
    (pref: ThemePreference) => {
      saveThemePreference(pref);
      setThemePreferenceState(pref);
      const isDark = resolveThemeIsDark(pref);
      applyThemeToDocument(isDark);
      setProfile((prev) =>
        prev.darkMode === isDark ? prev : { ...prev, darkMode: isDark }
      );
      if (user && isOnline) {
        void updateDoc(doc(db, 'users', user.uid), {
          darkMode: isDark,
          updatedAt: serverTimestamp(),
        }).catch(() => {
          // Local storage remains authoritative if offline
        });
      }
    },
    [user, isOnline]
  );

  const spendHintCredit = useCallback(async (): Promise<boolean> => {
    const current = profileRef.current;
    if (current.hintCredits <= 0) return false;
    const nextCredits = clampInt(current.hintCredits - 1, 0, 500);
    setProfile((prev) => ({ ...prev, hintCredits: nextCredits }));

    if (!user || !isOnline) {
      setNeedsCloudSync(true);
      return true;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        hintCredits: nextCredits,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
    return true;
  }, [user, isOnline]);

  const spendPoints = useCallback(
    async (amount: number): Promise<boolean> => {
      const cost = clampInt(amount, 1, 5000);
      const current = profileRef.current;
      if (current.totalScore < cost) return false;
      const nextTotalScore = clampInt(current.totalScore - cost, 0, 10000000);
      setProfile((prev) => ({ ...prev, totalScore: nextTotalScore }));

      if (!user || !isOnline) {
        setNeedsCloudSync(true);
        return true;
      }

      const batch = writeBatch(db);
      const ts = serverTimestamp();
      batch.update(doc(db, 'users', user.uid), {
        totalScore: nextTotalScore,
        updatedAt: ts,
      });
      batch.update(doc(db, 'leaderboard', user.uid), {
        totalScore: nextTotalScore,
        updatedAt: ts,
      });

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
      return true;
    },
    [user, isOnline]
  );

  const grantAdRewardHints = useCallback(
    async (amount = 2) => {
      const current = profileRef.current;
      const nextCredits = clampInt(current.hintCredits + amount, 0, 500);
      const nextAds = clampInt(current.adsWatched + 1, 0, 100000);

      setProfile((prev) => ({
        ...prev,
        hintCredits: nextCredits,
        adsWatched: nextAds,
      }));

      if (!user || !isOnline) {
        setNeedsCloudSync(true);
        return;
      }

      try {
        await updateDoc(doc(db, 'users', user.uid), {
          hintCredits: nextCredits,
          adsWatched: nextAds,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    },
    [user, isOnline]
  );

  const recordPuzzleCompletion = useCallback(
    async (params: {
      puzzleId: string;
      mode: 'daily' | 'theme';
      themeId: string;
      themeName: string;
      puzzleWord?: string;
      puzzleWords?: string[];
      score: number;
      durationSeconds: number;
      hintsUsed: number;
      wordsFound: number;
    }): Promise<{ streakUpdated: boolean; newStreak: number }> => {
      const current = profileRef.current;
      const today = getTodayDateString();
      const safeScore = clampInt(params.score, 0, 50000);
      const safeDuration = clampInt(params.durationSeconds, 0, 86400);
      const safeHints = clampInt(params.hintsUsed, 0, 50);
      const safeWords = clampInt(params.wordsFound, 0, 50);

      const streakCalc = computeNextDailyStreak(
        current.currentStreak,
        current.bestStreak,
        current.lastDailyDate,
        today
      );
      const { snapshot, alreadySolvedToday } = recordDailyCompletionInStorage(
        today,
        {
          currentStreak: current.currentStreak,
          bestStreak: current.bestStreak,
          lastDailyDate: current.lastDailyDate,
        }
      );
      setDailyStreak(snapshot);
      const nextStreak = Math.max(streakCalc.currentStreak, snapshot.currentStreak);
      const nextBestStreak = Math.max(streakCalc.bestStreak, snapshot.bestStreak);
      const nextLastDailyDate = today;
      const nextLastDailyScore =
        params.mode === 'daily'
          ? Math.max(
              streakCalc.alreadySolvedToday || alreadySolvedToday
                ? current.lastDailyScore
                : 0,
              safeScore
            )
          : current.lastDailyScore;
      const streakUpdated = !(streakCalc.alreadySolvedToday && alreadySolvedToday);

      const nextCompletedThemes =
        params.mode === 'theme'
          ? sanitizeStringArray([...current.completedThemeIds, params.themeId], 50)
          : current.completedThemeIds;

      const alreadyCompletedId = completionsRef.current.some(
        (c) => c.puzzleId === params.puzzleId
      );

      const nextTotalScore = clampInt(
        current.totalScore + (alreadyCompletedId ? Math.round(safeScore * 0.25) : safeScore),
        0,
        10000000
      );
      const nextPuzzlesSolved = clampInt(
        current.puzzlesSolved + (alreadyCompletedId ? 0 : 1),
        0,
        100000
      );

      const progressFields = {
        currentStreak: clampInt(nextStreak, 0, 10000),
        bestStreak: clampInt(nextBestStreak, 0, 10000),
        totalScore: nextTotalScore,
        puzzlesSolved: nextPuzzlesSolved,
        lastDailyDate: nextLastDailyDate.slice(0, 10),
        lastDailyScore: clampInt(nextLastDailyScore, 0, 50000),
        completedThemeIds: nextCompletedThemes,
      };

      setProfile((prev) => ({ ...prev, ...progressFields }));

      const cleanPuzzleWord = params.puzzleWord
        ? params.puzzleWord.trim().toUpperCase().slice(0, 32)
        : undefined;
      const cleanPuzzleWords = Array.isArray(params.puzzleWords)
        ? params.puzzleWords
            .map((w) => w.trim().toUpperCase().slice(0, 32))
            .filter(Boolean)
            .slice(0, 16)
        : undefined;

      if (cleanPuzzleWord) {
        saveCompletionWordMeta(params.puzzleId, cleanPuzzleWord, cleanPuzzleWords);
      }

      const newRecord: LocalCompletionRecord = {
        puzzleId: params.puzzleId,
        mode: params.mode,
        themeName: params.themeName.slice(0, 60),
        ...(cleanPuzzleWord ? { puzzleWord: cleanPuzzleWord } : {}),
        ...(cleanPuzzleWords && cleanPuzzleWords.length > 0
          ? { puzzleWords: cleanPuzzleWords }
          : {}),
        score: safeScore,
        durationSeconds: safeDuration,
        hintsUsed: safeHints,
        wordsFound: safeWords,
        completedAtIso: new Date().toISOString(),
        syncedToCloud: false,
      };

      setCompletions((prev) => {
        const filtered = prev.filter((c) => c.puzzleId !== params.puzzleId);
        return [newRecord, ...filtered].slice(0, 60);
      });

      if (!user || !isOnline) {
        setNeedsCloudSync(true);
        setSyncStatus(user ? 'offline-queued' : 'local');
        return { streakUpdated, newStreak: progressFields.currentStreak };
      }

      const safePuzzleId = params.puzzleId
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 64);

      const batch = writeBatch(db);
      const ts = serverTimestamp();

      batch.update(doc(db, 'users', user.uid), {
        ...progressFields,
        updatedAt: ts,
      });

      batch.update(doc(db, 'leaderboard', user.uid), {
        currentStreak: progressFields.currentStreak,
        bestStreak: progressFields.bestStreak,
        totalScore: progressFields.totalScore,
        puzzlesSolved: progressFields.puzzlesSolved,
        lastDailyDate: progressFields.lastDailyDate,
        lastDailyScore: progressFields.lastDailyScore,
        updatedAt: ts,
      });

      const compRef = doc(db, 'users', user.uid, 'completions', safePuzzleId);
      let compExists = false;
      try {
        const snap = await getDoc(compRef);
        compExists = snap.exists();
      } catch {
        compExists = false;
      }

      if (!compExists) {
        batch.set(compRef, {
          uid: user.uid,
          puzzleId: safePuzzleId,
          mode: params.mode,
          themeName: params.themeName.slice(0, 60) || 'Word Puzzle',
          score: safeScore,
          durationSeconds: safeDuration,
          hintsUsed: safeHints,
          wordsFound: safeWords,
          status: 'completed',
          completedAt: ts,
        });
      }

      try {
        await batch.commit();
        setCompletions((prev) =>
          prev.map((c) =>
            c.puzzleId === params.puzzleId ? { ...c, syncedToCloud: true } : c
          )
        );
        setSyncStatus('synced');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }

      return { streakUpdated, newStreak: progressFields.currentStreak };
    },
    [user, isOnline]
  );

  const unlockPeriodicUpdates = useCallback(async (): Promise<number> => {
    const current = profileRef.current;
    const allIds = WORD_THEME_PACKS.map((p) => p.id);
    const newlyUnlocked = allIds.filter(
      (id) => !current.unlockedPackIds.includes(id)
    );
    if (newlyUnlocked.length === 0) return 0;

    const merged = sanitizeStringArray(
      [...current.unlockedPackIds, ...newlyUnlocked],
      50
    );
    setProfile((prev) => ({ ...prev, unlockedPackIds: merged }));

    if (!user || !isOnline) {
      setNeedsCloudSync(true);
      return newlyUnlocked.length;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        unlockedPackIds: merged,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
    return newlyUnlocked.length;
  }, [user, isOnline]);

  const addFriendByCode = useCallback(
    async (rawCode: string): Promise<{ ok: boolean; message: string }> => {
      if (!user) {
        return {
          ok: false,
          message: 'Sign in with Google to connect with friends by Friend Code.',
        };
      }
      if (!isOnline) {
        return {
          ok: false,
          message: 'Reconnect to the internet to look up a Friend Code.',
        };
      }

      const code = rawCode.trim().toUpperCase();
      if (!/^[A-Z0-9-]{4,16}$/.test(code)) {
        return {
          ok: false,
          message: 'Enter a valid Friend Code (for example, LEXI-4K8P).',
        };
      }

      if (code === profileRef.current.friendCode) {
        return { ok: false, message: 'That is your own Friend Code.' };
      }

      const path = `friendCodes/${code}`;
      let snap;
      try {
        snap = await getDoc(doc(db, 'friendCodes', code));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }

      if (!snap.exists()) {
        return {
          ok: false,
          message: `No player found with code ${code}. Double-check the code and try again.`,
        };
      }

      const data = snap.data() as { uid: string; displayName: string };
      if (profileRef.current.friendUids.includes(data.uid)) {
        return {
          ok: false,
          message: `${data.displayName} is already on your Friends leaderboard.`,
        };
      }

      const nextFriends = sanitizeStringArray(
        [...profileRef.current.friendUids, data.uid],
        50
      );
      setProfile((prev) => ({ ...prev, friendUids: nextFriends }));

      try {
        await updateDoc(doc(db, 'users', user.uid), {
          friendUids: nextFriends,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }

      return {
        ok: true,
        message: `Added ${data.displayName} to your Friends leaderboard.`,
      };
    },
    [user, isOnline]
  );

  const removeFriend = useCallback(
    async (friendUid: string) => {
      const nextFriends = profileRef.current.friendUids.filter(
        (id) => id !== friendUid
      );
      setProfile((prev) => ({ ...prev, friendUids: nextFriends }));

      if (!user || !isOnline) {
        setNeedsCloudSync(true);
        return;
      }

      try {
        await updateDoc(doc(db, 'users', user.uid), {
          friendUids: nextFriends,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    },
    [user, isOnline]
  );

  const value = useMemo<GameContextValue>(
    () => ({
      user,
      authLoading,
      authError,
      isOnline,
      syncStatus,
      profile,
      completions,
      leaderboard,
      leaderboardLoading,
      signInWithGoogle,
      signOutUser,
      updateIdentity,
      updatePreferences,
      spendHintCredit,
      spendPoints,
      grantAdRewardHints,
      recordPuzzleCompletion,
      unlockPeriodicUpdates,
      addFriendByCode,
      removeFriend,
      showTimer,
      setShowTimer,
      bestDailyTimeSeconds,
      dailyStreak,
      themePreference,
      setThemePreference,
    }),
    [
      user,
      authLoading,
      authError,
      isOnline,
      syncStatus,
      profile,
      completions,
      leaderboard,
      leaderboardLoading,
      signInWithGoogle,
      signOutUser,
      updateIdentity,
      updatePreferences,
      spendHintCredit,
      spendPoints,
      grantAdRewardHints,
      recordPuzzleCompletion,
      unlockPeriodicUpdates,
      addFriendByCode,
      removeFriend,
      showTimer,
      setShowTimer,
      bestDailyTimeSeconds,
      dailyStreak,
      themePreference,
      setThemePreference,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used inside GameProvider');
  }
  return ctx;
}
