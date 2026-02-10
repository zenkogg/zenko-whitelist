'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  useEffect(() => {
    // Redirect to home - login is now integrated into main page
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    // Redirect if already logged in
    if (status === 'authenticated') {
      const user = session?.user as any;
      // If user has selected games, go to dashboard, else go to home page
      if (user?.hasCompletedGames) {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    }
  }, [status, session, router]);

  const handleOAuthSignIn = async (provider: 'google' | 'twitch' | 'twitter') => {
    setIsLoading(provider);
    try {
      await signIn(provider, { callbackUrl: '/games' });
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7F56D9] border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-black" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-3xl border border-white/20 bg-black/40 p-8 backdrop-blur-xl shadow-2xl">
            {/* Logo */}
            <div className="mb-8 flex justify-center">
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

            {/* Heading */}
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-3xl font-semibold leading-tight tracking-tight">
                <span className="text-[#cbbaee]">Welcome to</span>{' '}
                <span className="text-[#fdb022]">Zenko</span>
              </h1>
              <p className="text-sm text-gray-400">
                Sign in to join the waitlist and get early access
              </p>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              {/* Google Sign In */}
              <button
                onClick={() => handleOAuthSignIn('google')}
                disabled={isLoading !== null}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/20 bg-white px-4 py-3 text-base font-medium text-gray-900 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading === 'google' ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
                ) : (
                  <GoogleIcon />
                )}
                <span>Sign in with Google</span>
              </button>

              {/* Twitch Sign In */}
              <button
                onClick={() => handleOAuthSignIn('twitch')}
                disabled={isLoading !== null}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#9146FF]/30 bg-[#9146FF] px-4 py-3 text-base font-medium text-white transition-all hover:bg-[#7d3bd9] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading === 'twitch' ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <TwitchIcon />
                )}
                <span>Sign in with Twitch</span>
              </button>

              {/* Twitter/X Sign In - Optional for now */}
              {/* Uncomment when Twitter provider is fully set up */}
              {/*
              <button
                onClick={() => handleOAuthSignIn('twitter')}
                disabled={isLoading !== null}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/20 bg-black px-4 py-3 text-base font-medium text-white transition-all hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading === 'twitter' ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <TwitterIcon />
                )}
                <span>Sign in with X</span>
              </button>
              */}
            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-xs text-gray-400">
              By signing in, you agree to receive updates and marketing communications.
            </p>
          </div>

          {/* Bottom Links */}
          <div className="mt-8 flex items-center justify-center gap-6">
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

          <p className="mt-6 text-center text-xs text-gray-500">
            © 2026 Zenko, All rights reserved.
          </p>
        </div>
      </div>
    </main>
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

function TwitterIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
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
