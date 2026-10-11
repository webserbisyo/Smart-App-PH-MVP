import { describe, expect, it } from 'vitest';

import { paymentAccount } from '../test/samples';

import { PaymentAccount } from './payment-account';

describe('payment-account', () => {
  it('a valid PaymentAccount parses', () => {
    expect(PaymentAccount.parse(paymentAccount)).toEqual(paymentAccount);
  });
  it('only takes transfer methods', () => {
    expect(PaymentAccount.safeParse({ ...paymentAccount, method: 'cash' }).success).toBe(false);
  });
});
