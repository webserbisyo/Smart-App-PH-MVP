import { z } from 'zod';

import { Centavos, Uuid } from './primitives';

/** Flat delivery fee per area (table `delivery_zones`). */
export const DeliveryZone = z.object({
  id: Uuid,
  tenantId: Uuid,
  name: z.string().min(1),
  fee: Centavos,
  etaText: z.string().nullable(),
  isActive: z.boolean(),
  sort: z.int(),
});
export type DeliveryZone = z.infer<typeof DeliveryZone>;
