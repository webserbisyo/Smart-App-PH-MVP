import { lazy, Suspense, useState } from 'react';

import { exportOrdersCsv, useApiClient, useOrders, useSalesReport } from '@smartapp/api';
import {
  averageOrder,
  dailySales,
  formatPeso,
  formatShortDate,
  hourlySales,
  REPORT_RANGES,
  reportDates,
  reportRangeOf,
  WORDS,
} from '@smartapp/core';
import type { ReportRange, SalesReport } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Spinner } from '@smartapp/ui/components/spinner';
import { Stat, StatDescription, StatIndicator, StatLabel, StatValue } from '@smartapp/ui/components/stat';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@smartapp/ui/components/table';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IconCash, IconChartBar, IconDownload, IconReceipt, IconShoppingBag, IconStar } from '@smartapp/ui/icons';
import { Money } from '@smartapp/ui/patterns/Money';
import { PageBody } from '@smartapp/ui/patterns/PageBody';
import { QueryState } from '@smartapp/ui/patterns/QueryState';

import { useDownload } from '../../../app/download';
import { useShop } from '../../../app/shop';
import { useToday } from '../../../app/today';

const words = WORDS.dashboard.reports;
const shared = WORDS.shared;

/** The chart library loads only when Reports opens (ux-plan 5.16). */
const SalesBars = lazy(() => import('@smartapp/ui/patterns/SalesBars'));

const ChartSkeleton = () => <Skeleton className="h-56 w-full" />;

/** Sales bars: per hour from today's orders, per day from the report. */
function SalesChart({ range, report, today }: { range: ReportRange; report: SalesReport; today: string }) {
  const shop = useShop();
  const orders = useOrders(range === 'today' ? shop.id : null, { kind: 'day', date: today });
  if (range === 'today' && orders.isPending) return <ChartSkeleton />;
  const bars = range === 'today' ? hourlySales((orders.data ?? []).map((card) => card.order)) : dailySales(report.days);
  if (report.totals.orders === 0 || bars.length === 0) {
    return <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">{words.noSales}</p>;
  }
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <SalesBars
        bars={bars}
        words={{ sales: words.sales, orders: words.orders }}
        label={words.chartLabel(formatShortDate(report.from), formatShortDate(report.to))}
      />
    </Suspense>
  );
}

function ReportBody({ range, report, today }: { range: ReportRange; report: SalesReport; today: string }) {
  const ratingAverage = report.ratingAverage ?? report.totals.ratingAverage;
  const ratingCount = report.ratingCount ?? report.totals.ratingCount ?? 0;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat>
          <StatLabel>{words.sales}</StatLabel>
          <StatIndicator color="success">
            <IconCash />
          </StatIndicator>
          <StatValue>{formatPeso(report.totals.sales)}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>{words.orders}</StatLabel>
          <StatIndicator color="info">
            <IconShoppingBag />
          </StatIndicator>
          <StatValue>{report.totals.orders}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>{words.average}</StatLabel>
          <StatIndicator>
            <IconReceipt />
          </StatIndicator>
          <StatValue>{formatPeso(averageOrder(report.totals.sales, report.totals.paidOrders))}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>{words.rating}</StatLabel>
          <StatIndicator color="warning">
            <IconStar />
          </StatIndicator>
          <StatValue>{ratingAverage != null ? words.ratingValue(ratingAverage) : '—'}</StatValue>
          <StatDescription>{ratingCount > 0 ? words.reviews(ratingCount) : words.noRatings}</StatDescription>
        </Stat>
      </div>

      <section aria-labelledby="sales-chart" className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
        <h2 id="sales-chart" className="font-semibold">
          {range === 'today' ? words.chartTitle.today : words.chartTitle.days}
        </h2>
        <SalesChart range={range} report={report} today={today} />
      </section>

      <section aria-labelledby="best-sellers" className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
        <h2 id="best-sellers" className="font-semibold">
          {words.bestSellers}
        </h2>
        {report.bestSellers.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{words.noBestSellers}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{words.columns.item}</TableHead>
                <TableHead className="text-right">{words.columns.qty}</TableHead>
                <TableHead className="text-right">{words.columns.sales}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.bestSellers.map((item) => (
                <TableRow key={item.itemName}>
                  <TableCell className="max-w-40 truncate font-medium sm:max-w-none">{item.itemName}</TableCell>
                  <TableCell className="tabular text-right">{item.qty}</TableCell>
                  <TableCell className="text-right">
                    <Money amount={item.sales} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </>
  );
}

/** Reports (ux-plan 5.16): Today, 7 days or 30 days in Manila dates; totals, sales bars, best sellers and the CSV. */
export default function ReportsScreen() {
  const shop = useShop();
  const client = useApiClient();
  const online = useOnline();
  const { date: today } = useToday();
  const [range, setRange] = useState<ReportRange>('today');
  const dates = reportDates(range, today);
  const report = useSalesReport(shop.id, dates);
  const download = useDownload(words.downloadFailed);
  const state = report.isPending ? 'loading' : report.isError ? 'error' : 'ready';
  const labels: Record<ReportRange, string> = {
    today: words.range.today,
    week: words.range.week,
    month: words.range.month,
  };

  return (
    <PageBody size="wide">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          value={[range]}
          variant="outline"
          aria-label={words.range.label}
          onValueChange={(values) => {
            const next = reportRangeOf(values[0]);
            if (next !== null) setRange(next);
          }}
        >
          {REPORT_RANGES.map((value) => (
            <ToggleGroupItem key={value} value={value}>
              {labels[value]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button
          variant="outline"
          disabled={!online || download.pending}
          onClick={() => {
            download.run(
              () => exportOrdersCsv(client, shop.id, dates),
              WORDS.dashboard.reports.csv.fileName(dates.from, dates.to),
            );
          }}
        >
          {download.pending ? <Spinner /> : <IconDownload aria-hidden="true" />}
          {words.download}
        </Button>
      </div>

      <QueryState
        state={state}
        skeleton={
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
            <Skeleton className="h-72 rounded-xl" />
          </div>
        }
        empty={{ media: <IconChartBar />, title: words.noSales }}
        error={{
          title: shared.loadFailed,
          retryLabel: shared.tryAgain,
          onRetry: () => {
            void report.refetch();
          },
        }}
        offline={online ? null : { title: shared.offlineShort }}
      >
        {report.data ? <ReportBody range={range} report={report.data} today={today} /> : null}
      </QueryState>
    </PageBody>
  );
}
