import { WORDS } from '@smartapp/core';

import { defineAppModule } from '../../app/module';

export const productsModule = defineAppModule({
  id: 'products',
  nav: { label: WORDS.dashboard.nav.products, icon: 'products', order: 30, placement: 'dock' },
  routes: [{ path: 'products', screen: () => import('./screens/ProductsScreen') }],
});
