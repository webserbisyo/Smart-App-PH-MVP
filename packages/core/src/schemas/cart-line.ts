import { z } from 'zod';

import { Uuid } from './primitives';

/**
 * One line of the cart as the customer chose it. No prices: the database computes them
 * (quote_order, place_order). Strict, so a price field is rejected.
 */
export const CartLine = z.strictObject({
  itemId: Uuid,
  variantId: Uuid,
  optionIds: z.array(Uuid),
  qty: z.int().min(1).max(99),
  note: z.string().max(200).nullable(),
});
export type CartLine = z.infer<typeof CartLine>;
