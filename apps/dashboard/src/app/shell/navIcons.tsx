import type { ReactNode } from 'react';

import type { NavIconKey } from '@smartapp/core';
import {
  IconChartBar,
  IconHome,
  IconHomeFilled,
  IconPackage,
  IconReceipt,
  IconReceiptFilled,
  IconSettings,
  IconSettingsFilled,
  IconUsers,
} from '@smartapp/ui/icons';

/** Each nav icon key as Tabler icons: outline, and the filled one for the current page. */
export const NAV_ICON: Readonly<Record<NavIconKey, { icon: ReactNode; active: ReactNode }>> = {
  home: { icon: <IconHome />, active: <IconHomeFilled /> },
  orders: { icon: <IconReceipt />, active: <IconReceiptFilled /> },
  products: { icon: <IconPackage />, active: <IconPackage stroke={2.5} /> },
  customers: { icon: <IconUsers />, active: <IconUsers stroke={2.5} /> },
  reports: { icon: <IconChartBar />, active: <IconChartBar stroke={2.5} /> },
  settings: { icon: <IconSettings />, active: <IconSettingsFilled /> },
};
