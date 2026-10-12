import { CatalogItem, Category, OptionGroup, Variant } from '@smartapp/core';
import type { CategoryDraft, CategoryIcon, ItemDraft, ItemPhoto } from '@smartapp/core';

import type { Database, Json } from '../database.types';

type Tables = Database['public']['Tables'];
export type CategoryRow = Tables['categories']['Row'];
export type CategoryInsert = Tables['categories']['Insert'];
export type ItemRow = Tables['items']['Row'];
export type ItemPhotoRow = Tables['item_photos']['Row'];
export type VariantRow = Tables['item_variants']['Row'];
export type OptionGroupRow = Tables['option_groups']['Row'];
export type OptionRow = Tables['options']['Row'];

/** An items row with what `useCatalog` reads alongside it. */
export type CatalogRow = ItemRow & {
  item_photos: ItemPhotoRow[];
  item_variants: VariantRow[];
  item_option_groups: { group_id: string; sort: number }[];
};

/** `icon_kind` + `icon_value` → the core CategoryIcon (an unknown kind reads as no icon). */
export function categoryIconFromRow(kind: string | null, value: string | null): CategoryIcon | null {
  if (value === null) return null;
  if (kind === 'fluent') return { kind: 'fluent', key: value };
  if (kind === 'emoji') return { kind: 'emoji', value };
  if (kind === 'image') return { kind: 'image', path: value };
  return null;
}

export function categoryIconToRow(icon: CategoryIcon | null): { icon_kind: string | null; icon_value: string | null } {
  if (icon === null) return { icon_kind: null, icon_value: null };
  if (icon.kind === 'fluent') return { icon_kind: 'fluent', icon_value: icon.key };
  if (icon.kind === 'emoji') return { icon_kind: 'emoji', icon_value: icon.value };
  return { icon_kind: 'image', icon_value: icon.path };
}

export function categoryFromRow(row: CategoryRow): Category {
  return Category.parse({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    sort: row.sort,
    isHidden: row.is_hidden,
    icon: categoryIconFromRow(row.icon_kind, row.icon_value),
  });
}

export function categoryToRow(tenantId: string, draft: CategoryDraft): CategoryInsert {
  return {
    ...(draft.id === null ? {} : { id: draft.id }),
    tenant_id: tenantId,
    name: draft.name,
    is_hidden: draft.isHidden,
    ...categoryIconToRow(draft.icon),
  };
}

function photoFromRow(row: ItemPhotoRow): ItemPhoto {
  return { id: row.id, tenantId: row.tenant_id, itemId: row.item_id, path: row.path, sort: row.sort };
}

export function variantFromRow(row: VariantRow): Variant {
  return Variant.parse({
    id: row.id,
    tenantId: row.tenant_id,
    itemId: row.item_id,
    name: row.name,
    price: row.price,
    stockOnHand: row.stock_on_hand,
    lowStockAt: row.low_stock_at,
    isSoldOut: row.is_sold_out,
    sort: row.sort,
    archivedAt: row.archived_at,
  });
}

function bySort<T extends { sort: number }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => a.sort - b.sort);
}

/** An item with its photos, live variants (not archived) and option group ids, each in order. */
export function catalogItemFromRow(row: CatalogRow): CatalogItem {
  return CatalogItem.parse({
    id: row.id,
    tenantId: row.tenant_id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    status: row.status,
    isFeatured: row.is_featured,
    trackStock: row.track_stock,
    sort: row.sort,
    photos: bySort(row.item_photos).map(photoFromRow),
    variants: bySort(row.item_variants.filter((variant) => variant.archived_at === null)).map(variantFromRow),
    optionGroupIds: bySort(row.item_option_groups).map((link) => link.group_id),
  });
}

/** `save_item` returns the CatalogItem already in camelCase; it is still parsed before it reaches a screen. */
export function catalogItemFromJson(json: Json): CatalogItem {
  return CatalogItem.parse(json);
}

/** The `save_item` payload: the draft plus the shop it belongs to. */
export function itemDraftToJson(tenantId: string, draft: ItemDraft): Json {
  return {
    id: draft.id,
    tenantId,
    categoryId: draft.categoryId,
    name: draft.name,
    description: draft.description,
    status: draft.status,
    isFeatured: draft.isFeatured,
    trackStock: draft.trackStock,
    variants: draft.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: variant.price,
      lowStockAt: variant.lowStockAt,
      isSoldOut: variant.isSoldOut,
    })),
    photoPaths: [...draft.photoPaths],
    optionGroupIds: [...draft.optionGroupIds],
  };
}

export function optionGroupFromRow(row: OptionGroupRow & { options: OptionRow[] }): OptionGroup {
  return OptionGroup.parse({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    minSelect: row.min_select,
    maxSelect: row.max_select,
    options: bySort(row.options).map((option) => ({
      id: option.id,
      tenantId: option.tenant_id,
      groupId: option.group_id,
      name: option.name,
      priceDelta: option.price_delta,
      isSoldOut: option.is_sold_out,
    })),
  });
}
