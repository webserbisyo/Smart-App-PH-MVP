import type { MetadataRoute } from 'next';

import { shopPalette } from '@smartapp/core';

import { loadStorefront } from '../../../features/shell/shop';

// Per-shop install: "Add to home screen" names the app after the shop and opens its storefront.
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ shop: string }> }): Promise<Response> {
  const storefront = await loadStorefront((await params).shop);
  if (!storefront) return new Response(null, { status: 404 });

  const { shop } = storefront;
  const palette = shopPalette(shop.settings.colorPrimary);
  const home = `/${shop.slug}`;
  const manifest: MetadataRoute.Manifest = {
    id: home,
    name: shop.name,
    short_name: shop.name,
    description: shop.settings.tagline ?? undefined,
    start_url: `${home}?source=pwa`,
    scope: `${home}/`,
    display: 'standalone',
    theme_color: palette.secondary,
    background_color: palette.primary,
    icons: [
      { src: `${home}/icon?size=192`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${home}/icon?size=512`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${home}/icon?size=512&maskable=1`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/manifest+json; charset=utf-8' } });
}
