'use client';

import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { keepPreviousData, skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import type {
  DeliveryProvider,
  Order,
  OrderMessage,
  OrderReceipt,
  Payment,
  PushSubscription,
  Quote,
  QuotePayload,
} from '@smartapp/core';

import { qk } from '../keys';
import { useApiClient } from '../provider';

import { parseMyOrders, readMyOrdersRaw, rememberMyOrder, subscribeMyOrders } from './my-orders';
import {
  createOrderPlacer,
  getOrder,
  getOrderMessages,
  placeOrder,
  quoteOrder,
  rateOrder,
  setDeliveryInfo,
  submitPaymentProof,
  subscribeOrderPush,
} from './orders';
import type { OrderInput, PaymentProofInput, PlacedOrder } from './orders';


/** While the live channel is not joined, the receipt refetches this often (paper 10). */
export const ORDER_POLL_MS = 15_000;

/** The priced cart; re-runs when the payload changes. Pass null while there is nothing to price. */
export function useQuote(slug: string, payload: QuotePayload | null) {
  const client = useApiClient();
  return useQuery<Quote>({
    queryKey: qk.quote(slug, payload),
    queryFn: payload === null ? skipToken : () => quoteOrder(client, slug, payload),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

/**
 * Places the order. One clientKey per checkout: a retry after a failure reuses it (and gets the same order); a
 * success starts a new one and remembers the token for the Orders tab.
 */
export function usePlaceOrder() {
  const client = useApiClient();
  const [place] = useState(() => createOrderPlacer((slug, payload) => placeOrder(client, slug, payload)));
  return useMutation({
    mutationFn: ({ slug, payload }: { slug: string; payload: OrderInput }): Promise<PlacedOrder> => place(slug, payload),
    onSuccess: (placed, { slug }) => {
      rememberMyOrder(slug, placed.token);
    },
  });
}

/** The receipt (`null` when the link is not an order). */
export function useOrder(token: string) {
  const client = useApiClient();
  return useQuery<OrderReceipt | null>({ queryKey: qk.order(token), queryFn: () => getOrder(client, token) });
}

/**
 * Keeps the receipt live: joins the public `order:<token>` channel and refetches useOrder on each change. While the
 * channel is not joined it refetches every 15 seconds instead. Returns whether the channel is joined.
 */
export function useOrderLive(token: string): { live: boolean } {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: qk.order(token) });
    };
    const channel = client
      .channel(`order:${token}`, { config: { private: false } })
      .on('broadcast', { event: 'order_changed' }, refresh)
      .on('broadcast', { event: 'message_added' }, refresh)
      .subscribe((status) => {
        const joined = status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED;
        setLive(joined);
        // Catch up on anything that changed while the channel was down.
        if (joined) refresh();
      });
    return () => {
      setLive(false);
      void client.removeChannel(channel);
    };
  }, [client, queryClient, token]);

  useEffect(() => {
    if (live) return undefined;
    const timer = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: qk.order(token) });
    }, ORDER_POLL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [live, queryClient, token]);

  return { live };
}

/** Sends a proof and reference number, then refetches the receipt. */
export function useSubmitPaymentProof() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentProofInput): Promise<Payment> => submitPaymentProof(client, input),
    onSuccess: (_payment, input) => {
      void queryClient.invalidateQueries({ queryKey: qk.order(input.token) });
      void queryClient.invalidateQueries({ queryKey: qk.orderMessages(input.token) });
    },
  });
}

/** Receipt tokens this device placed in the shop, newest first (the guest Orders tab). */
export function useMyOrderTokens(slug: string): string[] {
  const raw = useSyncExternalStore(subscribeMyOrders, () => readMyOrdersRaw(slug), () => '[]');
  return useMemo(() => parseMyOrders(raw), [raw]);
}

/**
 * Messages and timeline events for an order, kept live via realtime broadcasts on `order:<token>`.
 */
export function useOrderMessages(token: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: qk.orderMessages(token) });
    };
    const channel = client
      .channel(`order:${token}`, { config: { private: false } })
      .on('broadcast', { event: 'message_added' }, refresh)
      .on('broadcast', { event: 'order_changed' }, refresh)
      .subscribe((status) => {
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) refresh();
      });
    return () => {
      void client.removeChannel(channel);
    };
  }, [client, queryClient, token]);

  return useQuery<OrderMessage[]>({
    queryKey: qk.orderMessages(token),
    queryFn: () => getOrderMessages(client, token),
  });
}

/** Customer rates a completed order. */
export function useRateOrder() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ token, stars, comment }: { token: string; stars: number; comment?: string | null }) =>
      rateOrder(client, token, stars, comment),
    onSuccess: (_rating, { token }) => {
      void queryClient.invalidateQueries({ queryKey: qk.order(token) });
    },
  });
}

/** Owner sets delivery provider, rider and tracking link. */
export function useSetDeliveryInfo() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      provider,
      trackingUrl,
      riderName,
      riderPhone,
    }: {
      orderId: string;
      provider: DeliveryProvider;
      trackingUrl?: string | null;
      riderName?: string | null;
      riderPhone?: string | null;
    }): Promise<Order> => setDeliveryInfo(client, orderId, provider, trackingUrl, riderName, riderPhone),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: qk.order(order.token) });
      void queryClient.invalidateQueries({ queryKey: qk.allOrders });
    },
  });
}

/** Subscribes an order link to Web Push notifications. */
export function useSubscribeOrderPush() {
  const client = useApiClient();
  return useMutation({
    mutationFn: ({ token, subscription }: { token: string; subscription: PushSubscription }) =>
      subscribeOrderPush(client, token, subscription),
  });
}

