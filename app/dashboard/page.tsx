'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/20/solid';
import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { ProfileCard, ReferralCodeCard, ApplyReferralCard, AvatarGroup, ReferralProgress, Leaderboard, FAQ } from '@/components/dashboard';
import { Footer } from '@/components/Footer';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface ReferrerInfo {
  displayName: string;
  username: string | null;
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
  username: string | null;
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
  status: string;
  waitlistStatus: 'open' | 'closed';
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
  const isMobile = useMediaQuery('(max-width: 1023px)');

  useEffect(() => {
    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      // Pass the raw value through — server normalizes (6-char codes vs username slugs).
      setPendingReferralCode(refCode);
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
          username: result.data.user.username ?? null,
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
          status: result.data.user.status,
          waitlistStatus: result.data.waitlistStatus || 'open',
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

  if (isLoading || !user || !userStats) {
    return (
      <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
        <BackgroundLayer />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      {/* Shared Background Layer with Preset Switcher */}
      <BackgroundLayer />

      {/* Header Section */}
      <div className="relative z-10 px-4 md:px-6 pt-8 md:pt-12 pb-6 md:pb-8">
        <div className="mx-auto max-w-6xl text-center">
          <h1
            className="text-2xl sm:text-3xl md:text-3xl font-semibold text-white mb-4 md:mb-6"
            style={{ fontFamily: 'var(--font-sora)' }}
          >
            Your reputation starts <span className="text-amber-500">here</span>
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 md:px-6 pb-12">
        <div className="mx-auto max-w-6xl">
          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:gap-8 lg:grid-cols-6">
            {/* Profile Card - Left column, spans 2 columns and 2 rows */}
            <div className="lg:col-span-2 lg:row-span-2 flex flex-col gap-4 md:gap-6 lg:gap-8">
              <ProfileCard
                displayName={user.displayName}
                email={user.email}
                customAvatarUrl={user.customAvatarUrl}
                createdAt={user.createdAt || new Date().toISOString()}
                userId={user.id}
                oauthProvider={user.oauthProvider}
                twitterHandle={userStats?.twitterHandle}
                registrationOrder={userStats?.registrationOrder}
                onAvatarUpdate={handleAvatarUpdate}
                onLogout={handleLogout}
              />

              {/* Disconnect Button */}
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-400/70 transition-all hover:text-red-400 cursor-pointer"
              >
                <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                <span>Disconnect {user.oauthProvider === 'twitter' ? 'X' : user.oauthProvider === 'twitch' ? 'Twitch' : user.oauthProvider === 'virtualeagues' ? 'Virtualeagues' : 'Google'}</span>
              </button>
            </div>

            {/* Referral Code Card - Top right, spans 4 columns */}
            <div className="lg:col-span-4 flex">
              <ReferralCodeCard
                userId={user.id}
                referralCode={userStats.referralCode}
                username={userStats.username}
                referralCount={userStats.referralCount}
                onUsernameUpdated={() => fetchUserStats(user.id)}
                collapsible={isMobile}
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
                defaultCollapsed={isMobile}
                collapsible={isMobile}
              />
            </div>

            {/* Referral Progress */}
            <div className="lg:col-span-6">
              <ReferralProgress
                referralCount={userStats.referralCount}
                reputationPoints={userStats.reputationPoints}
                status={userStats.status}
                waitlistStatus={userStats.waitlistStatus}
                collapsible={isMobile}
              />
            </div>

            {/* Avatar Group Badge */}
            <div className="lg:col-span-6 flex justify-center">
              <AvatarGroup
                totalWaitlistUsers={userStats.totalPending || 0}
              />
            </div>

            {/* Leaderboard */}
            <Leaderboard userId={user.id} totalUsers={userStats.totalPending} />

            {/* FAQ */}
            <FAQ />
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </main>
  );
}
