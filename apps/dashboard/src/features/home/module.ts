import { WORDS } from '@smartapp/core';

import { defineAppModule } from '../../app/module';

export const homeModule = defineAppModule({
  id: 'home',
  nav: { label: WORDS.dashboard.nav.home, icon: 'home', order: 10, placement: 'dock' },
  routes: [{ path: 'home', screen: () => import('./screens/HomeScreen') }],
});
