import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

/** Every client in the apps: typed with the generated database types. */
export type ApiClient = SupabaseClient<Database>;

/** What an app passes in. packages/api never reads env itself. */
export interface ApiEnv {
  url: string;
  publishableKey: string;
}

/** The cookie store a Next server component or proxy passes in, so packages/api never imports `next`. */
export interface CookieAdapter {
  getAll(): { name: string; value: string }[];
  setAll(cookies: { name: string; value: string; options: CookieOptions }[], headers: Record<string, string>): void;
}

/** Dashboard: a browser client with the session in localStorage. */
export function createDashboardClient(env: ApiEnv): ApiClient {
  return createClient<Database>(env.url, env.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
}

/** Storefront server code (server components, proxy): the session lives in cookies. */
export function createStorefrontServerClient(env: ApiEnv, cookies: CookieAdapter): ApiClient {
  return createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (toSet, headers) => {
        cookies.setAll(toSet, headers);
      },
    },
  });
}

/** Storefront client components: the same cookie session as the server client. */
export function createStorefrontBrowserClient(env: ApiEnv): ApiClient {
  return createBrowserClient<Database>(env.url, env.publishableKey);
}

/** No session at all: for shop pages that must stay cacheable. */
export function createPublicClient(env: ApiEnv): ApiClient {
  return createClient<Database>(env.url, env.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
