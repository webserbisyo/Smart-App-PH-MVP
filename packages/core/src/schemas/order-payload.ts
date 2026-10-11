import { z } from 'zod';

import { CartLine } from './cart-line';
import { Fulfillment, PaymentMethod } from './enums';
import { IsoDateTime, PhPhone, Uuid } from './primitives';

/**
 * What the storefront sends to quote_order and place_order. It carries choices only, never
 * prices: the database recomputes every amount. Strict at every level, so extra fields fail.
 */
export const OrderPayload = z
  .strictObject({
    /** Generated once per checkout; a retry with the same key returns the same order. */
    clientKey: Uuid,
    fulfillment: Fulfillment,
    customer: z.strictObject({
      name: z.string().trim().min(1).max(80),
      phone: PhPhone,
      email: z.email().nullable(),
    }),
    lines: z.array(CartLine).min(1).max(50),
    paymentMethod: PaymentMethod,
    /** Pickup only: null means as soon as possible. */
    pickupAt: IsoDateTime.nullable(),
    /** Delivery only. */
    delivery: z
      .strictObject({
        addressLine: z.string().trim().min(1).max(200),
        landmark: z.string().max(200).nullable(),
        /** Null when the shop confirms the fee on Messenger. */
        deliveryZoneId: Uuid.nullable(),
      })
      .nullable(),
    notes: z.string().max(500).nullable(),
    /** Members only: apply the stamp card reward if it is ready. */
    useReward: z.boolean(),
    /** The privacy consent line at checkout must be ticked. */
    privacyConsent: z.literal(true),
  })
  .superRefine((payload, ctx) => {
    if (payload.fulfillment === 'delivery' && payload.delivery === null) {
      ctx.addIssue({ code: 'custom', path: ['delivery'], message: 'Delivery needs an address.' });
    }
    if (payload.fulfillment !== 'delivery' && payload.delivery !== null) {
      ctx.addIssue({ code: 'custom', path: ['delivery'], message: 'Only delivery orders have an address.' });
    }
    if (payload.fulfillment !== 'pickup' && payload.pickupAt !== null) {
      ctx.addIssue({ code: 'custom', path: ['pickupAt'], message: 'Only pickup orders have a pickup time.' });
    }
    if (payload.paymentMethod === 'cod' && payload.fulfillment !== 'delivery') {
      ctx.addIssue({ code: 'custom', path: ['paymentMethod'], message: 'Cash on delivery is for delivery orders.' });
    }
  });
export type OrderPayload = z.infer<typeof OrderPayload>;
