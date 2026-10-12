'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { signOut } from '@smartapp/api';
import { WORDS } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';

import { browserClient } from './browser-client';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="lg"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        signOut(browserClient()).then(
          () => {
            router.refresh();
          },
          () => {
            setBusy(false);
          },
        );
      }}
    >
      {WORDS.storefront.account.signOut}
    </Button>
  );
}
