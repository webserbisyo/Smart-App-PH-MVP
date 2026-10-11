import { describe, expect, it } from 'vitest';

import { customer } from '../test/samples';

import { Customer } from './customer';

describe('customer', () => {
  it('a valid Customer parses', () => {
    expect(Customer.parse(customer)).toEqual(customer);
  });
  it('rejects a phone in 09 format', () => {
    expect(Customer.safeParse({ ...customer, phone: '09171234567' }).success).toBe(false);
  });
});
