import { describe, expect, it } from 'vitest';

import { getShopStub } from './stubs';

describe('getShopStub', () => {
  it('knows the two stub shops', () => {
    expect(getShopStub('juans-cafe')?.businessType).toBe('food');
    expect(getShopStub('tala-apparel')?.businessType).toBe('retail');
  });

  it('returns null for any other slug', () => {
    expect(getShopStub('nope')).toBeNull();
  });
});
