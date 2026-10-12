'use client';

import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CustomerAddress, MemberAccount, StampRule } from '@smartapp/core';

import { useSession } from '../auth/hooks';
import { qk } from '../keys';
import { parseMyOrders, readMyOrdersRaw } from '../orders/my-orders';
import { useApiClient } from '../provider';

import { getMyAccount, getStampRule, joinAsMember, removeMyAddress, saveMyAddress, saveStampRule } from './members';
import type { AddressInput, JoinAsMemberInput } from './members';

/** What the join sheet sends; `orderToken` null uses the newest receipt this device holds for the shop. */
export type JoinInput = Omit<JoinAsMemberInput, 'orderToken'> & { orderToken: string | null };

/**
 * Joins the shop. Without a token from the screen it sends the newest receipt token this device placed in the shop
 * (useMyOrderTokens), which is what links earlier guest orders (decision P5-10).
 */
export function useJoinAsMember() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: JoinInput): Promise<MemberAccount> =>
      joinAsMember(client, { ...input, orderToken: input.orderToken ?? parseMyOrders(readMyOrdersRaw(input.slug))[0] ?? null }),
    onSuccess: (account, { slug }) => {
      queryClient.setQueryData(qk.myAccount(slug), account);
      void queryClient.invalidateQueries({ queryKey: qk.myAccount(slug) });
      void queryClient.invalidateQueries({ queryKey: qk.storefront(slug) });
    },
  });
}

/** The signed-in customer's account here: null when not a member; waits while nobody is signed in. */
export function useMyAccount(slug: string) {
  const client = useApiClient();
  const session = useSession();
  const signedIn = session.data !== null && session.data !== undefined;
  return useQuery<MemberAccount | null>({
    queryKey: qk.myAccount(slug),
    queryFn: signedIn ? () => getMyAccount(client, slug) : skipToken,
  });
}

/** Adds or edits a saved address, then refreshes the account. */
export function useSaveMyAddress(slug: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddressInput): Promise<CustomerAddress> => saveMyAddress(client, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.myAccount(slug) });
    },
  });
}

export function useRemoveMyAddress(slug: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string): Promise<void> => removeMyAddress(client, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.myAccount(slug) });
    },
  });
}

/** The owner's stamp card. */
export function useStampRule(tenantId: string) {
  const client = useApiClient();
  return useQuery<StampRule>({ queryKey: qk.stampRule(tenantId), queryFn: () => getStampRule(client, tenantId) });
}

export function useSaveStampRule() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rule: StampRule): Promise<StampRule> => saveStampRule(client, rule),
    onSuccess: (rule) => {
      queryClient.setQueryData(qk.stampRule(rule.tenantId), rule);
    },
  });
}
