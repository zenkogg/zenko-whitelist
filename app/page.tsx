import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { HeroColumn } from '@/components/landing/HeroColumn';
import { GlassSidebar } from '@/components/landing/GlassSidebar';
import { MobileLayout } from '@/components/landing/MobileLayout';

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      {/* Desktop Layout - Side by side */}
      <div className="hidden lg:flex lg:h-screen">
        {/* Left Column - Hero Section with Background */}
        <div className="relative flex-1">
          <BackgroundLayer />
          <HeroColumn />
        </div>

        {/* Right Column - Form Sidebar */}
        <div className="relative z-10 flex w-[560px] shrink">
          <GlassSidebar />
        </div>
      </div>

      {/* Mobile Layout */}
      <MobileLayout />
    </main>
  );
}
