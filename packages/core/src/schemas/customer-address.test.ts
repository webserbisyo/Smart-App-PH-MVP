import { describe, expect, it } from 'vitest';

import { customerAddress } from '../test/samples';

import { CustomerAddress } from './customer-address';

describe('customer-address', () => {
  it('a valid CustomerAddress parses', () => {
    expect(CustomerAddress.parse(customerAddress)).toEqual(customerAddress);
  });
});
