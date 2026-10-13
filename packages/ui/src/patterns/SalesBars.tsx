import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import { formatPeso } from '@smartapp/core';
import type { SalesBar } from '@smartapp/core';

import { ChartContainer, ChartTooltip } from '#components/chart';
import type { ChartConfig } from '#components/chart';
import { cn } from '#lib/utils';

export interface SalesBarsWords {
  sales: string;
  orders: string;
}

export interface SalesBarsProps {
  /** One bar per hour or per day (`hourlySales`, `dailySales` in packages/core). */
  bars: readonly SalesBar[];
  words: SalesBarsWords;
  /** What the chart shows, for screen readers ("Sales from Oct 7 to Oct 13"). */
  label: string;
  className?: string;
}

function BarTip({ bar, words }: { bar: SalesBar; words: SalesBarsWords }) {
  return (
    <div className="grid min-w-32 gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium">{bar.label}</p>
      <p className="flex justify-between gap-3">
        <span className="text-muted-foreground">{words.sales}</span>
        <span className="tabular font-medium">{formatPeso(bar.sales)}</span>
      </p>
      <p className="flex justify-between gap-3">
        <span className="text-muted-foreground">{words.orders}</span>
        <span className="tabular font-medium">{bar.orders}</span>
      </p>
    </div>
  );
}

/**
 * Sales bars for Reports (ux-plan 5.16), in the chart colour; the tooltip shows the sales and the order count. A
 * separate module so the dashboard can load recharts only when Reports opens.
 */
export default function SalesBars({ bars, words, label, className }: SalesBarsProps) {
  const config = { sales: { label: words.sales, color: 'var(--chart-1)' } } satisfies ChartConfig;
  const data = bars.map((bar) => ({ key: bar.key, label: bar.label, sales: bar.sales }));
  return (
    <ChartContainer config={config} role="img" aria-label={label} className={cn('aspect-auto h-56 w-full', className)}>
      <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
        <ChartTooltip
          cursor={false}
          content={({ active, label: tipLabel }) => {
            const bar = active ? bars.find((entry) => entry.label === tipLabel) : undefined;
            return bar ? <BarTip bar={bar} words={words} /> : null;
          }}
        />
        <Bar dataKey="sales" fill="var(--color-sales)" radius={4} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}
