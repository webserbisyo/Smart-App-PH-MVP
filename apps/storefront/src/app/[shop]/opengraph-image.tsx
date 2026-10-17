import { ImageResponse } from 'next/og';

import { mediaUrl } from '@smartapp/api';
import { readableTextOn, shopPalette, VOCAB } from '@smartapp/core';

import { loadStorefront } from '../../features/shell/shop';

export const alt = 'Storefront preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

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
 * Dynamic Open Graph preview image generated per shop (SF3 step 8, decision SF-19).
 * Uses the shop's logo, brand palette, and name.
 */
export default async function Image({ params }: { params: Promise<{ shop: string }> }) {
  const { shop: shopSlug } = await params;
  const storefront = await loadStorefront(shopSlug);

  const shopName = storefront?.shop.name ?? 'SmartApp Shop';
  const tagline = storefront?.shop.settings.tagline ?? '';
  const businessType = storefront?.shop.businessType ?? 'food';
  const catalogLabel = VOCAB[businessType].catalog;
  const colorPrimary = storefront?.shop.settings.colorPrimary ?? '#2456D3';

  const palette = shopPalette(colorPrimary);
  const accent = palette.accent;
  const textOnAccent = readableTextOn(accent);
  const initials = initialsOf(shopName);

  const logoPath = storefront?.shop.settings.logoPath;
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
      // Fallback to initials monogram
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          backgroundImage: `linear-gradient(135deg, #090d16 0%, #1e293b 100%)`,
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '32px',
            padding: '48px 56px',
            width: '100%',
            maxWidth: '1080px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            gap: '40px',
          }}
        >
          {/* Logo or Monogram */}
          {logoDataUrl ? (
            <img
              src={logoDataUrl}
              alt={shopName}
              style={{
                width: '160px',
                height: '160px',
                borderRadius: '32px',
                objectFit: 'cover',
                border: '4px solid #f1f5f9',
              }}
            />
          ) : (
            <div
              style={{
                width: '160px',
                height: '160px',
                borderRadius: '32px',
                backgroundColor: accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: textOnAccent,
                fontSize: '64px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
              }}
            >
              {initials}
            </div>
          )}

          {/* Details */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: `${accent}1a`,
                  color: accent,
                  padding: '6px 16px',
                  borderRadius: '9999px',
                  fontSize: '18px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {catalogLabel}
              </div>
            </div>

            <div
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#0f172a',
                lineHeight: 1.15,
                letterSpacing: '-0.025em',
                marginBottom: tagline ? '12px' : '0px',
              }}
            >
              {shopName}
            </div>

            {tagline ? (
              <div
                style={{
                  fontSize: '22px',
                  color: '#64748b',
                  lineHeight: 1.4,
                  fontWeight: 500,
                }}
              >
                {tagline}
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: '1080px',
            marginTop: '28px',
            padding: '0 8px',
          }}
        >
          <div
            style={{
              color: '#94a3b8',
              fontSize: '20px',
              fontWeight: 600,
              letterSpacing: '0.01em',
            }}
          >
            smartapp.ph/{shopSlug}
          </div>
          <div
            style={{
              color: '#64748b',
              fontSize: '18px',
              fontWeight: 500,
            }}
          >
            Order online · Pick up or Delivery
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
