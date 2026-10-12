import type { CatalogItem, Category } from '@smartapp/core';

// What the products list shows for each item, worked out from the catalog the dashboard loads.

/** Lowest and highest price of the item's variants. */
export function priceRange(item: CatalogItem): { min: number; max: number } | null {
  if (item.variants.length === 0) return null;
  const prices = item.variants.map((variant) => variant.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Stock left across variants, and whether any variant is at or below its low-stock number; `null` when not counted. */
export function stockSummary(item: CatalogItem): { left: number; low: boolean } | null {
  if (!item.trackStock) return null;
  let left = 0;
  let low = false;
  for (const variant of item.variants) {
    const count = variant.stockOnHand ?? 0;
    left += count;
    if (count === 0 || (variant.lowStockAt !== null && count <= variant.lowStockAt)) low = true;
  }
  return { left, low };
}

/** Sold out when every variant is. */
export function isSoldOut(item: CatalogItem): boolean {
  return item.variants.length > 0 && item.variants.every((variant) => variant.isSoldOut);
}

export interface CatalogGroup {
  /** `null` is "No category" (always last). */
  category: Category | null;
  items: CatalogItem[];
}

/** Items under their categories in the owner's order, archived ones last; groups with nothing to show are left out. */
export function groupByCategory(items: readonly CatalogItem[], categories: readonly Category[], query: string): CatalogGroup[] {
  const needle = query.trim().toLowerCase();
  const shown = items
    .filter((item) => needle === '' || item.name.toLowerCase().includes(needle))
    .sort((a, b) => Number(a.status === 'archived') - Number(b.status === 'archived'));
  const known = new Set(categories.map((category) => category.id));
  const groups: CatalogGroup[] = categories.map((category) => ({ category, items: shown.filter((item) => item.categoryId === category.id) }));
  groups.push({ category: null, items: shown.filter((item) => item.categoryId === null || !known.has(item.categoryId)) });
  return groups.filter((group) => group.items.length > 0);
}

/** How many items (not archived) each category holds. */
export function countByCategory(items: readonly CatalogItem[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.categoryId === null || item.status === 'archived') continue;
    counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
  }
  return counts;
}
