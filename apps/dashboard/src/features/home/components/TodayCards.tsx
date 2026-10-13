import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { formatPeso, PESO_SIGN, WORDS } from '@smartapp/core';
import type { DashboardToday } from '@smartapp/core';
import { buttonVariants } from '@smartapp/ui/components/button';
import { NumberTicker } from '@smartapp/ui/components/number-ticker';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Stat, StatDescription, StatIndicator, StatLabel, StatValue } from '@smartapp/ui/components/stat';
import { IconCash, IconClock, IconPackage, IconReceipt, IconShoppingBag, IconUsers } from '@smartapp/ui/icons';

import type { ModuleSearch } from '../../../app/search';

const words = WORDS.dashboard.home;

interface Chip {
  key: string;
  count: number;
  label: string;
  path: string;
  search: ModuleSearch;
  icon: ReactNode;
}

/** "2 to verify", "3 waiting", "1 low stock": each opens its filtered list; a chip at 0 is hidden, and so is the row. */
export function AttentionChips({ today }: { today: DashboardToday }) {
  const chips: Chip[] = [
    { key: 'verify', count: today.toVerify, label: words.attention.toVerify(today.toVerify), path: 'orders', search: { show: 'to_verify' }, icon: <IconReceipt /> },
    { key: 'waiting', count: today.waiting, label: words.attention.waiting(today.waiting), path: 'orders', search: { show: 'waiting' }, icon: <IconClock /> },
    { key: 'stock', count: today.lowStock, label: words.attention.lowStock(today.lowStock), path: 'products', search: { stock: 'low' }, icon: <IconPackage /> },
  ];
  const shown = chips.filter((chip) => chip.count > 0);
  if (shown.length === 0) return null;
  return (
    <nav aria-label={words.attention.label} className="flex flex-wrap gap-2">
      {shown.map((chip) => (
        <Link
          key={chip.key}
          to="/$"
          params={{ _splat: chip.path }}
          search={chip.search}
          className={buttonVariants({ variant: 'outline', className: 'tabular border-warning/40 bg-warning-soft text-warning-soft-foreground' })}
        >
          <span aria-hidden="true">{chip.icon}</span>
          {chip.label}
        </Link>
      ))}
    </nav>
  );
}

/** Today's sales in pesos, counting up once (the number ticker); screen readers get the plain amount. */
function SalesTicker({ amount }: { amount: number }) {
  return (
    <>
      <span className="sr-only">{formatPeso(amount)}</span>
      <span aria-hidden="true">
        {PESO_SIGN}
        <NumberTicker value={amount / 100} decimalPlaces={amount % 100 === 0 ? 0 : 2} className="tracking-tight text-inherit dark:text-inherit" />
      </span>
    </>
  );
}

/** The four numbers of the day (no comparisons, ux-plan 2). */
export function TodayStats({ today }: { today: DashboardToday }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat>
        <StatLabel>{words.stats.sales}</StatLabel>
        <StatIndicator color="success">
          <IconCash />
        </StatIndicator>
        <StatValue>
          <SalesTicker amount={today.salesToday} />
        </StatValue>
      </Stat>
      <Stat>
        <StatLabel>{words.stats.orders}</StatLabel>
        <StatIndicator color="info">
          <IconShoppingBag />
        </StatIndicator>
        <StatValue>{today.ordersToday}</StatValue>
        <StatDescription className="tabular">{words.stats.open(today.openOrders)}</StatDescription>
      </Stat>
      <Stat>
        <StatLabel>{words.stats.average}</StatLabel>
        <StatIndicator>
          <IconReceipt />
        </StatIndicator>
        <StatValue>{formatPeso(today.averageOrder)}</StatValue>
      </Stat>
      <Stat>
        <StatLabel>{words.stats.newMembers}</StatLabel>
        <StatIndicator color="member">
          <IconUsers />
        </StatIndicator>
        <StatValue>{today.newMembersThisWeek}</StatValue>
      </Stat>
    </div>
  );
}

export function TodaySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}
