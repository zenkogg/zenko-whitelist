'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signInWithOAuth } from '@/lib/oauth-client';
import { GameBadge } from './GameBadge';
import { Button } from '@/components/ui/button';

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

type OnboardingStep = 'login' | 'referral' | 'games';

interface OnboardingSidebarProps {
  mobile?: boolean;
}

export function OnboardingSidebar({ mobile = false }: OnboardingSidebarProps) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('login');
  const [user, setUser] = useState<any>(null);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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

      // If user has completed games, redirect to dashboard with ref if present
      if (userData.games && userData.games.length > 0) {
        const redirectUrl = refCode ? `/dashboard?ref=${refCode}` : '/dashboard';
        router.push(redirectUrl);
      } else if (userData.usedReferralCode) {
        // If user already used a referral code, go to games
        setStep('games');
      } else {
        // Otherwise, show referral code step
        setStep('referral');
      }
    } else {
      setStep('login');
    }
  }, [router]);

  const handleOAuthSignIn = (provider: 'google' | 'twitch') => {
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

      // Move to games step
      setStep('games');
    } catch (error: any) {
      console.error('Apply referral error:', error);
      setError(error.message || 'Failed to apply referral code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipReferral = () => {
    setStep('games');
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

  const commonClasses = mobile
    ? 'flex min-h-[calc(100vh-400px)] w-full flex-col rounded-3xl border border-white/20 bg-black/40 backdrop-blur-xl shadow-2xl'
    : 'flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/20 bg-black/40 backdrop-blur-xl shadow-2xl';

  return (
    <div className={commonClasses}>
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex min-h-full w-full max-w-[384px] flex-col justify-center">
          {/* Logo - Centered */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center">
              <Image
                src="/images/zenko-head.svg"
                alt="Zenko Logo"
                width={64}
                height={64}
                className="h-16 w-16"
              />
            </div>
          </div>

          {/* Step 1: OAuth Login */}
          {step === 'login' && (
            <>
              {/* Heading */}
              <h2 className="mb-2 text-center text-4xl font-semibold leading-[44px] tracking-[-0.72px]">
                <span className="text-[#cbbaee]">Welcome to</span>{' '}
                <span className="text-[#fdb022]">Zenko</span>
              </h2>
              <p className="mb-8 text-center text-sm text-gray-400">
                Sign in to join the waitlist and get early access
              </p>

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

              {/* Footer Text */}
              <p className="mt-6 text-center text-xs text-gray-400">
                By signing in, you agree to receive updates and marketing communications.
              </p>
            </>
          )}

          {/* Step 2: Referral Code (Optional) */}
          {step === 'referral' && (
            <>
              {/* Heading */}
              <h2 className="mb-2 text-center text-3xl font-semibold leading-tight tracking-tight text-[#cbbaee]">
                Have a Referral Code?
              </h2>
              <p className="mb-6 text-center text-sm text-gray-400">
                Enter a friend&apos;s code to boost your reputation and skip ahead
              </p>

              {/* Connected Account Banner */}
              {user && (
                <div className="mb-6 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
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
                    Referral Code
                  </label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character code"
                    maxLength={6}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-gray-400 backdrop-blur-xl transition-colors focus:border-[#7F56D9] focus:outline-none"
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
            </>
          )}

          {/* Step 3: Game Selection */}
          {step === 'games' && (
            <>
              {/* Heading */}
              <h2 className="mb-2 text-center text-3xl font-semibold leading-tight tracking-tight text-[#cbbaee]">
                Select Your Games
              </h2>
              <p className="mb-4 text-center text-sm text-gray-400">
                Choose at least one game you&apos;re interested in playing on Zenko
              </p>

              {/* Connected Account Banner */}
              {user && (
                <div className="mb-6 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
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
                    Games of Interest<span className="text-[#c70036]">*</span>
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
                  {isSubmitting ? 'Saving...' : 'Continue to Dashboard'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto space-y-4 px-6 py-6">
        {/* Built on Sui */}
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-sm uppercase tracking-wide">Built on</span>
          <Image
            src="/images/icons/sui.svg"
            alt="Sui"
            width={46}
            height={16}
            className="h-4 w-auto"
          />
        </div>

        {/* Copyright and Social */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">© 2026 Zenko, All rights reserved.</span>
          <div className="flex gap-4">
            <a
              href="https://www.instagram.com/zenkogg?igsh=YzdqYTc0N2ZuMzNx&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7F56D9] transition-colors hover:text-[#9b8afb]"
              aria-label="Instagram"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://x.com/zenkogginc?s=21&t=aZd4S6kCPZBx-rpP3YEdAg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7F56D9] transition-colors hover:text-[#9b8afb]"
              aria-label="X (Twitter)"
            >
              <XIcon />
            </a>
          </div>
        </div>
      </div>
    </div>
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
