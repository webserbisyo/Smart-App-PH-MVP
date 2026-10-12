import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { createStorefrontServerClient, getVerifiedUser } from '@smartapp/api';

import { readEnv } from './env';

/**
 * Refreshes the Supabase session cookie on each request (Next 16 proxy). Guests have no `sb-` cookie and are
 * most of the traffic, so they pass straight through without calling Supabase.
 */
export async function proxy(request: NextRequest) {
  if (!request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-'))) return NextResponse.next({ request });

  const env = readEnv();
  let response = NextResponse.next({ request });
  const client = createStorefrontServerClient(
    { url: env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
    {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies, headers) => {
        for (const { name, value } of cookies) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookies) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  );
  // Verifies the JWT and refreshes it when it is about to expire (the refresh writes the cookies above).
  await getVerifiedUser(client);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
