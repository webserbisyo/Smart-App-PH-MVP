import { describe, expect, it } from 'vitest';

import { customer } from '../test/samples';

import { CustomerRow } from './customer-row';

describe('customer row', () => {
  it('a customer with a stamp balance parses', () => {
    expect(CustomerRow.parse({ ...customer, stamps: 4 })).toEqual({ ...customer, stamps: 4 });
  });
  it('rejects a negative balance', () => {
    expect(CustomerRow.safeParse({ ...customer, stamps: -1 }).success).toBe(false);
  });
});
