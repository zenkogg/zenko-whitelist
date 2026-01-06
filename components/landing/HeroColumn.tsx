'use client';

import { GameCarousel } from './GameCarousel';

export function HeroColumn() {
  return (
    <div className="flex h-full flex-1 flex-col justify-between p-8 lg:p-12">
      {/* Main Content */}
      <div className="flex flex-1 flex-col justify-center space-y-8">
        {/* Title */}
        <h1 className="lg:text-6xl text-4xl font-semibold text-[#CBBAEE] capitalize leading-tight">
          Play your games,<br /> Win real prizes.
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-xl text-gray-300 lg:text-2xl">
          Link your gaming accounts, prove your skills on-chain, and get instant, trustless payouts on every win.
        </p>

        {/* Game Carousel */}
        <GameCarousel />
      </div>

      {/* Footer - Built on Sui */}
      <div className="mt-8 flex items-center gap-3 text-gray-400">
        <span className="text-sm">Built on</span>
        <div className="flex items-center gap-2">
          {/* TODO: Add Sui logo */}
          <div className="h-6 w-6 rounded-full bg-linear-to-br from-blue-400 to-cyan-400" />
          <span className="font-semibold text-white">Sui</span>
        </div>
      </div>
    </div>
  );
}
