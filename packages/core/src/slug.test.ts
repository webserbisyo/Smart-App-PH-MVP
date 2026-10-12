import { describe, expect, it } from 'vitest';

import { shopUrl, slugFromName } from './slug';

describe('slugFromName', () => {
  it.each([
    ["Juan's Café", 'juans-cafe'],
    ['Tala Apparel', 'tala-apparel'],
    ['  Ñanay  Bakery!! ', 'nanay-bakery'],
    ['Milk & Tea 24/7', 'milk-tea-24-7'],
    ['', ''],
  ])('%s → %s', (name, slug) => {
    expect(slugFromName(name)).toBe(slug);
  });

  it('cuts to 40 characters without a trailing hyphen', () => {
    const slug = slugFromName(`${'a'.repeat(39)} b`);
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('shopUrl', () => {
  it('is the storefront origin plus the slug', () => {
    expect(shopUrl('juans-cafe')).toBe('https://shop.webserbisyo.com/juans-cafe');
  });
});
