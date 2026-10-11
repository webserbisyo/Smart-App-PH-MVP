import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Toaster } from '@smartapp/ui/components/sonner';
import { TooltipProvider } from '@smartapp/ui/components/tooltip';

import { router } from './app/router';
import './styles.css';

const queryClient = new QueryClient();
const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element.');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
