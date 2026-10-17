import { z } from 'zod';

import { IsoDateTime, Uuid } from './primitives';

/** A private customer rating for a completed order (table `order_ratings`). */
export const OrderRating = z.object({
  orderId: Uuid.optional(),
  tenantId: Uuid.optional(),
  stars: z.int().min(1).max(5),
  comment: z.string().max(300).nullable(),
  createdAt: IsoDateTime.optional(),
});
export type OrderRating = z.infer<typeof OrderRating>;

export const RateOrderPayload = z.object({
  token: z.string().min(8),
  stars: z.int().min(1).max(5),
  comment: z.string().trim().max(300).nullable().optional(),
});
export type RateOrderPayload = z.infer<typeof RateOrderPayload>;
