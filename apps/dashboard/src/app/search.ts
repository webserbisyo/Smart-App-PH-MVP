// The search part of a module page's link (`/orders?show=to_verify`, `/products?stock=low`): Home's attention chips
// open these filtered lists (P4.7). Anything else in the search is dropped.

export interface ModuleSearch {
  /** Orders: `to_verify` or `waiting` (core `attentionFilter`). */
  show?: string;
  /** Products: `low` shows only what is low on stock. */
  stock?: string;
}

export function moduleSearch(search: Record<string, unknown>): ModuleSearch {
  return {
    ...(typeof search.show === 'string' ? { show: search.show } : {}),
    ...(typeof search.stock === 'string' ? { stock: search.stock } : {}),
  };
}
