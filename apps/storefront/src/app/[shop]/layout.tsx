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

// Read on every request for now, so an owner's changes show after a refresh (caching is P6).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: ShopParams): Promise<Metadata> {
  const { shop } = await storefrontOrNotFound((await params).shop);
  return {
    title: shop.name,
    description: shop.settings.tagline,
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
  return (
    <ShopTheme colors={shopColors(storefront)} root>
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
