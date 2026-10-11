import { describe, expect, it } from 'vitest';

import { order } from '../test/samples';

import { Order } from './order';

describe('order', () => {
  it('a valid Order parses', () => {
    expect(Order.parse(order)).toEqual(order);
  });
  it('rejects a total that does not add up', () => {
    expect(Order.safeParse({ ...order, total: 35000 }).success).toBe(false);
  });
  it('rejects money with decimals', () => {
    expect(Order.safeParse({ ...order, subtotal: 360.5, total: 360.5 }).success).toBe(false);
  });
});
