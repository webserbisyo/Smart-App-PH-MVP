import { describe, expect, it } from 'vitest';

import {
  catalogItemFromJson,
  catalogItemFromRow,
  categoryFromRow,
  categoryIconFromRow,
  categoryIconToRow,
  categoryToRow,
  itemDraftToJson,
  optionGroupFromRow,
} from './mappers';
import type { CatalogRow, CategoryRow, VariantRow } from './mappers';

const tenantId = '0b6f3b9e-8f5a-4c2e-9d1a-2f3e4a5b6c7d';
const itemId = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const groupId = '2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f60';

const variant = (id: string, sort: number, archived: string | null): VariantRow => ({
  id,
  tenant_id: tenantId,
  item_id: itemId,
  name: `Size ${String(sort)}`,
  price: 12000 + sort * 1000,
  stock_on_hand: null,
  low_stock_at: null,
  is_sold_out: false,
  sort,
  archived_at: archived,
});

const row: CatalogRow = {
  id: itemId,
  tenant_id: tenantId,
  category_id: null,
  name: 'Iced Latte',
  description: null,
  status: 'active',
  is_featured: false,
  track_stock: false,
  sort: 0,
  created_at: '2026-10-12T01:00:00+00:00',
  item_photos: [
    { id: '3e4f5a6b-7c8d-4e9f-8a1b-2c3d4e5f6071', tenant_id: tenantId, item_id: itemId, path: `${tenantId}/items/b.webp`, sort: 1 },
    { id: '4f5a6b7c-8d9e-4f0a-9b2c-3d4e5f607182', tenant_id: tenantId, item_id: itemId, path: `${tenantId}/items/a.webp`, sort: 0 },
  ],
  item_variants: [
    variant('5a6b7c8d-9e0f-4a1b-8c3d-4e5f60718293', 1, null),
    variant('6b7c8d9e-0f1a-4b2c-9d4e-5f6071829304', 0, null),
    variant('7c8d9e0f-1a2b-4c3d-8e5f-607182930415', 2, '2026-10-12T02:00:00+00:00'),
  ],
  item_option_groups: [{ group_id: groupId, sort: 0 }],
};

describe('category mappers', () => {
  it('reads each icon kind and no icon', () => {
    expect(categoryIconFromRow('fluent', 'coffee')).toEqual({ kind: 'fluent', key: 'coffee' });
    expect(categoryIconFromRow('emoji', '🧋')).toEqual({ kind: 'emoji', value: '🧋' });
    expect(categoryIconFromRow('image', `${tenantId}/categories/a.webp`)).toEqual({ kind: 'image', path: `${tenantId}/categories/a.webp` });
    expect(categoryIconFromRow(null, null)).toBeNull();
  });

  it('writes icons back the same way', () => {
    for (const icon of [{ kind: 'fluent', key: 'coffee' }, { kind: 'emoji', value: '🍰' }, { kind: 'image', path: 'x/categories/a.webp' }] as const) {
      const columns = categoryIconToRow(icon);
      expect(categoryIconFromRow(columns.icon_kind, columns.icon_value)).toEqual(icon);
    }
    expect(categoryIconToRow(null)).toEqual({ icon_kind: null, icon_value: null });
  });

  it('maps a category row and a new category', () => {
    const categoryRow: CategoryRow = {
      id: groupId,
      tenant_id: tenantId,
      name: 'Coffee',
      sort: 2,
      is_hidden: false,
      icon_kind: 'fluent',
      icon_value: 'coffee',
      created_at: '2026-10-12T01:00:00+00:00',
    };
    expect(categoryFromRow(categoryRow)).toMatchObject({ name: 'Coffee', icon: { kind: 'fluent', key: 'coffee' } });
    const insert = categoryToRow(tenantId, { id: null, name: 'Tea', isHidden: false, icon: null });
    expect(insert).not.toHaveProperty('id');
    expect(insert).toMatchObject({ tenant_id: tenantId, icon_kind: null });
  });
});

describe('catalog mappers', () => {
  it('orders photos and variants and leaves archived variants out', () => {
    const item = catalogItemFromRow(row);
    expect(item.photos.map((photo) => photo.path)).toEqual([`${tenantId}/items/a.webp`, `${tenantId}/items/b.webp`]);
    expect(item.variants.map((v) => v.sort)).toEqual([0, 1]);
    expect(item.optionGroupIds).toEqual([groupId]);
  });

  it('parses the save_item result and refuses a broken one', () => {
    const saved = catalogItemFromJson({
      id: itemId,
      tenantId,
      categoryId: null,
      name: 'Iced Latte',
      description: null,
      status: 'active',
      isFeatured: false,
      trackStock: false,
      sort: 0,
      photos: [],
      variants: [],
      optionGroupIds: [],
    });
    expect(saved.name).toBe('Iced Latte');
    expect(() => catalogItemFromJson({ id: itemId })).toThrow();
  });

  it('sends the draft with the shop id', () => {
    const json = itemDraftToJson(tenantId, {
      id: null,
      categoryId: null,
      name: 'Tee',
      description: null,
      status: 'hidden',
      isFeatured: false,
      trackStock: true,
      variants: [{ id: null, name: 'M', price: 45000, lowStockAt: 3, isSoldOut: false }],
      photoPaths: [],
      optionGroupIds: [],
    });
    expect(json).toMatchObject({ tenantId, name: 'Tee', status: 'hidden', variants: [{ name: 'M', price: 45000 }] });
  });

  it('maps option groups with options in order', () => {
    const group = optionGroupFromRow({
      id: groupId,
      tenant_id: tenantId,
      name: 'Sugar',
      min_select: 1,
      max_select: 1,
      created_at: '2026-10-12T01:00:00+00:00',
      options: [
        { id: '8d9e0f1a-2b3c-4d4e-9f60-718293041526', tenant_id: tenantId, group_id: groupId, name: '50%', price_delta: 0, is_sold_out: false, sort: 1 },
        { id: '9e0f1a2b-3c4d-4e5f-8071-829304152637', tenant_id: tenantId, group_id: groupId, name: '100%', price_delta: 0, is_sold_out: false, sort: 0 },
      ],
    });
    expect(group.options.map((option) => option.name)).toEqual(['100%', '50%']);
  });
});
