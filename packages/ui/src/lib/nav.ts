import type { ReactElement, ReactNode } from 'react';

/**
 * One nav entry as the shell patterns draw it. `link` is the app's own link element without children
 * (`<Link to=… />` from TanStack Router or `next/link`); the pattern adds the label, icon and classes.
 */
export interface ShellNavItem {
  key: string;
  label: string;
  icon: ReactNode;
  /** Shown instead of `icon` while this is the current page (Tabler's filled variant). */
  activeIcon?: ReactNode;
  link: ReactElement;
  /** The current page: filled icon, bold label, `aria-current="page"`. */
  active: boolean;
  /** Waiting work (new orders): a count badge; nothing when 0. */
  count?: number;
}

/** "99+" above 99, so a badge never grows wider than its slot. */
export function countText(count: number): string {
  return count > 99 ? '99+' : String(count);
}

/** Initials for an avatar fallback: "Juan dela Cruz" → "JC", "Kapihan" → "KA". */
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word));
  const first = words[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1] ?? '') : '';
  const letters = last ? `${first.charAt(0)}${last.charAt(0)}` : first.slice(0, 2);
  return letters.toUpperCase();
}
