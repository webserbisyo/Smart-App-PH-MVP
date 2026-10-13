import { describe, expect, it } from 'vitest';

import type { CatalogItem, Category, Variant } from '@smartapp/core';

import { countByCategory, groupByCategory, isLowStock, isSoldOut, priceRange, stockSummary } from './catalog';

const TENANT = '00000000-0000-4000-8000-000000000001';
const COFFEE = '00000000-0000-4000-8000-0000000000c1';
const PASTRY = '00000000-0000-4000-8000-0000000000c2';

function variant(price: number, stockOnHand: number | null = null, lowStockAt: number | null = null, isSoldOut = false): Variant {
  return { id: crypto.randomUUID(), tenantId: TENANT, itemId: TENANT, name: 'Regular', price, stockOnHand, lowStockAt, isSoldOut, sort: 0, archivedAt: null };
}

function item(name: string, categoryId: string | null, variants: Variant[], extra: Partial<CatalogItem> = {}): CatalogItem {
  return { id: crypto.randomUUID(), tenantId: TENANT, categoryId, name, description: null, status: 'active', isFeatured: false, trackStock: false, sort: 0, photos: [], variants, optionGroupIds: [], ...extra };
}

function category(id: string, name: string): Category {
  return { id, tenantId: TENANT, name, sort: 0, isHidden: false, icon: null };
}

describe('priceRange and isSoldOut', () => {
  it('spans the variants', () => {
    expect(priceRange(item('Latte', null, [variant(12_000), variant(15_000)]))).toEqual({ min: 12_000, max: 15_000 });
    expect(priceRange(item('Empty', null, []))).toBeNull();
    expect(isSoldOut(item('Latte', null, [variant(1, null, null, true), variant(2, null, null, false)]))).toBe(false);
    expect(isSoldOut(item('Latte', null, [variant(1, null, null, true)]))).toBe(true);
  });
});

describe('stockSummary', () => {
  it('adds up stock and flags low at or below the number', () => {
    expect(stockSummary(item('Tee', null, [variant(1, 3)]))).toBeNull();
    expect(stockSummary(item('Tee', null, [variant(1, 3, 3), variant(1, 10, 3)], { trackStock: true }))).toEqual({ left: 13, low: true });
    expect(stockSummary(item('Tee', null, [variant(1, 4, 3)], { trackStock: true }))).toEqual({ left: 4, low: false });
    expect(stockSummary(item('Tee', null, [variant(1, 0)], { trackStock: true }))).toEqual({ left: 0, low: true });
  });
});

describe('isLowStock', () => {
  it('needs stock counting, an active item and a variant at or below its low-stock number', () => {
    expect(isLowStock(item('Tee', null, [variant(1, 3, 3), variant(1, 10, 3)], { trackStock: true }))).toBe(true);
    expect(isLowStock(item('Tee', null, [variant(1, 4, 3)], { trackStock: true }))).toBe(false);
    expect(isLowStock(item('Tee', null, [variant(1, 0, null)], { trackStock: true }))).toBe(false);
    expect(isLowStock(item('Tee', null, [variant(1, 1, 3)]))).toBe(false);
    expect(isLowStock(item('Tee', null, [variant(1, 1, 3)], { trackStock: true, status: 'archived' }))).toBe(false);
  });
});

describe('groupByCategory', () => {
  const categories = [category(COFFEE, 'Coffee'), category(PASTRY, 'Pastries')];
  const items = [
    item('Old Brew', COFFEE, [variant(1)], { status: 'archived' }),
    item('Iced Latte', COFFEE, [variant(1)]),
    item('Water', null, [variant(1)]),
  ];

  it('follows the category order, archived last, no empty groups, no category at the end', () => {
    expect(groupByCategory(items, categories, '').map((group) => [group.category?.name ?? null, group.items.map((entry) => entry.name)])).toEqual([
      ['Coffee', ['Iced Latte', 'Old Brew']],
      [null, ['Water']],
    ]);
  });

  it('filters by name', () => {
    expect(groupByCategory(items, categories, ' latte ').map((group) => group.items.map((entry) => entry.name))).toEqual([['Iced Latte']]);
    expect(groupByCategory(items, categories, 'zzz')).toEqual([]);
  });

  it('counts what is not archived', () => {
    expect(countByCategory(items).get(COFFEE)).toBe(1);
  });
});
