import { z } from 'zod';

import { CartLine } from './cart-line';
import { Fulfillment, PaymentMethod } from './enums';
import { Pin } from './pin';
import { IsoDateTime, PhPhone, Uuid } from './primitives';

/** The customer's choices: what quote_order prices and place_order places. Never prices. */
const choices = {
  fulfillment: Fulfillment,
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
      pin: Pin.nullable().optional(),
    })
    .nullable(),
  /** Members only: apply the stamp card reward if it is ready. */
  useReward: z.boolean(),
};


type Choices = z.infer<z.ZodObject<typeof choices>>;

function checkChoices(payload: Choices, ctx: z.RefinementCtx): void {
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
}

/**
 * What the checkout sends to quote_order: the choices only, so totals show before the customer fills in the form.
 * Strict at every level, so extra fields fail.
 */
export const QuotePayload = z.strictObject(choices).superRefine(checkChoices);
export type QuotePayload = z.infer<typeof QuotePayload>;

/**
 * What the storefront sends to place_order: the choices plus who orders. It carries choices only, never prices: the
 * database recomputes every amount. Strict at every level, so extra fields fail.
 */
export const OrderPayload = z
  .strictObject({
    /** Generated once per checkout; a retry with the same key returns the same order. */
    clientKey: Uuid,
    ...choices,
    customer: z.strictObject({
      name: z.string().trim().min(1).max(80),
      phone: PhPhone,
      email: z.email().nullable(),
    }),
    notes: z.string().max(500).nullable(),
    /** The privacy consent line at checkout must be ticked. */
    privacyConsent: z.literal(true),
  })
  .superRefine(checkChoices);
export type OrderPayload = z.infer<typeof OrderPayload>;
