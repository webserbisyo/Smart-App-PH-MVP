import { Outlet, useLocation } from '@tanstack/react-router';
import { Fragment, useEffect, useState, ViewTransition } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { placeNav } from '@smartapp/core';
import type { DockPlan, Label, NavEntry, NavGroup, NavIconKey, ShellMode } from '@smartapp/core';
import { deviceStorage } from '@smartapp/data';
import { t } from '@smartapp/i18n';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { IconChevronLeft } from '@smartapp/ui/icons';
import type { MenuAction, ShellNavItem } from '@smartapp/ui/lib/nav';
import { AppShell } from '@smartapp/ui/patterns/AppShell';
import { AppSidebar, SidebarToggle } from '@smartapp/ui/patterns/AppSidebar';
import { BottomDock } from '@smartapp/ui/patterns/BottomDock';
import { Breadcrumbs } from '@smartapp/ui/patterns/Breadcrumbs';
import { TopBar, topBarButtonClass } from '@smartapp/ui/patterns/TopBar';

import { AccountButton } from './AccountButton';
import { Bell } from './Bell';
import { OfflineBanner } from './OfflineBanner';
import { BottomBarContext } from './bottomBar';
import { SidebarFoldContext } from './sidebarFold';
import { PathLink, parentCrumb, useCrumbTrail } from './crumbs';
import { usePageTitleValue } from './pageTitle';
import { useShellNavItems } from './navItems';

export interface ShellFrameProps {
  entries: readonly NavEntry[];
  mode: ShellMode;
  labelOf: (label: Label) => string;
  /** Support banner (tenant pages in support mode). */
  banner?: ReactNode | undefined;
  /** Sidebar header: who/what this is (business initials + name + role chip; the initials alone when collapsed). */
  sidebarHeader: ReactNode;
  /** The role's phone dock (`ROLE_DOCK`); left out: priority order, nothing raised. */
  dock?: DockPlan | undefined;
  /** Rows in the More sheet when the dock plan has a sheet (the cashier's shift and account actions). */
  sheetActions?: readonly MenuAction[] | undefined;
  /** Waiting work per nav entry (new orders, tickets): count badges. */
  counts?: Partial<Readonly<Record<NavIconKey, number>>> | undefined;
  /** Paths that open as a full-screen layer (Settings, Account): no sidebar, dock or top bar there. */
  layerPaths?: readonly string[] | undefined;
  /** In the top bar before the bell: the shop status chip (business pages, for who can change it). */
  shopStatus?: ReactNode | undefined;
  /** "Owner · Juan's Café" (legacy) or role label. */
  chip?: string | undefined;
  email?: string | undefined;
  accountLink: ReactElement;
  /** The root breadcrumb links here: the person's home. */
  homeLink: ReactElement;
  /** The path of that home: `null`: always show them. */
  homePath?: string | null | undefined;
  /** After the page title in `document.title`: "Orders · Juan's Café". */
  titleSuffix: string;
  /** Before the bell in the top bar (the live-orders "Reconnecting" dot). */
  status?: ReactNode | undefined;
  /** The bell with its list (business pages); the plain bell otherwise. */
  bell?: ReactNode | undefined;
  sidebarFooter?: ReactNode | undefined;
  phoneLeading?: ReactNode | undefined;
}

const ACCOUNT_PATH = /\/account(\/|$)/;

function readSidebarOpen(): boolean {
  return deviceStorage.read('sidebar') !== 'collapsed';
}

