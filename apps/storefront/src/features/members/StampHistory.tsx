import { formatManilaDateTime, ticketNo, WORDS } from '@smartapp/core';
import type { LoyaltyEntry, MemberAccount } from '@smartapp/core';
import { cn } from '@smartapp/ui/lib/utils';

const words = WORDS.storefront.stamps;

function entryText(entry: LoyaltyEntry, orders: MemberAccount['orders']): string {
  if (entry.reason === 'earned') {
    const order = orders.find((candidate) => candidate.id === entry.orderId);
    return words.reason.earned(order ? ticketNo(order.orderNo) : null);
  }
  return words.reason[entry.reason];
}

/** The latest stamp movements, newest first: "Welcome stamp +1", "Stamp from order #042 +1", "Reward used −10". */
export function StampHistory({ account, className }: { account: MemberAccount; className?: string }) {
  if (account.history.length === 0) return <p className={cn('text-sm text-muted-foreground', className)}>{WORDS.storefront.account.historyEmpty}</p>;
  return (
    <ul className={cn('flex flex-col divide-y rounded-xl border', className)}>
      {account.history.map((entry) => (
        <li key={`${entry.createdAt}-${entry.reason}-${entry.orderId ?? ''}`} className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{entryText(entry, account.orders)}</span>
            <span className="text-xs text-muted-foreground">{formatManilaDateTime(entry.createdAt)}</span>
          </span>
          <span className={cn('tabular shrink-0 font-semibold', entry.delta > 0 ? 'text-member-text' : 'text-muted-foreground')}>{words.delta(entry.delta)}</span>
        </li>
      ))}
    </ul>
  );
}
