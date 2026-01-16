'use client';

import Image from 'next/image';

export function BackgroundLayer() {
  return (
    <>
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/mushrooms.png"
          alt="Background"
          fill
          className="object-cover blur-[2px]"
          priority
          quality={90}
        />
      </div>

      {/* Dim Overlay */}
      <div className="absolute inset-0 z-[2] bg-black/80 opacity-80" />
    </>
  );
}
