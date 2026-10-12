import { z } from 'zod';

import { OrderActor, OrderEventKind, OrderStatus } from './enums';
import { IsoDateTime, Uuid } from './primitives';

/**
 * One step of an order's timeline (table `order_events`), shown on the receipt and in the dashboard. A status step
 * has `toStatus`; a payment step (proof sent, confirmed, rejected) has neither status (decision P5-4).
 */
export const OrderEvent = z
  .object({
    id: Uuid,
    orderId: Uuid,
    kind: OrderEventKind,
    fromStatus: OrderStatus.nullable(),
    toStatus: OrderStatus.nullable(),
    actor: OrderActor,
    note: z.string().nullable(),
    createdAt: IsoDateTime,
  })
  .refine((event) => (event.kind === 'status' ? event.toStatus !== null : event.fromStatus === null && event.toStatus === null), {
    message: 'A status step has toStatus; a payment step has no status.',
    path: ['toStatus'],
  });
export type OrderEvent = z.infer<typeof OrderEvent>;
