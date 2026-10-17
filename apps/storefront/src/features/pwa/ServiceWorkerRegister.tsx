'use client';

import { useEffect } from 'react';

/** Registers the hand-written storefront service worker on window load (SF3 step 7). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
      window.addEventListener('load', () => {
        void navigator.serviceWorker
          .register('/sw.js', {
            scope: '/',
            updateViaCache: 'none',
          })
          .catch(() => {
            // Ignore registration errors in restricted environments
          });
      });
    }
  }, []);

  return null;
}
