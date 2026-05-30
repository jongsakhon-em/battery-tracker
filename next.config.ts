import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // อนุญาตให้มือถือ (IP 192.168.1.7) เข้าถึง Next.js dev resources ได้
  allowedDevOrigins: ['192.168.1.7'],
};

export default nextConfig;
