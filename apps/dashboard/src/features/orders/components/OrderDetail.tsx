import { useState } from 'react';

import { toApiError, useOrderDetail, useShopSettings } from '@smartapp/api';
import {
  ageLabel,
  canCancel,
  distanceKm,
  formatManilaTime,
  formatPhPhone,
  isLate,
  mapsLink,
  minutesSince,
  nextActions,
  ticketNo,
  timelineSteps,
  WORDS,
} from '@smartapp/core';
import type { OrderReceipt } from '@smartapp/core';
import { Button, buttonVariants } from '@smartapp/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@smartapp/ui/components/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@smartapp/ui/components/dropdown-menu';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Spinner } from '@smartapp/ui/components/spinner';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IconDots, IconExternalLink, IconMessage, IconPhone, IconPrinter, IconReceiptOff } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';
import { OrderLines } from '@smartapp/ui/patterns/OrderLines';
import { OrderTimeline } from '@smartapp/ui/patterns/OrderTimeline';
import { QueryState } from '@smartapp/ui/patterns/QueryState';
import { OrderStatusBadge } from '@smartapp/ui/patterns/StatusBadge';
import { StickyActionBar } from '@smartapp/ui/patterns/StickyActionBar';

import { useShop } from '../../../app/shop';
import { useNow } from '../../../app/orders/useNow';
import { useOrderSteps } from '../../../app/orders/useOrderSteps';
import { useRuleSettings } from '../../../app/orders/useRuleSettings';

import { CancelDialog } from '../../../app/orders/CancelDialog';
import { PaymentCard } from './PaymentCard';
import { PrintSlip } from './PrintSlip';
import { TrackingDialog } from '../../../app/orders/TrackingDialog';

