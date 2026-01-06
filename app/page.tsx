export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-white">
            Zenko
          </h1>
          <p className="text-xl text-gray-300">
            Competitive Gaming Meets Blockchain
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 space-y-6">
          <h2 className="text-2xl font-semibold text-white">
            Join the Whitelist
          </h2>
          <p className="text-gray-300">
            Be among the first to experience skill-based wagers and competitive challenges.
          </p>

          <form className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="text-gray-900">Select your game</option>
              <option value="league" className="text-gray-900">League of Legends</option>
              <option value="valorant" className="text-gray-900">Valorant</option>
              <option value="overwatch" className="text-gray-900">Overwatch 2</option>
            </select>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Join Whitelist
            </button>
          </form>

          <p className="text-sm text-gray-400">
            Early access. Exclusive rewards. Be part of the future of competitive gaming.
          </p>
        </div>
      </div>
    </main>
  );
}
