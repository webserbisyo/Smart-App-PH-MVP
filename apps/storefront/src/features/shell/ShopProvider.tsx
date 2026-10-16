'use client';

import { createContext, use, useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { addCartLine, canQuickAdd, priceCart, removeCartLine, setCartLineQty, WORDS } from '@smartapp/core';
import type { CartLine, OrderingBlock, PricedCart, Storefront, StorefrontItem } from '@smartapp/core';
import { toast, Toaster } from '@smartapp/ui/components/sonner';

import { CartSheet } from '../cart/CartSheet';
import { useCartLines } from '../cart/cart-store';
import { ItemSheet } from '../catalog/ItemSheet';
import '../install/install-prompt';
import { JoinSheet } from '../members/JoinSheet';
import type { JoinFrom } from '../members/JoinSheet';
import type { MediaUrls } from './shop';

interface ShopContextValue {
  storefront: Storefront;
  /** Public URLs of the shop's images, by path. */
  media: Readonly<Record<string, MediaUrls>>;
  /** Why ordering is off now (closed or paused), or null. */
  block: OrderingBlock | null;
  /** "Menu" or "Products". */
  catalogLabel: string;
  cart: PricedCart;
  /** Grows by one on every add, so the cart bar can bump. */
  added: number;
  addLine: (line: CartLine, name: string) => void;
  setQty: (index: number, qty: number) => void;
  removeLine: (index: number) => void;
  /** Empties the cart (after the order is placed). */
  clearCart: () => void;
  /** Opens the item sheet. */
  openItem: (itemId: string) => void;
  /** The card's "+": adds at once when there is nothing to choose, else opens the sheet. */
  quickAdd: (item: StorefrontItem) => void;
  openCart: () => void;
  /** Opens the join sheet; a receipt passes its order so it links and counts. */
  openJoin: (from: JoinFrom | null) => void;
  /**
   * The member's "Use ₱100 off" switch, shared by the cart and checkout. `rejected` is set when the database said
   * the reward is not ready (`reward_unavailable`), so both can say why the switch went off.
   */
  reward: { on: boolean; rejected: boolean };
  setRewardOn: (on: boolean) => void;
  rejectReward: () => void;
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function useShop(): ShopContextValue {
  const value = use(ShopContext);
  if (!value) throw new Error('useShop must be used inside ShopProvider.');
  return value;
}

export interface ShopProviderProps {
  storefront: Storefront;
  media: Record<string, MediaUrls>;
  block: OrderingBlock | null;
  catalogLabel: string;
  children: ReactNode;
}

/** The shop's data, cart, item sheet and cart sheet for every page of one storefront. */
export function ShopProvider({ storefront, media, block, catalogLabel, children }: ShopProviderProps) {
  const [lines, updateLines] = useCartLines(storefront.shop.slug);
  const [itemId, setItemId] = useState<string | null>(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [added, setAdded] = useState(0);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinFrom, setJoinFrom] = useState<JoinFrom | null>(null);
  const [reward, setReward] = useState({ on: false, rejected: false });
  const cart = useMemo(() => priceCart(storefront.items, lines), [storefront.items, lines]);

  const addLine = useCallback(
    (line: CartLine, name: string) => {
      updateLines((current) => addCartLine(current, line));
      setAdded((count) => count + 1);
      toast.success(WORDS.storefront.item.added(name), { duration: 1500 });
      if ('vibrate' in navigator) navigator.vibrate(10);
    },
    [updateLines],
  );

  const openItem = useCallback((id: string) => {
    setItemId(id);
    setItemOpen(true);
  }, []);

  const quickAdd = useCallback(
    (item: StorefrontItem) => {
      const [only] = item.variants;
      if (block) toast.warning(block.short, { description: block.alert });
      else if (only && canQuickAdd(item)) addLine({ itemId: item.id, variantId: only.id, optionIds: [], qty: 1, note: null }, item.name);
      else openItem(item.id);
    },
    [addLine, block, openItem],
  );

  const value = useMemo<ShopContextValue>(
    () => ({
      storefront,
      media,
      block,
      catalogLabel,
      cart,
      added,
      addLine,
      setQty: (index, qty) => {
        updateLines((current) => setCartLineQty(current, index, qty));
      },
      removeLine: (index) => {
        updateLines((current) => removeCartLine(current, index));
      },
      clearCart: () => {
        updateLines(() => []);
        setReward({ on: false, rejected: false });
      },
      openItem,
      quickAdd,
      openCart: () => {
        setCartOpen(true);
      },
      openJoin: (from) => {
        setJoinFrom(from);
        setCartOpen(false);
        setJoinOpen(true);
      },
      reward,
      setRewardOn: (on) => {
        setReward({ on, rejected: false });
      },
      rejectReward: () => {
        setReward({ on: false, rejected: true });
      },
    }),
    [storefront, media, block, catalogLabel, cart, added, addLine, updateLines, openItem, quickAdd, reward],
  );

  const item = storefront.items.find((candidate) => candidate.id === itemId) ?? null;
  return (
    <ShopContext value={value}>
      {children}
      <ItemSheet item={item} open={itemOpen} onOpenChange={setItemOpen} />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
      <JoinSheet open={joinOpen} onOpenChange={setJoinOpen} from={joinFrom} />
      <Toaster position="top-center" />
    </ShopContext>
  );
}
