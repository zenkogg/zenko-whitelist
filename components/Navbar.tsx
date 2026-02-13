'use client';

import Image from 'next/image';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/images/zenko-head.svg"
              alt="Zenko"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-semibold text-[#cbbaee]">Zenko</span>
          </div>

          {/* Early Access Badge */}
          <div className="flex items-center gap-2 rounded-full border border-[#fdb022]/30 bg-[#fdb022]/10 px-4 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#fdb022] animate-pulse"></div>
            <span className="text-xs font-medium text-[#fdb022]">Early Access • Invite Only</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
