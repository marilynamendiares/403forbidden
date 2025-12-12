import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.dev", // ← разрешаем все поддомены R2
      },
    ],
  },
};

export default nextConfig;