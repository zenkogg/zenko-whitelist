'use client';

import Image from 'next/image';

interface GameCarouselProps {
  mobile?: boolean;
}

export function GameCarousel({ mobile = false }: GameCarouselProps) {
  // All game logos
  const games = [
    { name: 'League of Legends', logo: '/images/games/lol.svg' },
    { name: 'TFT', logo: '/images/games/tft.svg' },
    { name: 'Valorant', logo: '/images/games/valorant.svg' },
    { name: 'Dota 2', logo: '/images/games/dota2.svg' },
    { name: 'Fortnite', logo: '/images/games/fortnite.svg' },
    { name: 'NBA 2K26', logo: '/images/games/nba2k26.svg' },
    { name: 'FC 26', logo: '/images/games/fc26.svg' },
    { name: '2XKO', logo: '/images/games/2xko.svg' },
    { name: 'Battlefield 6', logo: '/images/games/battlefield6.svg' },
    { name: 'Battlegrounds', logo: '/images/games/battlegrounds.svg' },
    { name: 'Call of Duty', logo: '/images/games/cod.svg' },
    { name: 'Legends of Runeterra', logo: '/images/games/lor.svg' },
    { name: 'Rocket League', logo: '/images/games/rocketleague.svg' },
  ];

  const logoHeight = mobile ? 'h-6' : 'h-12';
  const containerHeight = mobile ? 'h-6' : 'h-12';
  const gap = mobile ? 'gap-4' : 'gap-8';
  const padding = mobile ? 'py-2' : 'py-8';

  return (
    <div className={`relative w-full overflow-hidden ${padding}`}>
      {/* Gradient fade overlays */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-32 bg-linear-to-r from-transparent to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-32 bg-linear-to-l from-transparent to-transparent" />

      {/* Carousel track with duplicate slides for infinite loop */}
      <div className={`flex ${gap}`}>
        {/* First set of slides */}
        <div className={`flex shrink-0 animate-scroll items-center ${gap}`}>
          {games.map((game, index) => (
            <div
              key={`slide1-${index}`}
              className={`flex ${containerHeight} shrink-0 items-center justify-center`}
            >
              <Image
                src={game.logo}
                alt={game.name}
                width={mobile ? 60 : 120}
                height={mobile ? 24 : 48}
                className={`${logoHeight} w-auto object-contain`}
              />
            </div>
          ))}
        </div>

        {/* Duplicate set of slides for seamless loop */}
        <div className={`flex shrink-0 animate-scroll items-center ${gap}`} aria-hidden="true">
          {games.map((game, index) => (
            <div
              key={`slide2-${index}`}
              className={`flex ${containerHeight} shrink-0 items-center justify-center`}
            >
              <Image
                src={game.logo}
                alt={game.name}
                width={mobile ? 60 : 120}
                height={mobile ? 24 : 48}
                className={`${logoHeight} w-auto object-contain`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
