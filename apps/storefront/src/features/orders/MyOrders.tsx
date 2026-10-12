'use client';

import Link from 'next/link';

import { useMyOrderTokens, useOrder } from '@smartapp/api';
import { formatShortDate, ticketNo, WORDS } from '@smartapp/core';
import { FLUENT_ICONS } from '@smartapp/ui/assets/fluent';
import { buttonVariants } from '@smartapp/ui/components/button';
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@smartapp/ui/components/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@smartapp/ui/components/item';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { cn } from '@smartapp/ui/lib/utils';
import { Money } from '@smartapp/ui/patterns/Money';
import { StatusBadge } from '@smartapp/ui/patterns/StatusBadge';

import { useShop } from '../shell/ShopProvider';
import { useHydrated } from '../shell/use-hydrated';
import { customerOrderLook } from './order-look';

const words = WORDS.storefront.orders;

/** One order on this phone: number, date, total and status. A link that is no longer an order is left out. */
function OrderRow({ slug, token }: { slug: string; token: string }) {
  const { data, isPending } = useOrder(token);
  if (isPending) return <Skeleton className="h-16 w-full" />;
  if (!data) return null;
  const { order } = data;
  const ticket = ticketNo(order.orderNo);
  return (
    <Item variant="outline" render={<Link href={`/${slug}/o/${token}`} aria-label={words.open(ticket)} />}>
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

/** My orders (P4.4, guest): the orders placed on this phone, newest first. */
export function MyOrders() {
  const hydrated = useHydrated();
  const { storefront, catalogLabel } = useShop();
  const slug = storefront.shop.slug;
  const tokens = useMyOrderTokens(slug);

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">{words.title}</h1>
      {!hydrated ? (
        <Skeleton className="h-16 w-full" />
      ) : tokens.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <img src={FLUENT_ICONS['shopping-bags'].url} alt="" className="size-16" />
            </EmptyMedia>
            <EmptyTitle>{words.empty}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Link href={`/${slug}/menu`} className={cn(buttonVariants({ variant: 'outline' }))}>
              {WORDS.storefront.cart.seeCatalog(catalogLabel)}
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <ItemGroup className="gap-2">
          {tokens.map((token) => (
            <OrderRow key={token} slug={slug} token={token} />
          ))}
        </ItemGroup>
      )}
    </section>
  );
}
