import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { VOCAB } from '@smartapp/core';
import { ShopTheme } from '@smartapp/ui/shop-theme';

import { StoreNav } from '../../features/shell/StoreNav';
import { shopOrNotFound } from '../../features/shell/shop';

interface ShopParams {
  params: Promise<{ shop: string }>;
}

export async function generateMetadata({ params }: ShopParams): Promise<Metadata> {
  const shop = shopOrNotFound((await params).shop);
  return { title: shop.name };
}

/** The browser bar takes the shop's 30% colour. */
export async function generateViewport({ params }: ShopParams): Promise<Viewport> {
  const shop = shopOrNotFound((await params).shop);
  return { themeColor: shop.colors.secondary };
}

export default async function ShopLayout({ params, children }: ShopParams & { children: ReactNode }) {
  const shop = shopOrNotFound((await params).shop);
  return (
    <ShopTheme colors={shop.colors}>
      <StoreNav slug={shop.slug} shopName={shop.name} catalogLabel={VOCAB[shop.businessType].catalog} />
      {/* Clears the tab bar (56 px) and the cart bar above it on phones and tablets. */}
      <main id="main" className="mx-auto w-full max-w-320 px-4 pt-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:px-8 lg:pt-8 lg:pb-12">
        {children}
      </main>
    </ShopTheme>
  );
}
