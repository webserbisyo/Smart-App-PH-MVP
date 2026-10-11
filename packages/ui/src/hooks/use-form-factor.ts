import { useSyncExternalStore } from 'react';

/** Which shell the screen gets (docs/ui-kit.md section 5): phone < 768 px, tablet 768 to 1023 px, desktop from 1024 px. */
export type FormFactorShell = 'phone' | 'tablet' | 'desktop';

const QUERIES = {
  phone: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
} as const;

function read(): FormFactorShell {
  if (window.matchMedia(QUERIES.phone).matches) return 'phone';
  if (window.matchMedia(QUERIES.tablet).matches) return 'tablet';
  return 'desktop';
}

function subscribe(onChange: () => void): () => void {
  const lists = Object.values(QUERIES).map((query) => window.matchMedia(query));
  for (const list of lists) list.addEventListener('change', onChange);
  return () => {
    for (const list of lists) list.removeEventListener('change', onChange);
  };
}

/** The shell for the current width, updated when it changes. Worked out from media queries, so the first render is right. */
export function useFormFactor(): FormFactorShell {
  return useSyncExternalStore(subscribe, read, () => 'phone');
}
