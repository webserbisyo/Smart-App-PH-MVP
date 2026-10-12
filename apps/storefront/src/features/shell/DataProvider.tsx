'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { ApiProvider } from '@smartapp/api';

import { browserClient } from '../account/browser-client';

/**
 * TanStack Query and the browser's Supabase client for the order hooks (checkout, receipt, My orders). Shop data
 * itself is read on the server; these queries run only in the browser.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={browserClient()}>{children}</ApiProvider>
    </QueryClientProvider>
  );
}
