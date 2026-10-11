import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

import { catalogModule } from '../modules/catalog';
import { customersModule } from '../modules/customers';
import { homeModule } from '../modules/home';
import { marketingModule } from '../modules/marketing';
import { onlineShopModule } from '../modules/online-shop';
import { ordersModule } from '../modules/orders';
import { prepModule } from '../modules/prep';
import { reportsModule } from '../modules/reports';
import { sellModule } from '../modules/sell';
import { settingsModule } from '../modules/settings';
import { staffModule } from '../modules/staff';

import type { AppModule, AppModuleRoute } from './module';

/** Every module of the dashboard. A new module = a new folder in src/modules + one line here. */
export const registry: readonly AppModule[] = [
  homeModule,
  sellModule,
  prepModule,
  ordersModule,
  catalogModule,
  customersModule,
  marketingModule,
  onlineShopModule,
  staffModule,
  reportsModule,
  settingsModule,
];

const screens = new Map<AppModuleRoute, LazyExoticComponent<ComponentType>>(
  registry.flatMap((module) =>
    module.routes.flatMap((route) => (route.screen ? [[route, lazy(route.screen)] as const] : [])),
  ),
);

const skeletons = new Map<AppModuleRoute, LazyExoticComponent<ComponentType>>(
  registry.flatMap((module) =>
    module.routes.flatMap((route) => (route.skeleton ? [[route, lazy(route.skeleton)] as const] : [])),
  ),
);

/** The lazily loaded screen of a module route, or `null` while the module has none (its empty state is shown). */
export function screenOf(route: AppModuleRoute): LazyExoticComponent<ComponentType> | null {
  return screens.get(route) ?? null;
}

/** The lazily loaded skeleton of a module route, or `null` if none was defined. */
export function skeletonOf(route: AppModuleRoute): LazyExoticComponent<ComponentType> | null {
  return skeletons.get(route) ?? null;
}
