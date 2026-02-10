'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Login is now handled on the main page
    router.push('/');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7F56D9] border-t-transparent" />
    </div>
  );
}
