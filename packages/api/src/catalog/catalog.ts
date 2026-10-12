import { CategoryDraft, ItemDraft, OptionGroupDraft, dbFunctions } from '@smartapp/core';
import type { CatalogItem, Category, ItemStatus, OptionGroup, SortKind, Variant } from '@smartapp/core';

import type { ApiClient } from '../client';
import { ApiError, throwIfError, toApiError } from '../errors';
import { removeShopMedia } from '../media';
import { must, nextSort, parsed } from '../rows';

import {
  catalogItemFromJson,
  catalogItemFromRow,
  categoryFromRow,
  categoryToRow,
  itemDraftToJson,
  optionGroupFromRow,
  variantFromRow,
} from './mappers';

const CATALOG_SELECT = '*, item_photos (*), item_variants (*), item_option_groups (group_id, sort)';

// --- categories ------------------------------------------------------------------------------------

export async function getCategories(client: ApiClient, tenantId: string): Promise<Category[]> {
  const { data, error } = await client.from('categories').select('*').eq('tenant_id', tenantId).order('sort').order('created_at');
  throwIfError(error);
  return (data ?? []).map(categoryFromRow);
}

/** Adds (no id, goes last) or changes a category. A replaced photo icon is deleted from storage. */
export async function saveCategory(client: ApiClient, tenantId: string, draft: CategoryDraft): Promise<Category> {
  const category = parsed(CategoryDraft.safeParse(draft));
  const row = categoryToRow(tenantId, category);
  if (category.id === null) {
    const sort = await nextSort(client, 'categories', tenantId);
    return categoryFromRow(must(await client.from('categories').insert({ ...row, sort }).select('*').single()));
  }
  const before = must(await client.from('categories').select('*').eq('id', category.id).single());
  const data = must(
    await client
      .from('categories')
      .update({ name: row.name, is_hidden: row.is_hidden ?? false, icon_kind: row.icon_kind ?? null, icon_value: row.icon_value ?? null })
      .eq('id', category.id)
      .select('*')
      .single(),
  );
  if (before.icon_kind === 'image' && before.icon_value !== null && before.icon_value !== data.icon_value) {
    await removeShopMedia(client, [before.icon_value]);
  }
  return categoryFromRow(data);
}

/** Removes an empty category; one that still has items raises `category_not_empty`. */
export async function removeCategory(client: ApiClient, categoryId: string): Promise<void> {
  const { data, error } = await client.from('categories').delete().eq('id', categoryId).select('icon_kind, icon_value');
  if (error) {
    // 23503: items still point at it (the foreign key refuses the delete).
    throw error.code === '23503' ? new ApiError('category_not_empty') : toApiError(error);
  }
  await removeShopMedia(
    client,
    data.flatMap((row) => (row.icon_kind === 'image' && row.icon_value !== null ? [row.icon_value] : [])),
  );
}

// --- items -----------------------------------------------------------------------------------------

/** Every item of the shop (all statuses) with photos, live variants and option group ids, in order. */
export async function getCatalog(client: ApiClient, tenantId: string): Promise<CatalogItem[]> {
  const { data, error } = await client
    .from('items')
    .select(CATALOG_SELECT)
    .eq('tenant_id', tenantId)
    .order('sort')
    .order('created_at');
  throwIfError(error);
  return (data ?? []).map(catalogItemFromRow);
}

async function photoPaths(client: ApiClient, itemId: string): Promise<string[]> {
  const { data, error } = await client.from('item_photos').select('path').eq('item_id', itemId);
  throwIfError(error);
  return (data ?? []).map((row) => row.path);
}

/** Saves the item, variants, photos and option groups in one transaction; photos taken off are deleted. */
export async function saveItem(client: ApiClient, tenantId: string, draft: ItemDraft): Promise<CatalogItem> {
  const item = parsed(ItemDraft.safeParse(draft));
  parsed(dbFunctions.save_item.input.safeParse({ ...item, tenantId }));
  const before = item.id === null ? [] : await photoPaths(client, item.id);
  const { data, error } = await client.rpc('save_item', { p_item: itemDraftToJson(tenantId, item) });
  throwIfError(error);
  const saved = catalogItemFromJson(data);
  const kept = new Set(saved.photos.map((photo) => photo.path));
  await removeShopMedia(client, before.filter((path) => !kept.has(path)));
  return saved;
}

