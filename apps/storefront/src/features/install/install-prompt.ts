'use client';

// The browser's own install offer (Android and desktop Chrome or Edge fire `beforeinstallprompt` once per page
// load). It can fire before React has hydrated, so the listener is added when this module first loads (imported by
// ShopProvider on every shop page) and the event is kept for the install card's button.

/** The non-standard install event; only `prompt()` is used. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<unknown>;
}

function isInstallPromptEvent(event: Event): event is InstallPromptEvent {
  return 'prompt' in event && typeof event.prompt === 'function';
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    if (!isInstallPromptEvent(event)) return;
    // Our card asks instead of the browser's own bar.
    event.preventDefault();
    deferred = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The browser offered to install the shop on this page load. */
export function canPromptInstall(): boolean {
  return deferred !== null;
}

/** Opens the browser's install dialog; the event works once, so the card hides after. */
export async function promptInstall(): Promise<void> {
  const event = deferred;
  if (event === null) return;
  deferred = null;
  notify();
  await event.prompt();
}

/** Opened from the home screen (Android, desktop) or as an iPhone home-screen app. */
export function isStandalone(): boolean {
  const iosStandalone = 'standalone' in window.navigator && window.navigator.standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

export function subscribeStandalone(listener: () => void): () => void {
  const query = window.matchMedia('(display-mode: standalone)');
  query.addEventListener('change', listener);
  return () => {
    query.removeEventListener('change', listener);
  };
}

export function dismissedKey(slug: string): string {
  return `smartapp.install.${slug}`;
}

export function readDismissedRaw(slug: string): string | null {
  try {
    return window.localStorage.getItem(dismissedKey(slug));
  } catch {
    return null;
  }
}

export function saveDismissed(slug: string, at: number): void {
  try {
    window.localStorage.setItem(dismissedKey(slug), String(at));
  } catch {
    // Blocked storage: the card shows again on the next visit.
  }
}
