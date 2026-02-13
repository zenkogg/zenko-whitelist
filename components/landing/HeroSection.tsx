'use client';

export function HeroSection() {
  return (
    <div className="text-center mb-12">
      {/* Main Title in Sora */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-white mb-6" style={{ fontFamily: 'Sora, sans-serif' }}>
        The Social Platform for Gamers
      </h1>

      {/* Tagline */}
      <p className="text-base sm:text-lg lg:text-xl font-semibold text-[#fdb022] mb-6">
        Don&apos;t Just Play. Be Recognized.
      </p>

      {/* Description */}
      <p className="text-sm sm:text-base lg:text-lg font-medium leading-relaxed text-[#E9D7FE] max-w-3xl mx-auto">
        Build and connect your gaming identities. Own your reputation.
      </p>
    </div>
  );
}
