import { useCallback, useSyncExternalStore } from 'react';
import { z } from 'zod';

import { CartLine } from '@smartapp/core';

// The cart, one per shop, kept in this browser's local storage (`smartapp.cart.<slug>`). Only the customer's
// choices are stored (`CartLine`); names and prices come from the shop's current menu (`priceCart` in core).
// Storage can be missing or full (private mode): the cart then lives for this page only.

const CartLines = z.array(CartLine);
const EMPTY: readonly CartLine[] = [];

export function cartStorageKey(slug: string): string {
  return `smartapp.cart.${slug}`;
}

/** Saved text → lines; anything unreadable is an empty cart. */
export function parseCart(raw: string | null): CartLine[] {
  if (raw === null) return [];
  try {
    const data: unknown = JSON.parse(raw);
    const parsed = CartLines.safeParse(data);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

const carts = new Map<string, readonly CartLine[]>();
const listeners = new Map<string, Set<() => void>>();

function notify(slug: string): void {
  for (const listener of listeners.get(slug) ?? []) listener();
}

export function readCart(slug: string): readonly CartLine[] {
  const cached = carts.get(slug);
  if (cached) return cached;
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(cartStorageKey(slug)) ?? null;
  } catch {
    raw = null;
  }
  const lines = parseCart(raw);
  carts.set(slug, lines);
  return lines;
}

export function writeCart(slug: string, lines: readonly CartLine[]): void {
  carts.set(slug, lines);
  try {
    const store = storage();
    if (lines.length === 0) store?.removeItem(cartStorageKey(slug));
    else store?.setItem(cartStorageKey(slug), JSON.stringify(lines));
  } catch {
    // Full or blocked storage: keep the cart in memory.
  }
  notify(slug);
}

function subscribe(slug: string, listener: () => void): () => void {
  const set = listeners.get(slug) ?? new Set<() => void>();
  listeners.set(slug, set);
  set.add(listener);
  // Another tab changed the same cart.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== cartStorageKey(slug)) return;
    carts.delete(slug);
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    set.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** The shop's cart lines and a function that changes them. Empty on the server and during hydration. */
export function useCartLines(slug: string): [readonly CartLine[], (change: (lines: readonly CartLine[]) => CartLine[]) => void] {
  const subscribeSlug = useCallback((listener: () => void) => subscribe(slug, listener), [slug]);
  const lines = useSyncExternalStore(
    subscribeSlug,
    () => readCart(slug),
    () => EMPTY,
  );
  const update = useCallback(
    (change: (lines: readonly CartLine[]) => CartLine[]) => {
      writeCart(slug, change(readCart(slug)));
    },
    [slug],
  );
  return [lines, update];
}
