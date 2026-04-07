import { randomBytes } from "node:crypto";
import type { NextConfig } from "next";

function resolveBuildId() {
  const raw =
    process.env.NEXT_BUILD_ID ??
    process.env.VERCEL_DEPLOYMENT_ID ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.SOURCE_VERSION ??
    randomBytes(5).toString("hex");

  const normalized = raw.replace(/[^a-zA-Z0-9]/g, "");
  return (normalized || randomBytes(5).toString("hex")).slice(0, 9);
}

const BUILD_ID = resolveBuildId();

const nextConfig: NextConfig = {
  generateBuildId: async () => BUILD_ID,

  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.dev", // ← разрешаем все поддомены R2
      },
    ],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
