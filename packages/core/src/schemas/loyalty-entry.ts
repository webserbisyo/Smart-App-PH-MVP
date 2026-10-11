import { z } from 'zod';

import { LoyaltyReason } from './enums';
import { IsoDateTime, Uuid } from './primitives';

/** One stamp movement (table `loyalty_ledger`, append-only). The balance is the sum of delta. */
export const LoyaltyEntry = z.object({
  tenantId: Uuid,
  customerId: Uuid,
  orderId: Uuid.nullable(),
  delta: z.int().refine((delta) => delta !== 0, 'delta is never 0.'),
  reason: LoyaltyReason,
  createdAt: IsoDateTime,
});
export type LoyaltyEntry = z.infer<typeof LoyaltyEntry>;
