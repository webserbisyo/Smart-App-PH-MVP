import { useNavigate } from '@tanstack/react-router';

import { useCustomerClaims, useOrders, useSettleRewardClaim, useStampRule } from '@smartapp/api';
import { formatManilaDateTime, formatPeso, formatPhPhone, formatShortDate, manilaDate, WORDS } from '@smartapp/core';
import type { CustomerRow } from '@smartapp/core';
import { Button, buttonVariants } from '@smartapp/ui/components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@smartapp/ui/components/responsive-dialog';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { IconGift, IconPhone, IconReceipt } from '@smartapp/ui/icons';
import { OrderCard } from '@smartapp/ui/patterns/OrderCard';
import { QueryState } from '@smartapp/ui/patterns/QueryState';
import { StampCard } from '@smartapp/ui/patterns/StampCard';

import { useShop } from '../../../app/shop';

import { MemberBadge } from './MemberBadge';

const words = WORDS.dashboard.customers;
const shared = WORDS.shared;
const orderWords = WORDS.order;

function SheetBody({ customer }: { customer: CustomerRow }) {
  const shop = useShop();
  const navigate = useNavigate();
  const orders = useOrders(shop.id, { kind: 'customer', customerId: customer.id });
  const rule = useStampRule(shop.id).data;
  const claims = useCustomerClaims(customer.id);
  const settle = useSettleRewardClaim();
  const list = orders.data ?? [];
  const state = orders.isPending ? 'loading' : orders.isError ? 'error' : list.length === 0 ? 'empty' : 'ready';

  return (
    <div className="flex flex-col gap-4 px-4 pb-4 sm:px-0 sm:pb-0">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <a href={`tel:${customer.phone}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <IconPhone aria-hidden="true" />
          {formatPhPhone(customer.phone)}
        </a>
        <span className="tabular text-muted-foreground">{words.summary(customer.orderCount, formatPeso(customer.totalSpent))}</span>
      </div>

      {claims.data && claims.data.length > 0 && (
        <section aria-labelledby="customer-claims" className="flex flex-col gap-2 rounded-xl border border-member/20 bg-member-soft p-3 text-member-soft-foreground">
          <div className="flex items-center gap-2">
            <IconGift className="size-4 shrink-0 text-member" />
            <h3 id="customer-claims" className="font-semibold text-sm">
              {words.claims.title}
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {claims.data.map((claim) => (
              <div key={claim.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3 text-foreground">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-muted-foreground">{words.claims.codeLabel}</span>
                  <span className="font-mono text-xl font-bold tracking-widest">{claim.code}</span>
                  <span className="text-[11px] text-muted-foreground">{formatManilaDateTime(claim.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={settle.isPending}
                    onClick={() => {
                      void settle.mutateAsync({ claimId: claim.id, given: false });
                    }}
                  >
                    {words.claims.cancel}
                  </Button>
                  <Button
                    size="sm"
                    variant="shop"
                    disabled={settle.isPending}
                    onClick={() => {
                      void settle.mutateAsync({ claimId: claim.id, given: true });
                    }}
                  >
                    {words.claims.markGiven}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {customer.memberSince !== null && rule?.isActive ? (
        <StampCard stamps={customer.stamps} goal={rule.stampsNeeded} reward={rule.rewardLabel} words={words.stamps} celebrate={false} />
      ) : null}

      <section aria-labelledby="customer-orders" className="flex flex-col gap-2">
        <h3 id="customer-orders" className="font-semibold">
          {words.sheet.orders}
        </h3>
        <QueryState
          state={state}
          skeleton={
            <div className="flex flex-col gap-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          }
          empty={{ media: <IconReceipt />, title: words.sheet.noOrders }}
          error={{
            title: shared.loadFailed,
            retryLabel: shared.tryAgain,
            onRetry: () => {
              void orders.refetch();
            },
          }}
        >
          <div className="flex flex-col gap-2">
            {list.map(({ order, lines }) => (
              <OrderCard
                key={order.id}
                order={{ ...order, lines }}
                actions={[]}
                timeText={formatManilaDateTime(order.placedAt)}
                words={{ fulfillment: orderWords.fulfillment, more: orderWords.more, moreItems: orderWords.moreItems }}
                variant="compact"
                onOpen={() => {
                  void navigate({ to: '/$', params: { _splat: `orders/${order.id}` } });
                }}
              />
            ))}
          </div>
        </QueryState>
      </section>
    </div>
  );
}

/** A customer's sheet: mobile, totals, their stamp card (members) and their latest orders (tap one to open it). */
export function CustomerSheet({ customer, onClose }: { customer: CustomerRow | null; onClose: () => void }) {
  return (
    <ResponsiveDialog
      open={customer !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-lg">
        {customer ? (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <span className="min-w-0 truncate">{customer.name}</span>
                {customer.memberSince === null ? null : <MemberBadge />}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {customer.memberSince === null
                  ? customer.lastOrderAt === null
                    ? words.never
                    : words.lastOrder(formatShortDate(manilaDate(customer.lastOrderAt)))
                  : words.memberSince(formatShortDate(manilaDate(customer.memberSince)))}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <SheetBody key={customer.id} customer={customer} />
          </>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
