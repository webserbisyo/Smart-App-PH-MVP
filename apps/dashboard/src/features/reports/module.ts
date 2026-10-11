import { WORDS } from '@smartapp/core';

import { defineAppModule } from '../../app/module';

export const reportsModule = defineAppModule({
  id: 'reports',
  nav: { label: WORDS.dashboard.nav.reports, icon: 'reports', order: 50, placement: 'more' },
  routes: [{ path: 'reports', screen: () => import('./screens/ReportsScreen') }],
});
