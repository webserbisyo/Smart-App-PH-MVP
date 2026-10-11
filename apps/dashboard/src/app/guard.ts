import type { ShopStatus } from '@smartapp/core';

/** Pages for signed-out people. */
const AUTH_PATHS = ['/login', '/signup', '/forgot-password'];
/** One page per shop state before the shop is active. */
const STATE_PATH: Readonly<Record<'none' | Exclude<ShopStatus, 'active'>, string>> = {
  none: '/setup',
  pending: '/pending',
  suspended: '/suspended',
};
const STATE_PATHS = Object.values(STATE_PATH);

export type RouteDecision = 'ok' | { redirect: string };

/** A same-app path from `?redirect=`, or null (absolute and protocol-relative URLs are refused). */
export function safeRedirect(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  return value;
}

/**
 * Where a visit to `href` (path and query) may go, from the session and the owner's shop. Pure, so every case
 * is unit-tested; the router calls it in `beforeLoad`.
 */
export function decideRoute(
  session: { userId: string } | null,
  shop: { status: ShopStatus } | null,
  href: string,
): RouteDecision {
  const url = new URL(href, 'https://app.invalid');
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const isAuthPage = AUTH_PATHS.includes(path);

  if (session === null) {
    if (isAuthPage) return 'ok';
    if (STATE_PATHS.includes(path)) return { redirect: '/login' };
    return { redirect: `/login?redirect=${encodeURIComponent(`${path}${url.search}`)}` };
  }

  // Forgot password signs in with the code before the new password is saved, so it stays reachable.
  if (path === '/forgot-password') return 'ok';

  const statePath = shop === null ? STATE_PATH.none : shop.status === 'active' ? null : STATE_PATH[shop.status];
  if (statePath !== null) return path === statePath ? 'ok' : { redirect: statePath };

  if (isAuthPage || STATE_PATHS.includes(path)) {
    return { redirect: safeRedirect(url.searchParams.get('redirect')) ?? '/' };
  }
  return 'ok';
}
