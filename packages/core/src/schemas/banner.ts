import { z } from 'zod';

import { BannerKind } from './enums';
import { IsoDateTime, Uuid } from './primitives';

/** A promotional banner slide shown on the storefront (table `shop_banners`). */
export const ShopBanner = z.object({
  id: Uuid,
  tenantId: Uuid,
  kind: BannerKind,
  imagePath: z.string().nullable(),
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/).nullable(),
  title: z.string().min(1).max(60),
  linkUrl: z.url().nullable(),
  sort: z.int(),
  isActive: z.boolean(),
  createdAt: IsoDateTime,
});
export type ShopBanner = z.infer<typeof ShopBanner>;

/** A banner as the dashboard settings saves it; `id` is null for a new slide. */
export const ShopBannerDraft = ShopBanner.omit({ tenantId: true, createdAt: true }).extend({
  id: Uuid.nullable(),
});
export type ShopBannerDraft = z.infer<typeof ShopBannerDraft>;
