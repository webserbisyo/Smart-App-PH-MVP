'use client';

import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import type { BoardOrder, Order, OrderReceipt, Payment, ShopOrderChange } from '@smartapp/core';

import { qk } from '../keys';
import { useApiClient } from '../provider';

import { advanceOrder, cancelOrder, getOrderDetail, getOrders, getProofUrl, recordPayment, reviewPayment } from './board';
import type { AdvanceOrderInput, CancelOrderInput, OrderScope, RecordPaymentInput, ReviewPaymentInput } from './board';
import { PROOF_URL_SECONDS } from './board';
import { supabaseShopChannel, watchShopOrders } from './live';

/** The board's orders: `open` (in progress, plus today's completed) or one Manila day. */
export function useOrders(tenantId: string | null, scope: OrderScope) {
  const client = useApiClient();
  return useQuery<BoardOrder[]>({
    queryKey: qk.orderList(tenantId ?? '', scope),
    queryFn: tenantId === null ? skipToken : () => getOrders(client, tenantId, scope),
  });
}

/** One order with its lines, timeline and payments (`null` when it is not the owner's). */
export function useOrderDetail(orderId: string | null) {
  const client = useApiClient();
  return useQuery<OrderReceipt | null>({
    queryKey: qk.orderDetail(orderId ?? ''),
    queryFn: orderId === null ? skipToken : () => getOrderDetail(client, orderId),
  });
}

/** A 5-minute link to a proof photo, renewed before it runs out. */
export function useProofUrl(path: string | null) {
  const client = useApiClient();
  return useQuery<string>({
    queryKey: qk.proofUrl(path ?? ''),
    queryFn: path === null ? skipToken : () => getProofUrl(client, path),
    staleTime: (PROOF_URL_SECONDS - 60) * 1000,
    refetchInterval: (PROOF_URL_SECONDS - 60) * 1000,
  });
}

export interface ShopOrdersCallbacks {
  onNewOrder?: (change: ShopOrderChange) => void;
  onToVerify?: (change: ShopOrderChange) => void;
}

/**
 * Keeps the board live on the private `shop:<tenantId>` channel and calls back for a new order or a proof to check
 * (the screen plays the chime). Polls every 15 seconds while the channel is not joined. Returns whether it is joined.
 */
export function useShopOrdersLive(tenantId: string | null, callbacks: ShopOrdersCallbacks = {}): { live: boolean } {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);
  // The latest callbacks, without joining the channel again when the screen passes new functions.
  const latest = useRef(callbacks);
  useEffect(() => {
    latest.current = callbacks;
  });

  useEffect(() => {
    if (tenantId === null) return undefined;
    const stop = watchShopOrders(supabaseShopChannel(client), tenantId, {
      refresh: (orderId) => {
        refreshNumbers(queryClient, tenantId);
        if (orderId !== null) void queryClient.invalidateQueries({ queryKey: qk.orderDetail(orderId) });
      },
      onNewOrder: (change) => latest.current.onNewOrder?.(change),
      onToVerify: (change) => latest.current.onToVerify?.(change),
      onJoined: setLive,
    });
    return () => {
      setLive(false);
      stop();
    };
  }, [client, queryClient, tenantId]);

  return { live };
}

/** After any order change: refetch the shop's order lists and every number that counts orders (Home, Reports, Customers). */
function refreshNumbers(queryClient: QueryClient, tenantId: string): void {
  const keys = [qk.orders(tenantId), qk.dashboardToday(tenantId), qk.memberInsights(tenantId), qk.salesReports(tenantId), qk.customers(tenantId)];
  for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
}

/** After any owner action: refetch the shop's board, Home, Reports, Customers and the order. */
function refreshAfter(queryClient: QueryClient, tenantId: string, orderId: string): void {
  refreshNumbers(queryClient, tenantId);
  void queryClient.invalidateQueries({ queryKey: qk.orderDetail(orderId) });
}

export function useReviewPayment() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewPaymentInput): Promise<Payment> => reviewPayment(client, input),
    onSuccess: (payment) => {
      refreshAfter(queryClient, payment.tenantId, payment.orderId);
    },
  });
}

/** The board's lists with one order changed. */
function withOrder(orders: BoardOrder[] | undefined, orderId: string, change: Partial<Order>): BoardOrder[] | undefined {
  return orders?.map((card) => (card.order.id === orderId ? { ...card, order: { ...card.order, ...change } } : card));
}

/** The board's lists with one order moved to a new status. */
export function withStatus(orders: BoardOrder[] | undefined, orderId: string, status: Order['status']): BoardOrder[] | undefined {
  return withOrder(orders, orderId, { status });
}

/** Changes the order on every board list at once and returns how to put the lists back. */
async function optimistic(queryClient: QueryClient, orderId: string, change: Partial<Order>) {
  await queryClient.cancelQueries({ queryKey: qk.allOrders });
  const before = queryClient.getQueriesData<BoardOrder[]>({ queryKey: qk.allOrders });
  queryClient.setQueriesData<BoardOrder[]>({ queryKey: qk.allOrders }, (orders) => withOrder(orders, orderId, change));
  return { before };
}

function rollback(queryClient: QueryClient, context: Awaited<ReturnType<typeof optimistic>> | undefined): void {
  for (const [key, orders] of context?.before ?? []) queryClient.setQueryData(key, orders);
}

/** Marks the card paid at once; puts it back if the database refuses. */
export function useRecordPayment() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordPaymentInput): Promise<Payment> => recordPayment(client, input),
    onMutate: (input) => optimistic(queryClient, input.orderId, { paymentStatus: 'paid', paymentMethod: input.method }),
    onError: (_error, _input, context) => {
      rollback(queryClient, context);
    },
    onSuccess: (payment) => {
      refreshAfter(queryClient, payment.tenantId, payment.orderId);
    },
  });
}

/** Moves the card at once; puts it back if the database refuses the step. */
export function useAdvanceOrder() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdvanceOrderInput): Promise<Order> => advanceOrder(client, input),
    onMutate: (input) => optimistic(queryClient, input.orderId, { status: input.toStatus }),
    onError: (_error, _input, context) => {
      rollback(queryClient, context);
    },
    onSuccess: (order) => {
      refreshAfter(queryClient, order.tenantId, order.id);
    },
  });
}

export function useCancelOrder() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CancelOrderInput): Promise<Order> => cancelOrder(client, input),
    onSuccess: (order) => {
      refreshAfter(queryClient, order.tenantId, order.id);
    },
  });
}
