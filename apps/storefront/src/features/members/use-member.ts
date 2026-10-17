'use client';

import { useMyAccount, useSession } from '@smartapp/api';
import { stampProgress } from '@smartapp/core';
import type { MemberAccount, RewardRule, StampProgress } from '@smartapp/core';

import { useShop } from '../shell/ShopProvider';

export interface MemberState {
  /** Undefined while the browser's session is read. */
  signedIn: boolean | undefined;
  email: string | null;
  /** Undefined while loading (or signed out), null when signed in but not a member of this shop. */
  account: MemberAccount | null | undefined;
  /** The shop's stamp card when it is on, else null. */
  rule: RewardRule | null;
  /** Where the member stands; null for guests and when the stamp card is off. */
  progress: StampProgress | null;
  /** The account could not be loaded (offline or a server error). */
  failed: boolean;
  retry: () => void;
}

/** The visitor as a member of this shop: signed in or not, their account, and their stamp progress. */
export function useMember(): MemberState {
  const { storefront } = useShop();
  const session = useSession();
  const account = useMyAccount(storefront.shop.slug);
  const signedIn = session.data === undefined ? undefined : session.data !== null;
  const data = signedIn ? account.data : undefined;
  // The account's card is the newest; the page's comes from the server render.
  const sourceRule = data ? data.stampRule : storefront.stampRule;
  const rule = sourceRule?.isActive ? sourceRule : null;
  return {
    signedIn,
    email: session.data?.email ?? null,
    account: data,
    rule,
    progress: data ? stampProgress(data.stamps, rule) : null,
    failed: session.isError || (signedIn === true && account.isError),
    retry: () => {
      void session.refetch();
      void account.refetch();
    },
  };
}
