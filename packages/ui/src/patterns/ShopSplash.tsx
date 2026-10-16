'use client';

import { useEffect, useState } from 'react';

import { cn } from '#lib/utils';

export interface ShopSplashProps {
  name: string;
  logoUrl?: string | null | undefined;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0]?.charAt(0) ?? '';
    const second = parts[1]?.charAt(0) ?? '';
    return (first + second).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * ShopSplash pattern (Storefront v2 Step 9):
 * Shown only in standalone PWA display mode, once per session.
 * Logo on shop-60 background, gone after first paint or at most 600ms.
 * Uses opacity-only fade with reduced motion support.
 */
export function ShopSplash({ name, logoUrl }: ShopSplashProps) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check standalone mode (Android/desktop PWA matchMedia, or iOS Safari navigator.standalone)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Reflect.get(window.navigator, 'standalone') === true;

    if (!isStandalone) return;

    // Check once per session
    try {
      if (sessionStorage.getItem('smartapp_splash_seen') === '1') {
        return;
      }
      sessionStorage.setItem('smartapp_splash_seen', '1');
    } catch {
      // If sessionStorage is unavailable, continue
    }

    setVisible(true);

    const fadeTimer = setTimeout(() => {
      setFading(true);
      const hideTimer = setTimeout(() => {
        setVisible(false);
      }, 300);
      return () => {
        clearTimeout(hideTimer);
      };
    }, 600);

    return () => {
      clearTimeout(fadeTimer);
    };
  }, []);

  if (!visible) return null;

  const initials = initialsOf(name);

  return (
    <div
      aria-hidden="true"
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-shop-60 transition-opacity duration-300 pointer-events-none',
        fading ? 'opacity-0' : 'opacity-100',
      )}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className="size-24 rounded-2xl object-cover shadow-sm"
        />
      ) : (
        <div className="flex size-24 items-center justify-center rounded-2xl bg-shop-10 text-shop-10-foreground font-bold text-3xl shadow-sm">
          {initials}
        </div>
      )}
    </div>
  );
}
