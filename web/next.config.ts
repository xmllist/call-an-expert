import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Configure allowed image domains for next/image
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Experimental features for Next.js 15
  experimental: {
    // Server Actions are stable in Next.js 15
  },

  // Environment variables that should be available on the client
  // Note: NEXT_PUBLIC_ prefixed vars are automatically exposed
  env: {},
}

export default nextConfig
