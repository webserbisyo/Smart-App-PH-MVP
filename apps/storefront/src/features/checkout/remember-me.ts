import { z } from 'zod';

import { PhPhone } from '@smartapp/core';

// "Remember me on this phone": the name, mobile and email kept in this browser for the next checkout in the same
// shop (`smartapp.customer.<slug>`). Storage can be missing or blocked (private mode); then nothing is remembered.

const Remembered = z.object({ name: z.string().max(80), phone: PhPhone, email: z.string().max(254) });
export type Remembered = z.infer<typeof Remembered>;

export function rememberedKey(slug: string): string {
  return `smartapp.customer.${slug}`;
}

/** Saved text → details; anything unreadable is nothing. */
export function parseRemembered(raw: string | null): Remembered | null {
  if (raw === null) return null;
  try {
    const data: unknown = JSON.parse(raw);
    const parsed = Remembered.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function readRemembered(slug: string): Remembered | null {
  try {
    return parseRemembered(window.localStorage.getItem(rememberedKey(slug)));
  } catch {
    return null;
  }
}

/** Saves the details, or forgets them when the customer turned Remember me off. */
export function saveRemembered(slug: string, details: Remembered | null): void {
  try {
    if (details === null) window.localStorage.removeItem(rememberedKey(slug));
    else window.localStorage.setItem(rememberedKey(slug), JSON.stringify(details));
  } catch {
    // Full or blocked storage: nothing is remembered.
  }
}
