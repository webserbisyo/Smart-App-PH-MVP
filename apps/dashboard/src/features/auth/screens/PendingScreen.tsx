import { useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useMyShop } from '@smartapp/api';
import { WORDS } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Spinner } from '@smartapp/ui/components/spinner';

import { AuthPage } from '../components/AuthPage';
import { LogOutButton } from '../components/LogOutButton';

const words = WORDS.dashboard.pending;

/** Waiting for the founder's approval. Refetches on window focus; Refresh asks again. No polling. */
export default function PendingScreen() {
  const shop = useMyShop();
  const router = useRouter();
  const status = shop.data?.status;
  // Approved (or paused) while this page was open: the guard decides where to go now.
  useEffect(() => {
    if (status !== undefined && status !== 'pending') void router.invalidate();
  }, [status, router]);
  return (
    <AuthPage title={words.title} intro={words.text}>
      <div className="flex flex-col gap-3">
        {shop.data ? <p className="text-lg font-semibold">{shop.data.name}</p> : null}
        <Button
          size="lg"
          disabled={shop.isFetching}
          onClick={() => {
            void shop.refetch();
          }}
        >
          {shop.isFetching ? <Spinner /> : null}
          {words.refresh}
        </Button>
        <LogOutButton />
      </div>
    </AuthPage>
  );
}
