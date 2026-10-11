'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { WORDS } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@smartapp/ui/components/drawer';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@smartapp/ui/components/sheet';
import {
  IconBuildingStore,
  IconHome,
  IconHomeFilled,
  IconReceipt,
  IconReceiptFilled,
  IconShoppingBag,
  IconUser,
  IconUserFilled,
} from '@smartapp/ui/icons';
import type { ShellNavItem } from '@smartapp/ui/lib/nav';
import { cn } from '@smartapp/ui/lib/utils';
import { CartBar } from '@smartapp/ui/patterns/CartBar';
import { StoreTabBar } from '@smartapp/ui/patterns/StoreTabBar';

const words = WORDS.storefront;

export interface StoreNavProps {
  slug: string;
  shopName: string;
  /** "Menu" or "Products" (VOCAB). */
  catalogLabel: string;
}

/** Cart summary until the cart exists (P4.2). */
const CART_TEXT = words.cart.bar(0, '₱0');

/**
 * Storefront nav, one per device: phones and tablets get the bottom tab bar with the cart bar above it;
 * desktops (from 1024 px) get the top navigation and a cart drawer on the right.
 */
export function StoreNav({ slug, shopName, catalogLabel }: StoreNavProps) {
  const pathname = usePathname();
  // One cart per device: the desktop sheet and the phone drawer each keep their own open state, so opening
  // one never also mounts the other's overlay on top of it.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const base = `/${slug}`;
  const entries = [
    { key: 'home', href: base, label: words.nav.home, icon: <IconHome />, activeIcon: <IconHomeFilled /> },
    { key: 'menu', href: `${base}/menu`, label: catalogLabel, icon: <IconBuildingStore />, activeIcon: <IconBuildingStore stroke={2.5} /> },
    { key: 'orders', href: `${base}/orders`, label: words.nav.orders, icon: <IconReceipt />, activeIcon: <IconReceiptFilled /> },
    { key: 'account', href: `${base}/account`, label: words.nav.account, icon: <IconUser />, activeIcon: <IconUserFilled /> },
  ];
  const items: (ShellNavItem & { href: string })[] = entries.map((entry) => ({
    ...entry,
    link: <Link href={entry.href} />,
    active: entry.href === base ? pathname === base : pathname.startsWith(entry.href),
  }));

  return (
    <>
      {/* Desktop: top navigation and a cart drawer on the right. */}
      <header className="sticky top-0 z-30 hidden h-16 items-center gap-6 bg-shop-30 px-8 pt-safe text-shop-30-foreground shadow-sm lg:flex">
        <Link href={base} className="truncate text-lg font-bold">
          {shopName}
        </Link>
        <nav aria-label={words.nav.label} className="flex flex-1 items-center gap-1">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={cn(
                'flex h-11 items-center rounded-full px-4 text-sm font-medium text-shop-30-foreground/80 outline-none hover:text-shop-30-foreground focus-visible:ring-2 focus-visible:ring-ring',
                item.active && 'bg-shop-10 font-semibold text-shop-10-foreground hover:text-shop-10-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Button
          onClick={() => {
            setSheetOpen(true);
          }} aria-label={words.cart.open} className="bg-shop-10 text-shop-10-foreground hover:bg-shop-10/90 active:bg-shop-10/80">
          <IconShoppingBag aria-hidden="true" />
          <span className="tabular">{CART_TEXT}</span>
        </Button>
      </header>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{words.cart.title}</SheetTitle>
          </SheetHeader>
          <p className="px-4 text-muted-foreground">{words.cart.empty}</p>
        </SheetContent>
      </Sheet>

      {/* Phones and tablets: bottom tab bar, cart bar floating above it, cart as a bottom sheet. */}
      <div className="lg:hidden">
        <CartBar
          text={CART_TEXT}
          onClick={() => {
            setDrawerOpen(true);
          }} aria-label={`${words.cart.open}: ${CART_TEXT}`} />
        <StoreTabBar label={words.nav.label} items={items} />
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} showSwipeHandle>
          <DrawerContent className="pb-safe">
            <DrawerHeader>
              <DrawerTitle>{words.cart.title}</DrawerTitle>
            </DrawerHeader>
            <p className="px-4 pb-6 text-muted-foreground">{words.cart.empty}</p>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
