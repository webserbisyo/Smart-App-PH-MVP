import { describe, expect, it } from 'vitest';

import { buildNav, defineModule, findModuleRoute, matchModulePath, moduleTrail } from './modules';

const screen = () => Promise.resolve('screen');
const orders = defineModule({
  id: 'orders',
  nav: { label: 'Orders', icon: 'orders', order: 20, placement: 'dock' },
  routes: [{ path: 'orders', screen }, { path: 'orders/$orderId', crumb: 'Order', screen }],
});
const home = defineModule({ id: 'home', nav: { label: 'Home', icon: 'home', order: 10, placement: 'dock' }, routes: [{ path: 'home', screen }] });
const reports = defineModule({ id: 'reports', nav: { label: 'Reports', icon: 'reports', order: 50, placement: 'more' }, routes: [{ path: 'reports', screen }] });

describe('defineModule', () => {
  it('needs a route', () => {
    expect(() => defineModule({ id: 'x', nav: { label: 'X', icon: 'home', order: 1, placement: 'dock' }, routes: [] })).toThrow();
  });
});

describe('buildNav', () => {
  it('sorts by order and points at the first route', () => {
    expect(buildNav([reports, orders, home]).map((entry) => [entry.key, entry.path, entry.placement])).toEqual([
      ['home', 'home', 'dock'],
      ['orders', 'orders', 'dock'],
      ['reports', 'reports', 'more'],
    ]);
  });
});

describe('matchModulePath', () => {
  it('reads parameters', () => {
    expect(matchModulePath('orders/$orderId', 'orders/abc')).toEqual({ orderId: 'abc' });
    expect(matchModulePath('orders/$orderId', 'orders')).toBeNull();
    expect(matchModulePath('orders', 'products')).toBeNull();
  });
});

describe('moduleTrail', () => {
  it('builds breadcrumbs from the module routes', () => {
    expect(moduleTrail([home, orders], 'orders/abc')).toEqual([
      { path: 'orders', label: 'Orders' },
      { path: 'orders/abc', label: 'Order' },
    ]);
    expect(moduleTrail([home, orders], 'nope')).toEqual([]);
  });
});

describe('findModuleRoute', () => {
  it('finds the route and its parameters', () => {
    expect(findModuleRoute([home, orders], 'orders/abc')?.params).toEqual({ orderId: 'abc' });
    expect(findModuleRoute([home, orders], 'home')?.module.id).toBe('home');
    expect(findModuleRoute([home, orders], 'nope')).toBeNull();
  });
});
