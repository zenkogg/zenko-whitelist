'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { ArrowRightStartOnRectangleIcon, HashtagIcon } from '@heroicons/react/24/outline';
import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { ProfileCard, ReferralCodeCard, ApplyReferralCard } from '@/components/dashboard';

interface ReferrerInfo {
  displayName: string;
  avatarUrl: string | null;
  oauthProvider: string;
}

interface UserStats {
  referralCode: string;
  referralCount: number;
  reputationPoints: number;
  twitterConnected: boolean;
  twitterHandle?: string;
  usedReferralCode?: string | null;
  referrerInfo?: ReferrerInfo | null;
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

  useEffect(() => {
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
    const updatedUser = { ...user, customAvatarUrl: avatarUrl };
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

  const oauthProvider = user.oauthProvider || 'google';
  const progress = Math.min((userStats.referralCount / 50) * 100, 100);

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      {/* Shared Background Layer with Preset Switcher */}
      <BackgroundLayer />

      {/* Header */}
      <header className="relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          {/* Logo */}
          <Image
            src="/logo-primary.svg"
            alt="Zenko Logo"
            width={129}
            height={28}
            className="h-7 w-auto"
          />

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="group flex items-center gap-2 rounded-lg border border-purple-300/30 px-4 py-2 transition-all hover:bg-white/5 hover:border-purple-300/50"
            aria-label="Log out"
          >
            <ArrowRightStartOnRectangleIcon className="h-5 w-5 text-purple-300 transition-colors group-hover:text-purple-50" />
            <span className="text-sm font-medium text-purple-300 transition-colors group-hover:text-purple-50">
              Log Out
            </span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-6">
            {/* Profile Card - Left column, spans 2 columns and 2 rows */}
            <div className="lg:col-span-2 lg:row-span-2">
              <ProfileCard
                displayName={user.displayName}
                customAvatarUrl={user.customAvatarUrl}
                createdAt={user.createdAt || new Date().toISOString()}
                userId={user.id}
                oauthProvider={user.oauthProvider}
                onAvatarUpdate={handleAvatarUpdate}
              />
            </div>

            {/* Referral Code Card - Top right, spans 4 columns */}
            <div className="lg:col-span-4">
              <ReferralCodeCard
                referralCode={userStats.referralCode}
                referralCount={userStats.referralCount}
              />
            </div>

            {/* Apply Referral Card - Below referral code, spans 4 columns */}
            <div className="lg:col-span-4">
              <ApplyReferralCard
                userId={user.id}
                usedReferralCode={userStats.usedReferralCode || null}
                currentReputationPoints={userStats.reputationPoints}
                onReferralApplied={handleReferralApplied}
                referrerInfo={userStats.referrerInfo}
              />
            </div>

            {/* Referral Progress + Stats Combined - Full width row */}
            <div className="lg:col-span-6 rounded-2xl bg-white/5 p-6 backdrop-blur-md border-2 border-purple-300/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
              <h2 className="text-xl font-semibold text-white mb-2">Referrals</h2>
              <p className="text-sm text-neutral-800 mb-1">
                Perform 50 referrals, earn up to 500 points.
              </p>
              <p className="text-sm text-neutral-800 mb-4">
                Earn reputation points to boost your profile when Zenko goes live!
              </p>

              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-neutral-700">{userStats.referralCount}/50 referrals</span>
                <span className="text-amber-500 font-medium">
                  {50 - userStats.referralCount} more to go
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/20 mb-6">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-500/80 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Stats Badges */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      userStats.referralCount >= 50 ? 'bg-purple-300' : 'bg-amber-500'
                    }`} />
                    <span className="text-sm text-neutral-700">Early Access</span>
                  </div>
                  <div className={`text-lg font-bold ${
                    userStats.referralCount >= 50 ? 'text-purple-300' : 'text-amber-500'
                  }`}>
                    {userStats.referralCount >= 50 ? 'Access Granted' : 'On Waitlist'}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Image
                      src="/images/icons/zenko-rp.svg"
                      alt="Reputation"
                      width={20}
                      height={20}
                      className="h-5 w-5"
                      style={{ filter: 'brightness(0) saturate(100%) invert(65%) sepia(85%) saturate(1574%) hue-rotate(359deg) brightness(101%) contrast(98%)' }}
                    />
                    <span className="text-sm text-neutral-700">Reputation Points</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-500">{userStats.reputationPoints} XP</div>
                </div>
              </div>
            </div>

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

