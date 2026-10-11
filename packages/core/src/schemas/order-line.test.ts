import { describe, expect, it } from 'vitest';

import { orderLine } from '../test/samples';

import { OrderLine } from './order-line';

describe('order-line', () => {
  it('a valid OrderLine parses', () => {
    expect(OrderLine.parse(orderLine)).toEqual(orderLine);
  });
  it('rejects a line total that does not add up', () => {
    expect(OrderLine.safeParse({ ...orderLine, lineTotal: 30000 }).success).toBe(false);
  });
});
