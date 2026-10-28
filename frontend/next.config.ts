import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is for the Docker image; Vercel manages its own output.
  output: process.env.VERCEL ? undefined : "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    // Pin the workspace root so Turbopack does not walk up into the home directory.
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
