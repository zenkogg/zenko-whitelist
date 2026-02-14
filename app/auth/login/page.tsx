'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BackgroundLayer } from '@/components/landing/BackgroundLayer';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Login is now handled on the main page
    router.push('/');
  }, [router]);

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      <BackgroundLayer />
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    </main>
  );
}
