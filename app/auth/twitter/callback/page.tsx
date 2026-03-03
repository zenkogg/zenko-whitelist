'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { AuthErrorScreen } from '@/components/AuthErrorScreen';

export default function TwitterCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    async function handleCallback() {
      try {
        const urlParams = new URLSearchParams(window.location.search);

        // OAuth 1.0a: X redirects with oauth_token + oauth_verifier (or denied)
        const denied = urlParams.get('denied');
        if (denied) {
          setError('X sign in was cancelled');
          return;
        }

        const oauthToken = urlParams.get('oauth_token');
        const oauthVerifier = urlParams.get('oauth_verifier');

        if (!oauthToken || !oauthVerifier) {
          console.error('Twitter callback missing params:', { hasToken: !!oauthToken, hasVerifier: !!oauthVerifier });
          setError('X authentication failed - missing token or verifier');
          return;
        }

        // Exchange for access token via our API
        const response = await fetch('/api/auth/twitter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oauthToken, oauthVerifier }),
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
    return <AuthErrorScreen error={error} />;
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
