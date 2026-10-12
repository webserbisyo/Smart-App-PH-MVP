import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { useOrders } from '@smartapp/api';
import { ticketNo, WORDS } from '@smartapp/core';
import type { BoardColumn, BoardOrder, Order } from '@smartapp/core';
import { Alert, AlertDescription } from '@smartapp/ui/components/alert';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { toast } from '@smartapp/ui/components/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { IconReceipt, IconRefresh, IconSearch } from '@smartapp/ui/icons';
import { PageBody } from '@smartapp/ui/patterns/PageBody';
import { QueryState } from '@smartapp/ui/patterns/QueryState';

import { useOrdersLive } from '../../../app/shell/orders-live';
import { useShop, useVocab } from '../../../app/shop';
import { BOARD_COLUMNS, findByNumber, groupBoard, parseTicket, searchOrders } from '../board';
import { BoardCard } from '../components/BoardCard';
import { CancelDialog } from '../components/CancelDialog';
import { OrderDetail } from '../components/OrderDetail';
import { TrackingDialog } from '../components/TrackingDialog';
import { useNow } from '../hooks/useNow';
import { useOrderSteps } from '../hooks/useOrderSteps';
import { useRuleSettings } from '../hooks/useRuleSettings';
import { useWide } from '../hooks/useWide';

const words = WORDS.dashboard.orders;

/** How long the live channel may be down before the board says so (it polls meanwhile). */
const LIVE_GRACE_MS = 10_000;

function BoardSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ))}
    </div>
  );
}

/** True once the live channel has been down for a while (not on the first seconds of loading). */
function useLiveLost(live: boolean): boolean {
  const [lost, setLost] = useState(false);
  useEffect(() => {
    if (live) return undefined;
    const timer = window.setTimeout(() => {
      setLost(true);
    }, LIVE_GRACE_MS);
    return () => {
      window.clearTimeout(timer);
      setLost(false);
    };
  }, [live]);
  return !live && lost;
}

/** The orders board (ux-plan 5.10): New, Kitchen or Packing, Ready, Out, Done today; one next step per card. */
export default function OrdersScreen() {
  const shop = useShop();
  const vocab = useVocab();
  const settings = useRuleSettings();
  const now = useNow();
  const navigate = useNavigate();
  const phone = useFormFactor() === 'phone';
  const wide = useWide();
  const { live } = useOrdersLive();
  const liveLost = useLiveLost(live);
  const orders = useOrders(shop.id, { kind: 'open' });
  const [query, setQuery] = useState('');
  const [number, setNumber] = useState('');
  const [tab, setTab] = useState<BoardColumn>('new');
  const [selected, setSelected] = useState<string | null>(null);
  const [cancelFor, setCancelFor] = useState<Order | null>(null);

  const openOrder = (orderId: string) => {
    if (wide) {
      setSelected(orderId);
      return;
    }
    void navigate({ to: '/$', params: { _splat: `orders/${orderId}` } });
  };
  const steps = useOrderSteps(openOrder);

  const all = orders.data ?? [];
  const columns = groupBoard(searchOrders(all, query));
  const titles: Record<BoardColumn, string> = {
    new: words.columns.new,
    preparing: words.columns.preparing(vocab.prep),
    ready: words.columns.ready,
    out: words.columns.out,
    done: words.columns.done,
  };
  const state = orders.isPending ? 'loading' : orders.isError ? 'error' : all.length === 0 ? 'empty' : 'ready';

  const renderCard = (card: BoardOrder) => (
    <BoardCard
      key={card.order.id}
      card={card}
      settings={settings}
      now={now}
      pending={steps.pendingId === card.order.id}
      selected={wide && selected === card.order.id}
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
  );

  const renderColumn = (column: BoardColumn) =>
    columns[column].length === 0 ? (
      <p className="py-6 text-center text-sm text-muted-foreground">{query.trim() === '' ? words.emptyColumn : words.noMatch}</p>
    ) : (
      <div className="flex flex-col gap-3">{columns[column].map(renderCard)}</div>
    );

  const board = phone ? (
    <Tabs
      value={tab}
      onValueChange={(value: BoardColumn) => {
        setTab(value);
      }}
    >
      <TabsList className="w-full justify-start overflow-x-auto">
        {BOARD_COLUMNS.map((column) => (
          <TabsTrigger key={column} value={column} className="tabular shrink-0">
            {words.columnCount(titles[column], columns[column].length)}
          </TabsTrigger>
        ))}
      </TabsList>
      {BOARD_COLUMNS.map((column) => (
        <TabsContent key={column} value={column} className="pt-3">
          {renderColumn(column)}
        </TabsContent>
      ))}
    </Tabs>
  ) : (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] items-start gap-4">
      {BOARD_COLUMNS.map((column) => (
        <section key={column} aria-labelledby={`column-${column}`} className="flex min-w-0 flex-col gap-3 rounded-xl bg-muted/50 p-3">
          <h2 id={`column-${column}`} className="tabular flex items-center justify-between text-sm font-semibold">
            <span>{titles[column]}</span>
            <span className="text-muted-foreground">{columns[column].length}</span>
          </h2>
          {renderColumn(column)}
        </section>
      ))}
    </div>
  );

  return (
    <PageBody size="full" className="min-h-full">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <IconSearch aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={words.search}
            placeholder={words.search}
            value={query}
            className="pl-9"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const found = findByNumber(all, number);
            if (found) {
              setNumber('');
              openOrder(found.order.id);
              return;
            }
            const asked = parseTicket(number);
            if (asked !== null) toast(words.notFoundNumber(ticketNo(asked)));
          }}
        >
          <Input
            inputMode="numeric"
            aria-label={words.findByNumber}
            placeholder={words.findByNumber}
            value={number}
            className="w-36"
            onChange={(event) => {
              setNumber(event.target.value);
            }}
          />
          <Button type="submit" variant="outline">
            {words.find}
          </Button>
        </form>
      </div>

      {liveLost ? (
        <Alert className="flex flex-wrap items-center justify-between gap-2">
          <AlertDescription>{words.liveLost}</AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void orders.refetch();
            }}
          >
            <IconRefresh aria-hidden="true" />
            {words.refresh}
          </Button>
        </Alert>
      ) : null}

      <div className={wide ? 'grid grid-cols-[minmax(0,1fr)_26rem] items-start gap-4' : undefined}>
        <QueryState
          state={state}
          skeleton={<BoardSkeleton />}
          empty={{ media: <IconReceipt />, title: WORDS.dashboard.empty.orders }}
          error={{
            title: WORDS.shared.loadFailed,
            retryLabel: WORDS.shared.tryAgain,
            onRetry: () => {
              void orders.refetch();
            },
          }}
        >
          {board}
        </QueryState>
        {wide ? (
          <aside aria-label={WORDS.dashboard.orders.detail.crumb} className="sticky top-4 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-xl border bg-card p-4">
            {selected === null ? (
              <p className="py-12 text-center text-sm text-muted-foreground">{words.selectOrder}</p>
            ) : (
              <OrderDetail key={selected} orderId={selected} panel />
            )}
          </aside>
        ) : null}
      </div>

      <TrackingDialog open={steps.trackingFor !== null} onClose={steps.closeTracking} onSend={steps.sendOut} />
      <CancelDialog
        order={cancelFor}
        onClose={() => {
          setCancelFor(null);
        }}
      />
    </PageBody>
  );
}
