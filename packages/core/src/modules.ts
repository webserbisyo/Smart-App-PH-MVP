// Dashboard module definitions: copy-and-trimmed from the first build's modules.ts.
// Core stays free of React: a screen is any lazily imported value, the app gives it a type.
import type { Vocab } from './vocab';

/** Which icon a nav entry shows. The dashboard maps each key to an icon component. */
export const NAV_ICONS = ['home', 'orders', 'products', 'customers', 'reports', 'settings'] as const;
export type NavIconKey = (typeof NAV_ICONS)[number];

/** Where a nav entry sits on a phone: a slot in the bottom dock, or inside the More sheet. Tablets and desktops show all in the sidebar. */
export type NavPlacement = 'dock' | 'more';

/** A fixed word, or one that follows the shop's vocab ("Menu" or "Products"). */
export type ModuleLabel = string | ((vocab: Vocab) => string);

function labelText(label: ModuleLabel, vocab: Vocab): string {
  return typeof label === 'string' ? label : label(vocab);
}

export interface ModuleNav {
  label: ModuleLabel;
  icon: NavIconKey;
  /** Lower comes first. */
  order: number;
  placement: NavPlacement;
}

export interface ModuleRoute<TScreen> {
  /** Path under the dashboard root, without slashes at either end: `orders`, `orders/$orderId`. */
  path: string;
  /** Breadcrumb of a sub-page; the module's first route uses its nav label. */
  crumb?: ModuleLabel;
  screen: () => Promise<TScreen>;
}

export interface ModuleDefinition<TScreen = unknown> {
  id: string;
  nav: ModuleNav;
  routes: readonly ModuleRoute<TScreen>[];
}

export function defineModule<TScreen>(module: ModuleDefinition<TScreen>): ModuleDefinition<TScreen> {
  if (module.routes.length === 0) {
    throw new Error(`Module ${module.id} needs at least one route.`);
  }
  return module;
}

export interface NavEntry {
  key: string;
  label: string;
  icon: NavIconKey;
  placement: NavPlacement;
  /** The module's first route. */
  path: string;
}

/** Nav = registry sorted by order, labels in the shop's words. Placement decides dock slot or More on phones. */
export function buildNav(registry: readonly ModuleDefinition[], vocab: Vocab): NavEntry[] {
  return [...registry]
    .sort((a, b) => a.nav.order - b.nav.order)
    .flatMap((module) => {
      const first = module.routes[0];
      return first
        ? [{ key: module.id, label: labelText(module.nav.label, vocab), icon: module.nav.icon, placement: module.nav.placement, path: first.path }]
        : [];
    });
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

/** A fixed path wins over a parameter (`products/new` before `products/$itemId`). */
function specificity(path: string): number {
  return path.split('/').filter((segment) => !segment.startsWith('$')).length;
}

export interface FoundModuleRoute<TScreen> {
  module: ModuleDefinition<TScreen>;
  route: ModuleRoute<TScreen>;
  params: Record<string, string>;
}

/** The route for a path (no leading slash), or `null` (shown as not found). */
export function findModuleRoute<TScreen>(registry: readonly ModuleDefinition<TScreen>[], path: string): FoundModuleRoute<TScreen> | null {
  let best: FoundModuleRoute<TScreen> | null = null;
  for (const module of registry) {
    for (const route of module.routes) {
      const params = matchModulePath(route.path, path);
      if (params && (!best || specificity(route.path) > specificity(best.route.path))) {
        best = { module, route, params };
      }
    }
  }
  return best;
}

/**
 * Breadcrumbs for a path: every shorter path of the same module that is a page (the first route takes
 * the nav label, sub-pages their `crumb`), then the page itself. `orders/abc` → Orders › Order.
 */
export function moduleTrail(registry: readonly ModuleDefinition[], path: string, vocab: Vocab): { path: string; label: string }[] {
  const segments = path.split('/').filter((segment) => segment !== '');
  const module = registry.find((candidate) => candidate.routes.some((route) => matchModulePath(route.path, segments.join('/')) !== null));
  if (!module) return [];
  const trail: { path: string; label: string }[] = [];
  for (let length = 1; length <= segments.length; length++) {
    const prefix = segments.slice(0, length).join('/');
    const route = module.routes.find((candidate) => matchModulePath(candidate.path, prefix) !== null);
    if (!route) continue;
    const label = route === module.routes[0] ? module.nav.label : route.crumb;
    if (label !== undefined) trail.push({ path: prefix, label: labelText(label, vocab) });
  }
  return trail;
}
