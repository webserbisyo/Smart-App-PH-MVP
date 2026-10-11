import { describe, expect, it } from 'vitest';

import { deliveryZone } from '../test/samples';

import { DeliveryZone } from './delivery-zone';

describe('delivery-zone', () => {
  it('a valid DeliveryZone parses', () => {
    expect(DeliveryZone.parse(deliveryZone)).toEqual(deliveryZone);
  });
  it('rejects a fee in pesos with decimals', () => {
    expect(DeliveryZone.safeParse({ ...deliveryZone, fee: 60.5 }).success).toBe(false);
  });
});
