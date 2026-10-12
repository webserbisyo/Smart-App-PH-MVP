import { describe, expect, it } from 'vitest';

import { orderEvent } from '../test/samples';

import { OrderEvent } from './order-event';

describe('order-event', () => {
  it('a valid OrderEvent parses', () => {
    expect(OrderEvent.parse(orderEvent)).toEqual(orderEvent);
  });
  it('a payment step has no status', () => {
    const payment = { ...orderEvent, kind: 'payment_submitted', fromStatus: null, toStatus: null, actor: 'customer' };
    expect(OrderEvent.safeParse(payment).success).toBe(true);
    expect(OrderEvent.safeParse({ ...payment, toStatus: 'preparing' }).success).toBe(false);
  });
  it('a status step names the new status', () => {
    expect(OrderEvent.safeParse({ ...orderEvent, toStatus: null }).success).toBe(false);
  });
  it('only the closed actor list', () => {
    expect(OrderEvent.safeParse({ ...orderEvent, actor: 'cashier' }).success).toBe(false);
  });
});
