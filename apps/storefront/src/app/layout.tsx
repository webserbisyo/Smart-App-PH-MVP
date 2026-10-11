import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { WORDS } from '@smartapp/core';

import './globals.css';

export const metadata: Metadata = {
  title: WORDS.app.name,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

/** Light only at launch (decision P2-1): no .dark class on the storefront. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="light">
      <body>{children}</body>
    </html>
  );
}
