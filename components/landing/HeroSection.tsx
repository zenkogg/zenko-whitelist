export function HeroSection() {
  return (
    <div className="text-center mb-4 md:mb-8 space-y-2 md:space-y-3">
      {/* Hook line */}
      <p className="text-base sm:text-lg md:text-xl font-semibold text-purple-300/70 italic">
        They said it&apos;s just a game... we made it pay.
      </p>

      {/* Brand statement */}
      <h1
        className="text-2xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-white leading-tight"
        style={{ fontFamily: 'Sora, sans-serif' }}
      >
        Reputation has <span className="text-amber-500 whitespace-nowrap">no off-season.</span>
      </h1>

      {/* Explanation line */}
      <p className="mx-auto max-w-[20rem] sm:max-w-md md:max-w-lg text-base sm:text-lg md:text-xl text-gray-300">
        Compete on skill. Earn real money across every game you play.
      </p>
    </div>
  );
}
