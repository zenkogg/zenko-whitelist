'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function RedirectClient({ code }: { code: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/?ref=${code}`);
  }, [code, router]);

  return null;
}
