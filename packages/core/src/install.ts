// "Add to home screen" (paper 14): which install help a visitor sees. Pure, so the storefront only reads the browser
// (user agent, display mode, the browser's install event, local storage) and this decides.

/** Days the install card stays hidden after "Not now". */
export const INSTALL_SNOOZE_DAYS = 14;
const DAY_MS = 86_400_000;

/**
 * - `ios`: iPhone or iPad; there is no install event, so the card opens the drawn Share → Add to Home Screen steps.
 * - `in_app`: the Facebook, Messenger or Instagram browser, which cannot add to the home screen.
 * - `other`: Android and desktop; Chrome and Edge fire the install event when the shop can be installed.
 */
export type InstallPlatform = 'ios' | 'in_app' | 'other';

export function installPlatform(userAgent: string, maxTouchPoints: number): InstallPlatform {
  if (/FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger/i.test(userAgent)) return 'in_app';
  // iPadOS asks for the desktop site and reports itself as a Mac with a touch screen.
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) return 'ios';
  return 'other';
}

export interface InstallState {
  platform: InstallPlatform;
  /** Already opened from the home screen (`display-mode: standalone`). */
  standalone: boolean;
  /** When "Not now" was tapped (ms since 1970), or null. */
  dismissedAt: number | null;
  now: number;
  /** The browser fired its install event (Android and desktop Chrome or Edge). */
  canPrompt: boolean;
}

/** `prompt`: the Install button opens the browser's own install. `ios_steps`: the drawn steps. `none`: no card. */
export type InstallOffer = 'none' | 'prompt' | 'ios_steps';

export function installOffer(state: InstallState): InstallOffer {
  if (state.standalone || state.platform === 'in_app') return 'none';
  if (state.dismissedAt !== null && state.now >= state.dismissedAt && state.now - state.dismissedAt < INSTALL_SNOOZE_DAYS * DAY_MS) return 'none';
  if (state.platform === 'ios') return 'ios_steps';
  return state.canPrompt ? 'prompt' : 'none';
}

/** The stored "Not now" time; anything unreadable is never dismissed. */
export function parseDismissedAt(raw: string | null): number | null {
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
