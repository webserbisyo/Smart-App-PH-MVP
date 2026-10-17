import { z } from 'zod';

import { AnnouncementTone } from './enums';
import { IsoDateTime } from './primitives';

/** A shop's banner announcement shown at the top of the storefront. */
export const ShopAnnouncement = z.object({
  text: z.string().min(1).max(160),
  tone: AnnouncementTone,
  endsAt: IsoDateTime.nullable(),
});
export type ShopAnnouncement = z.infer<typeof ShopAnnouncement>;
