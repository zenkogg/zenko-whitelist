'use client';

import { useState, useCallback } from 'react';
import { BackgroundLayer } from './BackgroundLayer';
import { HeroColumn } from './HeroColumn';
import { GlassSidebar, FormState } from './GlassSidebar';

export function MobileLayout() {
  const [formState, setFormState] = useState<FormState>('form');

  const handleStateChange = useCallback((state: FormState) => {
    setFormState(state);
  }, []);

  const showHero = formState === 'form';

  return (
    <div className="relative flex min-h-screen flex-col lg:hidden">
      {/* Background - Full height */}
      <div className="absolute inset-0">
        <BackgroundLayer />
      </div>

      {/* Hero Section - Hidden on success/error */}
      {showHero && (
        <div className="relative z-10 h-[360px]">
          <HeroColumn mobile />
        </div>
      )}

      {/* Form Section */}
      <div className={`relative z-10 flex-1 ${!showHero ? 'pt-24' : ''}`}>
        <GlassSidebar mobile onStateChange={handleStateChange} />
      </div>
    </div>
  );
}
