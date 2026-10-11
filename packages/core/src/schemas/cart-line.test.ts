import { describe, expect, it } from 'vitest';

import { cartLine } from '../test/samples';

import { CartLine } from './cart-line';

describe('cart-line', () => {
  it('a valid CartLine parses', () => {
    expect(CartLine.parse(cartLine)).toEqual(cartLine);
  });
  it('rejects a price field (strict)', () => {
    expect(CartLine.safeParse({ ...cartLine, unitPrice: 15000 }).success).toBe(false);
  });
  it('rejects a zero quantity', () => {
    expect(CartLine.safeParse({ ...cartLine, qty: 0 }).success).toBe(false);
  });
});
