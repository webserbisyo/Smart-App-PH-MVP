import type { QuotePayload } from '@smartapp/core';

// Every query key, in one place. Screens never build keys by hand (docs/api-surface.md).
export const qk = {
  session: ['session'] as const,
  myShop: ['my-shop'] as const,
  slugAvailable: (slug: string) => ['slug-available', slug] as const,
  shopSettings: (tenantId: string) => ['shop-settings', tenantId] as const,
  businessHours: (tenantId: string) => ['business-hours', tenantId] as const,
  closures: (tenantId: string) => ['closures', tenantId] as const,
  paymentAccounts: (tenantId: string) => ['payment-accounts', tenantId] as const,
  deliveryZones: (tenantId: string) => ['delivery-zones', tenantId] as const,
  categories: (tenantId: string) => ['categories', tenantId] as const,
  catalog: (tenantId: string) => ['catalog', tenantId] as const,
  optionGroups: (tenantId: string) => ['option-groups', tenantId] as const,
  storefront: (slug: string) => ['storefront', slug] as const,
  quote: (slug: string, payload: QuotePayload | null) => ['quote', slug, payload] as const,
  order: (token: string) => ['order', token] as const,
};
