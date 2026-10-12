import { z } from 'zod';

import { ItemStatus } from './enums';
import { Centavos, Uuid } from './primitives';

/** A variant as the product editor saves it. `id` is null for a new one. Stock is set with `set_stock`, not here. */
export const VariantDraft = z.object({
  id: Uuid.nullable(),
  name: z.string().trim().min(1).max(60),
  price: Centavos,
  lowStockAt: z.int().nonnegative().nullable(),
  isSoldOut: z.boolean(),
});
export type VariantDraft = z.infer<typeof VariantDraft>;

/**
 * What the product editor saves in one go (`save_item`): the item, at least one variant in order, photo paths in
 * order (`shop-media` paths under `<tenantId>/items/`) and option group ids. `id` is null for a new item.
 * Variants left out are archived.
 */
export const ItemDraft = z.object({
  id: Uuid.nullable(),
  categoryId: Uuid.nullable(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).nullable(),
  status: ItemStatus,
  isFeatured: z.boolean(),
  trackStock: z.boolean(),
  variants: z.array(VariantDraft).min(1),
  photoPaths: z.array(z.string().min(1)).max(8),
  optionGroupIds: z.array(Uuid),
});
export type ItemDraft = z.infer<typeof ItemDraft>;
