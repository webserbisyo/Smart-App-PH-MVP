import { z } from 'zod';

import { Centavos, Uuid } from './primitives';

/** An add-on as it was chosen, with its price at order time. */
export const OrderLineOption = z.object({
  optionId: Uuid.nullable(),
  name: z.string().min(1),
  priceDelta: Centavos,
});
export type OrderLineOption = z.infer<typeof OrderLineOption>;

/**
 * One line of a placed order (table `order_items`). Names and prices are snapshots at order
 * time, so editing or deleting a product never changes old receipts.
 */
export const OrderLine = z
  .object({
    id: Uuid,
    tenantId: Uuid,
    orderId: Uuid,
    itemId: Uuid.nullable(),
    variantId: Uuid.nullable(),
    itemName: z.string().min(1),
    variantName: z.string().min(1),
    unitPrice: Centavos,
    options: z.array(OrderLineOption),
    optionsTotal: Centavos,
    qty: z.int().positive(),
    lineTotal: Centavos,
    note: z.string().nullable(),
  })
  .refine((line) => line.lineTotal === (line.unitPrice + line.optionsTotal) * line.qty, {
    message: 'lineTotal must equal (unitPrice + optionsTotal) × qty.',
    path: ['lineTotal'],
  });
export type OrderLine = z.infer<typeof OrderLine>;
