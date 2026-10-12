'use client';

import { createContext, use, useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { addCartLine, canQuickAdd, priceCart, removeCartLine, setCartLineQty, WORDS } from '@smartapp/core';
import type { CartLine, OrderingBlock, PricedCart, Storefront, StorefrontItem } from '@smartapp/core';
import { toast, Toaster } from '@smartapp/ui/components/sonner';

import { CartSheet } from '../cart/CartSheet';
import { useCartLines } from '../cart/cart-store';
import { ItemSheet } from '../catalog/ItemSheet';
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
  /** Opens the item sheet. */
  openItem: (itemId: string) => void;
  /** The card's "+": adds at once when there is nothing to choose, else opens the sheet. */
  quickAdd: (item: StorefrontItem) => void;
  openCart: () => void;
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
      if (block) toast(block.short, { description: block.alert });
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
      openItem,
      quickAdd,
      openCart: () => {
        setCartOpen(true);
      },
    }),
    [storefront, media, block, catalogLabel, cart, added, addLine, updateLines, openItem, quickAdd],
  );

  const item = storefront.items.find((candidate) => candidate.id === itemId) ?? null;
  return (
    <ShopContext value={value}>
      {children}
      <ItemSheet item={item} open={itemOpen} onOpenChange={setItemOpen} />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
      <Toaster position="top-center" />
    </ShopContext>
  );
}
