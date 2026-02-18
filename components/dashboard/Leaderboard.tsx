'use client';

import Image from 'next/image';
import { useEffect, useState, useRef, useCallback } from 'react';
import CountUp from '@/components/CountUp';
import { AnimatedItem } from '@/components/AnimatedList';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/20/solid';

// Leaderboard Configuration
const INITIAL_LOAD_COUNT = 7; // Number of users to load initially
const LOAD_MORE_INCREMENT = 10; // Number of users to add per "load more" click
const VISIBLE_ROWS = 5; // Approximate number of rows visible in viewport (controlled by max-h-[420px])

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
  totalUsers?: number;
}

export function Leaderboard({ userId, totalUsers = 0 }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRevealingUser, setIsRevealingUser] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(INITIAL_LOAD_COUNT);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchLeaderboard = useCallback(async (limit: number = INITIAL_LOAD_COUNT) => {
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
    setIsLoadingMore(true);
    const previousLength = leaderboard.length;

    // Determine how many users to load
    const targetLimit = currentUserEntry
      ? currentUserEntry.rank // Load up to current user if they're outside the list
      : Math.min(currentLimit + LOAD_MORE_INCREMENT, totalUsers); // Otherwise load next batch or remaining

    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, limit: targetLimit }),
      });

      if (!response.ok) throw new Error('Failed to fetch leaderboard');

      const result = await response.json();
      if (result.success && result.data) {
        setLeaderboard(result.data.leaderboard);
        setCurrentUserEntry(result.data.currentUserEntry || null);
        setCurrentLimit(targetLimit);

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
      setIsRevealingUser(true);
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
      } finally {
        setIsRevealingUser(false);
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
            referrerPolicy="no-referrer"
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
            disabled={isRevealingUser}
            className="flex items-center gap-1.5 text-xs text-purple-300/70 hover:text-purple-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRevealingUser ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-300/30 border-t-purple-300" />
            ) : (
              <MagnifyingGlassIcon className="h-3.5 w-3.5" />
            )}
            <span>{isRevealingUser ? 'loading...' : 'reveal me'}</span>
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

      {/* Load More Button - show if there are more users to load */}
      {leaderboard.length < totalUsers && (
        <div className="mt-4 flex items-center">
          <div aria-hidden="true" className="w-full border-t border-white/5" />
          <div className="relative flex justify-center">
            <button
              type="button"
              onClick={loadMoreUsers}
              disabled={isLoadingMore}
              className="cursor-pointer inline-flex items-center gap-x-1.5 rounded-full bg-white/0 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-neutral-700/80 border border-white/5 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon aria-hidden="true" className="-mr-0.5 -ml-1 size-5 text-neutral-700" />
              Load more
            </button>
          </div>
          <div aria-hidden="true" className="w-full border-t border-white/5" />
        </div>
      )}

    </div>
  );
}
