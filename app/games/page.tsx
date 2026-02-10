'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { GameBadge } from '@/components/landing/GameBadge';
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

export default function GamesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Redirect to home if not authenticated (game selection is now on main page)
    if (status === 'unauthenticated') {
      router.push('/');
    }
    // Redirect to dashboard if already completed games
    if (status === 'authenticated' && (session?.user as any)?.hasCompletedGames) {
      router.push('/dashboard');
    }
    // Redirect to home if authenticated but no games yet (will show game selection step)
    if (status === 'authenticated' && !(session?.user as any)?.hasCompletedGames) {
      router.push('/');
    }
  }, [status, session, router]);

  const toggleGame = (gameValue: string) => {
    setSelectedGames((prev) =>
      prev.includes(gameValue) ? prev.filter((g) => g !== gameValue) : [...prev, gameValue]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Save error:', error);
      setError('Failed to save game selection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7F56D9] border-t-transparent" />
      </div>
    );
  }

  if (status !== 'authenticated' || !session) {
    return null;
  }

  const user = session.user;
  const oauthProvider = (user as any)?.oauthProvider || 'google';

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-black" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/images/zenko-head.svg"
              alt="Zenko Logo"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <span className="text-xl font-semibold text-[#fdb022]">Zenko</span>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2">
              {user.image && (
                <Image
                  src={user.image}
                  alt={user.name || 'User'}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">
                  {user.name || user.email}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <ProviderIcon provider={oauthProvider} />
                  {oauthProvider === 'google' ? 'Google' : 'Twitch'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          {/* Card */}
          <div className="rounded-3xl border border-white/20 bg-black/40 p-8 backdrop-blur-xl shadow-2xl">
            {/* Heading */}
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-3xl font-semibold leading-tight tracking-tight text-[#cbbaee]">
                Select Your Games
              </h1>
              <p className="text-sm text-gray-400">
                Choose at least one game you&apos;re interested in playing on Zenko
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Game Selection */}
              <div className="flex flex-col gap-4">
                <label className="text-sm font-medium text-white">
                  Games of Interest<span className="text-[#c70036]">*</span>
                </label>
                <div className="flex flex-wrap gap-3">
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
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-gray-500">
            © 2026 Zenko, All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === 'twitch') {
    return (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
      </svg>
    );
  }

  // Google icon
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24">
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
