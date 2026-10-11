import { z } from 'zod';

import { OrderStatus } from './enums';
import { IsoDateTime, Uuid } from './primitives';

/** One step of an order's timeline (table `order_events`), shown on the receipt and in the dashboard. */
export const OrderEvent = z.object({
  id: Uuid,
  orderId: Uuid,
  fromStatus: OrderStatus.nullable(),
  toStatus: OrderStatus,
  note: z.string().nullable(),
  createdAt: IsoDateTime,
});
export type OrderEvent = z.infer<typeof OrderEvent>;
