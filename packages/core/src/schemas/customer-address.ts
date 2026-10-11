import { z } from 'zod';

import { Uuid } from './primitives';

/** A member's saved address (table `customer_addresses`). */
export const CustomerAddress = z.object({
  id: Uuid,
  tenantId: Uuid,
  customerId: Uuid,
  label: z.string().min(1).max(40),
  addressLine: z.string().min(1).max(200),
  landmark: z.string().max(200).nullable(),
  isDefault: z.boolean(),
});
export type CustomerAddress = z.infer<typeof CustomerAddress>;
