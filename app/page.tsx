import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { HeroColumn } from '@/components/landing/HeroColumn';
import { GlassSidebar } from '@/components/landing/GlassSidebar';

export default function Home() {
  return (
    <main className="relative h-screen w-full overflow-hidden">
      {/* Full viewport background layer */}
      <BackgroundLayer />

      {/* Content container - responsive with max-width */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-screen-2xl flex-col p-8 lg:flex-row">
        {/* Left Column - Hero Section */}
        <HeroColumn />

        {/* Right Column - Glassmorphism Sidebar */}
        <GlassSidebar />
      </div>
    </main>
  );
}
