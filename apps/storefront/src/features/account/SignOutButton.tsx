'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { qk, signOut, useApiClient } from '@smartapp/api';
import { WORDS } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';

import { useShop } from '../shell/ShopProvider';

/**
 * Signs out, marks the session gone (so no account read goes out without a login), forgets the member's account
 * and re-reads the page on the server.
 */
export function SignOutButton() {
  const router = useRouter();
  const { storefront } = useShop();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const leave = useMutation({
    mutationFn: () => signOut(client),
    onSuccess: () => {
      queryClient.setQueryData(qk.session, null);
      queryClient.removeQueries({ queryKey: qk.myAccount(storefront.shop.slug) });
      router.refresh();
    },
  });
  return (
    <Button
      variant="outline"
      size="lg"
      disabled={leave.isPending}
      onClick={() => {
        leave.mutate();
      }}
    >
      {WORDS.storefront.account.signOut}
    </Button>
  );
}
