import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { HeroColumn } from '@/components/landing/HeroColumn';
import { GlassSidebar } from '@/components/landing/GlassSidebar';
import { MobileLayout } from '@/components/landing/MobileLayout';

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      {/* Desktop Layout - Side by side */}
      <div className="hidden lg:flex lg:h-screen">
        {/* Background spans full width for glass effect */}
        <BackgroundLayer />

        {/* Left Column - Hero Section */}
        <div className="relative z-10 flex-1">
          <HeroColumn />
        </div>

        {/* Right Column - Form Sidebar */}
        <div className="relative z-10 flex w-[560px] shrink p-6">
          <GlassSidebar />
        </div>
      </div>

      {/* Mobile Layout */}
      <MobileLayout />
    </main>
  );
}
