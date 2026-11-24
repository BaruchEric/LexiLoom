import React, { useMemo, useState } from 'react';
import { Check, Copy, Flame, Trophy, UserMinus, UserPlus } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { AvatarDisplay } from './AvatarDisplay';
import { getTodayDateString } from '../data/wordThemes';

export const LeaderboardView: React.FC = () => {
  const {
    user,
    profile,
    leaderboard,
    leaderboardLoading,
    signInWithGoogle,
    addFriendByCode,
    removeFriend,
  } = useGame();

  const [scope, setScope] = useState<'global' | 'friends'>('global');
  const [sortBy, setSortBy] = useState<'totalScore' | 'currentStreak' | 'daily'>(
    'totalScore'
  );
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [friendFeedback, setFriendFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [addingFriend, setAddingFriend] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const today = getTodayDateString();

  const rankedPlayers = useMemo(() => {
    const base =
      scope === 'friends' && user
        ? leaderboard.filter(
            (p) => p.uid === user.uid || profile.friendUids.includes(p.uid)
          )
        : leaderboard;

    return [...base].sort((a, b) => {
      if (sortBy === 'currentStreak') {
        return b.currentStreak - a.currentStreak || b.totalScore - a.totalScore;
      }
      if (sortBy === 'daily') {
        const aToday = a.lastDailyDate === today ? a.lastDailyScore : 0;
        const bToday = b.lastDailyDate === today ? b.lastDailyScore : 0;
        return bToday - aToday || b.totalScore - a.totalScore;
      }
      return b.totalScore - a.totalScore || b.currentStreak - a.currentStreak;
    });
  }, [leaderboard, scope, sortBy, user, profile.friendUids, today]);

  const userRank = useMemo(() => {
    if (!user) return null;
    const idx = rankedPlayers.findIndex((p) => p.uid === user.uid);
    return idx >= 0 ? idx + 1 : null;
  }, [rankedPlayers, user]);

  const handleCopyFriendCode = async () => {
    try {
      await navigator.clipboard.writeText(profile.friendCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Clipboard blocked
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCodeInput.trim()) return;
    setAddingFriend(true);
    const result = await addFriendByCode(friendCodeInput);
    setFriendFeedback(result);
    if (result.ok) {
      setFriendCodeInput('');
    }
    setAddingFriend(false);
  };

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#E2E6E1] dark:border-[#223040]">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-[#52606D] dark:text-[#94A3B8]">
            <span>Real-Time Standings</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Your Streak: {profile.currentStreak}d
            </span>
            {userRank && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Rank #{userRank}
                </span>
              </>
            )}
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight text-[#131B23] dark:text-[#F1F5F9]">
            Global & Friends Leaderboard
          </h1>
          <p className="text-sm sm:text-base text-[#52606D] dark:text-[#94A3B8]">
            Compare daily scores, streaks, and total points with friends and puzzle enthusiasts worldwide.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div
            role="group"
            aria-label="Leaderboard scope"
            className="inline-flex items-center p-1 rounded-lg bg-[#E9EDE8] dark:bg-[#161F2A] border border-[#D4DDD6] dark:border-[#263342]"
          >
            <button
              type="button"
              onClick={() => setScope('global')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                scope === 'global'
                  ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                  : 'text-[#52606D] dark:text-[#94A3B8]'
              }`}
            >
              Global
            </button>
            <button
              type="button"
              onClick={() => setScope('friends')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                scope === 'friends'
                  ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                  : 'text-[#52606D] dark:text-[#94A3B8]'
              }`}
            >
              Friends ({profile.friendUids.length})
            </button>
          </div>

          <div
            role="group"
            aria-label="Sort leaderboard"
            className="inline-flex items-center p-1 rounded-lg bg-[#E9EDE8] dark:bg-[#161F2A] border border-[#D4DDD6] dark:border-[#263342]"
          >
            {(
              [
                { id: 'totalScore', label: 'Total Score' },
                { id: 'currentStreak', label: 'Streaks' },
                { id: 'daily', label: 'Today' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSortBy(opt.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  sortBy === opt.id
                    ? 'bg-white dark:bg-[#233142] text-[#131B23] dark:text-[#F1F5F9] shadow-xs'
                    : 'text-[#52606D] dark:text-[#94A3B8]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Friend Code Sharing & Add Friend Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 rounded-2xl p-6 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-editorial text-lg font-semibold text-[#131B23] dark:text-[#F1F5F9]">
              Your Friend Code
            </h2>
            <p className="text-xs text-[#52606D] dark:text-[#94A3B8]">
              Share your code so friends can add you directly to their Friends standings.
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2">
            <span className="font-mono text-xl font-bold tracking-wider text-[#176B52] dark:text-[#2EB88A]">
              {profile.friendCode}
            </span>
            <button
              type="button"
              onClick={() => void handleCopyFriendCode()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2E3D4F] text-xs font-semibold text-[#131B23] dark:text-[#F1F5F9] hover:bg-[#EDF1EE] dark:hover:bg-[#1E2A38] transition-colors whitespace-nowrap shrink-0"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#176B52] dark:text-[#2EB88A]" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Code
                </>
              )}
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => void handleAddFriend(e)}
          className="lg:col-span-7 rounded-2xl p-6 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] flex flex-col justify-between gap-4"
        >
          <div className="space-y-1">
            <h2 className="font-editorial text-lg font-semibold text-[#131B23] dark:text-[#F1F5F9]">
              Add a Friend
            </h2>
            <p className="text-xs text-[#52606D] dark:text-[#94A3B8]">
              Enter a friend’s LexiLoom code to follow their daily scores and streak.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={friendCodeInput}
              onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. LEXI-7K4M"
              maxLength={16}
              aria-label="Friend code"
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#F6F7F5] dark:bg-[#0F1721] border border-[#D4DDD6] dark:border-[#2E3D4F] font-mono text-sm text-[#131B23] dark:text-[#F1F5F9] placeholder:text-[#7B8794] focus-visible:outline-2 focus-visible:outline-[#176B52]"
            />
            <button
              type="submit"
              disabled={addingFriend || !friendCodeInput.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] disabled:opacity-50 text-white dark:text-[#0B1410] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              {addingFriend ? 'Looking up…' : 'Add Friend'}
            </button>
          </div>
          {friendFeedback && (
            <p
              className={`text-xs font-medium ${
                friendFeedback.ok
                  ? 'text-[#176B52] dark:text-[#2EB88A]'
                  : 'text-[#B45309] dark:text-[#F59E0B]'
              }`}
            >
              {friendFeedback.message}
            </p>
          )}
        </form>
      </div>

      {/* Standings Table or Sign-In Prompt */}
      {!user ? (
        <div className="rounded-2xl p-8 sm:p-10 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] text-center space-y-4">
          <Trophy
            className="w-8 h-8 mx-auto text-[#176B52] dark:text-[#2EB88A]"
            aria-hidden="true"
          />
          <h2 className="font-editorial text-2xl font-bold text-[#131B23] dark:text-[#F1F5F9]">
            Join the Live Leaderboard
          </h2>
          <p className="text-sm text-[#52606D] dark:text-[#94A3B8] max-w-md mx-auto">
            Sign in with Google to sync your local score ({profile.totalScore} pts) and{' '}
            {profile.currentStreak}-day streak across devices and compete globally or with friends.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] text-sm font-semibold transition-colors whitespace-nowrap"
          >
            Sign In with Google
          </button>
        </div>
      ) : leaderboardLoading ? (
        <div className="rounded-2xl p-8 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] text-center text-sm text-[#52606D] dark:text-[#94A3B8]">
          Loading live standings…
        </div>
      ) : rankedPlayers.length === 0 ? (
        <div className="rounded-2xl p-8 bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] text-center space-y-2">
          <p className="text-base font-semibold text-[#131B23] dark:text-[#F1F5F9]">
            {scope === 'friends'
              ? 'No friends added yet'
              : 'Be the first on the board'}
          </p>
          <p className="text-sm text-[#52606D] dark:text-[#94A3B8]">
            {scope === 'friends'
              ? 'Enter a friend’s Friend Code above to compare daily streaks.'
              : 'Solve today’s challenge to publish your first score.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E6E1] dark:border-[#223040] text-xs font-semibold text-[#52606D] dark:text-[#94A3B8]">
                <th className="py-3.5 px-5 w-16">Rank</th>
                <th className="py-3.5 px-5">Player</th>
                <th className="py-3.5 px-5 text-right">Streak</th>
                <th className="py-3.5 px-5 text-right hidden sm:table-cell">
                  Solved
                </th>
                <th className="py-3.5 px-5 text-right">
                  {sortBy === 'daily' ? 'Today' : 'Total Score'}
                </th>
                {scope === 'friends' && (
                  <th className="py-3.5 px-5 text-right w-16">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEFEA] dark:divide-[#223040] text-sm">
              {rankedPlayers.map((player, idx) => {
                const isMe = player.uid === user.uid;
                const displayScore =
                  sortBy === 'daily'
                    ? player.lastDailyDate === today
                      ? player.lastDailyScore
                      : 0
                    : player.totalScore;

                return (
                  <tr
                    key={player.uid}
                    className={
                      isMe
                        ? 'bg-[#E4F2EC]/50 dark:bg-[#15392E]/40'
                        : 'hover:bg-[#F6F7F5] dark:hover:bg-[#1C2735]'
                    }
                  >
                    <td className="py-3.5 px-5 font-mono tabular-nums font-bold text-[#131B23] dark:text-[#F1F5F9]">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <AvatarDisplay
                          avatarType={player.avatarType}
                          avatarId={player.avatarId}
                          avatarInitials={player.avatarInitials}
                          avatarColor={player.avatarColor}
                          displayName={player.displayName}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-[#131B23] dark:text-[#F1F5F9] truncate max-w-[180px] sm:max-w-[260px]">
                            {player.displayName}
                            {isMe ? ' (You)' : ''}
                          </div>
                          <div className="font-mono text-xs text-[#52606D] dark:text-[#94A3B8]">
                            {player.friendCode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono tabular-nums font-semibold text-[#9A5B13] dark:text-[#F59E0B]">
                      <span className="inline-flex items-center justify-end gap-1">
                        <Flame className="w-3.5 h-3.5" aria-hidden="true" />
                        {player.currentStreak}d
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono tabular-nums text-[#52606D] dark:text-[#94A3B8] hidden sm:table-cell">
                      {player.puzzlesSolved}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono tabular-nums font-bold text-[#131B23] dark:text-[#F1F5F9]">
                      {displayScore.toLocaleString()}
                    </td>
                    {scope === 'friends' && (
                      <td className="py-3.5 px-5 text-right">
                        {!isMe && (
                          <button
                            type="button"
                            onClick={() => void removeFriend(player.uid)}
                            aria-label={`Remove ${player.displayName} from friends`}
                            className="p-1.5 rounded-lg text-[#52606D] hover:text-[#B91C1C] dark:text-[#94A3B8] dark:hover:text-[#F87171] transition-colors"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
