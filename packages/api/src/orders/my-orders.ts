// The orders this device placed, per shop, for the guest Orders tab: the last 20 receipt tokens, newest first, in
// localStorage. Storage can be full or blocked (private mode), so every read and write is wrapped.

export const MY_ORDERS_MAX = 20;

const listeners = new Set<() => void>();

export function myOrdersKey(slug: string): string {
  return `smartapp.orders.${slug}`;
}

/** The saved list as stored (a JSON array of tokens), or '[]'. */
export function readMyOrdersRaw(slug: string): string {
  try {
    return localStorage.getItem(myOrdersKey(slug)) ?? '[]';
  } catch {
    return '[]';
  }
}

/** Tokens from the stored text; anything that is not a list of strings counts as empty. */
export function parseMyOrders(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((token): token is string => typeof token === 'string' && token.length > 0).slice(0, MY_ORDERS_MAX);
  } catch {
    return [];
  }
}

/** Puts a token first (once) and keeps the newest 20. */
export function addMyOrder(tokens: readonly string[], token: string): string[] {
  return [token, ...tokens.filter((existing) => existing !== token)].slice(0, MY_ORDERS_MAX);
}

export function rememberMyOrder(slug: string, token: string): void {
  try {
    localStorage.setItem(myOrdersKey(slug), JSON.stringify(addMyOrder(parseMyOrders(readMyOrdersRaw(slug)), token)));
  } catch {
    // Storage full or blocked: the receipt link still works, the Orders tab just will not list it.
  }
  for (const listener of listeners) listener();
}

export function subscribeMyOrders(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith('smartapp.orders.')) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
