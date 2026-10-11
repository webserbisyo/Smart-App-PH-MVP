import { describe, expect, it } from 'vitest';

import { loyaltyEntry } from '../test/samples';

import { LoyaltyEntry } from './loyalty-entry';

describe('loyalty-entry', () => {
  it('a valid LoyaltyEntry parses', () => {
    expect(LoyaltyEntry.parse(loyaltyEntry)).toEqual(loyaltyEntry);
  });
  it('rejects a zero delta', () => {
    expect(LoyaltyEntry.safeParse({ ...loyaltyEntry, delta: 0 }).success).toBe(false);
  });
});
