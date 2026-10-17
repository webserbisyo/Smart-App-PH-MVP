import { z } from 'zod';

import { Pin } from './pin';
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
  centerLat: z.number().min(-90).max(90).nullable().optional(),
  centerLng: z.number().min(-180).max(180).nullable().optional(),
  center: Pin.nullable().optional(),
});

export type DeliveryZone = z.infer<typeof DeliveryZone>;

/** A delivery zone as Settings saves it; `id` is null for a new one (it goes to the end of the list). */
export const DeliveryZoneDraft = DeliveryZone.omit({ tenantId: true, sort: true }).extend({ id: Uuid.nullable() });
export type DeliveryZoneDraft = z.infer<typeof DeliveryZoneDraft>;
