'use client';

/**
 * A signed-in waitlist player's dashboard: profile, referral code, points and
 * the leaderboard. Once Zenko itself is open, a banner on top points the player
 * to zenko.gg, the waitlist copy below follows, and the points stay.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/20/solid';
import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { ProfileCard, ReferralCodeCard, ApplyReferralCard, AvatarGroup, ReferralProgress, Leaderboard, FAQ } from '@/components/dashboard';
import { Footer } from '@/components/Footer';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useZenkoOpen } from '@/hooks/useZenkoOpen';
import { ZenkoOpenBanner } from '@/components/ZenkoOpenBanner';

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
  const zenkoOpen = useZenkoOpen();

  // The stored user outlives the session, so a signed-out caller still has one to
  // render. Clearing it is what turns an expired session back into a sign-in
  // prompt rather than a dashboard that never loads. Every refused read on this
  // page lands here, including the ones the cards below make.
  const handleSessionExpired = useCallback(() => {
    localStorage.removeItem('waitlist_user');
    router.push('/');
  }, [router]);

  const fetchUserStats = useCallback(async () => {
    try {
      // The session cookie names the row, so the request carries no id of its own.
      const response = await fetch('/api/user/stats', { method: 'POST' });
      if (response.status === 401) {
        handleSessionExpired();
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch stats');
      const result = await response.json();

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
  }, [handleSessionExpired]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      // Passed through raw: the server tells 6-character codes from username slugs.
      setPendingReferralCode(refCode);
      window.history.replaceState({}, '', '/dashboard');
      sessionStorage.removeItem('pending_referral_code');
    }

    const storedUser = localStorage.getItem('waitlist_user');
    if (!storedUser) {
      router.push('/');
      return;
    }

    const userData = JSON.parse(storedUser);

    if (!userData.games || userData.games.length === 0) {
      router.push('/?step=games');
      return;
    }

    setUser(userData);
    fetchUserStats();
  }, [router, fetchUserStats]);

  const handleAvatarUpdate = useCallback((avatarUrl: string) => {
    if (!user) return;

    // An empty string means the avatar was removed.
    const updatedUser = { ...user, customAvatarUrl: avatarUrl || null };
    setUser(updatedUser);
    localStorage.setItem('waitlist_user', JSON.stringify(updatedUser));
  }, [user]);

  const handleReferralApplied = useCallback(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user, fetchUserStats]);

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
      <BackgroundLayer />

      <div className="relative z-10 px-4 md:px-6 pt-8 md:pt-12 pb-6 md:pb-8">
        <div className="mx-auto max-w-6xl text-center">
          {zenkoOpen && (
            <div className="mb-4 md:mb-6">
              <ZenkoOpenBanner open />
            </div>
          )}
          <h1
            className="text-2xl sm:text-3xl md:text-3xl font-semibold text-white mb-4 md:mb-6"
            style={{ fontFamily: 'var(--font-sora)' }}
          >
            Your reputation starts <span className="text-amber-500">here</span>
          </h1>
        </div>
      </div>

      <div className="relative z-10 px-4 md:px-6 pb-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:gap-8 lg:grid-cols-6">
            <div className="lg:col-span-2 lg:row-span-2 flex flex-col gap-4 md:gap-6 lg:gap-8">
              <ProfileCard
                displayName={user.displayName}
                email={user.email}
                customAvatarUrl={user.customAvatarUrl}
                createdAt={user.createdAt || new Date().toISOString()}
                oauthProvider={user.oauthProvider}
                twitterHandle={userStats?.twitterHandle}
                registrationOrder={userStats?.registrationOrder}
                onAvatarUpdate={handleAvatarUpdate}
                onLogout={handleLogout}
              />

              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-400/70 transition-all hover:text-red-400 cursor-pointer"
              >
                <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                <span>Disconnect {user.oauthProvider === 'twitter' ? 'X' : user.oauthProvider === 'twitch' ? 'Twitch' : user.oauthProvider === 'virtualeagues' ? 'Virtualeagues' : 'Google'}</span>
              </button>
            </div>

            <div className="lg:col-span-4 flex">
              <ReferralCodeCard
                referralCode={userStats.referralCode}
                username={userStats.username}
                referralCount={userStats.referralCount}
                onUsernameUpdated={() => fetchUserStats()}
                collapsible={isMobile}
              />
            </div>

            <div className="lg:col-span-4 flex">
              <ApplyReferralCard
                usedReferralCode={userStats.usedReferralCode || null}
                currentReputationPoints={userStats.reputationPoints}
                onReferralApplied={handleReferralApplied}
                referrerInfo={userStats.referrerInfo}
                initialReferralCode={!userStats.usedReferralCode ? pendingReferralCode : null}
                defaultCollapsed={isMobile}
                collapsible={isMobile}
              />
            </div>

            <div className="lg:col-span-6">
              <ReferralProgress
                referralCount={userStats.referralCount}
                reputationPoints={userStats.reputationPoints}
                status={userStats.status}
                waitlistStatus={userStats.waitlistStatus}
                zenkoOpen={zenkoOpen}
                collapsible={isMobile}
              />
            </div>

            <div className="lg:col-span-6 flex justify-center">
              <AvatarGroup
                totalWaitlistUsers={userStats.totalPending || 0}
                zenkoOpen={zenkoOpen}
              />
            </div>

            <Leaderboard
              totalUsers={userStats.totalPending}
              onSessionExpired={handleSessionExpired}
            />

            <FAQ zenkoOpen={zenkoOpen} />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
