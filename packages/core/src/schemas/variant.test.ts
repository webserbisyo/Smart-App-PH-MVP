import { describe, expect, it } from 'vitest';

import { variant } from '../test/samples';

import { Variant } from './variant';

describe('variant', () => {
  it('a valid Variant parses', () => {
    expect(Variant.parse(variant)).toEqual(variant);
  });
  it('rejects a decimal or negative price', () => {
    expect(Variant.safeParse({ ...variant, price: 150.5 }).success).toBe(false);
    expect(Variant.safeParse({ ...variant, price: -100 }).success).toBe(false);
  });
});
