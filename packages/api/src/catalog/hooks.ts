'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CatalogItem, Category, CategoryDraft, ItemDraft, ItemStatus, OptionGroup, OptionGroupDraft, SortKind } from '@smartapp/core';

import { qk } from '../keys';
import { useApiClient } from '../provider';
import { useShopId } from '../shops/hooks';

import {
  deleteItem,
  getCatalog,
  getCategories,
  getOptionGroups,
  removeCategory,
  removeOptionGroup,
  saveCategory,
  saveItem,
  saveOptionGroup,
  saveSortOrder,
  setItemStatus,
  setStock,
  setVariantSoldOut,
} from './catalog';

// Queries take the shop id; mutations work on the signed-in owner's shop and refresh what they change.

/** Refreshes the catalog (items carry category and option group ids, so those changes refresh it too). */
function useRefresh() {
  const queryClient = useQueryClient();
  const shopId = useShopId();
  return (...keys: ('catalog' | 'categories' | 'optionGroups' | 'paymentAccounts' | 'deliveryZones')[]) =>
    Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: qk[key](shopId()) })));
}

export function useCategories(tenantId: string) {
  const client = useApiClient();
  return useQuery<Category[]>({ queryKey: qk.categories(tenantId), queryFn: () => getCategories(client, tenantId) });
}

export function useSaveCategory() {
  const client = useApiClient();
  const shopId = useShopId();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (draft: CategoryDraft) => saveCategory(client, shopId(), draft),
    onSuccess: () => refresh('categories'),
  });
}

/** Raises `category_not_empty` while items are still in it. */
export function useRemoveCategory() {
  const client = useApiClient();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { categoryId: string }) => removeCategory(client, input.categoryId),
    onSuccess: () => refresh('categories'),
  });
}

/** Every item with photos, live variants and option group ids, all statuses. */
export function useCatalog(tenantId: string) {
  const client = useApiClient();
  return useQuery<CatalogItem[]>({ queryKey: qk.catalog(tenantId), queryFn: () => getCatalog(client, tenantId) });
}

export function useSaveItem() {
  const client = useApiClient();
  const shopId = useShopId();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (draft: ItemDraft) => saveItem(client, shopId(), draft),
    onSuccess: () => refresh('catalog'),
  });
}

export function useSetItemStatus() {
  const client = useApiClient();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { itemId: string; status: ItemStatus }) => setItemStatus(client, input),
    onSuccess: () => refresh('catalog'),
  });
}

export function useDeleteItem() {
  const client = useApiClient();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { itemId: string }) => deleteItem(client, input.itemId),
    onSuccess: () => refresh('catalog'),
  });
}

export function useSetVariantSoldOut() {
  const client = useApiClient();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { variantId: string; isSoldOut: boolean }) => setVariantSoldOut(client, input),
    onSuccess: () => refresh('catalog'),
  });
}

export function useSetStock() {
  const client = useApiClient();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { variantId: string; stockOnHand: number }) => setStock(client, input),
    onSuccess: () => refresh('catalog'),
  });
}

export function useOptionGroups(tenantId: string) {
  const client = useApiClient();
  return useQuery<OptionGroup[]>({ queryKey: qk.optionGroups(tenantId), queryFn: () => getOptionGroups(client, tenantId) });
}

export function useSaveOptionGroup() {
  const client = useApiClient();
  const shopId = useShopId();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (draft: OptionGroupDraft) => saveOptionGroup(client, shopId(), draft),
    onSuccess: () => refresh('optionGroups'),
  });
}

export function useRemoveOptionGroup() {
  const client = useApiClient();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { groupId: string }) => removeOptionGroup(client, input.groupId),
    onSuccess: () => refresh('optionGroups', 'catalog'),
  });
}

const SORT_KEYS = {
  categories: 'categories',
  items: 'catalog',
  variants: 'catalog',
  photos: 'catalog',
  paymentAccounts: 'paymentAccounts',
  deliveryZones: 'deliveryZones',
} as const satisfies Record<SortKind, 'catalog' | 'categories' | 'paymentAccounts' | 'deliveryZones'>;

/** Drag to sort: the ids of one list, in the new order. */
export function useSaveSortOrder() {
  const client = useApiClient();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { kind: SortKind; ids: readonly string[] }) => saveSortOrder(client, input),
    onSuccess: (_result, input) => refresh(SORT_KEYS[input.kind]),
  });
}
