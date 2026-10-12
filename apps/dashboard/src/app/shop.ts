import { useMyShop } from '@smartapp/api';
import { VOCAB } from '@smartapp/core';
import type { Tenant, Vocab } from '@smartapp/core';

/** The signed-in owner's shop. The guard loads it before any shell page shows, so it is always there. */
export function useShop(): Tenant {
  const { data: shop } = useMyShop();
  if (!shop) throw new Error('useShop needs the guard to have loaded the shop.');
  return shop;
}

/** The shop's words: "Menu" and "Menu item", or "Products" and "Product". */
export function useVocab(): Vocab {
  return VOCAB[useShop().businessType];
}
