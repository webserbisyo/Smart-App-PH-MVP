import { useSyncExternalStore } from 'react';

const WIDE = '(min-width: 1280px)';

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia(WIDE);
  list.addEventListener('change', onChange);
  return () => {
    list.removeEventListener('change', onChange);
  };
}

/** 1280 px and wider: the board shows the chosen order in a side panel instead of opening its page. */
export function useWide(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => false);
}
