'use client';

import Image from 'next/image';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 md:py-4">
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
            <span className="text-xl font-semibold text-zenko-light">Zenko</span>
          </div>

          {/* Early Access Badge */}
          <div className="flex items-center gap-1.5 md:gap-2 rounded-full border-2 border-amber-500/30 bg-amber-500/10 px-2.5 md:px-3.5 py-1 md:py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-[10px] md:text-xs font-medium text-amber-500">Early Access • Invite Only</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
