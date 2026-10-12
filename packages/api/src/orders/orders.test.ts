import { describe, expect, it } from 'vitest';

import { OrderReceipt, Quote } from '@smartapp/core';
import type { OrderPayload } from '@smartapp/core';

import { ApiError, toApiError } from '../errors';

import { QUOTE, RECEIPT } from './fixtures';
import { addMyOrder, MY_ORDERS_MAX, parseMyOrders } from './my-orders';
import { createOrderPlacer, orderPayloadToJson, quotePayloadToJson } from './orders';
import type { OrderInput, PlacedOrder } from './orders';

const line = {
  itemId: '4a0c5a4e-4c55-4b8e-9d1c-6f8e1b2a3c4d',
  variantId: '5b1d6b5f-5d66-4c9f-8e2d-7a9f2c3b4d5e',
  optionIds: ['6c2e7c60-6e77-4da0-9f3e-8bae3d4c5e6f'],
  qty: 2,
  note: 'less ice',
};

const input: OrderInput = {
  fulfillment: 'delivery',
  customer: { name: 'Maria Santos', phone: '+639171234567', email: null },
  lines: [line],
  paymentMethod: 'gcash',
  pickupAt: null,
  delivery: { addressLine: '34 Mabini St.', landmark: 'Near the chapel', deliveryZoneId: null },
  notes: 'Call when outside',
  useReward: false,
  privacyConsent: true,
};

const placed: PlacedOrder = { orderId: '7d3f8d71-7f88-4eb1-a04f-9cbf4e5d6f70', orderNo: 1, token: 'pvMJIPoFaPcsBDVxhwb7gA' };

describe('payload builders', () => {
  it('send the choices field by field and drop anything else, such as a price', () => {
    const withPrice = { ...line, unitPrice: 1 };
    expect(quotePayloadToJson({ ...input, lines: [withPrice] })).toEqual({
      fulfillment: 'delivery',
      lines: [line],
      paymentMethod: 'gcash',
      pickupAt: null,
      delivery: { addressLine: '34 Mabini St.', landmark: 'Near the chapel', deliveryZoneId: null },
      useReward: false,
    });
  });

  it('add the clientKey, customer, notes and consent when placing', () => {
    const payload: OrderPayload = { ...input, clientKey: '8e4a9e82-8a99-4fc2-b15a-adc05f6e7a81' };
    const json = orderPayloadToJson(payload);
    expect(json).toMatchObject({
      clientKey: payload.clientKey,
      customer: payload.customer,
      notes: 'Call when outside',
      privacyConsent: true,
      lines: [line],
    });
    expect(Object.keys(typeof json === 'object' && json !== null ? json : {}).sort()).toEqual(
      ['clientKey', 'customer', 'delivery', 'fulfillment', 'lines', 'notes', 'paymentMethod', 'pickupAt', 'privacyConsent', 'useReward'],
    );
  });
});

describe('createOrderPlacer', () => {
  function fakePlace(failures: number) {
    const keys: string[] = [];
    let left = failures;
    const place = (_slug: string, payload: OrderPayload): Promise<PlacedOrder> => {
      keys.push(payload.clientKey);
      if (left > 0) {
        left -= 1;
        return Promise.reject(new ApiError('network'));
      }
      return Promise.resolve(placed);
    };
    let n = 0;
    const newKey = () => {
      n += 1;
      return `key-${String(n)}`;
    };
    return { keys, placeOrder: createOrderPlacer(place, newKey) };
  }

  it('retries a failed checkout with the same clientKey', async () => {
    const { keys, placeOrder } = fakePlace(2);
    await expect(placeOrder('juans-cafe', input)).rejects.toThrow(ApiError);
    await expect(placeOrder('juans-cafe', input)).rejects.toThrow(ApiError);
    await expect(placeOrder('juans-cafe', input)).resolves.toEqual(placed);
    expect(keys).toEqual(['key-1', 'key-1', 'key-1']);
  });

  it('starts a new clientKey only after a success', async () => {
    const { keys, placeOrder } = fakePlace(0);
    await placeOrder('juans-cafe', input);
    await placeOrder('juans-cafe', input);
    expect(keys).toEqual(['key-1', 'key-2']);
  });
});

describe('error mapping', () => {
  it('reads the order codes and keeps the detail', () => {
    const error = toApiError({ code: 'P0001', message: 'out_of_stock', details: '5b1d6b5f-5d66-4c9f-8e2d-7a9f2c3b4d5e', hint: null });
    expect(error.code).toBe('out_of_stock');
    expect(error.detail).toBe('5b1d6b5f-5d66-4c9f-8e2d-7a9f2c3b4d5e');
    for (const code of ['shop_closed', 'shop_busy', 'duplicate_reference', 'too_many_proofs', 'not_found', 'pickup_time_invalid']) {
      expect(toApiError({ code: 'P0001', message: code, details: null }).code).toBe(code);
    }
  });
});

describe('recorded results', () => {
  it('parse with the core schemas', () => {
    const receipt = OrderReceipt.parse(RECEIPT);
    expect(receipt.order.paymentStatus).toBe('pending');
    expect(receipt.events.map((event) => event.kind)).toEqual(['status', 'payment_submitted']);
    expect(receipt.payments[0]?.referenceNorm).toBeNull();

    const quote = Quote.parse(QUOTE);
    expect(quote.problems).toEqual([{ lineIndex: 1, code: 'out_of_stock', variantId: quote.problems[0]?.variantId }]);
    expect(quote.total).toBe(quote.lines.reduce((sum, priced) => sum + priced.lineTotal, 0));
  });
});

describe('my orders', () => {
  it('keeps the newest 20 tokens, each once', () => {
    let tokens: string[] = [];
    for (let n = 0; n < 25; n += 1) tokens = addMyOrder(tokens, `token-${String(n)}`);
    expect(tokens).toHaveLength(MY_ORDERS_MAX);
    expect(tokens[0]).toBe('token-24');
    expect(addMyOrder(tokens, 'token-10')[0]).toBe('token-10');
    expect(addMyOrder(tokens, 'token-10')).toHaveLength(MY_ORDERS_MAX);
  });

  it('reads anything broken as empty', () => {
    expect(parseMyOrders('not json')).toEqual([]);
    expect(parseMyOrders('{"a":1}')).toEqual([]);
    expect(parseMyOrders('["abc", 3, ""]')).toEqual(['abc']);
  });
});
