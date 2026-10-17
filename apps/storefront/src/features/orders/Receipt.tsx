'use client';

import { useState, useSyncExternalStore } from 'react';

import { toApiError, useOrder, useOrderLive, useOrderMessages, useRateOrder } from '@smartapp/api';
import {
  formatManilaTime,
  mapsLink,
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
import {
  IconBrandMessenger,
  IconCircleCheckFilled,
  IconDownload,
  IconExternalLink,
  IconMapPin,
  IconPhone,
  IconReceiptOff,
  IconStar,
  IconTruckDelivery,
} from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';
import { CopyButton } from '@smartapp/ui/patterns/CopyButton';
import { OrderLines } from '@smartapp/ui/patterns/OrderLines';
import { OrderThread } from '@smartapp/ui/patterns/OrderThread';
import { OrderTimeline } from '@smartapp/ui/patterns/OrderTimeline';
import { QueryState } from '@smartapp/ui/patterns/QueryState';
import { RatingField } from '@smartapp/ui/patterns/RatingField';
import { StatusBadge } from '@smartapp/ui/patterns/StatusBadge';

import { InstallCard } from '../install/InstallCard';
import { ReceiptStamps } from '../members/ReceiptStamps';
import { useShop } from '../shell/ShopProvider';
import { subscribeNothing } from '../shell/use-hydrated';
import { customerOrderLook, customerPaymentLook } from './order-look';
import { OrderPush } from './OrderPush';
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

function ReceiptView({
  receipt,
  justPlaced,
  vapidPublicKey,
}: {
  receipt: OrderReceipt;
  justPlaced: boolean;
  vapidPublicKey?: string | null;
}) {
  const { storefront } = useShop();
  const { shop } = storefront;
  const { order, lines, events } = receipt;
  const origin = useOrigin();
  const [now] = useState(() => new Date());
  const messages = useOrderMessages(order.token);
  const rate = useRateOrder();
  const ticket = ticketNo(order.orderNo);
  const url = `${origin}/${shop.slug}/o/${order.token}`;
  const text = messengerOrderText(order, lines, url, now);
  const messenger = shop.settings.messengerUsername;
  const isTransfer = TransferMethod.safeParse(order.paymentMethod).success;
  const isProofActive = isTransfer && order.paymentStatus === 'unpaid' && order.status !== 'cancelled' && order.status !== 'expired';
  const orderPin =
    order.deliveryPin ??
    (order.deliveryLat !== null && order.deliveryLat !== undefined && order.deliveryLng !== null && order.deliveryLng !== undefined
      ? { lat: order.deliveryLat, lng: order.deliveryLng }
      : null);

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
    <article className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
      <header className={cn('flex flex-col items-center gap-1.5 rounded-[var(--radius-card,1.25rem)] p-6 text-center shadow-xs', justPlaced ? 'border border-shop-10/20 bg-shop-30 text-shop-30-foreground' : 'border border-border/60 bg-shop-30')}>
        {justPlaced && (
          <p className="flex items-center gap-2 text-lg font-semibold">
            <IconCircleCheckFilled aria-hidden="true" className="size-6 text-success" />
            {words.placed}
          </p>
        )}
        <h1 className="tabular text-5xl font-bold tracking-tight">
          <span className="sr-only">{words.title('')}</span>
          {ticket}
        </h1>
        <p className="text-base text-muted-foreground">{typeLine(order)}</p>
        <StatusBadge look={customerOrderLook(order.status)} className="mt-2" />
      </header>

      <div className="flex flex-col items-center justify-center rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-6 shadow-xs">
        <QRCode value={url} size={160} className="rounded-xl border border-border/40 bg-white p-3 shadow-xs">
          <QRCodeSkeleton />
          <QRCodeImage alt={words.qrAlt} />
        </QRCode>
        <p className="mt-3 text-center text-xs text-muted-foreground">{words.qrHint}</p>
      </div>

      <section aria-labelledby="receipt-status" className="flex flex-col gap-3 rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-5 shadow-xs">
        <h2 id="receipt-status" className="text-lg font-semibold">
          {words.status}
        </h2>
        <OrderTimeline steps={timelineSteps(order, events)} labels={words.steps} formatTime={formatManilaTime} orientation="horizontal" />
        {order.status === 'cancelled' && order.cancelReason !== null && <p className="text-sm text-destructive-text">{words.cancelled(order.cancelReason)}</p>}
        {order.status === 'expired' && <p className="text-sm text-muted-foreground">{words.expired}</p>}
      </section>

      <section aria-labelledby="receipt-payment" className="flex flex-col gap-3 rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-5 shadow-xs">
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

      <OrderThread
        messages={messages.data ?? []}
        payments={receipt.payments}
        isOwnerView={false}
      />

      {order.fulfillment === 'delivery' && (order.addressLine || order.trackingUrl || order.riderName) && (
        <section aria-labelledby="receipt-delivery" className="flex flex-col gap-3 rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-5 shadow-xs">
          <h2 id="receipt-delivery" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {words.deliveryInfo}
          </h2>
          {order.addressLine && (
            <div>
              <p className="text-base font-medium">{order.addressLine}</p>
              {order.landmark && <p className="text-sm text-muted-foreground">{order.landmark}</p>}
              {orderPin && (
                <div className="pt-1">
                  <a
                    href={mapsLink(orderPin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-shop-10 hover:underline"
                  >
                    <IconMapPin className="size-4" aria-hidden="true" />
                    <span>{words.openInMaps}</span>
                    <IconExternalLink className="size-3.5 opacity-70" aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>
          )}
          {(order.riderName || order.riderPhone || order.trackingUrl) && (
            <div className="flex flex-col gap-2 rounded-xl border border-border/40 bg-background/50 p-3 mt-1">
              {order.riderName && (
                <p className="text-sm font-semibold">{words.riderName(order.riderName)}</p>
              )}
              {order.riderPhone && (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{words.riderPhone(order.riderPhone)}</p>
                  <a
                    href={`tel:${order.riderPhone}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <IconPhone className="size-3.5" aria-hidden="true" />
                    <span>{words.callRider}</span>
                  </a>
                </div>
              )}
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: 'shop', size: 'sm' }), 'mt-1 w-full sm:w-auto self-start font-bold gap-1.5')}
                >
                  <IconTruckDelivery className="size-4" aria-hidden="true" />
                  <span>{words.trackDelivery}</span>
                  <IconExternalLink className="size-3.5 opacity-80" aria-hidden="true" />
                </a>
              )}
            </div>
          )}
        </section>
      )}

      <div className="rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-5 shadow-xs">
        <OrderLines
          lines={lines}
          totals={{ subtotal: order.subtotal, deliveryFee: order.deliveryFee, discount: order.discountTotal, total: order.total }}
          words={WORDS.order}
        />
      </div>

      {order.status === 'completed' && (
        <RatingField
          readOnly={Boolean(order.rating)}
          stars={order.rating?.stars ?? null}
          comment={order.rating?.comment ?? null}
          onSubmit={(stars, comment) => {
            rate.mutate({ token: order.token, stars, comment });
          }}
          submitting={rate.isPending}
          words={words.rating}
        />
      )}

      <OrderPush order={order} shopName={shop.name} vapidPublicKey={vapidPublicKey ?? null} />

      <ReceiptStamps order={order} />

      <div className="flex flex-col gap-2 print:hidden">
        {order.status === 'completed' && shop.settings.googleReviewUrl && (
          <a
            href={shop.settings.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'border-warning/30 bg-warning/5 text-foreground hover:bg-warning/10' })}
          >
            <IconStar aria-hidden="true" className="size-5 text-warning fill-warning" />
            <span className="font-semibold">{words.reviewOnGoogle}</span>
            <IconExternalLink aria-hidden="true" className="size-4 ml-auto text-muted-foreground" />
          </a>
        )}
        {messenger !== null && (
          <a
            href={messengerLink(messenger, text)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: isProofActive ? 'shopOutline' : 'shop', size: 'lg' })}
          >
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

      <InstallCard buttonVariant="outline" />

      <p className="text-center text-xs text-muted-foreground">{words.slip}</p>
    </article>
  );
}

/** The receipt (P4.4): the order, its live status and the payment step, for anyone with the link. */
export function Receipt({
  token,
  justPlaced,
  vapidPublicKey,
}: {
  token: string;
  justPlaced: boolean;
  vapidPublicKey?: string | null;
}) {
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
      {order.data && (
        <ReceiptView
          receipt={order.data}
          justPlaced={justPlaced}
          vapidPublicKey={vapidPublicKey ?? null}
        />
      )}
    </QueryState>
  );
}
