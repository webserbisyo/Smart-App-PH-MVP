import { z } from 'zod';

import { DeliveryProvider } from './enums';
import { PhPhone, Uuid } from './primitives';

/** Delivery tracking and rider details for an order. */
export const DeliveryInfo = z.object({
  deliveryProvider: DeliveryProvider,
  riderName: z.string().max(60).nullable(),
  riderPhone: PhPhone.nullable(),
  trackingUrl: z.url().nullable(),
});
export type DeliveryInfo = z.infer<typeof DeliveryInfo>;

export const SetDeliveryInfoPayload = z.object({
  orderId: Uuid,
  provider: DeliveryProvider,
  trackingUrl: z.url().nullable().optional(),
  riderName: z.string().trim().max(60).nullable().optional(),
  riderPhone: z.string().nullable().optional(),
});
export type SetDeliveryInfoPayload = z.infer<typeof SetDeliveryInfoPayload>;
