import type { NextConfig } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const mediaPattern = [
  ...(supabaseUrl ? [new URL('/storage/v1/object/public/shop-media/**', supabaseUrl)] : []),
  new URL('https://i.ytimg.com/**'),
];

const config: NextConfig = {
  // The shared packages export TypeScript source.
  transpilePackages: ['@smartapp/ui', '@smartapp/core', '@smartapp/api'],
  reactStrictMode: true,
  images: {
    remotePatterns: mediaPattern,
    // The local Supabase (127.0.0.1) in development only.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === 'development',
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default config;
