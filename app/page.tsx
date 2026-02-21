'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { GameLogoLoop } from '@/components/landing/GameLogoLoop';
import { CenteredOnboardingCard } from '@/components/landing/CenteredOnboardingCard';
import { HeroSection } from '@/components/landing/HeroSection';
import { Footer } from '@/components/Footer';

export default function Home() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('waitlist_user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      if (userData.games && userData.games.length > 0) {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        const redirectUrl = refCode ? `/dashboard?ref=${refCode}` : '/dashboard';
        router.push(redirectUrl);
        return;
      }
    }
    setIsCheckingSession(false);
  }, [router]);

  if (isCheckingSession) {
    return (
      <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
        <BackgroundLayer />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      <BackgroundLayer />

      {/* Vertical Zenko Logo */}
      <div className="relative z-10 flex justify-center pt-8 md:pt-12">
        <div className="relative">
          {/* Glow effect behind logo */}
          <div
            className="absolute inset-0 blur-3xl opacity-30"
            style={{
              background: 'radial-gradient(ellipse at center, #7F56D9 0%, #9E77ED 40%, transparent 70%)',
              transform: 'scale(1.8)',
            }}
          />
          <Image
            src="/logo/logo-only-brand.svg"
            alt="Zenko"
            width={140}
            height={103}
            className="relative h-16 md:h-[90px] w-auto"
            priority
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 md:px-6 pt-4 pb-8 md:pt-6 md:pb-12 lg:pb-16">
        <div className="mx-auto max-w-6xl">
          {/* Hero Section with Title */}
          <HeroSection />

          {/* Onboarding Card */}
          <CenteredOnboardingCard />

          {/* Game Logo Loop - Below Card */}
          <div className="mt-8 md:mt-16">
            <GameLogoLoop />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
