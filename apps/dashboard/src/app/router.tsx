import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, createRoute, createRouter, lazyRouteComponent, Navigate, Outlet, redirect } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';

import { getMyShop, getSession, qk } from '@smartapp/api';
import type { ApiClient } from '@smartapp/api';
import { WORDS } from '@smartapp/core';
import { Spinner } from '@smartapp/ui/components/spinner';

import { decideRoute } from './guard';
import type { AppModuleRoute } from './module';
import { registry, routeFor } from './registry';
import { Shell } from './shell/Shell';

/** Each module screen, lazy-loaded once; the element is made once too, so no component is created during render. */
const screens = new Map<AppModuleRoute, ReactElement>(
  registry.flatMap((module) =>
    module.routes.map((route) => {
      const Screen = lazy(route.screen);
      return [route, <Screen key={route.path} />] as const;
    }),
  ),
);

function NotFound() {
  return <p className="py-12 text-center text-muted-foreground">{WORDS.dashboard.notFound}</p>;
}

function Loading() {
  return (
    <div className="flex justify-center py-12">
      <Spinner className="size-6" />
    </div>
  );
}

function ModulePage() {
  const { _splat: splat } = moduleRoute.useParams();
  const found = routeFor(splat ?? '');
  const screen = found ? screens.get(found.route) : undefined;
  if (!screen) return <NotFound />;
  return <Suspense fallback={<Loading />}>{screen}</Suspense>;
}

export interface RouterContext {
  queryClient: QueryClient;
  client: ApiClient;
}

/**
 * Every page asks the guard first (decideRoute): signed out → Log in, no shop → Setup, pending → Waiting,
 * suspended → Paused, active → the shell. Session and shop come from the query cache.
 */
async function guard({ context, location }: { context: RouterContext; location: { href: string } }) {
  const { queryClient, client } = context;
  const session = await queryClient.query({ queryKey: qk.session, queryFn: () => getSession(client), staleTime: 'static' });
  const shop = session ? await queryClient.query({ queryKey: qk.myShop, queryFn: () => getMyShop(client), staleTime: 'static' }) : null;
  const decision = decideRoute(session, shop, location.href);
  if (decision !== 'ok') redirect({ href: decision.redirect, replace: true, throw: true });
}

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: Outlet, notFoundComponent: NotFound });

const shellRoute = createRoute({ getParentRoute: () => rootRoute, id: 'shell', component: Shell, beforeLoad: guard });

/** Full-screen pages outside the shell (sign-up, log in, setup, waiting). Same guard. */
const outsideRoute = createRoute({ getParentRoute: () => rootRoute, id: 'outside', component: Outlet, beforeLoad: guard });

const outsidePage = <TPath extends string>(path: TPath, load: () => Promise<{ default: () => ReactElement }>) =>
  createRoute({ getParentRoute: () => outsideRoute, path, component: lazyRouteComponent(load) });

const outsideRoutes = [
  outsidePage('/login', () => import('../features/auth/screens/LoginScreen')),
  outsidePage('/signup', () => import('../features/auth/screens/SignUpScreen')),
  outsidePage('/forgot-password', () => import('../features/auth/screens/ForgotPasswordScreen')),
  outsidePage('/setup', () => import('../features/auth/screens/SetupScreen')),
  outsidePage('/pending', () => import('../features/auth/screens/PendingScreen')),
  outsidePage('/suspended', () => import('../features/auth/screens/SuspendedScreen')),
];

const indexRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/',
  component: () => <Navigate to="/$" params={{ _splat: 'home' }} replace />,
});

/** Every installed component in light and dark; not in the nav. */
const kitRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/kit',
  component: lazyRouteComponent(() => import('./kit/KitScreen')),
});

/** Module pages: the registry decides which screen a path shows. */
const moduleRoute = createRoute({ getParentRoute: () => shellRoute, path: '$', component: ModulePage });

const routeTree = rootRoute.addChildren([
  outsideRoute.addChildren(outsideRoutes),
  shellRoute.addChildren([indexRoute, kitRoute, moduleRoute]),
]);

export function createAppRouter(context: RouterContext) {
  return createRouter({
    routeTree,
    context,
    defaultPreload: 'intent',
    defaultViewTransition: true,
    scrollRestoration: true,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
