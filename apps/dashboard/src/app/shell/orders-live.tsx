import { createContext, use, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

import { useOrders, useShopOrdersLive } from '@smartapp/api';
import { boardColumn, WORDS } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { toast } from '@smartapp/ui/components/sonner';
import { IconBell } from '@smartapp/ui/icons';

import { useShop } from '../shop';

import { enableSound, playChime, soundReady, subscribeSound } from './chime';

const words = WORDS.dashboard.orders;

interface OrdersLive {
  /** The shop channel is joined; false while it polls instead. */
  live: boolean;
  /** Orders in the New column. */
  newCount: number;
}

const OrdersLiveContext = createContext<OrdersLive>({ live: false, newCount: 0 });

/** Live orders for the whole dashboard: one shop channel, the chime and a toast on every new order or proof. */
export function OrdersLiveProvider({ children }: { children: ReactNode }) {
  const shop = useShop();
  const open = useOrders(shop.id, { kind: 'open' });
  const { live } = useShopOrdersLive(shop.id, {
    onNewOrder: () => {
      playChime();
      toast(words.newOrder);
    },
    onToVerify: () => {
      playChime();
      toast(words.toVerify);
    },
  });
  const newCount = (open.data ?? []).filter((card) => boardColumn(card.order) === 'new').length;
  return <OrdersLiveContext value={{ live, newCount }}>{children}</OrdersLiveContext>;
}

export function useOrdersLive(): OrdersLive {
  return use(OrdersLiveContext);
}

/** "Turn on order sound" until the first tap unlocks it (browsers block sound before that). */
export function SoundChip() {
  const ready = useSyncExternalStore(subscribeSound, soundReady, () => false);
  if (ready) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      onClick={() => {
        void enableSound().then(() => {
          playChime();
          toast.success(words.soundOn);
        });
      }}
    >
      <IconBell aria-hidden="true" />
      {words.sound}
    </Button>
  );
}
