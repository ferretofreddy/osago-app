import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.44', 'localhost', '127.0.0.1'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Deshabilitar TypeScript temporalmente si hay conflicto
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;