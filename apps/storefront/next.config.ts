import type { NextConfig } from 'next';

// Shop images come from the project's public `shop-media` bucket only.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const mediaPattern = supabaseUrl ? [new URL('/storage/v1/object/public/shop-media/**', supabaseUrl)] : [];

const config: NextConfig = {
  // The shared packages export TypeScript source.
  transpilePackages: ['@smartapp/ui', '@smartapp/core', '@smartapp/api'],
  reactStrictMode: true,
  images: {
    remotePatterns: mediaPattern,
    // The local Supabase (127.0.0.1) in development only.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === 'development',
  },
};

export default config;
