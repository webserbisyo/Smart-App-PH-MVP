import type { ReactNode } from 'react';

import type { OrderLine } from '@smartapp/core';

import { Separator } from '#components/separator';
import { cn } from '#lib/utils';

import { Money } from './Money';

export type OrderLinesLine = Pick<OrderLine, 'itemName' | 'variantName' | 'qty' | 'lineTotal' | 'note'> & {
  options: readonly Pick<OrderLine['options'][number], 'name'>[];
  isReward?: boolean | undefined;
};

export interface OrderLinesTotals {
  subtotal: number;
  deliveryFee?: number;
  discount?: number;
  total: number;
}

export interface OrderLinesWords {
  subtotal: string;
  deliveryFee: string;
  discount: string;
  total: string;
  defaultVariant: string;
  lineQty: (qty: number) => string;
  note: (note: string) => string;
}

export interface OrderLinesProps {
  lines: readonly OrderLinesLine[];
  totals?: OrderLinesTotals;
  words: OrderLinesWords;
  /** Controls for a line (the cart's stepper and remove button). */
  renderLineActions?: (index: number) => ReactNode;
  className?: string;
}

/** The lines of a cart or an order, then the totals. Cart, checkout, receipt, order detail and the print slip. */
export function OrderLines({ lines, totals, words, renderLineActions, className }: OrderLinesProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <ul className="flex flex-col gap-3">
        {lines.map((line, index) => {
          const details = [
            ...(line.variantName === words.defaultVariant ? [] : [line.variantName]),
            ...line.options.map((option) => option.name),
          ];
          return (
            <li key={`${line.itemName}-${String(index)}`} className="flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <span className="tabular w-8 shrink-0 font-semibold text-muted-foreground">{words.lineQty(line.qty)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-medium break-words">{line.itemName}</p>
                    {line.isReward && (
                      <span className="inline-flex items-center rounded-sm bg-member/15 px-1.5 py-0.5 text-[11px] font-semibold text-member">
                        Reward
                      </span>
                    )}
                  </div>
                  {details.length > 0 && <p className="text-sm text-muted-foreground">{details.join(', ')}</p>}
                  {line.note && <p className="text-sm text-muted-foreground italic">{words.note(line.note)}</p>}
                </div>
                {line.isReward ? (
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xs text-muted-foreground line-through tabular"><Money amount={line.lineTotal} /></span>
                    <span className="font-semibold text-member">Free</span>
                  </div>
                ) : (
                  <Money amount={line.lineTotal} className="font-semibold" />
                )}
              </div>
              {renderLineActions && <div className="flex items-center justify-end gap-2 pl-11">{renderLineActions(index)}</div>}
            </li>
          );
        })}
      </ul>
      {totals && (
        <>
          <Separator />
          <dl className="flex flex-col gap-1.5 text-sm">
            <TotalRow label={words.subtotal} amount={totals.subtotal} />
            {totals.deliveryFee !== undefined && totals.deliveryFee > 0 && <TotalRow label={words.deliveryFee} amount={totals.deliveryFee} />}
            {totals.discount !== undefined && totals.discount > 0 && <TotalRow label={words.discount} amount={-totals.discount} />}
            <TotalRow label={words.total} amount={totals.total} strong />
          </dl>
        </>
      )}
    </div>
  );
}

function TotalRow({ label, amount, strong = false }: { label: string; amount: number; strong?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-3', strong && 'text-base font-bold')}>
      <dt className={cn(!strong && 'text-muted-foreground')}>{label}</dt>
      <dd>
        <Money amount={amount} />
      </dd>
    </div>
  );
}
