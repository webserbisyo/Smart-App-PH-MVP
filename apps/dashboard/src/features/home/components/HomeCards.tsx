import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { useMemberInsights, useOrders, useSalesReport } from '@smartapp/api';
import { isOpen, WORDS } from '@smartapp/core';
import type { Order } from '@smartapp/core';
import { buttonVariants } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { IconChartBar, IconReceipt, IconUsers } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';
import { Money } from '@smartapp/ui/patterns/Money';
import { QueryState } from '@smartapp/ui/patterns/QueryState';

import { BoardCard } from '../../../app/orders/BoardCard';
import { CancelDialog } from '../../../app/orders/CancelDialog';
import { TrackingDialog } from '../../../app/orders/TrackingDialog';
import { useOrderSteps } from '../../../app/orders/useOrderSteps';
import { useRuleSettings } from '../../../app/orders/useRuleSettings';
import { useShop } from '../../../app/shop';

const words = WORDS.dashboard.home;
const shared = WORDS.shared;

/** How many open orders Home lists. */
const IN_PROGRESS_MAX = 5;

function HomeCard({ title, action, className, children }: { title: string; action?: ReactNode; className?: string; children: ReactNode }) {
  const id = `home-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return (
    <section aria-labelledby={id} className={cn('flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 id={id} className="font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

const retry = (refetch: () => Promise<unknown>) => ({
  title: shared.loadFailed,
  retryLabel: shared.tryAgain,
  onRetry: () => {
    void refetch();
  },
});

/**
 * In progress: the five oldest open orders as compact cards with the board's own buttons (one `nextActions`), so an
 * order can be finished from Home. Verify payment and tapping a card open the order.
 */
export function InProgress({ now, noOrdersToday }: { now: Date; noOrdersToday: boolean }) {
  const shop = useShop();
  const settings = useRuleSettings();
  const navigate = useNavigate();
  const orders = useOrders(shop.id, { kind: 'open' });
  const [cancelFor, setCancelFor] = useState<Order | null>(null);
  const openOrder = (orderId: string) => {
    void navigate({ to: '/$', params: { _splat: `orders/${orderId}` } });
  };
  const steps = useOrderSteps(openOrder);
  const open = (orders.data ?? []).filter((card) => isOpen(card.order));
  const state = orders.isPending ? 'loading' : orders.isError ? 'error' : open.length === 0 ? 'empty' : 'ready';

  return (
    <HomeCard
      title={words.inProgress.title}
      action={
        <Link to="/$" params={{ _splat: 'orders' }} className={buttonVariants({ variant: 'link', size: 'sm', className: 'px-0' })}>
          {words.inProgress.viewAll}
        </Link>
      }
    >
      <QueryState
        state={state}
        skeleton={<ListSkeleton rows={3} />}
        empty={
          noOrdersToday
            ? { media: <IconReceipt />, title: words.noOrdersToday, description: words.noOrdersTodayText }
            : { media: <IconReceipt />, title: words.inProgress.empty }
        }
        error={retry(orders.refetch)}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {open.slice(0, IN_PROGRESS_MAX).map((card) => (
            <BoardCard
              key={card.order.id}
              card={card}
              settings={settings}
              now={now}
              variant="compact"
              pending={steps.pendingId === card.order.id}
              onStep={(action) => {
                steps.run(action, card.order);
              }}
              onOpen={() => {
                openOrder(card.order.id);
              }}
              onCancel={() => {
                setCancelFor(card.order);
              }}
            />
          ))}
        </div>
      </QueryState>
      <TrackingDialog open={steps.trackingFor !== null} onClose={steps.closeTracking} onSend={steps.sendOut} />
      <CancelDialog
        order={cancelFor}
        onClose={() => {
          setCancelFor(null);
        }}
      />
    </HomeCard>
  );
}

/** The members card in member green: how many, and the top three suki this month. */
export function MembersCard() {
  const shop = useShop();
  const insights = useMemberInsights(shop.id);
  const data = insights.data;
  const state = insights.isPending ? 'loading' : insights.isError ? 'error' : data?.memberCount === 0 ? 'empty' : 'ready';
  return (
    <HomeCard title={words.members.title} className="border-member/20 bg-member-soft text-member-soft-foreground">
      <QueryState state={state} skeleton={<ListSkeleton rows={2} />} empty={{ media: <IconUsers />, title: words.members.none }} error={retry(insights.refetch)}>
        {data ? (
          <div className="flex flex-col gap-3">
            <p className="tabular text-2xl font-bold">{words.members.count(data.memberCount)}</p>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">{words.members.topSuki}</h3>
              {data.topSuki.length === 0 ? (
                <p className="text-sm opacity-80">{words.members.noSuki}</p>
              ) : (
                <ol className="flex flex-col gap-1 text-sm">
                  {data.topSuki.map((suki, index) => (
                    <li key={suki.customerId} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">
                        <span className="tabular mr-2 font-semibold">{index + 1}</span>
                        {suki.name}
                      </span>
                      <Money amount={suki.totalSpent} className="font-medium" />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        ) : null}
      </QueryState>
    </HomeCard>
  );
}

/** Best sellers today: the top five by quantity, from the same report as Reports "Today". */
export function BestSellersToday({ date }: { date: string }) {
  const shop = useShop();
  const report = useSalesReport(shop.id, { from: date, to: date });
  const best = report.data?.bestSellers ?? [];
  const state = report.isPending ? 'loading' : report.isError ? 'error' : best.length === 0 ? 'empty' : 'ready';
  return (
    <HomeCard title={words.bestSellers.title}>
      <QueryState state={state} skeleton={<ListSkeleton rows={3} />} empty={{ media: <IconChartBar />, title: words.noOrdersToday }} error={retry(report.refetch)}>
        <ol className="flex flex-col divide-y text-sm">
          {best.map((item) => (
            <li key={item.itemName} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate font-medium">{item.itemName}</span>
              <span className="tabular shrink-0 text-muted-foreground">{words.bestSellers.sold(item.qty)}</span>
            </li>
          ))}
        </ol>
      </QueryState>
    </HomeCard>
  );
}
