'use client';

import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { GameLogoLoop } from '@/components/landing/GameLogoLoop';
import { CenteredOnboardingCard } from '@/components/landing/CenteredOnboardingCard';
import { HeroSection } from '@/components/landing/HeroSection';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      <BackgroundLayer />

      {/* Transparent Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="relative z-10 px-6 pt-32 pb-12 lg:pt-40 lg:pb-16">
        <div className="mx-auto max-w-6xl">
          {/* Hero Section with Title, Description, Waitlist Badge & Avatar Group */}
          <HeroSection />

          {/* Onboarding Card */}
          <CenteredOnboardingCard />

          {/* Game Logo Loop - Below Card */}
          <div className="mt-16">
            <GameLogoLoop />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
