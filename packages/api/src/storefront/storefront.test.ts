import { describe, expect, it } from 'vitest';

import { ApiError } from '../errors';

import { JUANS_CAFE, TALA_APPAREL } from './fixtures';
import { storefrontFromJson } from './storefront';

function keysOf(value: unknown, key: string): string[] {
  const inner: unknown = typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;
  return typeof inner === 'object' && inner !== null ? Object.keys(inner) : [];
}

describe('storefrontFromJson', () => {
  it('parses the recorded demo shops with the core schema', () => {
    const cafe = storefrontFromJson(JUANS_CAFE);
    expect(cafe.shop.slug).toBe('juans-cafe');
    expect(cafe.shop.businessType).toBe('food');
    expect(cafe.categories.map((category) => category.name)).toEqual(['Coffee', 'Milk tea', 'Pastries', 'Rice meals']);
    expect(cafe.items.find((item) => item.name === 'Iced Latte')?.variants.map((variant) => variant.price)).toEqual([12_000, 15_000]);
    expect(cafe.deliveryZones.map((zone) => zone.name)).toEqual(['Poblacion', 'Barangay San Roque']);

    const tala = storefrontFromJson(TALA_APPAREL);
    expect(tala.shop.businessType).toBe('retail');
    expect(tala.hours.map((day) => day.weekday)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(tala.paymentAccounts.map((account) => account.method)).toEqual(['bank', 'gcash']);
  });

  it('never carries billing fields (checked on the raw result, before parsing drops anything)', () => {
    const keys = keysOf(JUANS_CAFE, 'shop');
    expect(keys).toContain('slug');
    expect(keys).not.toContain('plan');
    expect(keys).not.toContain('paidUntil');
    expect(keys).not.toContain('status');
  });

  it('fails loudly on a shape it does not know', () => {
    expect(() => storefrontFromJson({ shop: null })).toThrow(ApiError);
  });
});
