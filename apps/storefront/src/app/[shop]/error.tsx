'use client';

import { useEffect } from 'react';

import { Button } from '@smartapp/ui/components/button';
import { IconAlertTriangle, IconRefresh } from '@smartapp/ui/icons';

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Shop error caught:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <IconAlertTriangle className="size-7 stroke-[1.5]" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            There was an issue loading this shop section. Please try again.
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full pt-2">
          <Button variant="shop" onClick={reset} className="w-full gap-2">
            <IconRefresh className="size-4" />
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.reload();
            }}
            className="w-full"
          >
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}
