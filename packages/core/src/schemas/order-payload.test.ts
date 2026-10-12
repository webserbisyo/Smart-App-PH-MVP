import { describe, expect, it } from 'vitest';

import { cartLine, orderPayload, quotePayload } from '../test/samples';

import { OrderPayload, QuotePayload } from './order-payload';

describe('order-payload', () => {
  it('a valid OrderPayload parses', () => {
    expect(OrderPayload.parse(orderPayload)).toEqual(orderPayload);
  });
  it('rejects a price field at the top level (strict)', () => {
    expect(OrderPayload.safeParse({ ...orderPayload, total: 36000 }).success).toBe(false);
  });
  it('rejects a price field inside a line (strict)', () => {
    const lines = [{ ...cartLine, unitPrice: 15000 }];
    expect(OrderPayload.safeParse({ ...orderPayload, lines }).success).toBe(false);
  });
  it('rejects a phone in 09 format', () => {
    const customer = { ...orderPayload.customer, phone: '09171234567' };
    expect(OrderPayload.safeParse({ ...orderPayload, customer }).success).toBe(false);
  });
  it('needs the privacy consent', () => {
    expect(OrderPayload.safeParse({ ...orderPayload, privacyConsent: false }).success).toBe(false);
  });
  it('needs an address for delivery', () => {
    expect(OrderPayload.safeParse({ ...orderPayload, fulfillment: 'delivery', pickupAt: null }).success).toBe(false);
    const delivery = { addressLine: '34 Mabini St.', landmark: null, deliveryZoneId: null };
    const ok = { ...orderPayload, fulfillment: 'delivery', pickupAt: null, paymentMethod: 'cod', delivery };
    expect(OrderPayload.safeParse(ok).success).toBe(true);
  });
  it('allows cash on delivery only for delivery', () => {
    expect(OrderPayload.safeParse({ ...orderPayload, paymentMethod: 'cod' }).success).toBe(false);
  });
  it('needs at least one line', () => {
    expect(OrderPayload.safeParse({ ...orderPayload, lines: [] }).success).toBe(false);
  });
});

describe('quote-payload', () => {
  const quote = quotePayload;
  it('a quote needs only the choices', () => {
    expect(QuotePayload.parse(quote)).toEqual(quote);
  });
  it('rejects a price field (strict)', () => {
    expect(QuotePayload.safeParse({ ...quote, total: 1 }).success).toBe(false);
  });
  it('keeps the fulfillment rules', () => {
    expect(QuotePayload.safeParse({ ...quote, paymentMethod: 'cod' }).success).toBe(false);
  });
});
