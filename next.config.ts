import type { NextConfig } from "next";

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.example.com";
const publicApi = new URL(publicApiUrl);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      // Keep the production backend host here; replace the placeholder via NEXT_PUBLIC_API_URL in production.
      {
        protocol: publicApi.protocol.replace(':', '') as 'http' | 'https',
        hostname: publicApi.hostname,
        ...(publicApi.port ? { port: publicApi.port } : {}),
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5001',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '5000',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '5001',
      },
    ],
  },
};

export default nextConfig;
