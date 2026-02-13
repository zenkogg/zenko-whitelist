'use client';

import LogoLoop, { LogoItem } from '@/components/LogoLoop';

const GAME_LOGOS: LogoItem[] = [
  { src: '/images/games/lol.svg', alt: 'League of Legends' },
  { src: '/images/games/tft.svg', alt: 'TFT' },
  { src: '/images/games/valorant.svg', alt: 'Valorant' },
  { src: '/images/games/dota2.svg', alt: 'Dota 2' },
  { src: '/images/games/fortnite.svg', alt: 'Fortnite' },
  { src: '/images/games/nba2k26.svg', alt: 'NBA 2K26' },
  { src: '/images/games/fc26.svg', alt: 'FC 26' },
  { src: '/images/games/2xko.svg', alt: '2XKO' },
  { src: '/images/games/battlefield6.svg', alt: 'Battlefield 6' },
  { src: '/images/games/battlegrounds.svg', alt: 'Battlegrounds' },
  { src: '/images/games/cod.svg', alt: 'Call of Duty' },
  { src: '/images/games/lor.svg', alt: 'Legends of Runeterra' },
  { src: '/images/games/rocketleague.svg', alt: 'Rocket League' },
];

export function GameLogoLoop() {
  return (
    <div className="py-8 w-full">
      <LogoLoop
        logos={GAME_LOGOS}
        speed={60}
        direction="left"
        logoHeight={48}
        gap={32}
        pauseOnHover={true}
        fadeOut={true}
        fadeOutColor="#000000"
        ariaLabel="Supported games"
      />
    </div>
  );
}
