import { WORDS } from '@smartapp/core';

import { defineAppModule } from '../../app/module';

export const customersModule = defineAppModule({
  id: 'customers',
  nav: { label: WORDS.dashboard.nav.customers, icon: 'customers', order: 40, placement: 'dock' },
  routes: [{ path: 'customers', screen: () => import('./screens/CustomersScreen') }],
});
