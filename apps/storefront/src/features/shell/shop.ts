import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { createPublicClient, getStorefront, mediaUrl } from '@smartapp/api';
import type { Storefront } from '@smartapp/core';

import { readEnv } from '../../env';

/**
 * The shop's storefront data:
 * Cached per slug with fallback revalidation of 60 seconds (Refinement D)
 * and tagged `shop:<slug>` for instant on-demand owner revalidation (decisions SF-19, SF-20).
 * Also wrapped in React cache() so multiple calls in one request share the result.
 */
export const loadStorefront = cache(async (slug: string): Promise<Storefront | null> => {
  const getCached = unstable_cache(
    async (s: string) => {
      const env = readEnv();
      const client = createPublicClient({
        url: env.NEXT_PUBLIC_SUPABASE_URL,
        publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      });
      return getStorefront(client, s);
    },
    ['storefront', slug],
    {
      revalidate: 60,
      tags: [`shop:${slug}`],
    },
  );

  return getCached(slug);
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

/** A shop image's two public URLs. */
export interface MediaUrls {
  thumb: string;
  full: string;
}

/**
 * Public URLs of every image the shop pages show (item photos, category photos, logo, cover, payment QR codes),
 * keyed by path. Built on the server so client components need no Supabase client.
 */
export function shopMedia(storefront: Storefront): Record<string, MediaUrls> {
  const { settings } = storefront.shop;
  const paths = [
    ...storefront.items.flatMap((item) => item.photos.map((photo) => photo.path)),
    ...storefront.categories.flatMap((category) => (category.icon?.kind === 'image' ? [category.icon.path] : [])),
    ...(settings.logoPath ? [settings.logoPath] : []),
    ...(settings.coverPath ? [settings.coverPath] : []),
    ...(storefront.stampRule?.rewardImagePath ? [storefront.stampRule.rewardImagePath] : []),
    ...storefront.paymentAccounts.flatMap((account) => (account.qrPath && account.isActive ? [account.qrPath] : [])),
  ];
  return Object.fromEntries(paths.map((path) => [path, { thumb: mediaUrl(path, 'thumb'), full: mediaUrl(path, 'full') }]));
}
