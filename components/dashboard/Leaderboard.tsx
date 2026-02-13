'use client';

import Image from 'next/image';
import { useEffect, useState, useRef, useCallback } from 'react';
import CountUp from '@/components/CountUp';
import { AnimatedItem } from '@/components/AnimatedList';
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/20/solid';

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
}

export function Leaderboard({ userId }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(20);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchLeaderboard = useCallback(async (limit: number = 20) => {
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, limit }),
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
      setIsLoadingMore(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchLeaderboard(currentLimit);
  }, [fetchLeaderboard, currentLimit]);

  const loadMoreUsers = async () => {
    if (!currentUserEntry) return;

    setIsLoadingMore(true);
    const previousLength = leaderboard.length;

    // Load all users up to current user's rank
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, limit: currentUserEntry.rank }),
      });

      if (!response.ok) throw new Error('Failed to fetch leaderboard');

      const result = await response.json();
      if (result.success && result.data) {
        setLeaderboard(result.data.leaderboard);
        setCurrentUserEntry(result.data.currentUserEntry || null);
        setCurrentLimit(currentUserEntry.rank);

        // Scroll to first newly loaded item after render
        setTimeout(() => {
          scrollToPosition(previousLength);
        }, 100);
      }
    } catch (error) {
      console.error('Failed to load more users:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const scrollToUserPosition = async () => {
    const userRowIndex = leaderboard.findIndex(e => e.isCurrentUser);

    // If user is not in the current leaderboard, fetch more data
    if (userRowIndex === -1 && currentUserEntry) {
      try {
        // Fetch users up to current user's rank
        const response = await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, limit: currentUserEntry.rank }),
        });

        if (!response.ok) return;

        const result = await response.json();
        if (result.success && result.data) {
          setLeaderboard(result.data.leaderboard);

          // Wait for render, then scroll
          setTimeout(() => {
            scrollToPosition(result.data.leaderboard.findIndex((e: LeaderboardEntry) => e.isCurrentUser));
          }, 100);
        }
      } catch (error) {
        console.error('Failed to load extended leaderboard:', error);
      }
    } else {
      // User is already in the list, just scroll
      scrollToPosition(userRowIndex);
    }
  };

  const scrollToPosition = (userRowIndex: number) => {
    if (!scrollContainerRef.current || userRowIndex === -1) return;

    const container = scrollContainerRef.current;
    const selectedItem = container.querySelector(`[data-index="${userRowIndex}"]`) as HTMLElement | null;

    if (selectedItem) {
      const extraMargin = 50;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;

      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: 'smooth' });
      } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: 'smooth'
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="lg:col-span-6 flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-300/30 border-t-purple-300" />
      </div>
    );
  }

  // Reusable row renderer
  const renderLeaderboardRow = (entry: LeaderboardEntry) => (
    <div
      className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
        entry.isCurrentUser
          ? 'bg-white/5 border-2 border-purple-300/30'
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
              <span className="ml-2 text-xs text-amber-500">(You)</span>
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
  );

  const userInLeaderboard = leaderboard.some(e => e.isCurrentUser);
  const userRankInList = leaderboard.findIndex(e => e.isCurrentUser);
  // Show button if user is beyond first 5-6 rows OR if user is outside the leaderboard
  const shouldShowRevealButton = (userInLeaderboard && userRankInList > 5) || (!userInLeaderboard && currentUserEntry);

  return (
    <div className="lg:col-span-6 relative">
      {/* Reveal Position Link */}
      {shouldShowRevealButton && (
        <div className="flex justify-end mb-6">
          <button
            onClick={scrollToUserPosition}
            className="flex items-center gap-1.5 text-xs text-purple-300/70 hover:text-purple-300 transition-colors cursor-pointer"
          >
            <MagnifyingGlassIcon className="h-3.5 w-3.5" />
            <span>reveal me</span>
          </button>
        </div>
      )}

      {/* Scrollable Leaderboard - 5 rows visible initially */}
      <div
        ref={scrollContainerRef}
        className="max-h-[420px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-purple-300/20 [&::-webkit-scrollbar-thumb]:rounded-full pr-2"
      >
        {leaderboard.map((entry, index) => (
          <AnimatedItem key={entry.rank} delay={index * 0.05} index={index}>
            {renderLeaderboardRow(entry)}
          </AnimatedItem>
        ))}
      </div>

      {/* Load More Button - only show if there are more users to load */}
      {currentUserEntry && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={loadMoreUsers}
            disabled={isLoadingMore}
            className="group flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-purple-500/10 border border-purple-300/20 hover:border-purple-300/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-4 w-4 text-purple-300/70 group-hover:text-purple-300 transition-colors ${isLoadingMore ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Current User Row - if not in top 20 */}
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
                  <span className="ml-2 text-xs text-amber-500">(You)</span>
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
