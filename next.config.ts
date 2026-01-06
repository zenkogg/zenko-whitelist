import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Whitelist is a separate submodule, use its directory as root
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
