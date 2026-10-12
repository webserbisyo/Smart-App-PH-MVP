import { findModuleRoute } from '@smartapp/core';

import { customersModule } from '../features/customers/module';
import { homeModule } from '../features/home/module';
import { ordersModule } from '../features/orders/module';
import { productsModule } from '../features/products/module';
import { reportsModule } from '../features/reports/module';
import { settingsModule } from '../features/settings/module';

import type { AppModule } from './module';

/** Every area of the dashboard. A new area = a new folder in src/features + one line here. */
export const registry: readonly AppModule[] = [
  homeModule,
  ordersModule,
  productsModule,
  customersModule,
  reportsModule,
  settingsModule,
];

/** The module route for a path, or `null` (not found). */
export function routeFor(path: string) {
  return findModuleRoute(registry, path);
}
