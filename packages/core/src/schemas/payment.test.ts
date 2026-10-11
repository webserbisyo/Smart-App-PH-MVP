import { describe, expect, it } from 'vitest';

import { payment } from '../test/samples';

import { Payment } from './payment';

describe('payment', () => {
  it('a valid Payment parses', () => {
    expect(Payment.parse(payment)).toEqual(payment);
  });
});
