'use client';

/**
 * The top bar of the legal pages: the Zenko mark and the waitlist status pill.
 */

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useZenkoOpen } from '@/hooks/useZenkoOpen';

export function Navbar() {
  const [waitlistStatus, setWaitlistStatus] = useState<'open' | 'closed' | null>(null);
  const zenkoOpen = useZenkoOpen();

  useEffect(() => {
    fetch('/api/waitlist/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setWaitlistStatus(data.data.waitlistStatus);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/zenko-head.svg"
              alt="Zenko"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-semibold text-zenko-light">Zenko</span>
          </Link>

          <WaitlistStatusBadge waitlistStatus={waitlistStatus} zenkoOpen={zenkoOpen} />
        </div>
      </div>
    </nav>
  );
}

/** Hidden once Zenko is open, when the waitlist no longer decides who gets in. */
export function WaitlistStatusBadge({
  waitlistStatus,
  zenkoOpen,
}: {
  waitlistStatus: 'open' | 'closed' | null;
  zenkoOpen: boolean;
}) {
  if (!waitlistStatus || zenkoOpen) return null;

  return (
    <div className={`flex items-center gap-1.5 md:gap-2 rounded-full border-2 px-2.5 md:px-3.5 py-1 md:py-1.5 ${
      waitlistStatus === 'open'
        ? 'border-success-300/30 bg-success-300/10'
        : 'border-error-300/30 bg-error-300/10'
    }`}>
      <div className={`h-1.5 w-1.5 rounded-full ${
        waitlistStatus === 'open'
          ? 'bg-success-300 animate-pulse'
          : 'bg-error-300'
      }`}></div>
      <span className={`text-[10px] md:text-xs font-medium ${
        waitlistStatus === 'open'
          ? 'text-success-300'
          : 'text-error-300'
      }`}>
        Waitlist {waitlistStatus === 'open' ? 'Open' : 'Closed'}
      </span>
    </div>
  );
}
