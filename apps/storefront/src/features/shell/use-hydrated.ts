import { useSyncExternalStore } from 'react';

function subscribeNothing(): () => void {
  return () => undefined;
}

/**
 * False on the server and during hydration, true after. Pages built from this browser's storage (the cart, saved
 * orders) wait for it, so the server's empty cart never flashes.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}