function within(pathname: string, paths: readonly string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/** Dock, rail or sidebar (or the focus menu), top bar and banners around the current page. */
export function ShellFrame(props: ShellFrameProps) {
  const { entries, mode, labelOf, banner, sidebarHeader, sidebarFooter, phoneLeading, dock, sheetActions = [], counts, layerPaths = [], shopStatus, chip, email, accountLink, titleSuffix, status, bell } =
    props;
  const { shell } = useFormFactor();
  // Desktop: the person's choice, remembered on this device. Tablet: the icon rail until opened (not remembered).
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  const [tabletOpen, setTabletOpen] = useState(false);
  // A screen may fold the sidebar while it is open (Sell). Not saved: the person's own choice stays in storage.
  const [folded, setFolded] = useState(false);
  const [bottomBar, setBottomBar] = useState<HTMLDivElement | null>(null);
  const pathname = useLocation({ select: (location) => location.pathname.replace(/\/+$/, '') || '/' });
  const trail = useCrumbTrail();
  const crumbText = (index: number): string => {
    const crumb = trail[index];
    if (!crumb) return '';
    return crumb.label.kind === 'text' ? crumb.label.text : labelOf(crumb.label.label);
  };
  // A detail page's own name ("Iced Latte") wins over its generic crumb ("Edit").
  const named = usePageTitleValue();
  const title = named ?? crumbText(trail.length - 1);
  const parent = parentCrumb(trail);
  // Account pages are about you, not a nav section: the avatar button shows where you are instead.
  const onAccount = ACCOUNT_PATH.test(pathname);

  const items = useShellNavItems(entries, labelOf, counts);
  // The current page is always named: nav item, breadcrumb, and the browser tab. A page without a
  // breadcrumb (the kitchen's full-screen view) takes the name of its nav entry.
  const tabTitle = title || (items.find((item) => item.active)?.label ?? '');
  useEffect(() => {
    document.title = tabTitle ? `${tabTitle} · ${titleSuffix}` : titleSuffix;
  }, [tabTitle, titleSuffix]);
  const placed = placeNav(entries, shell, mode, dock);
  const layer = within(pathname, layerPaths);
  const byKey = new Map(items.map((item) => [item.key, item]));
  const pick = (list: readonly NavEntry[]): ShellNavItem[] =>
    list.flatMap((entry) => {
      const item = byKey.get(entry.key);
      return item ? [item] : [];
    });

  let nav: ReactNode = null;
  if (placed.dock) {
    nav = (
      <BottomDock
        label={t('shell.nav')}
        items={pick(placed.dock.slots.map((slot) => slot.entry))}
        raisedKey={placed.dock.slots.find((slot) => slot.raised)?.entry.key ?? null}
        more={{ label: t('nav.more'), closeLabel: t('shell.close'), items: pick(placed.dock.more), actions: placed.dock.sheet ? sheetActions : [] }}
      />
    );
  } else if (placed.sidebar) {
    const groupLabel = (group: NavGroup) => t(`navGroup.${group}`);
    nav = (
      <AppSidebar
        label={t('shell.nav')}
        header={sidebarHeader}
        groups={placed.sidebar.map((section) => ({ key: section.group, label: groupLabel(section.group), items: pick(section.entries) }))}
        footer={sidebarFooter}
      />
    );
  }

  const page = <Outlet />;
  // Desktop and tablet: breadcrumbs show on EVERY page (full trail, never business name).
  const showCrumbs = shell !== 'phone';

  let leading: ReactNode = null;
  let subBar: ReactNode = null;
  if (placed.sidebar) {
    leading = <SidebarToggle label={t('shell.toggleSidebar')} />;
  } else if (shell === 'phone') {
    if (parent) {
      // Back goes to the page above this one (not browser history), so deep links work too.
      leading = (
        <PathLink href={parent.path} className={topBarButtonClass} aria-label={t('shell.backTo', { page: crumbText(trail.length - 2) })}>
          <IconChevronLeft aria-hidden="true" />
        </PathLink>
      );
      if (trail.length > 1) {
        subBar = (
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {trail.slice(0, -1).map((crumb, idx) => (
              <Fragment key={crumb.path}>
                {idx > 0 ? <span className="text-muted-foreground/60 no-underline">›</span> : null}
                <PathLink href={crumb.path} className="underline hover:text-foreground">
                  {crumbText(idx)}
                </PathLink>
              </Fragment>
            ))}
          </div>
        );
      }
    } else {
      leading = phoneLeading;
    }
  }

  const topBarActions = (
    <>
      {status}
      {shopStatus}
      {bell ?? <Bell />}
      {shell === 'phone' ? (
        <AccountButton
          variant="drawer"
          chip={chip ?? ''}
          email={email}
          accountLink={accountLink}
          active={onAccount}
          {...(placed.focusMenu ? { navItems: pick(placed.focusMenu) } : {})}
        />
      ) : null}
    </>
  );

  return (
    <AppShell
      shell={shell}
      skipLabel={t('shell.skip')}
      layer={layer}
      sidebarOpen={shell === 'tablet' ? tabletOpen : sidebarOpen && !folded}
      onSidebarOpenChange={(open) => {
        if (shell === 'tablet') {
          setTabletOpen(open);
          return;
        }
        // The person used the toggle: that is their choice from now on, also on a folding screen.
        setFolded(false);
        setSidebarOpen(open);
        deviceStorage.write('sidebar', open ? 'expanded' : 'collapsed');
      }}
      banners={
        <>
          <OfflineBanner />
          {banner}
        </>
      }
      topBar={
        <TopBar
          title={shell === 'phone' && parent ? title : undefined}
          leading={leading}
          subBar={subBar}
          crumbs={
            showCrumbs ? (
              <Breadcrumbs
                label={t('shell.breadcrumb')}
                moreLabel={t('shell.moreCrumbs')}
                entries={trail.map((crumb, index) => ({
                  key: crumb.path,
                  label: crumbText(index),
                  link: index === trail.length - 1 ? null : <PathLink href={crumb.path} />,
                }))}
              />
            ) : undefined
          }
          actions={topBarActions}
        />
      }
      nav={nav}
      // Filled by the page (save bar); hidden while empty.
      bottomBar={<div ref={setBottomBar} data-slot="bottom-bar" />}
    >
      <SidebarFoldContext value={setFolded}>
        <BottomBarContext value={bottomBar}>
          {/* Phones: a page change fades and rises 8 px (fades only with reduced motion). */}
          {shell === 'phone' && !layer ? <ViewTransition name="smartapp-page">{page}</ViewTransition> : page}
        </BottomBarContext>
      </SidebarFoldContext>
    </AppShell>
  );
}
