import { z } from 'zod';

import { BusinessType, ShopStatus } from './enums';
import { HexColor, IsoDateTime, ManilaDate, Slug, Uuid } from './primitives';

/** One business account (table `tenants`). Status and paidUntil are changed by the founder with SQL. */
export const Tenant = z.object({
  id: Uuid,
  slug: Slug,
  name: z.string().min(1).max(80),
  businessType: BusinessType,
  status: ShopStatus,
  plan: z.string().min(1).nullable(),
  paidUntil: ManilaDate.nullable(),
  isDemo: z.boolean(),
  createdAt: IsoDateTime,
});
export type Tenant = z.infer<typeof Tenant>;

/** The shop's public settings (table `shop_settings`, one row per shop). */
export const ShopSettings = z.object({
  tenantId: Uuid,
  logoPath: z.string().min(1).nullable(),
  coverPath: z.string().min(1).nullable(),
  tagline: z.string().max(160).nullable(),
  phone: z.string().nullable(),
  email: z.email().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  mapsUrl: z.url().nullable(),
  facebookUrl: z.url().nullable(),
  messengerUsername: z.string().min(1).nullable(),
  /** 60%: background and surfaces. */
  colorPrimary: HexColor,
  /** 30%: cards and secondary areas. */
  colorSecondary: HexColor,
  /** 10%: buttons and highlights. */
  colorAccent: HexColor,
  acceptingOrders: z.boolean(),
  busyUntil: IsoDateTime.nullable(),
  walkInEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  deliveryEnabled: z.boolean(),
  codEnabled: z.boolean(),
  payLaterPickup: z.boolean(),
  deliveryFeeViaMessenger: z.boolean(),
  unpaidExpiryMinutes: z.int().positive(),
  showMemberCount: z.boolean(),
});
export type ShopSettings = z.infer<typeof ShopSettings>;

/** A shop as the apps see it: the tenant plus its settings. */
export const Shop = Tenant.extend({
  settings: ShopSettings,
});
export type Shop = z.infer<typeof Shop>;

/** The settings an owner changes (every field but the shop id). */
export const ShopSettingsPatch = ShopSettings.omit({ tenantId: true }).partial();
export type ShopSettingsPatch = z.infer<typeof ShopSettingsPatch>;

/** A shop as customers see it (the storefront): no plan, paid until or status, which are only the founder's. */
export const PublicShop = Tenant.omit({ status: true, plan: true, paidUntil: true }).extend({
  settings: ShopSettings,
});
export type PublicShop = z.infer<typeof PublicShop>;
