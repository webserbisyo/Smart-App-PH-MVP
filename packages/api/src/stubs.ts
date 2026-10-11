import type { BusinessType } from '@smartapp/core';

/** What the storefront needs about a shop until P4 (mock data) and P5 (Supabase) replace this stub. */
export interface ShopStub {
  slug: string;
  name: string;
  businessType: BusinessType;
  /** 60 / 30 / 10 colours, `#RRGGBB`. */
  colors: { primary: string; secondary: string; accent: string };
}

const SHOPS: readonly ShopStub[] = [
  {
    slug: 'juans-cafe',
    name: "Juan's Café",
    businessType: 'food',
    colors: { primary: '#fff8ef', secondary: '#5b3a1e', accent: '#c8641e' },
  },
  {
    slug: 'tala-apparel',
    name: 'Tala Apparel',
    businessType: 'retail',
    colors: { primary: '#f6f7fb', secondary: '#1f2a44', accent: '#d6336c' },
  },
];

/** The two stub shops by slug; any other slug is `null` (the storefront shows not found). */
export function getShopStub(slug: string): ShopStub | null {
  return SHOPS.find((shop) => shop.slug === slug) ?? null;
}
