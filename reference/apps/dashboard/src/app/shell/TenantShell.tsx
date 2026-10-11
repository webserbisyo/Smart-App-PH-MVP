import { Link, getRouteApi, useLocation, useNavigate } from '@tanstack/react-router';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';

import { ROLE_DOCK, ROLE_LABELS, ROLE_SHELL, SUPPORT_MESSENGER_URL, can, isThemeChoice, roleHomePath, waitingCounts } from '@smartapp/core';
import { useLastSeen, useOrdersBoard, useSignOut } from '@smartapp/data/react';
import { t, tKey } from '@smartapp/i18n';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { IconAccount, IconSignOut } from '@smartapp/ui/icons';
import type { MenuAction } from '@smartapp/ui/lib/nav';
import { toast } from '@smartapp/ui/lib/toast';
import { NavUser } from '@smartapp/ui/patterns/NavUser';
import { ShopSwitcher } from '@smartapp/ui/patterns/ShopSwitcher';

import { rememberPageOutside } from '../links';
import { labelText, useCan, useTenantView } from '../tenant';

import { registry } from '../registry';
import { LiveSync } from '../live/LiveSync';
import { CounterLock } from '../lock/CounterLock';

import { MeAvatar } from './MeAvatar';
import { SheetActions } from './SheetActions';
import { ShellFrame } from './ShellFrame';
import { ShopStatusMenu } from './ShopStatusMenu';
import { TenantBell } from './TenantBell';
import { SupportBanner } from './SupportBanner';
import { TenantCommerce } from './TenantCommerce';

const authedRoute = getRouteApi('/authed');

/** Every page of one business: nav from the registry, shaped by the role's shell mode (data, not role checks). */
export function TenantShell() {
  const { me } = authedRoute.useRouteContext();
  const { access, nav, preset, viewer } = useTenantView();
  const { tenant } = access;
  const mode = access.via === 'member' ? ROLE_SHELL[access.role] : 'full';
  // A support viewer uses the owner's screens, but is shown as Webserbisyo support.
  const role = access.via === 'member' ? labelText(ROLE_LABELS[access.role], preset) : t('role.support');
  const home = roleHomePath(nav, viewer.role) ?? '';
  const canChangeStatus = useCan('settings.manage');
  // Members only: a support session is not staff and leaves no "last active".
  useLastSeen(tenant.id, access.via === 'member');
  // Settings is a layer over the app: its X returns to the page it was opened from.
  const pathname = useLocation({ select: (location) => location.pathname });
  useEffect(() => rememberPageOutside(pathname, 'settings'), [pathname]);
  // Every role can see the board; its live counts badge Orders and Kitchen / Packing.
  const board = useOrdersBoard(tenant.id);
  const counts = waitingCounts(board.data ?? []);
  const { shell } = useFormFactor();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const themeValue = isThemeChoice(theme) ? theme : 'system';

  const dock = ROLE_DOCK[viewer.role];
  // The More sheet's rows (cashier on a phone): each module's own actions, then the account ones.
  const sheet = dock.sheet && mode === 'full' && shell === 'phone';
  const sheetModules = registry.flatMap((module) =>
    module.sheetActions && (module.feature === undefined || viewer.features[module.feature]) && can(viewer.role, module.sheetActions.permission)
      ? [module.sheetActions.component]
      : [],
  );
  const accountActions: MenuAction[] = [
    { kind: 'link', key: 'account', label: t('sheet.myAccount'), icon: <IconAccount aria-hidden="true" />, link: <Link to="/s/$slug/account" params={{ slug: tenant.slug }} /> },
    { kind: 'button', key: 'switch', label: t('sheet.switchUser'), icon: <IconSignOut aria-hidden="true" />, onSelect: () => signOut.mutate(), danger: true },
  ];

  const otherShops = me.memberships
    .filter((m) => m.tenant.id !== tenant.id)
    .map((m) => ({
      id: m.tenant.id,
      slug: m.tenant.slug,
      name: m.tenant.name,
      onSelect: () => {
        void navigate({ to: '/s/$slug', params: { slug: m.tenant.slug } });
      },
    }));

  const shopSwitcherCommon = {
    name: tenant.name,
    businessType: tKey(preset.labelKey),
    editProfile: {
      label: t('shopSwitcher.editProfile'),
      link: <Link to="/s/$slug/$" params={{ slug: tenant.slug, _splat: 'settings/business' }} />,
    },
    viewShop: {
      label: t('shopSwitcher.viewShop'),
      href: `/shop/${tenant.slug}`,
    },
    copyLink: {
      label: t('shopSwitcher.copyLink'),
      onSelect: () => {
        const url = `${window.location.origin}/shop/${tenant.slug}`;
        void navigator.clipboard.writeText(url);
        toast.success(t('shopSwitcher.linkCopied'));
      },
    },
    switchShop:
      otherShops.length > 0
        ? {
            label: t('shopSwitcher.switchShop'),
            shops: otherShops,
          }
        : undefined,
    closeLabel: t('shell.close'),
  };

  const navUser = (
    <NavUser
      avatar={<MeAvatar size={32} />}
      avatarLarge={<MeAvatar size={40} />}
      name={me.display_name}
      email={me.phone ?? ''}
      account={{
        label: t('account.title'),
        link: me.is_platform_admin ? <Link to="/admin/account" /> : <Link to="/s/$slug/account" params={{ slug: tenant.slug }} />,
      }}
      supportConsole={
        me.is_platform_admin
          ? { label: t('account.supportConsole'), link: <Link to="/admin" /> }
          : null
      }
      theme={{
        label: t('account.theme'),
        lightLabel: t('theme.light'),
        darkLabel: t('theme.dark'),
        deviceLabel: t('account.themeDevice'),
        value: themeValue,
        onChange: (val) => setTheme(val),
      }}
      help={{
        label: t('account.help'),
        href: SUPPORT_MESSENGER_URL,
      }}
      logOut={{
        label: t('account.logout'),
        onSelect: () => signOut.mutate(),
      }}
    />
  );

  return (
    <TenantCommerce>
      <SheetActions components={sheetModules} enabled={sheet}>
        {(moduleActions) => (
          <ShellFrame
            entries={nav}
            mode={mode}
            labelOf={(label) => labelText(label, preset)}
            banner={access.via === 'support' ? <SupportBanner session={access.session} /> : null}
            sidebarHeader={<ShopSwitcher {...shopSwitcherCommon} variant="sidebar" />}
            sidebarFooter={navUser}
            phoneLeading={<ShopSwitcher {...shopSwitcherCommon} variant="phone" />}
            dock={dock}
            sheetActions={sheet ? [...moduleActions, ...accountActions] : []}
            counts={counts}
            layerPaths={[`/s/${tenant.slug}/settings`, `/s/${tenant.slug}/account`]}
            {...(canChangeStatus ? { shopStatus: <ShopStatusMenu /> } : {})}
            homeLink={<Link to="/s/$slug/$" params={{ slug: tenant.slug, _splat: home }} />}
            homePath={`/s/${tenant.slug}/${home}`}
            titleSuffix={tenant.name}
            status={<LiveSync />}
            bell={<TenantBell />}
            chip={t('account.chip', { role, business: tenant.name })}
            email={me.phone ?? undefined}
            accountLink={me.is_platform_admin ? <Link to="/admin/account" /> : <Link to="/s/$slug/account" params={{ slug: tenant.slug }} />}
          />
        )}
      </SheetActions>
      <CounterLock />
    </TenantCommerce>
  );
}
