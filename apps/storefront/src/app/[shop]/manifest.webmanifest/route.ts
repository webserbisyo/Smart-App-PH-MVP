import type { MetadataRoute } from 'next';

import { mediaUrl } from '@smartapp/api';

import { loadStorefront } from '../../../features/shell/shop';

// Per-shop install: "Add to home screen" names the app after the shop and opens its storefront.
export const dynamic = 'force-dynamic';

/** The platform icon, used when the shop has no logo (and as the maskable icon). Per-shop icons are P6. */
const PLATFORM_ICONS: MetadataRoute.Manifest['icons'] = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

export async function GET(_request: Request, { params }: { params: Promise<{ shop: string }> }): Promise<Response> {
  const storefront = await loadStorefront((await params).shop);
  if (!storefront) return new Response(null, { status: 404 });

  const { shop } = storefront;
  const home = `/${shop.slug}`;
  const logo = shop.settings.logoPath;
  const manifest: MetadataRoute.Manifest = {
    id: home,
    name: shop.name,
    short_name: shop.name,
    description: shop.settings.tagline ?? undefined,
    start_url: home,
    scope: home,
    display: 'standalone',
    theme_color: shop.settings.colorSecondary,
    background_color: shop.settings.colorPrimary,
    icons: [
      // The logo is a square of up to 512 px (IMAGE_SIZES.logo).
      ...(logo ? [{ src: mediaUrl(logo, 'full'), sizes: '512x512', type: 'image/webp', purpose: 'any' as const }] : []),
      ...(PLATFORM_ICONS ?? []),
    ],
  };
  return new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/manifest+json; charset=utf-8' } });
}
