import type { FeatureFlags, FeatureKey } from './features';
import { can } from './permissions';
import type { Permission } from './permissions';
import type { Role } from './roles';
import type { Label } from './vocab';

/** Which icon a nav entry shows. The apps map each key to an icon component; core stays free of React. */
export const NAV_ICONS = ['home', 'orders', 'schedule', 'sell', 'catalog', 'prep', 'customers', 'marketing', 'staff', 'reports', 'shop', 'settings', 'businesses', 'audit', 'design'] as const;
export type NavIconKey = (typeof NAV_ICONS)[number];

/** Sidebar groups, in the order they are shown. Each has an i18n label `navGroup.<group>`. */
export const NAV_GROUPS = ['today', 'business', 'shop'] as const;
export type NavGroup = (typeof NAV_GROUPS)[number];

export interface ModuleNavItem {
  label: Label;
  permission: Permission;
  /** Lower comes first. */
  priority: number;
  icon: NavIconKey;
  group: NavGroup;
  /** Shown only when the business has this switch on (the module itself may still be on). */
  feature?: FeatureKey;
  /** Where the entry goes, under `/s/$slug/` (default: the module's first route). */
  path?: string;
}

export interface ModuleRoute<TScreen> {
  /** Path under `/s/$slug/`. A segment starting with `$` is a parameter (`orders/$orderId`). */
  path: string;
  /** The breadcrumb of a sub-page (the module's first route uses its nav label). */
  crumb?: Label;
  /** Left out while the module has no screen yet: the page shows the module's empty state. */
  screen?: () => Promise<TScreen>;
  /** Optional custom skeleton while the screen is loading. */
  skeleton?: () => Promise<TScreen>;
  permission: Permission;
  /** Not found when the business has this switch off. */
  feature?: FeatureKey;
}

export interface ModuleDefinition<TScreen = unknown> {
  id: string;
  /** Hidden when the business has this switch off. */
  feature?: FeatureKey;
  /** i18n key of the empty state ("New orders will show up here."). */
  emptyKey: string;
  nav: readonly ModuleNavItem[];
  routes: readonly ModuleRoute<TScreen>[];
}

export function defineModule<TScreen>(module: ModuleDefinition<TScreen>): ModuleDefinition<TScreen> {
  return module;
}

/** What decides which modules someone gets: the business's features and the person's role. */
export interface Viewer {
  features: FeatureFlags;
  /** A support viewer uses `owner`; the database still enforces read-only. */
  role: Role;
}

/** Where a nav entry goes: the router's own paths, so a link type-checks without casts. */
export type NavTarget =
  | { to: '/s/$slug/$'; params: { slug: string; _splat: string } }
  | { to: '/admin' }
  | { to: '/admin/audit' }
  | { to: '/admin/design-system' };

export interface NavEntry {
  /** Unique within one nav. */
  key: string;
  moduleId: string;
  label: Label;
  /** The module's first route, under `/s/$slug/` (empty for admin entries). */
  path: string;
  priority: number;
  icon: NavIconKey;
  group: NavGroup;
  target: NavTarget;
}

function moduleIsOn(module: ModuleDefinition, features: FeatureFlags): boolean {
  return module.feature === undefined || features[module.feature];
}

/** Nav = registry → feature on → permission allowed → sorted by priority. Targets point into business `slug`. */
export function buildNav(registry: readonly ModuleDefinition[], viewer: Viewer, slug: string): NavEntry[] {
  const entries: NavEntry[] = [];
  for (const module of registry) {
    const firstRoute = module.routes[0];
    if (!firstRoute || !moduleIsOn(module, viewer.features)) {
      continue;
    }
    for (const [index, item] of module.nav.entries()) {
      if (item.feature !== undefined && !viewer.features[item.feature]) continue;
      if (can(viewer.role, item.permission)) {
        const path = item.path ?? firstRoute.path;
        entries.push({
          key: `${module.id}:${String(index)}`,
          moduleId: module.id,
          label: item.label,
          path,
          priority: item.priority,
          icon: item.icon,
          group: item.group,
          target: { to: '/s/$slug/$', params: { slug, _splat: path } },
        });
      }
    }
  }
  return entries.sort((a, b) => a.priority - b.priority);
}

