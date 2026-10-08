'use client';

/**
 * The waitlist's way in: OAuth sign-in for a visitor, then the referral code
 * and game picks for a signed-in player who has not finished setup. Once Zenko
 * itself is open, a banner on top points visitors to zenko.gg.
 */

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signInWithOAuth } from '@/lib/oauth-client';
import { GameBadge } from './GameBadge';
import { Button } from '@/components/ui/button';
import Stepper, { Step } from '@/components/Stepper';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';
import { ZenkoOpenBanner } from '@/components/ZenkoOpenBanner';
import { useZenkoOpen } from '@/hooks/useZenkoOpen';

const VL_LOGIN_ENABLED = process.env.NEXT_PUBLIC_VL_LOGIN_ENABLED === 'true';

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
  // The Stepper counts from 1: referral code, then games.
  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [referralSuccess, setReferralSuccess] = useState('');
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const stepClickRef = useRef<((step: number) => void) | null>(null);
  const zenkoOpen = useZenkoOpen();

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

  useEffect(() => {
    // Resolve referral code from the URL first, then fall back to sessionStorage so the
    // value survives any navigation that drops the ?ref= param (OAuth round-trip, in-app links, etc).
    const urlParams = new URLSearchParams(window.location.search);
    const urlRefCode = urlParams.get('ref');
    if (urlRefCode) {
      sessionStorage.setItem('pending_referral_code', urlRefCode.toUpperCase());
    }
    const refCode = urlRefCode || sessionStorage.getItem('pending_referral_code');
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
    }

    const storedUser = localStorage.getItem('waitlist_user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setIsAuthenticated(true);

      if (userData.games && userData.games.length > 0) {
        const redirectUrl = refCode ? `/dashboard?ref=${refCode}` : '/dashboard';
        router.push(redirectUrl);
      } else if (userData.usedReferralCode) {
        setCurrentStepIndex(2);
      } else {
        setCurrentStepIndex(1);
      }
    } else {
      setIsAuthenticated(false);
    }
    setIsCheckingSession(false);
  }, [router]);

  const handleOAuthSignIn = (provider: 'google' | 'twitch' | 'twitter' | 'virtualeagues') => {
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

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/user/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCode: referralCode.trim().toUpperCase(),
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to apply referral code';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // A body that is not JSON keeps the default message.
        }
        throw new Error(errorMessage);
      }

      const { data } = await response.json();

      const currentPoints = user?.reputationPoints || 0;
      const pointsEarned = data.user.reputationPoints - currentPoints;

      if (user) {
        const updatedUser = {
          ...user,
          usedReferralCode: data.user.usedReferralCode,
          reputationPoints: data.user.reputationPoints
        };
        localStorage.setItem('waitlist_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }

      setReferralSuccess(`Code applied! You earned ${pointsEarned} reputation points`);

      // Leaves the success line up long enough to read before moving on.
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
        body: JSON.stringify({ games: selectedGames }),
      });

      if (!response.ok) {
        throw new Error('Failed to save games');
      }

      const { data } = await response.json();

      if (user) {
        const updatedUser = { ...user, games: data.games };
        localStorage.setItem('waitlist_user', JSON.stringify(updatedUser));
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Save error:', error);
      setError('Failed to save game selection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center w-full max-w-md mx-auto py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-md mx-auto py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        <div className="text-center">
          <h2 className="mb-2 text-xl md:text-2xl font-semibold text-zenko-light">
            Connecting...
          </h2>
          <p className="text-neutral-700">
            Please wait while we redirect you
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto">
        <ZenkoOpenBanner open={zenkoOpen} />

        {!statsLoading && stats && (
          <div className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1 ${
            stats.waitlistStatus === 'open'
              ? 'border-success-300/30 bg-success-300/10'
              : 'border-error-300/30 bg-error-300/10'
          }`}>
            <div className={`h-1.5 w-1.5 rounded-full ${
              stats.waitlistStatus === 'open'
                ? 'bg-success-300 animate-pulse'
                : 'bg-error-300'
            }`} />
            <span className={`text-xs font-medium ${
              stats.waitlistStatus === 'open'
                ? 'text-success-300'
                : 'text-error-300'
            }`}>
              Waitlist {stats.waitlistStatus === 'open' ? 'open' : 'closed'}
            </span>
          </div>
        )}

        <div className="text-center space-y-3">
          <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-white">
            Join Zenko. Be a <span className="text-amber-500">Day One</span>.
          </h2>
          <p className="text-sm md:text-base text-gray-400">
            Before the awards. Before the spotlight. This is where the names that matter started.
          </p>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={() => handleOAuthSignIn('google')}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white/5 border border-purple-300/20 px-4 py-3 text-sm font-medium text-neutral-600 transition-all hover:bg-white/10 cursor-pointer"
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

          <button
            onClick={() => handleOAuthSignIn('twitch')}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white/5 border border-purple-300/20 px-4 py-3 text-sm font-medium text-neutral-600 transition-all hover:bg-white/10 cursor-pointer"
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

          <button
            onClick={() => handleOAuthSignIn('twitter')}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white/5 border border-purple-300/20 px-4 py-3 text-sm font-medium text-neutral-600 transition-all hover:bg-white/10 cursor-pointer"
          >
            <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Continue with X</span>
          </button>

          {VL_LOGIN_ENABLED && (
            <button
              onClick={() => handleOAuthSignIn('virtualeagues')}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white/5 border border-purple-300/20 px-4 py-3 text-sm font-medium text-neutral-600 transition-all hover:bg-white/10 cursor-pointer"
            >
              <Image
                src="/images/icons/virtualeagues.png"
                alt="Virtualeagues"
                width={16}
                height={16}
                className="h-4 w-4 flex-shrink-0"
              />
              <span>Sign in with Virtualeagues</span>
            </button>
          )}
        </div>

        {!statsLoading && stats && (
          <div className="flex items-center justify-center gap-3">
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

            <div className="h-1.5 w-1.5 rounded-full bg-purple-300/60" />

            <span className="text-xs font-medium text-gray-400">
              <span className="text-zenko-light font-semibold">
                {stats.totalCount.toLocaleString()}+
              </span> joined
            </span>
          </div>
        )}

        <div className="w-full border-t border-white/10"></div>

        <p className="text-center text-xs text-gray-400 -mt-2">
          By signing in, you agree to receive updates and marketing communications.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full -mt-4">
      {zenkoOpen && (
        <div className="pt-4">
          <ZenkoOpenBanner open />
        </div>
      )}
      <Stepper
        initialStep={currentStepIndex}
        onStepChange={(step) => setCurrentStepIndex(step)}
        stepCircleContainerClassName="!bg-transparent !border-none !shadow-none"
        stepContainerClassName="!bg-transparent"
        contentClassName="!py-4"
        footerClassName="hidden"
        className="!p-0 !aspect-auto !min-h-0"
        renderStepIndicator={({ step, currentStep, onStepClick }) => {
          // Kept so the referral step can advance itself once a code applies.
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
      <Step>
        <div className="flex flex-col space-y-6 w-full max-w-md mx-auto">
          <div className="text-center">
            <h2 className="mb-2 text-xl md:text-2xl font-semibold leading-tight tracking-tight text-white">
              Were you invited?
            </h2>
            <p className="text-gray-400">
              Enter a code and you both earn bonus rep
            </p>
          </div>

          <form onSubmit={handleApplyReferral} className="w-full space-y-4">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-white">
                Invite code
              </label>
              <input
                type="text"
                value={user?.usedReferralCode || referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Enter code or username"
                disabled={isSubmitting || !!user?.usedReferralCode}
                readOnly={!!user?.usedReferralCode}
                className="w-full rounded-xl border-2 border-purple-300/20 bg-black/40 px-4 py-3 text-white/60 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-300 disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="text-error-300" role="alert">
                {error}
              </p>
            )}

            {referralSuccess && (
              <p className="text-success-300" role="status">
                {referralSuccess}
              </p>
            )}

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
                className={`${user?.usedReferralCode ? 'w-full' : 'flex-1'} rounded-lg px-4 py-3 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 bg-zenko-purple hover:bg-purple-700 border-2 border-zenko-purple cursor-pointer`}
              >
                {isSubmitting ? 'Applying...' : user?.usedReferralCode ? 'Continue' : 'Apply'}
              </button>
            </div>
          </form>
        </div>
      </Step>

      <Step>
        <div className="flex flex-col space-y-6 w-full max-w-md mx-auto">
          <div className="text-center">
            <h2 className="mb-2 text-xl md:text-2xl font-semibold leading-tight tracking-tight text-white">
              Which games do you play?
            </h2>
            <p className="text-gray-400">
              Select at least one game
            </p>
          </div>

          <form onSubmit={handleSubmitGames} className="w-full space-y-6">
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

            {error && (
              <div className="rounded-lg border border-error-300/20 bg-error-300/10 px-4 py-3 text-error-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || selectedGames.length === 0}
              className="w-full rounded-lg border-2 border-purple-500 px-4 py-3 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 bg-zenko-purple hover:bg-purple-700 cursor-pointer"
            >
              {isSubmitting ? 'Setting up...' : 'Go to dashboard'}
            </button>

            <p className="text-center text-xs text-gray-500">
              Complete setup to unlock your referral link
            </p>
          </form>
        </div>
      </Step>
      </Stepper>

      {user && (
        <div className="relative mt-12">
          <div
            className="absolute top-0 left-0 w-full h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(203, 186, 238, 0.3), transparent)'
            }}
          ></div>

          <div className="flex items-center justify-between w-full max-w-md mx-auto pt-8">
            <div className="flex items-center gap-2 min-w-0">
              {user.oauthProvider === 'twitter' ? (
                <svg className="h-4 w-4 flex-shrink-0 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              ) : (
                <Image
                  src={
                    user.oauthProvider === 'google'
                      ? '/images/icons/google.svg'
                      : user.oauthProvider === 'virtualeagues'
                      ? '/images/icons/virtualeagues.png'
                      : '/images/icons/twitch.svg'
                  }
                  alt={user.oauthProvider}
                  width={16}
                  height={16}
                  className="h-4 w-4 flex-shrink-0"
                />
              )}
              <span className="text-sm text-neutral-700/70 font-medium truncate">
                {user.oauthProvider === 'google' && user.email
                  ? user.email
                  : (user.oauthProvider === 'twitch' ||
                      user.oauthProvider === 'twitter' ||
                      user.oauthProvider === 'virtualeagues') &&
                    user.displayName &&
                    user.displayName !== 'User'
                  ? user.displayName
                  : 'Connected'}
              </span>
            </div>

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
