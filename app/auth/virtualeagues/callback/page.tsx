'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { AuthErrorScreen } from '@/components/AuthErrorScreen';

const VL_LOGIN_ENABLED = process.env.NEXT_PUBLIC_VL_LOGIN_ENABLED === 'true';

export default function VirtualeaguesCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!VL_LOGIN_ENABLED) {
      router.replace('/');
      return;
    }
    async function handleCallback() {
      try {
        const urlParams = new URLSearchParams(window.location.search);

        const vlError = urlParams.get('error');
        if (vlError) {
          setError(
            urlParams.get('error_description') || 'Virtualeagues sign in was cancelled'
          );
          return;
        }

        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (!code || !state) {
          setError('Virtualeagues authentication failed - missing code or state');
          return;
        }

        const response = await fetch('/api/auth/virtualeagues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to authenticate with Virtualeagues');
        }

        const { user } = await response.json();

        localStorage.setItem('waitlist_user', JSON.stringify(user));

        const pendingRefCode = sessionStorage.getItem('pending_referral_code');

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
      } catch (err: unknown) {
        console.error('Virtualeagues callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
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
