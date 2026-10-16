'use client';

import Link from 'next/link';

import { useMyOrderTokens, useOrder } from '@smartapp/api';
import type { Order } from '@smartapp/core';
import { buttonVariants } from '@smartapp/ui/components/button';
import { IconBell, IconReceipt } from '@smartapp/ui/icons';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@smartapp/ui/components/responsive-dialog';
import { Skeleton } from '@smartapp/ui/components/skeleton';

import { useMember } from '../members/use-member';
import { OrderSummaryRow } from './MyOrders';

function ActiveOrderRow({ slug, token, onActive }: { slug: string; token: string; onActive: (order: Order) => void }) {
  const { data, isPending } = useOrder(token);
  if (isPending) return <Skeleton className="h-16 w-full rounded-xl" />;
  if (!data) return null;
  const { order } = data;
  const isOpen = order.status !== 'completed' && order.status !== 'cancelled';
  if (!isOpen) return null;
  onActive(order);
  return <OrderSummaryRow slug={slug} order={order} />;
}

export interface UpdatesSheetProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Updates sheet opened from the bell icon:
 * Lists this device's active / open orders with their real-time statuses.
 */
export function UpdatesSheet({ slug, open, onOpenChange }: UpdatesSheetProps) {
  const deviceTokens = useMyOrderTokens(slug);
  const { account } = useMember();
  const accountOrders = account?.orders ?? [];

  // Combine account orders and device tokens
  const accountOpenOrders = accountOrders.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled',
  );

  const extraTokens = deviceTokens.filter(
    (t) => !accountOrders.some((o) => o.token === t),
  );

  const hasAny = accountOpenOrders.length > 0 || extraTokens.length > 0;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} breakpoint={1024}>
      <ResponsiveDialogContent className="max-w-md p-4 flex flex-col gap-4">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-lg font-bold">
            <IconBell className="size-5 text-shop-10" />
            Order Updates
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-sm text-muted-foreground">
            Track active orders placed on this phone.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {accountOpenOrders.map((order) => (
            <OrderSummaryRow key={order.token} slug={slug} order={order} />
          ))}

          {extraTokens.map((token) => (
            <ActiveOrderRow key={token} slug={slug} token={token} onActive={() => undefined} />
          ))}

          {!hasAny && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
              <IconReceipt className="size-10 stroke-1 opacity-40" />
              <p className="text-sm font-medium">No active orders right now.</p>
              <p className="text-xs">Your in-progress orders will appear here.</p>
            </div>
          )}
        </div>

        <div className="pt-2 border-t flex justify-end">
          <Link
            href={`/${slug}/orders`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            View all orders
          </Link>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
