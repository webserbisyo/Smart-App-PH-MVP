import { describe, expect, it } from 'vitest';

import { OrderPayload, QuotePayload } from '@smartapp/core';

import { checkoutSchema, toOrderInput, toQuotePayload } from './checkout-form';
import type { CheckoutValues } from './checkout-form';
import { parseRemembered } from './remember-me';

const line = { itemId: '113602d8-4565-4668-bc54-bbc00692f3ae', variantId: 'daa25cba-fd73-4c82-a5fb-b4911a1b9505', optionIds: [], qty: 2, note: null };
const zone = '6f0c3c9e-8a51-4c43-9f8e-2a7d5b0e1c11';

const values: CheckoutValues = {
  fulfillment: 'walk_in',
  pickupAt: '',
  addressLine: '',
  landmark: '',
  deliveryZoneId: '',
  name: ' Maria Santos ',
  phone: '+639171234567',
  email: '',
  remember: true,
  paymentMethod: 'cash',
  privacy: true,
};
const rules = { zoneRequired: true };

describe('checkout form', () => {
  it('asks for what is missing in the customer words', () => {
    const result = checkoutSchema(rules).safeParse({ ...values, name: ' ', phone: null, privacy: false, fulfillment: 'delivery', paymentMethod: null });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    expect(messages).toEqual([
      'name: Add your name.',
      'phone: Use a mobile number like 0917 123 4567.',
      'paymentMethod: Choose how you pay.',
      'privacy: Tick this to place your order.',
      'addressLine: Add your address.',
      'deliveryZoneId: Choose your delivery area.',
    ]);
  });

  it('builds a quote that never re-prices on typing and waits for a required area', () => {
    const delivery = { ...values, fulfillment: 'delivery' as const, addressLine: '12 Rizal St.' };
    expect(toQuotePayload(delivery, [line], rules)).toBeNull();
    const quote = toQuotePayload({ ...delivery, deliveryZoneId: zone }, [line], rules);
    expect(QuotePayload.safeParse(quote).success).toBe(true);
    expect(quote?.delivery).toEqual({ addressLine: '-', landmark: null, deliveryZoneId: zone });
    expect(toQuotePayload({ ...delivery, deliveryZoneId: '' }, [line], { zoneRequired: false })?.delivery?.deliveryZoneId).toBeNull();
    expect(toQuotePayload({ ...values, paymentMethod: null }, [line], rules)).toBeNull();
  });

  it('sends a pickup time only for pickup', () => {
    const at = '2026-10-12T16:00:00+08:00';
    expect(toQuotePayload({ ...values, pickupAt: at }, [line], rules)?.pickupAt).toBeNull();
    expect(toQuotePayload({ ...values, fulfillment: 'pickup', pickupAt: at }, [line], rules)?.pickupAt).toBe(at);
    expect(toQuotePayload({ ...values, fulfillment: 'pickup' }, [line], rules)?.pickupAt).toBeNull();
  });

  it('places with the real address, trimmed details and the consent', () => {
    const input = toOrderInput(
      { ...values, fulfillment: 'delivery', addressLine: ' 12 Rizal St. ', landmark: ' ', deliveryZoneId: zone, paymentMethod: 'gcash', email: ' maria@gmail.com ' },
      [line],
      rules,
    );
    expect(OrderPayload.safeParse({ ...input, clientKey: '0d6e4f7a-3b2c-4d1e-9f8a-7b6c5d4e3f2a' }).success).toBe(true);
    expect(input?.delivery).toEqual({ addressLine: '12 Rizal St.', landmark: null, deliveryZoneId: zone });
    expect(input?.customer).toEqual({ name: 'Maria Santos', phone: '+639171234567', email: 'maria@gmail.com' });
    expect(toOrderInput({ ...values, privacy: false }, [line], rules)).toBeNull();
  });

  it('reads remembered details only when they are whole', () => {
    expect(parseRemembered(JSON.stringify({ name: 'Maria', phone: '+639171234567', email: '' }))).toEqual({ name: 'Maria', phone: '+639171234567', email: '' });
    expect(parseRemembered(JSON.stringify({ name: 'Maria', phone: '0917' }))).toBeNull();
    expect(parseRemembered('{oops')).toBeNull();
    expect(parseRemembered(null)).toBeNull();
  });
});
