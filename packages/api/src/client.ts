import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { setMediaClient } from './media';

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
  const client = createClient<Database>(env.url, env.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  setMediaClient(client);
  return client;
}

/** Storefront server code (server components, proxy): the session lives in cookies. */
export function createStorefrontServerClient(env: ApiEnv, cookies: CookieAdapter): ApiClient {
  const client = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (toSet, headers) => {
        cookies.setAll(toSet, headers);
      },
    },
  });
  setMediaClient(client);
  return client;
}

/** Storefront client components: the same cookie session as the server client. */
export function createStorefrontBrowserClient(env: ApiEnv): ApiClient {
  const client = createBrowserClient<Database>(env.url, env.publishableKey);
  setMediaClient(client);
  return client;
}

/** No session at all: for shop pages that must stay cacheable. */
export function createPublicClient(env: ApiEnv): ApiClient {
  const client = createClient<Database>(env.url, env.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  setMediaClient(client);
  return client;
}
