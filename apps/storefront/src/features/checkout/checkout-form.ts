import { z } from 'zod';

import type { OrderInput } from '@smartapp/api';
import { Fulfillment, PaymentMethod, Pin, WORDS } from '@smartapp/core';
import type { CartLine, QuotePayload } from '@smartapp/core';

// The checkout form (P4.4): what the customer fills in, checked with the words they read, and turned into the
// quote_order and place_order payloads. The database checks everything again.

const words = WORDS.storefront.checkout;

/** The quote only prices, so it carries a stand-in address: typing the real one does not re-price on every key. */
const QUOTE_ADDRESS = '-';

const Email = z.email();

export interface CheckoutRules {
  /** The shop has delivery areas and does not confirm the fee on Messenger, so an area must be picked. */
  zoneRequired: boolean;
}

export function checkoutSchema(rules: CheckoutRules) {
  return z
    .object({
      fulfillment: Fulfillment,
      /** `''` is as soon as possible. */
      pickupAt: z.string(),
      addressLine: z.string().max(200),
      landmark: z.string().max(200),
      /** `''` is no area (fee confirmed on Messenger). */
      deliveryZoneId: z.string(),
      pin: Pin.nullable().optional(),
      name: z.string().trim().min(1, words.required.name).max(80),
      /** `+639…`, or null while it is not a mobile number. */
      phone: z.string().nullable(),
      email: z.string().max(254),
      remember: z.boolean(),
      paymentMethod: PaymentMethod.nullable(),
      privacy: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.phone === null) ctx.addIssue({ code: 'custom', path: ['phone'], message: WORDS.shared.phoneInvalid });
      if (values.email.trim() !== '' && !Email.safeParse(values.email.trim()).success) {
        ctx.addIssue({ code: 'custom', path: ['email'], message: words.emailInvalid });
      }
      if (values.paymentMethod === null) ctx.addIssue({ code: 'custom', path: ['paymentMethod'], message: words.required.method });
      if (!values.privacy) ctx.addIssue({ code: 'custom', path: ['privacy'], message: words.required.privacy });
      if (values.fulfillment === 'delivery') {
        if (values.addressLine.trim() === '') ctx.addIssue({ code: 'custom', path: ['addressLine'], message: words.required.address });
        if (rules.zoneRequired && values.deliveryZoneId === '') {
          ctx.addIssue({ code: 'custom', path: ['deliveryZoneId'], message: WORDS.errors.zone_required });
        }
      }
    });
}

export type CheckoutValues = z.infer<ReturnType<typeof checkoutSchema>>;

/** The fields that change the price or what the shop accepts; the quote re-runs when one changes. */
export type QuoteChoices = Pick<CheckoutValues, 'fulfillment' | 'pickupAt' | 'deliveryZoneId' | 'paymentMethod'>;

/**
 * What quote_order prices: the type, lines, method, pickup time, area and the member's reward switch. Null until a
 * method (and, when the shop needs one, a delivery area) is picked, so the quote never asks for something the
 * customer has not chosen yet.
 */
export function toQuotePayload(values: QuoteChoices, lines: readonly CartLine[], rules: CheckoutRules, useReward = false): QuotePayload | null {
  if (values.paymentMethod === null || lines.length === 0) return null;
  if (values.fulfillment === 'delivery' && rules.zoneRequired && values.deliveryZoneId === '') return null;
  return {
    fulfillment: values.fulfillment,
    lines: [...lines],
    paymentMethod: values.paymentMethod,
    pickupAt: values.fulfillment === 'pickup' && values.pickupAt !== '' ? values.pickupAt : null,
    delivery:
      values.fulfillment === 'delivery'
        ? { addressLine: QUOTE_ADDRESS, landmark: null, deliveryZoneId: values.deliveryZoneId === '' ? null : values.deliveryZoneId }
        : null,
    useReward,
  };
}

/** What place_order gets (the hook adds the clientKey). Null when the form is not complete. */
export function toOrderInput(values: CheckoutValues, lines: readonly CartLine[], rules: CheckoutRules, useReward = false): OrderInput | null {
  const quote = toQuotePayload(values, lines, rules, useReward);
  if (quote === null || values.phone === null || !values.privacy) return null;
  const landmark = values.landmark.trim();
  const email = values.email.trim();
  return {
    ...quote,
    delivery:
      quote.delivery === null
        ? null
        : {
            addressLine: values.addressLine.trim(),
            landmark: landmark === '' ? null : landmark,
            deliveryZoneId: quote.delivery.deliveryZoneId,
            pin: values.pin ?? null,
          },
    customer: { name: values.name.trim(), phone: values.phone, email: email === '' ? null : email },
    notes: null,
    privacyConsent: true,
  };
}
