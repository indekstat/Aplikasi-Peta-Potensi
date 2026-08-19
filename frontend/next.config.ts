import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['72.60.78.97:1307', '72.60.78.97'],
  async rewrites() {
    return {
      fallback: [
        {
          source: '/api/:path*/',
          destination: `${process.env.API_URL || 'http://backend:8000'}/api/:path*/`,
        },
        {
          source: '/api/:path*',
          destination: `${process.env.API_URL || 'http://backend:8000'}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;

