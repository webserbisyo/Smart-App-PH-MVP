import { cookies } from 'next/headers';

import { createStorefrontServerClient } from '@smartapp/api';
import type { ApiClient } from '@smartapp/api';

import { readEnv } from '../../env';

/** A per-request server client on the cookie session. Server components only; user from `getVerifiedUser`. */
export async function serverClient(): Promise<ApiClient> {
  const env = readEnv();
  const store = await cookies();
  return createStorefrontServerClient(
    { url: env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
    {
      getAll: () => store.getAll(),
      // Server components cannot set cookies; the proxy refreshes them.
      setAll: () => undefined,
    },
  );
}
