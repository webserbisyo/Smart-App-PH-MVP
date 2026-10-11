import { z } from 'zod';

import { Centavos, IsoDateTime, PhPhone, Uuid } from './primitives';

/**
 * One person per shop (table `customers`). A member is a customer with memberSince set
 * (a linked login); a guest has userId null.
 */
export const Customer = z.object({
  id: Uuid,
  tenantId: Uuid,
  userId: Uuid.nullable(),
  name: z.string().min(1),
  phone: PhPhone,
  email: z.email().nullable(),
  memberSince: IsoDateTime.nullable(),
  orderCount: z.int().nonnegative(),
  totalSpent: Centavos,
  lastOrderAt: IsoDateTime.nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string().min(1)),
});
export type Customer = z.infer<typeof Customer>;
