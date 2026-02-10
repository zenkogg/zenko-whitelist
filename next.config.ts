import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Whitelist is a separate submodule, use its directory as root
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static-cdn.jtvnw.net',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
