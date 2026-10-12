import { describe, expect, it } from 'vitest';

import { cartStorageKey, parseCart } from './cart-store';

const line = {
  itemId: '3e9c6f4b-5d7a-4c8e-8f1a-2b3c4d5e6f7a',
  variantId: '4fad7a5c-6e8b-4d9f-9a2b-3c4d5e6f7a8b',
  optionIds: [],
  qty: 2,
  note: null,
};

describe('cart store', () => {
  it('keeps one cart per shop', () => {
    expect(cartStorageKey('juans-cafe')).toBe('smartapp.cart.juans-cafe');
  });

  it('reads saved lines', () => {
    expect(parseCart(JSON.stringify([line]))).toEqual([line]);
  });

  it('treats missing, broken or wrong data as an empty cart', () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart('{not json')).toEqual([]);
    expect(parseCart(JSON.stringify([{ ...line, qty: 0 }]))).toEqual([]);
    expect(parseCart(JSON.stringify([{ ...line, price: 100 }]))).toEqual([]);
  });
});
