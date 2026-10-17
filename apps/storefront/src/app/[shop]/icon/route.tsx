import { ImageResponse } from 'next/og';

import { mediaUrl } from '@smartapp/api';
import { readableTextOn, shopPalette } from '@smartapp/core';

import { loadStorefront } from '../../../features/shell/shop';


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
 * Per-shop icons generated with next/og:
 * - 192x192, 512x512, maskable 512 with safe padding, and apple-touch-icon 180x180.
 * - Displays logo when available, or shop initials on shop-10 accent colour.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ shop: string }> },
): Promise<Response> {
  const { shop: shopSlug } = await params;
  const storefront = await loadStorefront(shopSlug);
  if (!storefront) return new Response('Shop not found', { status: 404 });

  const url = new URL(request.url);
  const sizeParam = Number.parseInt(url.searchParams.get('size') ?? '512', 10);
  const size = [180, 192, 512].includes(sizeParam) ? sizeParam : 512;
  const isMaskable = url.searchParams.get('maskable') === '1' || url.searchParams.get('maskable') === 'true';
  const isApple = size === 180 || url.searchParams.get('apple') === '1';

  const { shop } = storefront;
  const palette = shopPalette(shop.settings.colorPrimary);
  const accent = palette.accent;
  const textColor = readableTextOn(accent);
  const initials = initialsOf(shop.name);

  const logoPath = shop.settings.logoPath;
  let logoDataUrl: string | null = null;
  if (logoPath) {
    try {
      const srcUrl = mediaUrl(logoPath, 'thumb');
      const res = await fetch(srcUrl);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const mime = res.headers.get('content-type') ?? 'image/png';
        const base64 = Buffer.from(buffer).toString('base64');
        logoDataUrl = `data:${mime};base64,${base64}`;
      }
    } catch {
      // Gracefully fall back to initials
    }
  }

  // Safe padding for maskable icons (inner area is ~70-80% per PWA spec)
  const padding = isMaskable ? Math.round(size * 0.15) : 0;
  const contentSize = size - padding * 2;
  const fontSize = Math.round(contentSize * 0.42);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: accent,
          padding,
        }}
      >
        {logoDataUrl ? (
          <img
            src={logoDataUrl}
            alt={shop.name}
            style={{
              width: contentSize,
              height: contentSize,
              objectFit: 'cover',
              borderRadius: isApple ? '0px' : isMaskable ? '0px' : '20%',
            }}
          />
        ) : (
          <div
            style={{
              width: contentSize,
              height: contentSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: textColor,
              fontSize,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            {initials}
          </div>
        )}
      </div>
    ),
    {
      width: size,
      height: size,
    },
  );
}
