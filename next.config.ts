import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  // Allow the Docker container hostname to access the dev server (HMR, etc.)
  allowedDevOrigins: ["game-delistings-tracker-app-1"],
};

export default nextConfig;
