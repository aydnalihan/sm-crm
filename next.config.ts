// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Build sırasında ESLint hatalarında kırılma!
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Build sırasında TS tip hatalarında kırılma!
    ignoreBuildErrors: true,
  },
  // İsteğe bağlı: App Router’da daha deterministik davranış için
  experimental: {
    reactCompiler: false,
  },
};

export default nextConfig;