/** The platform admin's nav outside a business. */
export const ADMIN_NAV: readonly NavEntry[] = [
  {
    key: 'admin:businesses',
    moduleId: 'admin',
    label: { i18n: 'nav.businesses' },
    path: '',
    priority: 10,
    icon: 'businesses',
    group: 'business',
    target: { to: '/admin' },
  },
  {
    key: 'admin:audit',
    moduleId: 'admin',
    label: { i18n: 'nav.audit' },
    path: 'audit',
    priority: 20,
    icon: 'audit',
    group: 'business',
    target: { to: '/admin/audit' },
  },
  {
    key: 'admin:design',
    moduleId: 'admin',
    label: { i18n: 'nav.designSystem' },
    path: 'design-system',
    priority: 30,
    icon: 'design',
    group: 'business',
    target: { to: '/admin/design-system' },
  },
];

/** The module each role starts on. */
export const ROLE_HOME: Readonly<Record<Role, string>> = {
  owner: 'home',
  cashier: 'sell',
  prep: 'prep',
};

/** Where this role lands: its home module if it is in the nav, else the first nav item, else nothing. */
export function roleHomePath(nav: readonly NavEntry[], role: Role): string | null {
  const home = nav.find((entry) => entry.moduleId === ROLE_HOME[role]) ?? nav[0];
  return home ? home.path : null;
}

/** Matches `orders/$orderId` against `orders/abc` → `{ orderId: 'abc' }`; `null` when it doesn't match. */
export function matchModulePath(pattern: string, path: string): Record<string, string> | null {
  const want = pattern.split('/');
  const got = path.split('/');
  if (want.length !== got.length) return null;
  const params: Record<string, string> = {};
  for (const [index, segment] of want.entries()) {
    const value = got[index] ?? '';
    if (segment.startsWith('$')) {
      if (value === '') return null;
      params[segment.slice(1)] = decodeURIComponent(value);
    } else if (segment !== value) {
      return null;
    }
  }
  return params;
}

/** A fixed path wins over a parameter (`catalog/new` before `catalog/$itemId`). */
function specificity(path: string): number {
  return path.split('/').filter((segment) => !segment.startsWith('$')).length;
}

export interface FoundModuleRoute<TScreen> {
  module: ModuleDefinition<TScreen>;
  route: ModuleRoute<TScreen>;
  params: Record<string, string>;
}

/** The route for a path under `/s/$slug/`, if this viewer may use it. Otherwise `null` (shown as not found). */
export function findModuleRoute<TScreen>(
  registry: readonly ModuleDefinition<TScreen>[],
  viewer: Viewer,
  path: string,
): FoundModuleRoute<TScreen> | null {
  let best: FoundModuleRoute<TScreen> | null = null;
  for (const module of registry) {
    if (!moduleIsOn(module, viewer.features)) {
      continue;
    }
    for (const route of module.routes) {
      if (route.feature !== undefined && !viewer.features[route.feature]) continue;
      const params = matchModulePath(route.path, path);
      if (params && (!best || specificity(route.path) > specificity(best.route.path))) {
        best = { module, route, params };
      }
    }
  }
  if (!best) return null;
  return can(viewer.role, best.route.permission) ? best : null;
}

/**
 * The breadcrumbs inside a module for `path`: every shorter path of the same module that is a page
 * (the first route takes the nav label, sub-pages their `crumb`), then the page itself.
 * `orders/abc` → Orders (`orders`) › Order (`orders/abc`).
 */
export function moduleTrail(module: ModuleDefinition<unknown>, path: string): { path: string; label: Label }[] {
  const segments = path.split('/');
  const trail: { path: string; label: Label }[] = [];
  for (let length = 1; length <= segments.length; length++) {
    const prefix = segments.slice(0, length).join('/');
    const route = module.routes.find((candidate) => matchModulePath(candidate.path, prefix) !== null);
    if (!route) continue;
    const label = route === module.routes[0] ? module.nav[0]?.label : route.crumb;
    if (label) trail.push({ path: prefix, label });
  }
  return trail;
}
