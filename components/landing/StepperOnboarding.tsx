'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signInWithOAuth } from '@/lib/oauth-client';
import { GameBadge } from './GameBadge';
import { Button } from '@/components/ui/button';
import Stepper, { Step } from '@/components/Stepper';

const GAMES = [
  { label: 'League of Legends', value: 'lol' },
  { label: 'TFT', value: 'tft' },
  { label: 'Valorant', value: 'valorant' },
  { label: 'CS2', value: 'cs2' },
  { label: 'Dota 2', value: 'dota2' },
  { label: 'Overwatch 2', value: 'overwatch2' },
  { label: 'Apex Legends', value: 'apex' },
  { label: 'Fortnite', value: 'fortnite' },
];

interface WaitlistStats {
  totalCount: number;
  recentUsers: Array<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
  waitlistStatus: 'open' | 'closed';
}

export function StepperOnboarding() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(1); // Stepper uses 1-based indexing (2 steps total)
  const [user, setUser] = useState<any>(null);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch waitlist stats
  useEffect(() => {
    fetch('/api/waitlist/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.data);
        }
      })
      .catch(err => console.error('Failed to load waitlist stats:', err))
      .finally(() => setStatsLoading(false));
  }, []);

  // Check for user session in localStorage and URL params
  useEffect(() => {
    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
      // Store in sessionStorage to preserve across OAuth flow
      sessionStorage.setItem('pending_referral_code', refCode.toUpperCase());
    }

    const storedUser = localStorage.getItem('waitlist_user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setIsAuthenticated(true);

      // If user has completed games, redirect to dashboard with ref if present
      if (userData.games && userData.games.length > 0) {
        const redirectUrl = refCode ? `/dashboard?ref=${refCode}` : '/dashboard';
        router.push(redirectUrl);
      } else if (userData.usedReferralCode) {
        // If user already used a referral code, go to games (step 2)
        setCurrentStepIndex(2);
      } else {
        // Otherwise, show referral code step (step 1)
        setCurrentStepIndex(1);
      }
    } else {
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, [router]);

  const handleOAuthSignIn = (provider: 'google' | 'twitch') => {
    setIsLoading(true);
    signInWithOAuth(provider);
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!referralCode.trim()) {
      setError('Please enter a referral code');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/user/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCode: referralCode.trim().toUpperCase(),
          userId: user?.id
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to apply referral code');
      }

      const { data } = await response.json();

      // Update user in localStorage with referral info
      if (user) {
        const updatedUser = {
          ...user,
          usedReferralCode: data.user.usedReferralCode,
          reputationPoints: data.user.reputationPoints
        };
        localStorage.setItem('waitlist_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }

      // Move to games step (step 2)
      setCurrentStepIndex(2);
    } catch (error: any) {
      console.error('Apply referral error:', error);
      setError(error.message || 'Failed to apply referral code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipReferral = () => {
    setCurrentStepIndex(2);
  };

  const toggleGame = (gameValue: string) => {
    setSelectedGames((prev) =>
      prev.includes(gameValue) ? prev.filter((g) => g !== gameValue) : [...prev, gameValue]
    );
  };

  const handleSubmitGames = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedGames.length === 0) {
      setError('Please select at least one game');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/user/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: selectedGames, userId: user?.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to save games');
      }

      const { data } = await response.json();

      // Update user in localStorage with games
      if (user) {
        const updatedUser = { ...user, games: data.games };
        localStorage.setItem('waitlist_user', JSON.stringify(updatedUser));
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Save error:', error);
      setError('Failed to save game selection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while OAuth is in progress
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-md mx-auto py-12">
        <div className="flex h-16 w-16 items-center justify-center">
          <Image
            src="/images/zenko-head.svg"
            alt="Zenko Logo"
            width={64}
            height={64}
            className="h-16 w-16 animate-pulse"
          />
        </div>
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-semibold text-[#cbbaee]">
            Connecting...
          </h2>
          <p className="text-sm text-gray-400">
            Please wait while we redirect you
          </p>
        </div>
        <div className="flex space-x-2">
          <div className="h-2 w-2 rounded-full bg-[#fdb022] animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="h-2 w-2 rounded-full bg-[#fdb022] animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="h-2 w-2 rounded-full bg-[#fdb022] animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    );
  }

  // Show OAuth login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto">
        {/* Waitlist Status Badge - Centered */}
        {!statsLoading && stats && (
          <div className="flex items-center justify-center w-full">
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${
              stats.waitlistStatus === 'open'
                ? 'border-green-500/30 bg-green-500/10'
                : 'border-red-500/30 bg-red-500/10'
            }`}>
              <div className={`h-1.5 w-1.5 rounded-full ${
                stats.waitlistStatus === 'open'
                  ? 'bg-green-500 animate-pulse'
                  : 'bg-red-500'
              }`}></div>
              <span className={`text-xs font-medium ${
                stats.waitlistStatus === 'open'
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                Waitlist {stats.waitlistStatus === 'open' ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>
        )}

        {/* Heading */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-[#cbbaee]">
            Join the Waitlist
          </h2>
          <p className="text-sm text-gray-400">
            Top 1K get early access • Connect your account to secure your spot
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="w-full space-y-3">
          {/* Google Sign In */}
          <button
            onClick={() => handleOAuthSignIn('google')}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/20 bg-white px-4 py-3 text-base font-medium text-gray-900 transition-all hover:bg-gray-50"
          >
            <GoogleIcon />
            <span>Sign in with Google</span>
          </button>

          {/* Twitch Sign In */}
          <button
            onClick={() => handleOAuthSignIn('twitch')}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#9146FF]/30 bg-[#9146FF] px-4 py-3 text-base font-medium text-white transition-all hover:bg-[#7d3bd9]"
          >
            <TwitchIcon />
            <span>Sign in with Twitch</span>
          </button>
        </div>

        {/* Avatar Group & Count - Below Buttons */}
        {!statsLoading && stats && (
          <div className="flex items-center justify-center gap-3">
            {/* Avatar Stack */}
            <div className="flex -space-x-2">
              {stats.recentUsers.slice(0, 4).map((user, index) => (
                <div
                  key={user.id}
                  className="relative h-8 w-8 rounded-full ring-2 ring-purple-300/50 bg-purple-400 overflow-hidden"
                  style={{ zIndex: 10 - index }}
                >
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.displayName}
                      fill
                      sizes="32px"
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bullet separator */}
            <div className="h-1.5 w-1.5 rounded-full bg-purple-300/60" />

            {/* Count */}
            <span className="text-xs font-medium text-gray-400">
              <span className="text-[#cbbaee] font-semibold">
                {stats.totalCount.toLocaleString()}+
              </span> joined
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="w-full border-t border-white/10"></div>

        {/* Footer Text */}
        <p className="text-center text-xs text-gray-400 -mt-2">
          By signing in, you agree to receive updates and marketing communications.
        </p>
      </div>
    );
  }

  // Show stepper with 2 steps (referral code → games)
  return (
    <Stepper
      initialStep={currentStepIndex}
      onStepChange={(step) => setCurrentStepIndex(step)}
      stepCircleContainerClassName="!bg-transparent !border-none !shadow-none"
      stepContainerClassName="!bg-transparent"
      contentClassName="!py-4"
      footerClassName="hidden"
      className="!p-0 !aspect-auto !min-h-0"
      renderStepIndicator={({ step, currentStep, onStepClick }) => (
        <div className="flex flex-col items-center cursor-pointer" onClick={() => onStepClick(step)}>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
              currentStep === step
                ? 'border-[#fdb022] bg-[#fdb022]/10 shadow-sm'
                : currentStep > step
                ? 'border-[#cbbaee]/40 bg-[#cbbaee]/20'
                : 'border-gray-700 bg-gray-800/50'
            }`}
          >
            {currentStep > step ? (
              <svg className="h-4 w-4 text-[#cbbaee]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className={`text-xs font-medium ${currentStep === step ? 'text-[#fdb022]' : 'text-gray-500'}`}>
                {step}
              </span>
            )}
          </div>
        </div>
      )}
    >
      {/* Step 1: Referral Code */}
      <Step>
        <div className="flex flex-col space-y-6 w-full max-w-md mx-auto">
          {/* Heading */}
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-semibold leading-tight tracking-tight text-[#cbbaee]">
              Were You Invited?
            </h2>
            <p className="text-sm text-gray-400">
              Enter an invite code to boost your position on the leaderboard
            </p>
          </div>

          {/* Connected Account Banner */}
          {user && (
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">
                  Connected via {user.oauthProvider === 'google' ? 'Google' : 'Twitch'}
                </p>
                {user.oauthProvider === 'google' && user.email ? (
                  <p className="text-xs text-gray-400">{user.email}</p>
                ) : user.oauthProvider === 'twitch' && user.displayName && user.displayName !== 'User' ? (
                  <p className="text-xs text-gray-400">@{user.displayName}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('waitlist_user');
                  window.location.href = '/';
                }}
                className="text-xs text-gray-400 transition-colors hover:text-white"
              >
                Sign out
              </button>
            </div>
          )}

          {/* Referral Code Form */}
          <form onSubmit={handleApplyReferral} className="w-full space-y-6">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-white">
                Invite Code
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code"
                maxLength={6}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-gray-400 backdrop-blur-xl transition-colors focus:border-[#fdb022] focus:outline-none"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSkipReferral}
                className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white backdrop-blur-xl transition-colors hover:bg-white/10"
              >
                Skip
              </button>
              <Button
                type="submit"
                color="brand"
                disabled={isSubmitting || !referralCode.trim()}
                className="flex-1"
              >
                {isSubmitting ? 'Applying...' : 'Apply Code'}
              </Button>
            </div>
          </form>
        </div>
      </Step>

      {/* Step 2: Game Selection */}
      <Step>
        <div className="flex flex-col space-y-6 w-full max-w-md mx-auto">
          {/* Heading */}
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-semibold leading-tight tracking-tight text-[#cbbaee]">
              Which Games Do You Play?
            </h2>
            <p className="text-sm text-gray-400">
              Select your games to complete your waitlist registration
            </p>
          </div>

          {/* Connected Account Banner */}
          {user && (
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">
                  Connected via {user.oauthProvider === 'google' ? 'Google' : 'Twitch'}
                </p>
                {user.oauthProvider === 'google' && user.email ? (
                  <p className="text-xs text-gray-400">{user.email}</p>
                ) : user.oauthProvider === 'twitch' && user.displayName && user.displayName !== 'User' ? (
                  <p className="text-xs text-gray-400">@{user.displayName}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('waitlist_user');
                  window.location.href = '/';
                }}
                className="text-xs text-gray-400 transition-colors hover:text-white"
              >
                Sign out
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmitGames} className="w-full space-y-6">
            {/* Game Selection */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-white">
                Your Games<span className="text-[#c70036]">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {GAMES.map((game) => (
                  <GameBadge
                    key={game.value}
                    game={game.label}
                    selected={selectedGames.includes(game.value)}
                    onClick={() => toggleGame(game.value)}
                  />
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              color="brand"
              disabled={isSubmitting || selectedGames.length === 0}
              className="w-full"
            >
              {isSubmitting ? 'Joining Waitlist...' : 'Join Waitlist'}
            </Button>

            {/* Footer Message */}
            <p className="text-center text-xs text-gray-500">
              🏆 Invite others to climb the leaderboard and secure your spot in the top 1K
            </p>
          </form>
        </div>
      </Step>
    </Stepper>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function TwitchIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
    </svg>
  );
}
