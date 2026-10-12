import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { Fragment, useEffect, useState } from 'react';

import { buildNav, moduleTrail, WORDS } from '@smartapp/core';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@smartapp/ui/components/breadcrumb';
import { SidebarTrigger } from '@smartapp/ui/components/sidebar';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import type { ShellNavItem } from '@smartapp/ui/lib/nav';
import { AppShell } from '@smartapp/ui/patterns/AppShell';
import { OfflineBanner } from '@smartapp/ui/patterns/OfflineBanner';
import { BottomDock } from '@smartapp/ui/patterns/BottomDock';
import { TopBar } from '@smartapp/ui/patterns/TopBar';

import { registry } from '../registry';
import { useShop, useVocab } from '../shop';

import { AccountMenu } from './AccountMenu';
import { AppSidebar } from './AppSidebar';
import { NAV_ICON } from './navIcons';
import { OrdersLiveProvider, SoundChip, useOrdersLive } from './orders-live';
import { readSidebarOpen, writeSidebarOpen } from './storage';

const words = WORDS.dashboard;

function setTabTitle(text: string) {
  document.title = text;
}

/** Dock (phone), icon rail (tablet) or sidebar (desktop), never two at once; top bar with breadcrumbs. */
export function Shell() {
  return (
    <OrdersLiveProvider>
      <ShellLayout />
    </OrdersLiveProvider>
  );
}

function ShellLayout() {
  const shell = useFormFactor();
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  // Tablet: the rail opens over the page and closes again on the next page (it is open only for the path it was opened on).
  const [tabletOpenOn, setTabletOpenOn] = useState<string | null>(null);
  const path = useLocation({ select: (location) => location.pathname.replace(/^\/+|\/+$/g, '') });
  const vocab = useVocab();
  const shop = useShop();
  const { newCount } = useOrdersLive();
  const nav = buildNav(registry, vocab);

  const items: ShellNavItem[] = nav.map((entry) => ({
    key: entry.key,
    label: entry.label,
    icon: NAV_ICON[entry.icon].icon,
    activeIcon: NAV_ICON[entry.icon].active,
    link: <Link to="/$" params={{ _splat: entry.path }} preload="intent" />,
    active: path === entry.path || path.startsWith(`${entry.path}/`),
    ...(entry.key === 'orders' ? { count: newCount } : {}),
  }));
  const tabletOpen = tabletOpenOn === path;
  const placements = new Map(nav.map((entry) => [entry.key, entry.placement]));
  const trail = path === 'kit' ? [{ path: 'kit', label: words.kit.title }] : moduleTrail(registry, path, vocab);
  const title = trail.at(-1)?.label ?? '';

  // "(2) Orders · Juan's Café": the new-order count shows even when the tab is in the background.
  useEffect(() => {
    setTabTitle(words.orders.tabTitle(newCount, title || WORDS.app.dashboardTitle, shop.name));
  }, [newCount, title, shop.name]);

  const navElement =
    shell === 'phone' ? (
      <BottomDock
        label={words.nav.label}
        items={items.filter((item) => placements.get(item.key) === 'dock')}
        more={{ label: words.nav.more, closeLabel: words.nav.close, items: items.filter((item) => placements.get(item.key) === 'more') }}
      />
    ) : (
      <AppSidebar items={items} />
    );

  const crumbs = (
    <Breadcrumb aria-label={words.shell.breadcrumb}>
      <BreadcrumbList>
        {trail.map((crumb, index) => (
          <Fragment key={crumb.path}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {index === trail.length - 1 ? (
                <BreadcrumbPage className="text-base font-semibold">{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link to="/$" params={{ _splat: crumb.path }} />}>{crumb.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );

  return (
    <AppShell
      shell={shell}
      skipLabel={words.shell.skip}
      sidebarOpen={shell === 'tablet' ? tabletOpen : sidebarOpen}
      onSidebarOpenChange={(open) => {
        if (shell === 'tablet') {
          setTabletOpenOn(open ? path : null);
          return;
        }
        setSidebarOpen(open);
        writeSidebarOpen(open);
      }}
      nav={navElement}
      topBar={
        <TopBar
          leading={shell === 'phone' ? null : <SidebarTrigger className="size-11" aria-label={words.shell.toggleSidebar} />}
          title={shell === 'phone' ? <h1 className="truncate px-2 text-lg font-semibold">{title}</h1> : crumbs}
          actions={shell === 'phone' ? <AccountMenu /> : null}
        />
      }
    >
      <OfflineBanner text={WORDS.shared.offline} className="mb-4 rounded-lg border print:hidden" />
      <div className="mb-3 flex justify-end empty:hidden print:hidden">
        <SoundChip />
      </div>
      <Outlet />
    </AppShell>
  );
}
