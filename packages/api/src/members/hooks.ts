'use client';

import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CustomerAddress, MemberAccount, RewardClaim, RewardRule, StampRule } from '@smartapp/core';

import { useSession } from '../auth/hooks';
import { qk } from '../keys';
import { parseMyOrders, readMyOrdersRaw } from '../orders/my-orders';
import { useApiClient } from '../provider';

import {
  claimReward,
  getCustomerClaims,
  getMyAccount,
  getMyClaims,
  getStampRule,
  joinAsMember,
  removeMyAddress,
  saveMyAddress,
  saveStampRule,
  settleRewardClaim,
} from './members';

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
    mutationFn: (rule: RewardRule | StampRule): Promise<RewardRule> => saveStampRule(client, rule),
    onSuccess: (rule) => {
      queryClient.setQueryData(qk.stampRule(rule.tenantId), rule);
    },
  });
}

/** Claims a custom reward code using stamps. */
export function useClaimReward(slug: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => claimReward(client, slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.myAccount(slug) });
      void queryClient.invalidateQueries({ queryKey: ['my-claims'] });
    },
  });
}

/** Owner settles or cancels a custom reward claim. */
export function useSettleRewardClaim() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, given }: { claimId: string; given: boolean }) =>
      settleRewardClaim(client, claimId, given),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.allCustomerClaims });
      void queryClient.invalidateQueries({ queryKey: qk.allCustomers });
      void queryClient.invalidateQueries({ queryKey: qk.allOrders });
      void queryClient.invalidateQueries({ queryKey: ['my-claims'] });
    },
  });
}

/** Owner: returns pending reward claims for a customer. */
export function useCustomerClaims(customerId: string | null) {
  const client = useApiClient();
  return useQuery<RewardClaim[]>({
    queryKey: customerId ? qk.customerClaims(customerId) : ['customer-claims', null],
    queryFn: customerId ? () => getCustomerClaims(client, customerId) : skipToken,
    enabled: customerId !== null,
  });
}

/** Signed-in member: returns their claims in the shop. */
export function useMyClaims(tenantId: string | null) {
  const client = useApiClient();
  const session = useSession();
  const signedIn = session.data !== null && session.data !== undefined;
  return useQuery<RewardClaim[]>({
    queryKey: tenantId ? qk.myClaims(tenantId) : ['my-claims', null],
    queryFn: signedIn && tenantId ? () => getMyClaims(client, tenantId) : skipToken,
    enabled: signedIn && tenantId !== null,
  });
}

