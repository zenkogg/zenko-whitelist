'use client';

import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { HeroColumn } from '@/components/landing/HeroColumn';
import { OnboardingSidebar } from '@/components/landing/OnboardingSidebar';
import { MobileLayout } from '@/components/landing/MobileLayout';
import { Footer } from '@/components/Footer';

export default function Home() {
  // OnboardingSidebar handles its own session management

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      {/* Desktop Layout - Side by side */}
      <div className="hidden lg:flex lg:h-screen">
        {/* Background spans full width for glass effect */}
        <BackgroundLayer />

        {/* Left Column - Hero Section */}
        <div className="relative z-10 flex-1 pointer-events-none">
          <div className="pointer-events-auto">
            <HeroColumn />
          </div>
        </div>

        {/* Right Column - Form Sidebar */}
        <div className="relative z-10 flex w-[560px] shrink p-6 pointer-events-none">
          <div className="pointer-events-auto">
            <OnboardingSidebar />
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <MobileLayout />

      {/* Footer */}
      <Footer />
    </main>
  );
}
