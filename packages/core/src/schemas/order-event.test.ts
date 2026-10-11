import { describe, expect, it } from 'vitest';

import { orderEvent } from '../test/samples';

import { OrderEvent } from './order-event';

describe('order-event', () => {
  it('a valid OrderEvent parses', () => {
    expect(OrderEvent.parse(orderEvent)).toEqual(orderEvent);
  });
});
