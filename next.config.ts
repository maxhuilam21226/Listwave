import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the outlet JSON knowledge base is bundled into the serverless output,
  // so fs reads in src/lib/outlets work in production (e.g. on Vercel).
  outputFileTracingIncludes: {
    "/**": ["./src/lib/outlets/data/**/*"],
  },
};

export default nextConfig;
