import { z } from 'zod';

import { OrderMessageKind, OrderMessageSender } from './enums';
import { IsoDateTime, Uuid } from './primitives';

/** A message or timeline event in an order conversation (table `order_messages`). */
export const OrderMessage = z.object({
  id: Uuid,
  tenantId: Uuid.optional(),
  orderId: Uuid.optional(),
  sender: OrderMessageSender,
  kind: OrderMessageKind,
  body: z.string().max(500).nullable(),
  attachmentPath: z.string().nullable(),
  paymentId: Uuid.nullable(),
  createdAt: IsoDateTime,
});
export type OrderMessage = z.infer<typeof OrderMessage>;
