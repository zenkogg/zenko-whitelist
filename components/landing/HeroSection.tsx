'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

const TITLES = [
  <>Build your gaming identity. <span className="text-amber-500">Everywhere you play.</span></>,
];

const TAGLINES = [
  'Don\u2019t just play. Be recognized.',
  'Skill Decides. Recognition Follows.',
  'Your best games count.',
];

export function HeroSection() {
  const [titleIndex, setTitleIndex] = useState(0);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [isFadingTitle, setIsFadingTitle] = useState(false);
  const [isFadingTagline, setIsFadingTagline] = useState(false);

  const cycleTitle = (direction: 1 | -1) => {
    setIsFadingTitle(true);
    setTimeout(() => {
      setTitleIndex((prev) => (prev + direction + TITLES.length) % TITLES.length);
      setIsFadingTitle(false);
    }, 300);
  };

  const cycleTagline = (direction: 1 | -1) => {
    setIsFadingTagline(true);
    setTimeout(() => {
      setTaglineIndex((prev) => (prev + direction + TAGLINES.length) % TAGLINES.length);
      setIsFadingTagline(false);
    }, 300);
  };

  const showTitleArrows = TITLES.length > 1;

  return (
    <div className="text-center mb-8 md:mb-12">
      {/* Main Title with Arrows */}
      <div className="flex items-center justify-center gap-2 md:gap-4 mb-4 md:mb-6">
        {showTitleArrows && (
          <button onClick={() => cycleTitle(-1)} className="text-white/20 hover:text-white/60 transition-colors cursor-pointer flex-shrink-0">
            <ChevronLeftIcon className="h-6 w-6 md:h-8 md:w-8" />
          </button>
        )}
        <h1
          className={`text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-semibold text-white leading-tight transition-opacity duration-300 ${
            isFadingTitle ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          {TITLES[titleIndex]}
        </h1>
        {showTitleArrows && (
          <button onClick={() => cycleTitle(1)} className="text-white/20 hover:text-white/60 transition-colors cursor-pointer flex-shrink-0">
            <ChevronRightIcon className="h-6 w-6 md:h-8 md:w-8" />
          </button>
        )}
      </div>

      {/* Tagline with Arrows */}
      <div className="flex items-center justify-center gap-2 md:gap-4 mb-4 md:mb-6">
        <button onClick={() => cycleTagline(-1)} className="text-amber-500/20 hover:text-amber-500/60 transition-colors cursor-pointer flex-shrink-0">
          <ChevronLeftIcon className="h-4 w-4 md:h-5 md:w-5" />
        </button>
        <p
          className={`text-[10px] sm:text-xs lg:text-base text-amber-500 transition-opacity duration-300 ${
            isFadingTagline ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ fontFamily: 'var(--font-press-start)' }}
        >
          {TAGLINES[taglineIndex]}
        </p>
        <button onClick={() => cycleTagline(1)} className="text-amber-500/20 hover:text-amber-500/60 transition-colors cursor-pointer flex-shrink-0">
          <ChevronRightIcon className="h-4 w-4 md:h-5 md:w-5" />
        </button>
      </div>
    </div>
  );
}
