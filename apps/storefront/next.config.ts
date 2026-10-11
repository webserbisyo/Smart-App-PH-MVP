import type { NextConfig } from 'next';

const config: NextConfig = {
  // The shared packages export TypeScript source.
  transpilePackages: ['@smartapp/ui', '@smartapp/core', '@smartapp/api'],
  reactStrictMode: true,
};

export default config;