export async function setItemStatus(client: ApiClient, input: { itemId: string; status: ItemStatus }): Promise<void> {
  const { error } = await client.from('items').update({ status: input.status }).eq('id', input.itemId);
  throwIfError(error);
}

/** Deletes an item with its variants, photos and links. From P5.3 an item with orders raises `item_has_orders`. */
export async function deleteItem(client: ApiClient, itemId: string): Promise<void> {
  const paths = await photoPaths(client, itemId);
  const { error } = await client.from('items').delete().eq('id', itemId);
  throwIfError(error);
  await removeShopMedia(client, paths);
}

export async function setVariantSoldOut(client: ApiClient, input: { variantId: string; isSoldOut: boolean }): Promise<Variant> {
  return variantFromRow(
    must(await client.from('item_variants').update({ is_sold_out: input.isSoldOut }).eq('id', input.variantId).select('*').single()),
  );
}

/** Sets a variant's stock count through `set_stock` (the only way stock changes outside orders). */
export async function setStock(client: ApiClient, input: { variantId: string; stockOnHand: number }): Promise<Variant> {
  const args = parsed(dbFunctions.set_stock.input.safeParse(input));
  return variantFromRow(must(await client.rpc('set_stock', { p_variant_id: args.variantId, p_stock_on_hand: args.stockOnHand })));
}

// --- option groups ---------------------------------------------------------------------------------

export async function getOptionGroups(client: ApiClient, tenantId: string): Promise<OptionGroup[]> {
  const { data, error } = await client.from('option_groups').select('*, options (*)').eq('tenant_id', tenantId).order('created_at');
  throwIfError(error);
  return (data ?? []).map(optionGroupFromRow);
}

/** Adds or changes a group and its choices (in order); choices left out are deleted. */
export async function saveOptionGroup(client: ApiClient, tenantId: string, draft: OptionGroupDraft): Promise<OptionGroup> {
  const group = parsed(OptionGroupDraft.safeParse(draft));
  const values = { tenant_id: tenantId, name: group.name.trim(), min_select: group.minSelect, max_select: group.maxSelect };
  const saved = must(
    group.id === null
      ? await client.from('option_groups').insert(values).select('id').single()
      : await client
          .from('option_groups')
          .update({ name: values.name, min_select: values.min_select, max_select: values.max_select })
          .eq('id', group.id)
          .select('id')
          .single(),
  );
  const groupId = saved.id;

  const kept = group.options.flatMap((option) => (option.id === null ? [] : [option.id]));
  let removed = client.from('options').delete().eq('group_id', groupId);
  if (kept.length > 0) removed = removed.not('id', 'in', `(${kept.join(',')})`);
  const removal = await removed;
  throwIfError(removal.error);

  const rows = group.options.map((option, index) => ({
    ...(option.id === null ? {} : { id: option.id }),
    tenant_id: tenantId,
    group_id: groupId,
    name: option.name.trim(),
    price_delta: option.priceDelta,
    is_sold_out: option.isSoldOut,
    sort: index,
  }));
  if (rows.length > 0) {
    const { error } = await client.from('options').upsert(rows);
    throwIfError(error);
  }

  return optionGroupFromRow(must(await client.from('option_groups').select('*, options (*)').eq('id', groupId).single()));
}

export async function removeOptionGroup(client: ApiClient, groupId: string): Promise<void> {
  const { error } = await client.from('option_groups').delete().eq('id', groupId);
  throwIfError(error);
}

// --- sorting ---------------------------------------------------------------------------------------

/** Drag to sort: rewrites `sort` for these rows of one shop, in this order. */
export async function saveSortOrder(client: ApiClient, input: { kind: SortKind; ids: readonly string[] }): Promise<void> {
  const args = parsed(dbFunctions.save_sort_order.input.safeParse({ kind: input.kind, ids: [...input.ids] }));
  const { error } = await client.rpc('save_sort_order', { p_kind: args.kind, p_ids: args.ids });
  throwIfError(error);
}
