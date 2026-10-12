'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { formatPeso, WORDS } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
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

import { useShop } from './ShopProvider';

const words = WORDS.storefront;

export interface StoreNavProps {
  slug: string;
  shopName: string;
  /** "Menu" or "Products" (VOCAB). */
  catalogLabel: string;
}

/**
 * Storefront nav, one per device: phones and tablets get the bottom tab bar with the cart bar above it;
 * desktops (from 1024 px) get the top navigation. Both open the one cart sheet (ShopProvider). The cart bar
 * bumps when an item is added.
 */
export function StoreNav({ slug, shopName, catalogLabel }: StoreNavProps) {
  const pathname = usePathname();
  const { cart, added, openCart } = useShop();
  const cartText = words.cart.bar(cart.count, formatPeso(cart.subtotal));
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
      {/* Desktop: top navigation. */}
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
          key={added}
          onClick={openCart}
          aria-label={`${words.cart.open}: ${cartText}`}
          className={cn('bg-shop-10 text-shop-10-foreground hover:bg-shop-10/90 active:bg-shop-10/80', added > 0 && 'bump')}
        >
          <IconShoppingBag aria-hidden="true" />
          <span className="tabular">{cartText}</span>
        </Button>
      </header>
      {/* Phones and tablets: bottom tab bar with the cart bar floating above it. */}
      <div className="lg:hidden">
        {/* Checkout has its own Place order bar. */}
        {pathname !== `${base}/checkout` && (
          <CartBar key={added} text={cartText} onClick={openCart} aria-label={`${words.cart.open}: ${cartText}`} className={cn(added > 0 && 'bump')} />
        )}
        <StoreTabBar label={words.nav.label} items={items} />
      </div>
    </>
  );
}
