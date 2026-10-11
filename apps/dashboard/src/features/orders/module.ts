import { WORDS } from '@smartapp/core';

import { defineAppModule } from '../../app/module';

export const ordersModule = defineAppModule({
  id: 'orders',
  nav: { label: WORDS.dashboard.nav.orders, icon: 'orders', order: 20, placement: 'dock' },
  routes: [{ path: 'orders', screen: () => import('./screens/OrdersScreen') }],
});
