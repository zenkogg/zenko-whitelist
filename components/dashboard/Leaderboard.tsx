'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import CountUp from '@/components/CountUp';

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  referralCount: number;
  registrationOrder: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  userId: string;
  currentUserRank?: number;
}

export function Leaderboard({ userId, currentUserRank }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [userId]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, limit: 4 }),
      });

      if (!response.ok) throw new Error('Failed to fetch leaderboard');

      const result = await response.json();
      if (result.success && result.data) {
        setLeaderboard(result.data.leaderboard);
        setCurrentUserEntry(result.data.currentUserEntry || null);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="lg:col-span-6 flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-300/30 border-t-purple-300" />
      </div>
    );
  }

  return (
    <div className="lg:col-span-6">
      <div className="space-y-4">
        {leaderboard.map((entry) => (
          <div
            key={entry.rank}
            className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
              entry.isCurrentUser
                ? 'bg-purple-500/20 border-2 border-purple-300/30'
                : 'bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Rank Badge */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                entry.rank === 1
                  ? 'bg-amber-600/20 text-amber-600'
                  : entry.rank === 2
                  ? 'bg-amber-500/20 text-amber-600/80'
                  : entry.rank === 3
                  ? 'bg-amber-400/20 text-amber-600/70'
                  : 'bg-white/10 text-neutral-700'
              }`}>
                {entry.rank}
              </div>

              {/* Avatar */}
              <div className="relative h-10 w-10 rounded-full bg-white/10 ring-2 ring-purple-300/30 overflow-hidden">
                <Image
                  src={entry.avatarUrl || '/images/placeholder.svg'}
                  alt={entry.displayName}
                  fill
                  className="rounded-full object-cover"
                  unoptimized
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/placeholder.svg';
                  }}
                />
              </div>

              {/* Name */}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">
                  {entry.displayName}
                  {entry.isCurrentUser && (
                    <span className="ml-2 text-xs text-purple-300">(You)</span>
                  )}
                </span>
                <span className="text-xs text-neutral-700">
                  #{entry.registrationOrder.toLocaleString()} joined
                </span>
              </div>
            </div>

            {/* Referral Count with CountUp */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-amber-500" style={{ fontFamily: 'var(--font-sora)' }}>
                <CountUp value={entry.referralCount} duration={1500} />
              </span>
              <span className="text-xs text-neutral-700">referrals</span>
            </div>
          </div>
        ))}
      </div>

      {/* Current User Row - if not in top 4 */}
      {currentUserEntry && (
        <>
          {/* Gap Indicator */}
          <div className="flex items-center justify-center gap-1.5 py-4">
            <div className="h-1.5 w-1.5 rounded-full bg-purple-300/40" />
            <div className="h-1.5 w-1.5 rounded-full bg-purple-300/40" />
            <div className="h-1.5 w-1.5 rounded-full bg-purple-300/40" />
          </div>

          <div className="bg-purple-500/20 border-2 border-purple-300/30 flex items-center justify-between rounded-2xl px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Rank Badge */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-white/10 text-neutral-700">
                {currentUserEntry.rank}
              </div>

              {/* Avatar */}
              <div className="relative h-10 w-10 rounded-full bg-white/10 ring-2 ring-purple-300/30 overflow-hidden">
                <Image
                  src={currentUserEntry.avatarUrl || '/images/placeholder.svg'}
                  alt={currentUserEntry.displayName}
                  fill
                  className="rounded-full object-cover"
                  unoptimized
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/placeholder.svg';
                  }}
                />
              </div>

              {/* Name */}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">
                  {currentUserEntry.displayName}
                  <span className="ml-2 text-xs text-purple-300">(You)</span>
                </span>
                <span className="text-xs text-neutral-700">
                  #{currentUserEntry.registrationOrder.toLocaleString()} joined
                </span>
              </div>
            </div>

            {/* Referral Count with CountUp */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-amber-500" style={{ fontFamily: 'var(--font-sora)' }}>
                <CountUp value={currentUserEntry.referralCount} duration={1500} />
              </span>
              <span className="text-xs text-neutral-700">referrals</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
