import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  // apicalypse pulls in better-queue → better-queue-memory which ships
  // .editorconfig / .travis.yml; Turbopack refuses unknown file types
  // when bundling. Marking it external makes Node.js require() it at
  // runtime instead.
  serverExternalPackages: ["apicalypse", "better-queue", "better-queue-memory", "axios"],
  // Allow the Docker container hostname to access the dev server (HMR, etc.)
  allowedDevOrigins: ["game-delistings-tracker-app-1"],
};

export default nextConfig;
