import { z } from 'zod';

import { ItemStatus } from './enums';
import { Uuid } from './primitives';

/** A menu item or product (table `items`). Archived instead of deleted when it has orders. */
export const Item = z.object({
  id: Uuid,
  tenantId: Uuid,
  categoryId: Uuid.nullable(),
  name: z.string().min(1).max(80),
  description: z.string().max(500).nullable(),
  status: ItemStatus,
  isFeatured: z.boolean(),
  trackStock: z.boolean(),
  sort: z.int(),
});
export type Item = z.infer<typeof Item>;

/** A product photo (table `item_photos`). The first photo is the cover. */
export const ItemPhoto = z.object({
  id: Uuid,
  tenantId: Uuid,
  itemId: Uuid,
  path: z.string().min(1),
  sort: z.int(),
});
export type ItemPhoto = z.infer<typeof ItemPhoto>;
