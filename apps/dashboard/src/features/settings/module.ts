import { WORDS } from '@smartapp/core';

import { defineAppModule } from '../../app/module';

const sections = WORDS.dashboard.settings.sections;

export const settingsModule = defineAppModule({
  id: 'settings',
  nav: { label: WORDS.dashboard.nav.settings, icon: 'settings', order: 60, placement: 'more' },
  routes: [
    { path: 'settings', screen: () => import('./screens/SettingsScreen') },
    { path: 'settings/look', crumb: sections.look, screen: () => import('./screens/LookScreen') },
    { path: 'settings/info', crumb: sections.info, screen: () => import('./screens/InfoScreen') },
    { path: 'settings/hours', crumb: sections.hours, screen: () => import('./screens/HoursScreen') },
    { path: 'settings/order-types', crumb: sections.orderTypes, screen: () => import('./screens/OrderTypesScreen') },
    { path: 'settings/payments', crumb: sections.payments, screen: () => import('./screens/PaymentsScreen') },
  ],
});
