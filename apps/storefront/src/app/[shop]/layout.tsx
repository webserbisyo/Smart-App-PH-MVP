import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { orderingBlock, VOCAB } from '@smartapp/core';
import { ShopTheme } from '@smartapp/ui/shop-theme';

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
  };
}

/** The browser bar takes the shop's 30% colour. */
export async function generateViewport({ params }: ShopParams): Promise<Viewport> {
  const storefront = await storefrontOrNotFound((await params).shop);
  return { themeColor: storefront.shop.settings.colorSecondary };
}

export default async function ShopLayout({ params, children }: ShopParams & { children: ReactNode }) {
  const storefront = await storefrontOrNotFound((await params).shop);
  const { shop } = storefront;
  const catalogLabel = VOCAB[shop.businessType].catalog;
  return (
    <ShopTheme colors={shopColors(storefront)} root>
      <ShopProvider storefront={storefront} media={shopMedia(storefront)} block={orderingBlock(storefront, new Date())} catalogLabel={catalogLabel}>
        <StoreNav slug={shop.slug} shopName={shop.name} catalogLabel={catalogLabel} />
        {/* Clears the tab bar (56 px) and the cart bar above it on phones and tablets. */}
        <main id="main" className="mx-auto w-full max-w-320 px-4 pt-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:px-8 lg:pt-8 lg:pb-12">
          {children}
        </main>
      </ShopProvider>
    </ShopTheme>
  );
}
