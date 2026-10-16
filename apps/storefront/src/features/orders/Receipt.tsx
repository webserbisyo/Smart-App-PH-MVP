'use client';

import { useState, useSyncExternalStore } from 'react';

import { toApiError, useOrder, useOrderLive } from '@smartapp/api';
import {
  formatManilaTime,
  messengerLink,
  messengerOrderText,
  ticketNo,
  timelineSteps,
  TransferMethod,
  WORDS,
} from '@smartapp/core';
import type { Order, OrderReceipt } from '@smartapp/core';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/alert';
import { Button, buttonVariants } from '@smartapp/ui/components/button';
import { QRCode, QRCodeImage, QRCodeSkeleton } from '@smartapp/ui/components/qr-code';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { IconBrandMessenger, IconCircleCheckFilled, IconDownload, IconReceiptOff } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';
import { CopyButton } from '@smartapp/ui/patterns/CopyButton';
import { OrderLines } from '@smartapp/ui/patterns/OrderLines';
import { OrderTimeline } from '@smartapp/ui/patterns/OrderTimeline';
import { QueryState } from '@smartapp/ui/patterns/QueryState';
import { StatusBadge } from '@smartapp/ui/patterns/StatusBadge';

import { InstallCard } from '../install/InstallCard';
import { ReceiptStamps } from '../members/ReceiptStamps';
import { useShop } from '../shell/ShopProvider';
import { subscribeNothing } from '../shell/use-hydrated';
import { customerOrderLook, customerPaymentLook } from './order-look';
import { ProofUpload } from './ProofUpload';

const words = WORDS.storefront.receipt;

/** This site's origin in the browser (the receipt renders in the browser only). */
function useOrigin(): string {
  return useSyncExternalStore(
    subscribeNothing,
    () => window.location.origin,
    () => '',
  );
}

/** The line under the order number: what the customer does next. */
function typeLine(order: Order): string {
  if (order.fulfillment === 'walk_in') return words.walkInLine;
  if (order.fulfillment === 'delivery') return words.deliveryLine;
  return order.pickupAt === null ? words.pickupAsap : WORDS.order.pickupAt(formatManilaTime(order.pickupAt));
}

function ReceiptSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="mx-auto size-40" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

/** Where the payment stands: the proof card, "Checking your payment", or the rejection with its reason. */
function PaymentPart({ receipt }: { receipt: OrderReceipt }) {
  const { order, payments } = receipt;
  const method = TransferMethod.safeParse(order.paymentMethod);
  const open = order.status !== 'cancelled' && order.status !== 'expired';
  if (!method.success || !open) return null;
  if (order.paymentStatus === 'pending') {
    return (
      <Alert>
        <AlertTitle>{words.checking}</AlertTitle>
        <AlertDescription>{words.checkingText}</AlertDescription>
      </Alert>
    );
  }
  if (order.paymentStatus !== 'unpaid') return null;
  const latest = payments.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1);
  return (
    <>
      {latest?.status === 'rejected' && (
        <Alert variant="destructive">
          <AlertTitle>{words.rejected}</AlertTitle>
          <AlertDescription>
            {latest.rejectReason !== null && <p>{words.rejectedReason(latest.rejectReason)}</p>}
            <p>{words.uploadAgain}</p>
          </AlertDescription>
        </Alert>
      )}
      <ProofUpload order={order} method={method.data} />
    </>
  );
}

