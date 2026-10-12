import { notFound } from 'next/navigation';
import { cache } from 'react';

import { createPublicClient, getStorefront } from '@smartapp/api';
import type { Storefront } from '@smartapp/core';

import { readEnv } from '../../env';

/**
 * The shop's storefront data, read once per request (layout, metadata, viewport and page share it). No session:
 * shop pages are the same for every visitor. Not cached across requests yet, so owner edits show at once (P6).
 */
export const loadStorefront = cache(async (slug: string): Promise<Storefront | null> => {
  const env = readEnv();
  const client = createPublicClient({ url: env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY });
  return getStorefront(client, slug);
});

/** The storefront for a `[shop]` route, or Next's not-found page (unknown, pending or suspended shop). */
export async function storefrontOrNotFound(slug: string): Promise<Storefront> {
  const storefront = await loadStorefront(slug);
  if (!storefront) notFound();
  return storefront;
}

/** The shop's 60/30/10 colours for `ShopTheme`. */
export function shopColors(storefront: Storefront): { primary: string; secondary: string; accent: string } {
  const { settings } = storefront.shop;
  return { primary: settings.colorPrimary, secondary: settings.colorSecondary, accent: settings.colorAccent };
}
