import { describe, expect, it } from 'vitest';

import { buildNav, defineModule, findModuleRoute, matchModulePath, moduleTrail } from './modules';
import { VOCAB } from './vocab';

const screen = () => Promise.resolve('screen');
const orders = defineModule({
  id: 'orders',
  nav: { label: 'Orders', icon: 'orders', order: 20, placement: 'dock' },
  routes: [{ path: 'orders', screen }, { path: 'orders/$orderId', crumb: 'Order', screen }],
});
const home = defineModule({ id: 'home', nav: { label: 'Home', icon: 'home', order: 10, placement: 'dock' }, routes: [{ path: 'home', screen }] });
const products = defineModule({
  id: 'products',
  nav: { label: (vocab) => vocab.catalog, icon: 'products', order: 30, placement: 'dock' },
  routes: [{ path: 'products', screen }, { path: 'products/$itemId', crumb: (vocab) => vocab.item, screen }],
});
const reports = defineModule({ id: 'reports', nav: { label: 'Reports', icon: 'reports', order: 50, placement: 'more' }, routes: [{ path: 'reports', screen }] });

describe('defineModule', () => {
  it('needs a route', () => {
    expect(() => defineModule({ id: 'x', nav: { label: 'X', icon: 'home', order: 1, placement: 'dock' }, routes: [] })).toThrow();
  });
});

describe('buildNav', () => {
  it('sorts by order and points at the first route', () => {
    expect(buildNav([reports, orders, home], VOCAB.food).map((entry) => [entry.key, entry.path, entry.placement])).toEqual([
      ['home', 'home', 'dock'],
      ['orders', 'orders', 'dock'],
      ['reports', 'reports', 'more'],
    ]);
  });

  it('words labels with the shop vocab', () => {
    expect(buildNav([products], VOCAB.food)[0]?.label).toBe('Menu');
    expect(buildNav([products], VOCAB.retail)[0]?.label).toBe('Products');
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
    expect(moduleTrail([home, orders], 'orders/abc', VOCAB.food)).toEqual([
      { path: 'orders', label: 'Orders' },
      { path: 'orders/abc', label: 'Order' },
    ]);
    expect(moduleTrail([home, orders], 'nope', VOCAB.food)).toEqual([]);
    expect(moduleTrail([products], 'products/abc', VOCAB.food).map((crumb) => crumb.label)).toEqual(['Menu', 'Menu item']);
    expect(moduleTrail([products], 'products/abc', VOCAB.retail).map((crumb) => crumb.label)).toEqual(['Products', 'Product']);
  });
});

describe('findModuleRoute', () => {
  it('finds the route and its parameters', () => {
    expect(findModuleRoute([home, orders], 'orders/abc')?.params).toEqual({ orderId: 'abc' });
    expect(findModuleRoute([home, orders], 'home')?.module.id).toBe('home');
    expect(findModuleRoute([home, orders], 'nope')).toBeNull();
  });
});
