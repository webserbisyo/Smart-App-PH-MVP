'use client';

import { createStorefrontBrowserClient } from '@smartapp/api';
import type { ApiClient } from '@smartapp/api';

import { readEnv } from '../../env';

let client: ApiClient | null = null;

/** One browser client per tab, sharing the cookie session with the server. */
export function browserClient(): ApiClient {
  if (client === null) {
    const env = readEnv();
    client = createStorefrontBrowserClient({ url: env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY });
  }
  return client;
}
