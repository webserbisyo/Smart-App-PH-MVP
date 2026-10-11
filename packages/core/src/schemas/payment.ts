import { z } from 'zod';

import { PaymentMethod, PaymentReviewStatus } from './enums';
import { Centavos, IsoDateTime, Uuid } from './primitives';

/**
 * A payment record (table `payments`). Several rows per order are allowed. A reference number
 * is unique per shop (compared on its normalized form).
 */
export const Payment = z.object({
  id: Uuid,
  tenantId: Uuid,
  orderId: Uuid,
  method: PaymentMethod,
  amount: Centavos,
  status: PaymentReviewStatus,
  referenceNo: z.string().min(1).nullable(),
  referenceNorm: z.string().min(1).nullable(),
  proofPath: z.string().min(1).nullable(),
  reviewedAt: IsoDateTime.nullable(),
  rejectReason: z.string().nullable(),
  createdAt: IsoDateTime,
});
export type Payment = z.infer<typeof Payment>;
