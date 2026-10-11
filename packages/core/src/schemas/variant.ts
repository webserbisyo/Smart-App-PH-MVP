import { z } from 'zod';

import { Centavos, IsoDateTime, Uuid } from './primitives';

/** A size or variant (table `item_variants`). Every item has at least one; price and stock live here. */
export const Variant = z.object({
  id: Uuid,
  tenantId: Uuid,
  itemId: Uuid,
  name: z.string().min(1).max(60),
  price: Centavos,
  /** Counted only when the item tracks stock. */
  stockOnHand: z.int().nonnegative().nullable(),
  lowStockAt: z.int().nonnegative().nullable(),
  isSoldOut: z.boolean(),
  sort: z.int(),
  archivedAt: IsoDateTime.nullable(),
});
export type Variant = z.infer<typeof Variant>;
