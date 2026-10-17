import { IconDots } from '@tabler/icons-react';

import { itemsSummary, ticketNo } from '@smartapp/core';
import type { Fulfillment, Order, OrderLine } from '@smartapp/core';

import { Button } from '#components/button';
import { Card } from '#components/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#components/dropdown-menu';
import { Spinner } from '#components/spinner';
import { cn } from '#lib/utils';

import { Money } from './Money';
import { OrderStatusBadge, PaymentBadge } from './StatusBadge';

export type OrderCardOrder = Pick<
  Order,
  'orderNo' | 'customerName' | 'fulfillment' | 'status' | 'paymentStatus' | 'paymentMethod' | 'total'
> & {
  lines: readonly Pick<OrderLine, 'qty' | 'itemName' | 'variantName'>[];
};

export interface OrderCardAction {
  key: string;
  label: string;
  onSelect: () => void;
  /** This step is being saved: the button shows a spinner and every action waits. */
  pending?: boolean;
}

export interface OrderCardProps {
  order: OrderCardOrder;
  /**
   * The steps from `nextActions(order, settings)`, already worded, main step first. The first is the one
   * full-width button; the rest go under "More".
   */
  actions: readonly OrderCardAction[];
  /** How long it has waited (`ageLabel`), or the pickup time. */
  timeText: string;
  late?: boolean;
  words: { fulfillment: Readonly<Record<Fulfillment, string>>; more: string; moreItems: (count: number) => string };
  /** Compact: Home's "In progress" list and a customer's orders (no item lines; the steps show when given). */
  variant?: 'normal' | 'compact' | undefined;
  /** Tapping the card (not a button) opens the order. */
  onOpen?: (() => void) | undefined;
  className?: string | undefined;
  deliveryInfo?: {
    mapUrl: string;
    mapLabel: string;
    distance?: string | null | undefined;
  } | null | undefined;
}

/** One order wherever an order appears: the board, Home, a customer's orders. */
export function OrderCard({
  order,
  actions,
  timeText,
  late = false,
  words,
  variant = 'normal',
  onOpen,
  className,
  deliveryInfo,
}: OrderCardProps) {
  const [main, ...more] = actions;
  const busy = actions.some((action) => action.pending);
  const summary = itemsSummary(order.lines);

  return (
    <Card size="sm" data-late={late || undefined} className={cn('gap-3 px-3', late && 'ring-destructive/40', className)}>
      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        className="flex flex-col gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="tabular text-lg leading-tight font-bold">{ticketNo(order.orderNo)}</p>
            <p className="truncate text-sm text-muted-foreground">
              {order.customerName} · {words.fulfillment[order.fulfillment]}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Money amount={order.total} className="font-semibold" />
            <span className={cn('tabular text-xs', late ? 'font-semibold text-destructive-text' : 'text-muted-foreground')}>{timeText}</span>
          </div>
        </div>
        {variant === 'normal' && (
          <ul className="text-sm">
            {summary.lines.map((line, index) => (
              <li key={`${line}-${String(index)}`} className="truncate">
                {line}
              </li>
            ))}
            {summary.more > 0 && <li className="text-muted-foreground">{words.moreItems(summary.more)}</li>}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-1">
          <OrderStatusBadge status={order.status} late={late} />
          <PaymentBadge status={order.paymentStatus} method={order.paymentMethod} />
        </div>
      </button>

      {deliveryInfo ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <a
            href={deliveryInfo.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {deliveryInfo.mapLabel}
          </a>
          {deliveryInfo.distance ? (
            <span className="text-muted-foreground">{deliveryInfo.distance}</span>
          ) : null}
        </div>
      ) : null}

      {main && (
        <div className="flex items-center gap-2">
          <Button className="h-11 flex-1" disabled={busy} onClick={main.onSelect}>
            {main.pending && <Spinner />}
            {main.label}
          </Button>
          {more.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label={words.more} disabled={busy} />}>
                <IconDots aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {more.map((action) => (
                  <DropdownMenuItem key={action.key} onClick={action.onSelect}>
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </Card>
  );
}
