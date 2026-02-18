'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signInWithOAuth } from '@/lib/oauth-client';
import { GameBadge } from './GameBadge';
import { Button } from '@/components/ui/button';
import Stepper, { Step } from '@/components/Stepper';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';

const GAMES = [
  { label: 'League of Legends', value: 'lol' },
  { label: 'TFT', value: 'tft' },
  { label: 'Valorant', value: 'valorant' },
  { label: 'CS2', value: 'cs2' },
  { label: 'Dota 2', value: 'dota2' },
  { label: 'Overwatch 2', value: 'overwatch2' },
  { label: 'Apex Legends', value: 'apex' },
  { label: 'Fortnite', value: 'fortnite' },
  { label: 'EAFC', value: 'fc26' },
  { label: 'Call of Duty', value: 'cod' },
  { label: 'Grand Theft Auto', value: 'gta' },
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
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(1); // Stepper uses 1-based indexing (2 steps total)
  const [user, setUser] = useState<any>(null);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [referralSuccess, setReferralSuccess] = useState('');
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const stepClickRef = useRef<((step: number) => void) | null>(null);

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
    setIsCheckingSession(false);
  }, [router]);

  const handleOAuthSignIn = (provider: 'google' | 'twitch' | 'twitter') => {
    setIsRedirecting(true);
    signInWithOAuth(provider);
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setReferralSuccess('');

    if (!referralCode.trim()) {
      setError('Please enter a referral code');
      return;
    }

    if (referralCode.length !== 6) {
      setError('Referral code must be 6 characters');
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
        let errorMessage = 'Failed to apply referral code';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, use default message
        }
        throw new Error(errorMessage);
      }

      const { data } = await response.json();

      // Calculate points earned
      const currentPoints = user?.reputationPoints || 0;
      const pointsEarned = data.user.reputationPoints - currentPoints;

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

      // Show success message
      setReferralSuccess(`Code applied! You earned ${pointsEarned} reputation points`);

      // Wait 1.5 seconds then advance to step 2
      setTimeout(() => {
        if (stepClickRef.current) {
          stepClickRef.current(2);
        }
      }, 1500);
    } catch (error: any) {
      console.error('Apply referral error:', error);
      setError(error.message || 'Failed to apply referral code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipReferral = () => {
    if (stepClickRef.current) {
      stepClickRef.current(2);
    }
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

  // Show minimal spinner while checking localStorage session
  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center w-full max-w-md mx-auto py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  // Show connecting state while OAuth redirect is in progress
  if (isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-md mx-auto py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-semibold text-zenko-light">
            Connecting...
          </h2>
          <p className="text-neutral-700">
            Please wait while we redirect you
          </p>
        </div>
      </div>
    );
  }

  // Show OAuth login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto">
        {/* Heading */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-amber-500">
            Join the Founding 1,000
          </h2>
          <p className="text-gray-400">
            Secure early access and lock in your OG reputation badge
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="w-full space-y-3">
          {/* Google Sign In */}
          <button
            onClick={() => handleOAuthSignIn('google')}
            className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-white bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-all hover:bg-white/90 cursor-pointer"
          >
            <Image
              src="/images/icons/google.svg"
              alt="Google"
              width={16}
              height={16}
              className="h-4 w-4 flex-shrink-0"
            />
            <span>Sign in with Google</span>
          </button>

          {/* Twitch Sign In */}
          <button
            onClick={() => handleOAuthSignIn('twitch')}
            className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-zenko-twitch/30 bg-zenko-twitch/80 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-zenko-twitch cursor-pointer"
          >
            <Image
              src="/images/icons/twitch.svg"
              alt="Twitch"
              width={16}
              height={16}
              className="h-4 w-4 flex-shrink-0"
            />
            <span>Sign in with Twitch</span>
          </button>

        </div>

        {/* OR Divider */}
        <div className="flex w-full items-center gap-3">
          <div className="flex-1 border-t border-white/10"></div>
          <span className="text-xs font-medium text-gray-500">OR</span>
          <div className="flex-1 border-t border-white/10"></div>
        </div>

        {/* X (Twitter) Sign In */}
        <div className="w-full">
          <button
            onClick={() => handleOAuthSignIn('twitter')}
            className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-black bg-black px-4 py-3 text-sm font-medium text-white transition-all hover:bg-[#151515] hover:border-[#151515] cursor-pointer"
          >
            <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Continue with X</span>
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
                  <Image
                    src={user.avatarUrl || '/images/placeholder.svg'}
                    alt={user.displayName}
                    fill
                    sizes="32px"
                    className="rounded-full object-cover"
                    unoptimized
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/placeholder.svg';
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Bullet separator */}
            <div className="h-1.5 w-1.5 rounded-full bg-purple-300/60" />

            {/* Count */}
            <span className="text-xs font-medium text-gray-400">
              <span className="text-zenko-light font-semibold">
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
    <div className="w-full -mt-4">
      <Stepper
        initialStep={currentStepIndex}
        onStepChange={(step) => setCurrentStepIndex(step)}
        stepCircleContainerClassName="!bg-transparent !border-none !shadow-none"
        stepContainerClassName="!bg-transparent"
        contentClassName="!py-4"
        footerClassName="hidden"
        className="!p-0 !aspect-auto !min-h-0"
        renderStepIndicator={({ step, currentStep, onStepClick }) => {
          // Store the step click function in ref for programmatic navigation
          if (!stepClickRef.current) {
            stepClickRef.current = onStepClick;
          }

          return (
            <div className="flex flex-col items-center cursor-pointer" onClick={() => onStepClick(step)}>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                  currentStep === step
                    ? 'bg-purple-500/20 ring-1 ring-purple-400/40'
                    : currentStep > step
                    ? 'bg-purple-400/10 ring-1 ring-purple-300/20'
                    : 'bg-black/20 ring-1 ring-white/10'
                }`}
              >
                {currentStep > step ? (
                  <svg className="h-4 w-4 text-purple-300/60" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className={`text-xs font-medium ${currentStep === step ? 'text-purple-300' : 'text-neutral-700'}`}>
                    {step}
                  </span>
                )}
              </div>
            </div>
          );
        }}
    >
      {/* Step 1: Referral Code */}
      <Step>
        <div className="flex flex-col space-y-6 w-full max-w-md mx-auto">
          {/* Heading */}
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-semibold leading-tight tracking-tight text-amber-500">
              Were you invited?
            </h2>
            <p className="text-gray-400">
              Enter an invite code to earn reputation points and secure your founding spot
            </p>
          </div>

          {/* Referral Code Form - Dashboard Style */}
          <form onSubmit={handleApplyReferral} className="w-full space-y-4">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-white">
                Invite code
              </label>
              <input
                type="text"
                value={user?.usedReferralCode || referralCode}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  // Only allow alphanumeric characters
                  if (/^[A-Z0-9]*$/.test(value)) {
                    setReferralCode(value);
                  }
                }}
                placeholder="Enter 6-character code"
                maxLength={6}
                disabled={isSubmitting || !!user?.usedReferralCode}
                readOnly={!!user?.usedReferralCode}
                className="w-full rounded-xl border-2 border-purple-300/20 bg-black/40 px-4 py-3 text-white/60 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-300 disabled:opacity-50"
              />
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-error-300" role="alert">
                {error}
              </p>
            )}

            {/* Success Message */}
            {referralSuccess && (
              <p className="text-success-300" role="status">
                {referralSuccess}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!user?.usedReferralCode && (
                <button
                  type="button"
                  onClick={handleSkipReferral}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-black/20 px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-black/30 hover:text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  Skip
                </button>
              )}
              <button
                type={user?.usedReferralCode ? 'button' : 'submit'}
                onClick={user?.usedReferralCode ? handleSkipReferral : undefined}
                disabled={isSubmitting || (!user?.usedReferralCode && !referralCode.trim())}
                className={`${user?.usedReferralCode ? 'w-full' : 'flex-1'} rounded-lg px-4 py-3 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 bg-purple-500 hover:bg-purple-600 border-2 border-purple-500 cursor-pointer`}
              >
                {isSubmitting ? 'Applying...' : user?.usedReferralCode ? 'Continue' : 'Apply'}
              </button>
            </div>
          </form>
        </div>
      </Step>

      {/* Step 2: Game Selection */}
      <Step>
        <div className="flex flex-col space-y-6 w-full max-w-md mx-auto">
          {/* Heading */}
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-semibold leading-tight tracking-tight text-amber-500">
              Which games do you play?
            </h2>
            <p className="text-gray-400">
              Select at least one game
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmitGames} className="w-full space-y-6">
            {/* Game Selection */}
            <div className="flex flex-wrap justify-center gap-2">
              {GAMES.map((game) => (
                <GameBadge
                  key={game.value}
                  game={game.label}
                  selected={selectedGames.includes(game.value)}
                  onClick={() => toggleGame(game.value)}
                />
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-error-300/20 bg-error-300/10 px-4 py-3 text-error-300">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || selectedGames.length === 0}
              className="w-full rounded-lg border-2 border-purple-500 px-4 py-3 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 bg-purple-500 hover:bg-purple-600 cursor-pointer"
            >
              {isSubmitting ? 'Setting up...' : 'Go to dashboard'}
            </button>

            {/* Footer Message */}
            <p className="text-center text-xs text-gray-500">
              Complete setup to unlock your referral link • Invite friends to join the founding 1,000 and get early access to Zenko
            </p>
          </form>
        </div>
      </Step>
      </Stepper>

      {/* Footer: Connected Account Info */}
      {user && (
        <div className="relative mt-12">
          {/* Gradient Divider */}
          <div
            className="absolute top-0 left-0 w-full h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(203, 186, 238, 0.3), transparent)'
            }}
          ></div>

          {/* Connected Account Row */}
          <div className="flex items-center justify-between w-full max-w-md mx-auto pt-8">
            {/* Left: Provider Icon + Username */}
            <div className="flex items-center gap-2">
              {user.oauthProvider === 'twitter' ? (
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              ) : (
                <Image
                  src={user.oauthProvider === 'google' ? '/images/icons/google.svg' : '/images/icons/twitch.svg'}
                  alt={user.oauthProvider}
                  width={16}
                  height={16}
                  className="h-4 w-4"
                />
              )}
              <span className="text-sm text-neutral-700/70 font-medium">
                {user.oauthProvider === 'google' && user.email
                  ? user.email
                  : (user.oauthProvider === 'twitch' || user.oauthProvider === 'twitter') && user.displayName && user.displayName !== 'User'
                  ? user.displayName
                  : 'Connected'}
              </span>
            </div>

            {/* Right: Disconnect */}
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('waitlist_user');
                window.location.href = '/';
              }}
              className="flex items-center gap-1.5 text-sm text-error-300/70 transition-colors hover:text-error-300 cursor-pointer"
            >
              <ArrowRightStartOnRectangleIcon className="h-3.5 w-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
