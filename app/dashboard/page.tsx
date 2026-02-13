'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/20/solid';
import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { ProfileCard, ReferralCodeCard, ApplyReferralCard, AvatarGroup, ReferralProgress, Leaderboard } from '@/components/dashboard';
import Shuffle from '@/components/Shuffle';

interface ReferrerInfo {
  displayName: string;
  avatarUrl: string | null;
  oauthProvider: string;
}

interface Referral {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string;
}

interface UserStats {
  referralCode: string;
  referralCount: number;
  reputationPoints: number;
  twitterConnected: boolean;
  twitterHandle?: string;
  usedReferralCode?: string | null;
  referrerInfo?: ReferrerInfo | null;
  registrationOrder?: number;
  referrals?: Referral[];
  estimatedRank?: number;
  totalPending?: number;
}

interface User {
  id: string;
  email: string | null;
  displayName: string;
  oauthProvider: string;
  oauthAvatarUrl: string | null;
  customAvatarUrl: string | null;
  games: string[];
  createdAt?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingReferralCode, setPendingReferralCode] = useState<string | null>(null);

  useEffect(() => {
    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setPendingReferralCode(refCode.toUpperCase());
      // Clear the ref param from URL after reading
      window.history.replaceState({}, '', '/dashboard');
      // Clear from sessionStorage
      sessionStorage.removeItem('pending_referral_code');
    }

    // Check localStorage for user
    const storedUser = localStorage.getItem('waitlist_user');
    if (!storedUser) {
      router.push('/');
      return;
    }

    const userData = JSON.parse(storedUser);

    // Redirect if no games selected
    if (!userData.games || userData.games.length === 0) {
      router.push('/?step=games');
      return;
    }

    setUser(userData);
    fetchUserStats(userData.id);
  }, [router]);

  const fetchUserStats = async (userId: string) => {
    try {
      const response = await fetch('/api/user/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const result = await response.json();

      // Handle the API response format with nested data
      if (result.success && result.data) {
        setUserStats({
          referralCode: result.data.user.referralCode,
          referralCount: result.data.stats.referralCount,
          reputationPoints: result.data.stats.reputationPoints,
          twitterConnected: !!result.data.user.twitterHandle,
          twitterHandle: result.data.user.twitterHandle,
          usedReferralCode: result.data.user.usedReferralCode,
          referrerInfo: result.data.referrerInfo || null,
          registrationOrder: result.data.user.registrationOrder,
          referrals: result.data.referrals || [],
          estimatedRank: result.data.stats.estimatedRank,
          totalPending: result.data.stats.totalPending,
        });
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpdate = useCallback((avatarUrl: string) => {
    if (!user) return;

    // Update user in state and localStorage
    // Empty string means avatar was removed, set to null
    const updatedUser = { ...user, customAvatarUrl: avatarUrl || null };
    setUser(updatedUser);
    localStorage.setItem('waitlist_user', JSON.stringify(updatedUser));
  }, [user]);

  const handleReferralApplied = useCallback(() => {
    if (user) {
      fetchUserStats(user.id);
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('waitlist_user');
    router.push('/');
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  if (!userStats) {
    return null;
  }

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      {/* Shared Background Layer with Preset Switcher */}
      <BackgroundLayer />

      {/* Header Section */}
      <div className="relative z-10 px-6 pt-20 pb-16">
        <div className="mx-auto max-w-6xl text-center">
          <Shuffle
            text="Level up"
            tag="h1"
            className="text-5xl font-bold text-white mb-6"
            style={{ fontFamily: 'var(--font-press-start)' }}
          />
          <p className="text-lg text-neutral-700">
            Refer your friends for early access and rewards
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 pb-12">
        <div className="mx-auto max-w-6xl">
          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-6">
            {/* Profile Card - Left column, spans 2 columns and 2 rows */}
            <div className="lg:col-span-2 lg:row-span-2 flex flex-col gap-8">
              <ProfileCard
                displayName={user.displayName}
                email={user.email}
                customAvatarUrl={user.customAvatarUrl}
                createdAt={user.createdAt || new Date().toISOString()}
                userId={user.id}
                oauthProvider={user.oauthProvider}
                registrationOrder={userStats?.registrationOrder}
                onAvatarUpdate={handleAvatarUpdate}
                onLogout={handleLogout}
              />

              {/* Disconnect Button */}
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-400/70 transition-all hover:text-red-400 cursor-pointer"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                <span>Disconnect</span>
              </button>
            </div>

            {/* Referral Code Card - Top right, spans 4 columns */}
            <div className="lg:col-span-4 flex">
              <ReferralCodeCard
                referralCode={userStats.referralCode}
                referralCount={userStats.referralCount}
              />
            </div>

            {/* Apply Referral Card - Below referral code, spans 4 columns */}
            <div className="lg:col-span-4 flex">
              <ApplyReferralCard
                userId={user.id}
                usedReferralCode={userStats.usedReferralCode || null}
                currentReputationPoints={userStats.reputationPoints}
                onReferralApplied={handleReferralApplied}
                referrerInfo={userStats.referrerInfo}
                initialReferralCode={!userStats.usedReferralCode ? pendingReferralCode : null}
              />
            </div>

            {/* Referral Progress */}
            <ReferralProgress
              referralCount={userStats.referralCount}
              reputationPoints={userStats.reputationPoints}
            />

            {/* Avatar Group Badge */}
            <div className="lg:col-span-6 flex justify-center">
              <AvatarGroup
                totalWaitlistUsers={userStats.totalPending || 0}
              />
            </div>

            {/* Leaderboard */}
            <Leaderboard userId={user.id} />

            {/* Info Card - spans full width */}
            <div className="lg:col-span-6 rounded-2xl bg-white/5 p-6 backdrop-blur-md border-2 border-purple-300/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
              <div className="flex gap-4">
                <div className="mt-1">
                  <svg
                    className="h-5 w-5 text-purple-300"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-white">How to Earn Reputation</h3>
                  <ul className="space-y-1 text-sm text-neutral-800">
                    <li>• Share your referral code with friends (+10 points per referral)</li>
                    <li>• Connect your X/Twitter account (+5 points)</li>
                    <li>• Share on X/Twitter (+5 points per share)</li>
                    <li>• Reach 50 referrals for priority beta access</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/40 px-6 py-6 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2 text-neutral-800">
            <span className="text-sm uppercase tracking-wide">Built on</span>
            <Image
              src="/images/icons/sui.svg"
              alt="Sui"
              width={46}
              height={16}
              className="h-4 w-auto"
            />
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://www.instagram.com/zenkogg?igsh=YzdqYTc0N2ZuMzNx&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 transition-colors hover:text-purple-400"
              aria-label="Instagram"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://x.com/zenkogginc?s=21&t=aZd4S6kCPZBx-rpP3YEdAg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 transition-colors hover:text-purple-400"
              aria-label="X (Twitter)"
            >
              <XIcon />
            </a>
          </div>

          <span className="text-xs text-neutral-700">© 2026 Zenko, All rights reserved.</span>
        </div>
      </footer>
    </main>
  );
}

function InstagramIcon() {
  return (
    <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

