import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { orderingBlock, shopPalette, VOCAB } from '@smartapp/core';
import { ShopSplash } from '@smartapp/ui/patterns/ShopSplash';
import { ShopTheme } from '@smartapp/ui/shop-theme';

import { DataProvider } from '../../features/shell/DataProvider';
import { ShopProvider } from '../../features/shell/ShopProvider';
import { StoreNav } from '../../features/shell/StoreNav';
import { shopColors, shopMedia, storefrontOrNotFound } from '../../features/shell/shop';

interface ShopParams {
  params: Promise<{ shop: string }>;
}

export async function generateMetadata({ params }: ShopParams): Promise<Metadata> {
  const { shop } = await storefrontOrNotFound((await params).shop);
  return {
    title: shop.name,
    description: shop.settings.tagline ?? undefined,
    alternates: {
      canonical: `/${shop.slug}`,
    },
    openGraph: {
      title: shop.name,
      description: shop.settings.tagline ?? undefined,
      url: `/${shop.slug}`,
      siteName: shop.name,
      locale: 'en_PH',
      type: 'website',
    },
    manifest: `/${shop.slug}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: shop.name, statusBarStyle: 'default' },
    icons: {
      icon: [
        { url: `/${shop.slug}/icon?size=192`, sizes: '192x192', type: 'image/png' },
        { url: `/${shop.slug}/icon?size=512`, sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        { url: `/${shop.slug}/icon?size=180`, sizes: '180x180', type: 'image/png' },
      ],
    },
  };
}

/** The browser bar takes the shop's 30% colour. */
export async function generateViewport({ params }: ShopParams): Promise<Viewport> {
  const storefront = await storefrontOrNotFound((await params).shop);
  const palette = shopPalette(storefront.shop.settings.colorPrimary);
  return { themeColor: palette.secondary };
}

export default async function ShopLayout({ params, children }: ShopParams & { children: ReactNode }) {
  const storefront = await storefrontOrNotFound((await params).shop);
  const { shop } = storefront;
  const media = shopMedia(storefront);
  const logoUrl = shop.settings.logoPath ? media[shop.settings.logoPath]?.thumb : undefined;
  const catalogLabel = VOCAB[shop.businessType].catalog;
  const schemaType = VOCAB[shop.businessType].schemaType;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: shop.name,
    description: shop.settings.tagline || storefront.about || undefined,
    url: `/${shop.slug}`,
    image: logoUrl,
    telephone: shop.settings.phone || undefined,
    address: shop.settings.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: shop.settings.address,
          addressCountry: 'PH',
        }
      : undefined,
    geo: storefront.pin
      ? {
          '@type': 'GeoCoordinates',
          latitude: storefront.pin.lat,
          longitude: storefront.pin.lng,
        }
      : undefined,
    openingHoursSpecification: storefront.hours.map((h) => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: days[h.weekday] ?? 'Monday',
        opens: h.opensAt,
        closes: h.closesAt,
      };
    }),
  };

  return (
    <ShopTheme colors={shopColors(storefront)} root>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DataProvider>
        <ShopProvider storefront={storefront} media={media} block={orderingBlock(storefront, new Date())} catalogLabel={catalogLabel}>
          <ShopSplash name={shop.name} logoUrl={logoUrl} />
          <StoreNav slug={shop.slug} shopName={shop.name} catalogLabel={catalogLabel} />
          {/* Clears the floating tab bar (64 px) and the cart bar (56 px) above it on phones and tablets. */}
          <main id="main" className="mx-auto w-full max-w-320 px-4 pt-4 pb-[calc(9.5rem+env(safe-area-inset-bottom))] lg:px-8 lg:pt-8 lg:pb-12">
            {children}
          </main>
        </ShopProvider>
      </DataProvider>
    </ShopTheme>
  );
}
