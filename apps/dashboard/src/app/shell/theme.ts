import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'smartapp-theme';
const listeners = new Set<() => void>();

function read(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Sets light or dark on <html> and remembers it on this device (index.html applies it before the first paint). */
export function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Private mode or blocked storage: the choice lasts until the page closes.
  }
  for (const listener of listeners) listener();
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => 'light');
}
