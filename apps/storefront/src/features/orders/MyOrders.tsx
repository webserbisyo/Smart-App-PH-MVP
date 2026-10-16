'use client';

import Link from 'next/link';

import { useMyOrderTokens, useOrder } from '@smartapp/api';
import { formatShortDate, ticketNo, WORDS } from '@smartapp/core';
import type { Order } from '@smartapp/core';
import { FLUENT_ICONS } from '@smartapp/ui/assets/fluent';
import { buttonVariants } from '@smartapp/ui/components/button';
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@smartapp/ui/components/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@smartapp/ui/components/item';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { cn } from '@smartapp/ui/lib/utils';
import { Money } from '@smartapp/ui/patterns/Money';
import { StatusBadge } from '@smartapp/ui/patterns/StatusBadge';

import { useMember } from '../members/use-member';
import { useShop } from '../shell/ShopProvider';
import { useHydrated } from '../shell/use-hydrated';
import { customerOrderLook } from './order-look';

const words = WORDS.storefront.orders;

/** One order: number, date, total and status, linking to its receipt. */
export function OrderSummaryRow({ slug, order }: { slug: string; order: Order }) {
  const ticket = ticketNo(order.orderNo);
  return (
    <Item
      variant="outline"
      className="rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-4 transition-all hover:border-shop-10/40 hover:shadow-xs"
      render={<Link href={`/${slug}/o/${order.token}`} aria-label={words.open(ticket)} />}
    >
      <ItemContent>
        <ItemTitle className="tabular text-base font-bold">{ticket}</ItemTitle>
        <ItemDescription>
          {formatShortDate(order.businessDate)} · {WORDS.order.fulfillment[order.fulfillment]}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="flex-col items-end gap-1">
        <Money amount={order.total} className="font-semibold" />
        <StatusBadge look={customerOrderLook(order.status)} />
      </ItemActions>
    </Item>
  );
}

/** One order on this phone. A link that is no longer an order is left out. */
function OrderRow({ slug, token }: { slug: string; token: string }) {
  const { data, isPending } = useOrder(token);
  if (isPending) return <Skeleton className="h-20 w-full rounded-[var(--radius-card,1.25rem)]" />;
  if (!data) return null;
  return <OrderSummaryRow slug={slug} order={data.order} />;
}

/**
 * My orders: members see their account's orders (any device, P4.6), then any other orders placed on this phone;
 * guests see the orders placed on this phone (P4.4). Newest first.
 */
export function MyOrders() {
  const hydrated = useHydrated();
  const { storefront, catalogLabel } = useShop();
  const slug = storefront.shop.slug;
  const deviceTokens = useMyOrderTokens(slug);
  const { account } = useMember();
  const accountOrders = account?.orders ?? [];
  const tokens = deviceTokens.filter((token) => !accountOrders.some((order) => order.token === token));
  const none = accountOrders.length === 0 && tokens.length === 0;

  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">{words.title}</h1>
      {!hydrated ? (
        <Skeleton className="h-20 w-full rounded-[var(--radius-card,1.25rem)]" />
      ) : none ? (
        <Empty className="rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-8 shadow-xs">
          <EmptyHeader>
            <EmptyMedia>
              <img src={FLUENT_ICONS['shopping-bags'].url} alt="" className="size-16" />
            </EmptyMedia>
            <EmptyTitle>{words.empty}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Link href={`/${slug}/menu`} className={cn(buttonVariants({ variant: 'shop' }))}>
              {WORDS.storefront.cart.seeCatalog(catalogLabel)}
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <ItemGroup className="gap-3">
          {accountOrders.map((order) => (
            <OrderSummaryRow key={order.id} slug={slug} order={order} />
          ))}
          {tokens.map((token) => (
            <OrderRow key={token} slug={slug} token={token} />
          ))}
        </ItemGroup>
      )}
    </section>
  );
}
