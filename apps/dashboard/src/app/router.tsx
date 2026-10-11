import { createRootRoute, createRoute, createRouter, lazyRouteComponent, Navigate, Outlet } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';

import { WORDS } from '@smartapp/core';
import { Spinner } from '@smartapp/ui/components/spinner';

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

const rootRoute = createRootRoute({ component: Outlet, notFoundComponent: NotFound });

const shellRoute = createRoute({ getParentRoute: () => rootRoute, id: 'shell', component: Shell });

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

const routeTree = rootRoute.addChildren([shellRoute.addChildren([indexRoute, kitRoute, moduleRoute])]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultViewTransition: true,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
