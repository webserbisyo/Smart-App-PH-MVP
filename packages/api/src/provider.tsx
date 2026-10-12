'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import type { ApiClient } from './client';

const ApiContext = createContext<ApiClient | null>(null);

/** Gives every hook below it the app's Supabase client. Goes inside the QueryClientProvider. */
export function ApiProvider({ client, children }: { client: ApiClient; children: ReactNode }) {
  return <ApiContext value={client}>{children}</ApiContext>;
}

/** The client from the nearest ApiProvider. */
export function useApiClient(): ApiClient {
  const client = useContext(ApiContext);
  if (!client) throw new Error('useApiClient needs an <ApiProvider> above it.');
  return client;
}
