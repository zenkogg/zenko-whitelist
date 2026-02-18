'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractTokenFromCallback, getStoredProvider } from '@/lib/oauth-client';
import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { AuthErrorScreen } from '@/components/AuthErrorScreen';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    async function handleCallback() {
      try {
        // Extract ID token from URL hash
        const idToken = extractTokenFromCallback();
        const provider = getStoredProvider();

        if (!idToken || !provider) {
          setError('OAuth callback failed');
          return;
        }

        // Send to backend to create/login user
        const response = await fetch('/api/auth-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, provider }),
        });

        if (!response.ok) {
          throw new Error('Failed to authenticate');
        }

        const { user } = await response.json();

        // Store user in localStorage for client-side session
        localStorage.setItem('waitlist_user', JSON.stringify(user));

        // Check for pending referral code
        const pendingRefCode = sessionStorage.getItem('pending_referral_code');

        // Redirect based on whether they've completed game selection
        if (user.games && user.games.length > 0) {
          // If there's a pending referral code and user hasn't used one, go to dashboard with ref
          if (pendingRefCode && !user.usedReferralCode) {
            router.push(`/dashboard?ref=${pendingRefCode}`);
          } else {
            router.push('/dashboard');
          }
        } else {
          // Preserve ref code in URL for onboarding flow
          const refParam = pendingRefCode ? `?ref=${pendingRefCode}` : '';
          router.push(`/${refParam}`);
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError('Authentication failed');
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
