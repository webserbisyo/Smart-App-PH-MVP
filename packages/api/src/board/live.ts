import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { ShopOrderChange } from '@smartapp/core';

import type { ApiClient } from '../client';

/** While the shop channel is not joined, the board refetches this often (paper 10). */
export const SHOP_POLL_MS = 15_000;

/** A channel the board listens on: calls back with each message's payload and whenever it joins or drops. */
export interface ShopChannelSource {
  join(topic: string, onMessage: (payload: unknown) => void, onJoined: (joined: boolean) => void): () => void;
}

export interface ShopOrdersHandlers {
  /** Refetch the board (and one order's detail when the message names it). */
  refresh: (orderId: string | null) => void;
  onNewOrder?: ((change: ShopOrderChange) => void) | undefined;
  onToVerify?: ((change: ShopOrderChange) => void) | undefined;
  onJoined?: ((joined: boolean) => void) | undefined;
}

/**
 * Listens on the private `shop:<tenantId>` channel: every message refreshes the board, a new order calls onNewOrder
 * and a proof waiting to be checked calls onToVerify (the screen plays the chime). Until the channel is joined, and
 * whenever it drops, the board refreshes every 15 seconds instead. Returns the function that stops listening.
 */
export function watchShopOrders(
  source: ShopChannelSource,
  tenantId: string,
  handlers: ShopOrdersHandlers,
  pollMs = SHOP_POLL_MS,
): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  const startPolling = () => {
    timer ??= setInterval(() => {
      handlers.refresh(null);
    }, pollMs);
  };
  const stopPolling = () => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };

  startPolling();
  const leave = source.join(
    `shop:${tenantId}`,
    (payload) => {
      const change = ShopOrderChange.safeParse(payload);
      if (!change.success) {
        handlers.refresh(null);
        return;
      }
      handlers.refresh(change.data.orderId);
      if (change.data.op === 'insert') handlers.onNewOrder?.(change.data);
      else if (change.data.paymentStatus === 'pending') handlers.onToVerify?.(change.data);
    },
    (joined) => {
      handlers.onJoined?.(joined);
      if (joined) {
        stopPolling();
        // Catch up on anything that changed while the channel was down.
        handlers.refresh(null);
      } else {
        startPolling();
      }
    },
  );

  return () => {
    stopPolling();
    leave();
  };
}

/** The real channel: signs the socket in (the channel is private, RLS lets only the shop's owners join), then joins. */
export function supabaseShopChannel(client: ApiClient): ShopChannelSource {
  return {
    join(topic, onMessage, onJoined) {
      let channel: RealtimeChannel | null = null;
      let left = false;
      client.realtime
        .setAuth()
        .then(() => {
          if (left) return;
          channel = client
            .channel(topic, { config: { private: true } })
            .on('broadcast', { event: 'order_changed' }, (message) => {
              onMessage(message.payload);
            })
            .subscribe((status) => {
              onJoined(status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
            });
        })
        .catch(() => {
          // No session for the socket: the board keeps polling.
          onJoined(false);
        });
      return () => {
        left = true;
        if (channel !== null) void client.removeChannel(channel);
      };
    },
  };
}
