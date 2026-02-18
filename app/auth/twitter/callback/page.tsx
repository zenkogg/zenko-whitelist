'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackgroundLayer } from '@/components/landing/BackgroundLayer';

export default function TwitterCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    async function handleCallback() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const codeVerifier = sessionStorage.getItem('twitter_code_verifier');

        if (!code || !codeVerifier) {
          setError('Twitter authentication failed - missing code or verifier');
          return;
        }

        // Clean up
        sessionStorage.removeItem('twitter_code_verifier');

        // Exchange code for user info via our API
        const response = await fetch('/api/auth/twitter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, codeVerifier }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to authenticate with X');
        }

        const { user } = await response.json();

        // Store user in localStorage for client-side session
        localStorage.setItem('waitlist_user', JSON.stringify(user));

        // Check for pending referral code
        const pendingRefCode = sessionStorage.getItem('pending_referral_code');

        // Redirect based on whether they've completed game selection
        if (user.games && user.games.length > 0) {
          if (pendingRefCode && !user.usedReferralCode) {
            router.push(`/dashboard?ref=${pendingRefCode}`);
          } else {
            router.push('/dashboard');
          }
        } else {
          const refParam = pendingRefCode ? `?ref=${pendingRefCode}` : '';
          router.push(`/${refParam}`);
        }
      } catch (err: any) {
        console.error('Twitter callback error:', err);
        setError(err.message || 'Authentication failed');
      }
    }

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
        <BackgroundLayer />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-error-300">Error</h1>
            <p className="mt-2 text-neutral-700">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 rounded-lg bg-purple-500 hover:bg-purple-600 px-4 py-3 text-sm font-medium text-white transition-all cursor-pointer"
            >
              Go Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      <BackgroundLayer />
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          <p className="text-neutral-700">Completing sign in...</p>
        </div>
      </div>
    </main>
  );
}
