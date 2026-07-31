import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.zenmarket.jp",
      },
      {
        protocol: "https",
        hostname: "static2.zenmarket.jp",
      },
      {
        protocol: "https",
        hostname: "a.lmcdn.ru",
      },
    ],
  },
};

export default nextConfig;
