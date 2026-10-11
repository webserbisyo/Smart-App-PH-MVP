import { WORDS } from '@smartapp/core';

import { defineAppModule } from '../../app/module';

export const settingsModule = defineAppModule({
  id: 'settings',
  nav: { label: WORDS.dashboard.nav.settings, icon: 'settings', order: 60, placement: 'more' },
  routes: [{ path: 'settings', screen: () => import('./screens/SettingsScreen') }],
});
