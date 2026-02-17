'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

const TITLES = [
  <>Build your gaming identity. <span className="text-amber-500">Everywhere you play.</span></>,
];

const TAGLINES = [
  'Don’t just play. Be recognized.',
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

  return (
    <div className="text-center mb-12">
      {/* Main Title with Arrows */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={() => cycleTitle(-1)} className="text-white/20 hover:text-white/60 transition-colors cursor-pointer">
          <ChevronLeftIcon className="h-8 w-8" />
        </button>
        <h1
          className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-white transition-opacity duration-300 ${
            isFadingTitle ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          {TITLES[titleIndex]}
        </h1>
        <button onClick={() => cycleTitle(1)} className="text-white/20 hover:text-white/60 transition-colors cursor-pointer">
          <ChevronRightIcon className="h-8 w-8" />
        </button>
      </div>

      {/* Tagline with Arrows */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={() => cycleTagline(-1)} className="text-amber-500/20 hover:text-amber-500/60 transition-colors cursor-pointer">
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <p
          className={`text-xs sm:text-sm lg:text-base text-amber-500 transition-opacity duration-300 ${
            isFadingTagline ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ fontFamily: 'var(--font-press-start)' }}
        >
          {TAGLINES[taglineIndex]}
        </p>
        <button onClick={() => cycleTagline(1)} className="text-amber-500/20 hover:text-amber-500/60 transition-colors cursor-pointer">
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