const words = WORDS.dashboard.orders;
const detail = words.detail;
const PAYMENT_ID = 'order-payment';

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function DetailView({ receipt, panel }: { receipt: OrderReceipt; panel: boolean }) {
  const shop = useShop();
  const shopSettings = useShopSettings(shop.id);
  const online = useOnline();
  const settings = useRuleSettings();
  const now = useNow();
  const [cancelling, setCancelling] = useState(false);
  const { order, lines, events } = receipt;
  const ticket = ticketNo(order.orderNo);
  const steps = useOrderSteps(() => {
    document.getElementById(PAYMENT_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  const [main, ...moreSteps] = nextActions(order, settings);
  const late = isLate(order, now);
  const waiting = order.pickupAt ? WORDS.order.pickupAt(formatManilaTime(order.pickupAt)) : ageLabel(minutesSince(order.placedAt, now));

  const settingsData = shopSettings.data;
  const shopPin =
    settingsData?.pin ??
    (settingsData !== undefined &&
    settingsData.shopLat !== null &&
    settingsData.shopLat !== undefined &&
    settingsData.shopLng !== null &&
    settingsData.shopLng !== undefined
      ? { lat: settingsData.shopLat, lng: settingsData.shopLng }
      : null);
  const orderPin =
    order.deliveryPin ??
    (order.deliveryLat !== null &&
    order.deliveryLat !== undefined &&
    order.deliveryLng !== null &&
    order.deliveryLng !== undefined
      ? { lat: order.deliveryLat, lng: order.deliveryLng }
      : null);
  const straightDistance = shopPin !== null && orderPin !== null ? distanceKm(shopPin, orderPin) : null;

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-col gap-4 print:hidden">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="tabular text-4xl font-bold">{ticket}</h2>
            <p className="text-sm text-muted-foreground">
              {WORDS.order.fulfillment[order.fulfillment]} · {detail.placed(formatManilaTime(order.placedAt))}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <OrderStatusBadge status={order.status} late={late} />
            <span className={cn('tabular text-sm', late ? 'font-semibold text-destructive-text' : 'text-muted-foreground')}>{waiting}</span>
          </div>
        </header>

        {order.cancelReason !== null ? <p className="text-sm text-destructive-text">{detail.cancelled(order.cancelReason)}</p> : null}

        <Card size="sm">
          <CardHeader>
            <CardTitle>{detail.customer}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{order.customerName}</p>
                <p className="tabular text-sm text-muted-foreground">{formatPhPhone(order.customerPhone)}</p>
              </div>
              <div className="flex gap-2">
                <a href={`tel:${order.customerPhone}`} className={buttonVariants({ variant: 'outline' })}>
                  <IconPhone aria-hidden="true" />
                  {words.call}
                </a>
                <a href={`sms:${order.customerPhone}`} className={buttonVariants({ variant: 'outline' })}>
                  <IconMessage aria-hidden="true" />
                  {words.message}
                </a>
              </div>
            </div>
            {order.addressLine !== null ? (
              <div className="flex flex-col gap-1.5 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{detail.address}</p>
                  <p className="break-words">{order.addressLine}</p>
                  {order.landmark !== null ? <p className="break-words text-muted-foreground">{detail.landmark(order.landmark)}</p> : null}
                </div>
                {orderPin ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <a
                      href={mapsLink(orderPin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <IconExternalLink aria-hidden="true" className="size-4" />
                      {detail.openInMaps}
                    </a>
                    {straightDistance !== null ? (
                      <span className="text-xs text-muted-foreground">
                        {detail.straightLineDistance(straightDistance.toFixed(1))}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            {order.trackingUrl !== null ? (
              <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
                <IconExternalLink aria-hidden="true" className="size-4" />
                {detail.tracking}
              </a>
            ) : null}
            {order.notes !== null ? <p className="break-words text-sm">{detail.notes(order.notes)}</p> : null}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>{detail.items}</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderLines
              lines={lines}
              totals={{ subtotal: order.subtotal, deliveryFee: order.deliveryFee, discount: order.discountTotal, total: order.total }}
              words={WORDS.order}
            />
          </CardContent>
        </Card>

        <PaymentCard receipt={receipt} id={PAYMENT_ID} />

        <Card size="sm">
          <CardHeader>
            <CardTitle>{detail.timeline}</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderTimeline steps={timelineSteps(order, events)} labels={WORDS.order.status} formatTime={formatManilaTime} orientation="vertical" />
          </CardContent>
        </Card>

        <StickyActionBar aboveDock={!panel} className={cn(panel && 'mx-0 rounded-b-xl px-0')}>
          {main ? (
            <Button
              size="lg"
              className="h-12 flex-1"
              disabled={!online || steps.pendingId === order.id}
              onClick={() => {
                steps.run(main, order);
              }}
            >
              {steps.pendingId === order.id ? <Spinner /> : null}
              {WORDS.order.action[main]}
            </Button>
          ) : (
            <span className="flex-1" />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="size-12" aria-label={detail.more} />}>
              <IconDots aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {moreSteps.map((action) => (
                <DropdownMenuItem
                  key={action}
                  disabled={!online}
                  onClick={() => {
                    steps.run(action, order);
                  }}
                >
                  {WORDS.order.action[action]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={() => {
                  window.print();
                }}
              >
                <IconPrinter aria-hidden="true" />
                {words.print}
              </DropdownMenuItem>
              {canCancel(order) ? (
                <DropdownMenuItem
                  variant="destructive"
                  disabled={!online}
                  onClick={() => {
                    setCancelling(true);
                  }}
                >
                  {words.cancel}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </StickyActionBar>
      </div>

      <PrintSlip receipt={receipt} shopName={shop.name} />
      <TrackingDialog open={steps.trackingFor !== null} onClose={steps.closeTracking} onSend={steps.sendOut} />
      <CancelDialog
        order={cancelling ? order : null}
        onClose={() => {
          setCancelling(false);
        }}
      />
    </div>
  );
}

/** The order detail (`/orders/$orderId`, and the side panel on wide screens). */
export function OrderDetail({ orderId, panel = false }: { orderId: string; panel?: boolean }) {
  const query = useOrderDetail(orderId);
  const offline = query.error ? toApiError(query.error).code === 'network' : false;
  const state = query.isPending ? 'loading' : query.isError ? 'error' : query.data === null ? 'empty' : 'ready';
  return (
    <QueryState
      state={state}
      skeleton={<DetailSkeleton />}
      empty={{ media: <IconReceiptOff />, title: detail.notFound }}
      error={{
        title: WORDS.shared.loadFailed,
        retryLabel: WORDS.shared.tryAgain,
        onRetry: () => {
          void query.refetch();
        },
      }}
      offline={offline ? { title: WORDS.shared.offlineShort } : null}
    >
      {query.data ? <DetailView receipt={query.data} panel={panel} /> : null}
    </QueryState>
  );
}
