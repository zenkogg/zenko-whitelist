'use client';

import Image from 'next/image';
import { GameCarousel } from './GameCarousel';

interface HeroColumnProps {
  mobile?: boolean;
}

export function HeroColumn({ mobile = false }: HeroColumnProps) {
  if (mobile) {
    return (
      <div className="relative z-10 flex h-full flex-col justify-end py-8 px-4">
        {/* All Content - At bottom with gap-4 between each element */}
        <div className="flex flex-col gap-4">
          {/* Header with Logo */}
          <div className="flex items-center gap-2">
            <Image
              src="/images/zenko-head.svg"
              alt="Zenko"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-3xl font-semibold text-zenko-purple">Zenko</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold font-['Inter'] uppercase leading-10 text-[#CBBAEE]">
            Play your games,
            <br />
            Win real prizes
          </h1>

          {/* Game Carousel - Auto-scroll */}
          <div className="-mx-4">
            <GameCarousel mobile />
          </div>

          {/* Subtitle */}
          <div className="self-stretch justify-start text-[#E9D7FE] text-sm font-medium font-['Inter'] leading-6">
            Link your gaming accounts, prove your skills on-chain, and get instant, trustless payouts on every win.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex h-full flex-1 flex-col p-8 lg:p-12">
      {/* Main Content - Centered */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-[640px] flex flex-col gap-2">
          {/* Title */}
          <h1 className="text-6xl font-semibold font-['Inter'] uppercase leading-[90px] text-[#CBBAEE]">
            Play your games,
            <br />
            Win real prizes
          </h1>

          {/* Subtitle */}
          <div className="self-stretch text-xl font-medium font-['Inter'] leading-8 text-[#E9D7FE]">
            Link your gaming accounts, prove your skills on-chain, and get instant, trustless payouts on every win.
          </div>

          {/* Game Carousel */}
          <GameCarousel />

          {/* Footer - Built on Sui */}
          <div className="flex items-center gap-3 text-[#D5D7DA]">
            <span className="text-sm uppercase font-medium font-['Inter'] tracking-wide">Built on</span>
            <Image
              src="/images/icons/sui.svg"
              alt="Sui"
              width={46}
              height={16}
              className="h-4 w-auto"
            />
          </div>
        </div>
      </div>      
    </div>
  );
}
