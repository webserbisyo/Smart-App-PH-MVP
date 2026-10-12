import { describe, expect, it } from 'vitest';

import { decideRoute, safeRedirect } from './guard';

const session = { userId: 'u1' };
const active = { status: 'active' as const };
const pending = { status: 'pending' as const };
const suspended = { status: 'suspended' as const };

describe('decideRoute', () => {
  it('signed out: auth pages are open, everything else goes to log in with a redirect back', () => {
    expect(decideRoute(null, null, '/login')).toBe('ok');
    expect(decideRoute(null, null, '/signup')).toBe('ok');
    expect(decideRoute(null, null, '/forgot-password')).toBe('ok');
    expect(decideRoute(null, null, '/orders?tab=new')).toEqual({ redirect: '/login?redirect=%2Forders%3Ftab%3Dnew' });
    expect(decideRoute(null, null, '/')).toEqual({ redirect: '/login?redirect=%2F' });
    expect(decideRoute(null, null, '/setup')).toEqual({ redirect: '/login' });
  });

  it('signed in, no shop: setup only', () => {
    expect(decideRoute(session, null, '/setup')).toBe('ok');
    expect(decideRoute(session, null, '/orders')).toEqual({ redirect: '/setup' });
    expect(decideRoute(session, null, '/login')).toEqual({ redirect: '/setup' });
    expect(decideRoute(session, null, '/pending')).toEqual({ redirect: '/setup' });
  });

  it('pending and suspended shops have one page each', () => {
    expect(decideRoute(session, pending, '/pending')).toBe('ok');
    expect(decideRoute(session, pending, '/home')).toEqual({ redirect: '/pending' });
    expect(decideRoute(session, pending, '/setup')).toEqual({ redirect: '/pending' });
    expect(decideRoute(session, suspended, '/suspended')).toBe('ok');
    expect(decideRoute(session, suspended, '/orders')).toEqual({ redirect: '/suspended' });
  });

  it('active: the shell is open and auth or state pages go home or to the redirect', () => {
    expect(decideRoute(session, active, '/orders')).toBe('ok');
    expect(decideRoute(session, active, '/')).toBe('ok');
    expect(decideRoute(session, active, '/login')).toEqual({ redirect: '/' });
    expect(decideRoute(session, active, '/login?redirect=%2Forders')).toEqual({ redirect: '/orders' });
    expect(decideRoute(session, active, '/login?redirect=https%3A%2F%2Fevil.example')).toEqual({ redirect: '/' });
    expect(decideRoute(session, active, '/setup')).toEqual({ redirect: '/' });
    expect(decideRoute(session, active, '/pending')).toEqual({ redirect: '/' });
  });

  it('forgot password stays reachable while signed in', () => {
    expect(decideRoute(session, null, '/forgot-password')).toBe('ok');
    expect(decideRoute(session, active, '/forgot-password')).toBe('ok');
  });
});

describe('safeRedirect', () => {
  it('accepts only same-app paths', () => {
    expect(safeRedirect('/orders')).toBe('/orders');
    expect(safeRedirect('//evil.example')).toBeNull();
    expect(safeRedirect('https://evil.example')).toBeNull();
    expect(safeRedirect('/\\evil.example')).toBeNull();
    expect(safeRedirect(undefined)).toBeNull();
  });
});
