import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ApiProvider, createDashboardClient } from '@smartapp/api';
import { Toaster } from '@smartapp/ui/components/sonner';
import { TooltipProvider } from '@smartapp/ui/components/tooltip';

import { createAppRouter } from './app/router';
import { readEnv } from './env';
import './styles.css';

const env = readEnv();
const client = createDashboardClient({ url: env.VITE_SUPABASE_URL, publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY });
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
const router = createAppRouter({ queryClient, client });

// A different user (or none) means everything cached belongs to someone else: clear it and run the guards again.
// Supabase calls this inside its auth lock, so the work is deferred instead of calling Supabase here.
let currentUser: string | null | undefined;
client.auth.onAuthStateChange((_event, session) => {
  const user = session?.user.id ?? null;
  if (currentUser !== undefined && user === currentUser) return;
  const first = currentUser === undefined;
  currentUser = user;
  if (first) return;
  window.setTimeout(() => {
    queryClient.clear();
    void router.invalidate();
  }, 0);
});

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element.');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={client}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster position="top-center" />
        </TooltipProvider>
      </ApiProvider>
    </QueryClientProvider>
  </StrictMode>,
);
