'use client';

import LogoLoop, { LogoItem } from '@/components/LogoLoop';

const GAME_LOGOS: LogoItem[] = [
  { src: '/images/gamesv2/scroll-logo_leagueoflegends.png', alt: 'League of Legends' },
  { src: '/images/gamesv2/Teamfight_Tactics_logo.png', alt: 'TFT' },
  { src: '/images/gamesv2/scroll-logo_valorant.png', alt: 'Valorant' },
  { src: '/images/gamesv2/scroll-logo_fortnite.png', alt: 'Fortnite' },
  { src: '/images/gamesv2/scroll-logo_nba2k26.png', alt: 'NBA 2K26' },
  { src: '/images/gamesv2/scroll-logo_fc26.png', alt: 'FC 26' },
  { src: '/images/gamesv2/scroll-logo_2xko.png', alt: '2XKO' },
  { src: '/images/gamesv2/scroll-logo_battlefield6.png', alt: 'Battlefield 6' },
  { src: '/images/gamesv2/scroll-logo_pubg.png', alt: 'PUBG' },
  { src: '/images/gamesv2/scroll-logo_cod.png', alt: 'Call of Duty' },
  { src: '/images/gamesv2/scroll-logo_codwarzone.png', alt: 'Call of Duty Warzone' },
  { src: '/images/gamesv2/scroll-logo_legendsofrunterra.png', alt: 'Legends of Runeterra' },
  { src: '/images/gamesv2/scroll-logo_rocket-league.png', alt: 'Rocket League' },
  { src: '/images/gamesv2/scroll-logo_gtao.png', alt: 'GTA Online' },
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
