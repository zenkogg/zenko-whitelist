'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { GameLogoLoop } from '@/components/landing/GameLogoLoop';
import { CenteredOnboardingCard } from '@/components/landing/CenteredOnboardingCard';
import { HeroSection } from '@/components/landing/HeroSection';
import { Navbar } from '@/components/Navbar';
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

      {/* Transparent Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="relative z-10 px-4 md:px-6 pt-24 pb-8 md:pt-32 md:pb-12 lg:pt-40 lg:pb-16">
        <div className="mx-auto max-w-6xl">
          {/* Hero Section with Title, Description, Waitlist Badge & Avatar Group */}
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