function ReceiptView({ receipt, justPlaced }: { receipt: OrderReceipt; justPlaced: boolean }) {
  const { storefront } = useShop();
  const { shop } = storefront;
  const { order, lines, events } = receipt;
  const origin = useOrigin();
  const [now] = useState(() => new Date());
  const ticket = ticketNo(order.orderNo);
  const url = `${origin}/${shop.slug}/o/${order.token}`;
  const text = messengerOrderText(order, lines, url, now);
  const messenger = shop.settings.messengerUsername;

  const save = () => {
    if ('share' in navigator) {
      navigator.share({ title: words.shareTitle(shop.name, ticket), text, url }).catch(() => {
        // Closed the share sheet: nothing to do.
      });
    } else {
      window.print();
    }
  };

  return (
    <article className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <header className={cn('flex flex-col items-center gap-1 rounded-xl p-6 text-center', justPlaced ? 'bg-shop-30 text-shop-30-foreground' : 'border')}>
        {justPlaced && (
          <p className="flex items-center gap-2 text-lg font-semibold">
            <IconCircleCheckFilled aria-hidden="true" className="size-6 text-success" />
            {words.placed}
          </p>
        )}
        <h1 className="tabular text-5xl font-bold">
          <span className="sr-only">{words.title('')}</span>
          {ticket}
        </h1>
        <p className="text-base">{typeLine(order)}</p>
        <StatusBadge look={customerOrderLook(order.status)} className="mt-2" />
      </header>

      <QRCode value={url} size={160} className="rounded-xl border p-4">
        <QRCodeSkeleton />
        <QRCodeImage alt={words.qrAlt} />
        <p className="text-center text-sm text-muted-foreground">{words.qrHint}</p>
      </QRCode>

      <section aria-labelledby="receipt-status" className="flex flex-col gap-3">
        <h2 id="receipt-status" className="text-lg font-semibold">
          {words.status}
        </h2>
        <OrderTimeline steps={timelineSteps(order, events)} labels={words.steps} formatTime={formatManilaTime} orientation="horizontal" />
        {order.status === 'cancelled' && order.cancelReason !== null && <p className="text-sm text-destructive-text">{words.cancelled(order.cancelReason)}</p>}
        {order.status === 'expired' && <p className="text-sm text-muted-foreground">{words.expired}</p>}
      </section>

      <section aria-labelledby="receipt-payment" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="receipt-payment" className="text-lg font-semibold">
            {words.payment}
          </h2>
          <span className="flex items-center gap-2 text-sm">
            {WORDS.order.method[order.paymentMethod]}
            <StatusBadge look={customerPaymentLook(order.paymentStatus, order.paymentMethod)} />
          </span>
        </div>
        <PaymentPart receipt={receipt} />
      </section>

      <OrderLines
        lines={lines}
        totals={{ subtotal: order.subtotal, deliveryFee: order.deliveryFee, discount: order.discountTotal, total: order.total }}
        words={WORDS.order}
      />

      <ReceiptStamps order={order} />

      <div className="flex flex-col gap-2 print:hidden">
        {messenger !== null && (
          <a href={messengerLink(messenger, text)} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'shop', size: 'lg' })}>
            <IconBrandMessenger aria-hidden="true" />
            {words.messenger}
          </a>
        )}
        <div className="grid grid-cols-2 gap-2">
          <CopyButton value={text} label={words.copy} words={{ copy: words.copy, copied: words.copied }} size="default" />
          <Button type="button" variant="outline" onClick={save}>
            <IconDownload aria-hidden="true" />
            {words.save}
          </Button>
        </div>
      </div>

      <InstallCard />

      <p className="text-center text-xs text-muted-foreground">{words.slip}</p>
    </article>
  );
}

/** The receipt (P4.4): the order, its live status and the payment step, for anyone with the link. */
export function Receipt({ token, justPlaced }: { token: string; justPlaced: boolean }) {
  const order = useOrder(token);
  useOrderLive(token);
  const offline = order.error ? toApiError(order.error).code === 'network' : false;
  const state = order.isPending ? 'loading' : order.isError ? 'error' : order.data === null ? 'empty' : 'ready';
  return (
    <QueryState
      state={state}
      skeleton={<ReceiptSkeleton />}
      empty={{ media: <IconReceiptOff />, title: words.notFound }}
      error={{
        title: WORDS.shared.loadFailed,
        retryLabel: WORDS.shared.tryAgain,
        onRetry: () => {
          void order.refetch();
        },
      }}
      offline={offline ? { title: WORDS.shared.offlineShort } : null}
    >
      {order.data && <ReceiptView receipt={order.data} justPlaced={justPlaced} />}
    </QueryState>
  );
}
