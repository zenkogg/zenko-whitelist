'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { extractTokenFromCallback } from '@/lib/oauth-client';
import { BackgroundLayer } from '@/components/landing/BackgroundLayer';

export default function AdminCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const idToken = extractTokenFromCallback();
      if (!idToken) {
        setError('No token received from Google.');
        return;
      }

      try {
        const res = await fetch('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        if (!res.ok) {
          setError('Access denied. Your email is not authorized.');
          return;
        }

        const data = await res.json();
        localStorage.setItem(
          'admin_session',
          JSON.stringify({ idToken, email: data.email, name: data.name })
        );
        window.location.href = '/admin';
      } catch {
        setError('Something went wrong. Please try again.');
      }
    }

    handleCallback();
  }, []);

  if (error) {
    return (
      <>
        <BackgroundLayer />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-red-400 mb-4">{error}</p>
            <Link href="/" className="text-purple-400 hover:text-purple-300 underline">
              Back to home
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <BackgroundLayer />
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="text-white/60">Verifying access...</p>
      </div>
    </>
  );
}
