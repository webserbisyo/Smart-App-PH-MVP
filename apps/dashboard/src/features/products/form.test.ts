import { describe, expect, it } from 'vitest';

import type { CatalogItem, OptionGroup } from '@smartapp/core';

import { emptyGroup, emptyOption, emptyProduct, emptyVariant, groupDrafts, itemDraft, parseCount, ProductForm, productFromItem, stockChanges } from './form';

const TENANT = '00000000-0000-4000-8000-000000000001';
const ITEM = '00000000-0000-4000-8000-000000000002';
const GROUP = '00000000-0000-4000-8000-000000000003';
const REGULAR = '00000000-0000-4000-8000-000000000004';
const LARGE = '00000000-0000-4000-8000-000000000005';

function issues(form: ProductForm): string[] {
  const result = ProductForm.safeParse(form);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

const latte: CatalogItem = {
  id: ITEM,
  tenantId: TENANT,
  categoryId: null,
  name: 'Iced Latte',
  description: null,
  status: 'active',
  isFeatured: false,
  trackStock: true,
  sort: 0,
  photos: [{ id: '00000000-0000-4000-8000-000000000006', tenantId: TENANT, itemId: ITEM, path: `${TENANT}/items/a.webp`, sort: 0 }],
  variants: [
    { id: REGULAR, tenantId: TENANT, itemId: ITEM, name: 'Regular', price: 12_000, stockOnHand: 3, lowStockAt: 2, isSoldOut: false, sort: 0, archivedAt: null },
    { id: LARGE, tenantId: TENANT, itemId: ITEM, name: 'Large', price: 15_000, stockOnHand: 5, lowStockAt: 2, isSoldOut: false, sort: 1, archivedAt: null },
  ],
  optionGroupIds: [GROUP],
};

const sugar: OptionGroup = {
  id: GROUP,
  tenantId: TENANT,
  name: 'Sugar',
  minSelect: 1,
  maxSelect: 1,
  options: [{ id: '00000000-0000-4000-8000-000000000007', tenantId: TENANT, groupId: GROUP, name: 'Less', priceDelta: 0, isSoldOut: false }],
};

describe('ProductForm', () => {
  it('needs a name and a price; one price row needs no name', () => {
    expect(issues(emptyProduct(null))).toEqual(['name', 'variants.0.price']);
    expect(issues({ ...emptyProduct(null), name: 'Iced Latte', variants: [{ ...emptyVariant(), price: 12_000 }] })).toEqual([]);
  });

  it('needs a name on every row once there are two', () => {
    const form = { ...emptyProduct(null), name: 'Iced Latte', variants: [{ ...emptyVariant(), price: 12_000 }, { ...emptyVariant(), name: 'Large', price: 15_000 }] };
    expect(issues(form)).toEqual(['variants.0.name']);
  });

  it('needs stock counts only while tracking stock', () => {
    const form = { ...emptyProduct(null), name: 'Tee', variants: [{ ...emptyVariant(), price: 45_000 }] };
    expect(issues({ ...form, trackStock: true })).toEqual(['variants.0.stock']);
    expect(issues({ ...form, trackStock: false })).toEqual([]);
  });

  it('limits add-on choices to the number of options', () => {
    const base = { ...emptyProduct(null), name: 'Iced Latte', variants: [{ ...emptyVariant(), price: 12_000 }] };
    const group = { ...emptyGroup(), name: 'Sugar', options: [{ ...emptyOption(), name: 'Less' }] };
    expect(issues({ ...base, groups: [{ ...group, maxSelect: 2 }] })).toEqual(['groups.0.maxSelect']);
    expect(issues({ ...base, groups: [{ ...group, maxSelect: 0 }] })).toEqual(['groups.0.maxSelect']);
    expect(issues({ ...base, groups: [{ ...group, maxSelect: 1 }] })).toEqual([]);
    expect(issues({ ...base, groups: [{ ...group, name: '', options: [] }] })).toEqual(['groups.0.name', 'groups.0.options']);
  });
});

describe('itemDraft', () => {
  it('names a single row with the default variant name and drops low stock when not tracking', () => {
    const draft = itemDraft({ ...emptyProduct(null), name: ' Ensaymada ', variants: [{ ...emptyVariant(), price: 6_500 }], lowStockAt: 3 }, null, []);
    expect(draft.name).toBe('Ensaymada');
    expect(draft.description).toBeNull();
    expect(draft.variants).toEqual([{ id: null, name: 'Regular', price: 6_500, lowStockAt: null, isSoldOut: false }]);
  });

  it('round-trips a saved item: two variants, photos, groups and the low-stock number', () => {
    const form = productFromItem(latte, [sugar]);
    expect(form.lowStockAt).toBe(2);
    expect(form.groups.map((group) => [group.name, group.required])).toEqual([['Sugar', true]]);
    const draft = itemDraft(form, ITEM, [GROUP]);
    expect(draft.variants.map((variant) => [variant.id, variant.name, variant.price, variant.lowStockAt])).toEqual([
      [REGULAR, 'Regular', 12_000, 2],
      [LARGE, 'Large', 15_000, 2],
    ]);
    expect(draft.photoPaths).toEqual([`${TENANT}/items/a.webp`]);
    expect(draft.optionGroupIds).toEqual([GROUP]);
  });
});

describe('groupDrafts', () => {
  it('turns "required" into a minimum of one and trims names', () => {
    const form = { ...emptyProduct(null), groups: [{ ...emptyGroup(), name: ' Sugar ', required: true, maxSelect: 1, options: [{ ...emptyOption(), name: ' Less ', priceDelta: null }] }] };
    expect(groupDrafts(form)).toEqual([{ id: null, name: 'Sugar', minSelect: 1, maxSelect: 1, options: [{ id: null, name: 'Less', priceDelta: 0, isSoldOut: false }] }]);
  });
});

describe('stockChanges', () => {
  it('sets only the counts that changed, matched by row', () => {
    const form = productFromItem(latte, [sugar]);
    expect(stockChanges(form, latte)).toEqual([]);
    const changed = { ...form, variants: form.variants.map((variant, index) => (index === 1 ? { ...variant, stock: 9 } : variant)) };
    expect(stockChanges(changed, latte)).toEqual([{ variantId: LARGE, stockOnHand: 9 }]);
    expect(stockChanges({ ...changed, trackStock: false }, latte)).toEqual([]);
  });
});

describe('parseCount', () => {
  it('reads whole numbers and keeps the last good value otherwise', () => {
    expect(parseCount('12', null)).toBe(12);
    expect(parseCount(' ', 4)).toBeNull();
    expect(parseCount('1.5', 4)).toBe(4);
    expect(parseCount('-1', 4)).toBe(4);
  });
});
