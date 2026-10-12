import { notFound } from 'next/navigation';
import { cache } from 'react';

import { createPublicClient, getStorefront, mediaUrl } from '@smartapp/api';
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
    ...storefront.paymentAccounts.flatMap((account) => (account.qrPath && account.isActive ? [account.qrPath] : [])),
  ];
  return Object.fromEntries(paths.map((path) => [path, { thumb: mediaUrl(path, 'thumb'), full: mediaUrl(path, 'full') }]));
}
