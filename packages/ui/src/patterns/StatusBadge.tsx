import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconCoin,
  IconHourglassEmpty,
  IconPackage,
  IconReceipt,
  IconSparkles,
  IconToolsKitchen2,
  IconTruckDelivery,
} from '@tabler/icons-react';
import type { Icon as TablerIcon } from '@tabler/icons-react';

import { STATUS_LOOK, orderStatusLook, paymentLook } from '@smartapp/core';
import type { OrderStatus, PaymentMethod, PaymentStatus, StatusIcon, StatusLook } from '@smartapp/core';

import { Status, StatusIndicator, StatusLabel } from '#components/status';
import { cn } from '#lib/utils';

const ICONS: Readonly<Record<StatusIcon, TablerIcon>> = {
  new: IconSparkles,
  preparing: IconToolsKitchen2,
  ready: IconPackage,
  delivery: IconTruckDelivery,
  done: IconCircleCheck,
  cancelled: IconCircleX,
  expired: IconHourglassEmpty,
  unpaid: IconCoin,
  verify: IconReceipt,
  paid: IconCircleCheck,
  late: IconAlertTriangle,
};

export interface StatusBadgeProps {
  look: StatusLook;
  /** A dot instead of the icon (open or closed shop, live dots). */
  dot?: boolean;
  pulse?: boolean;
  className?: string | undefined;
}

/** Icon + word + colour, always together (paper 9.1). */
export function StatusBadge({ look, dot = false, pulse = false, className }: StatusBadgeProps) {
  const Icon = ICONS[look.icon];
  return (
    <Status variant={look.tone} className={className}>
      {dot ? <StatusIndicator pulse={pulse} /> : <Icon aria-hidden="true" />}
      <StatusLabel>{look.word}</StatusLabel>
    </Status>
  );
}

/** An order's status; `late` adds the red Late badge next to it. */
export function OrderStatusBadge({ status, late = false, className }: { status: OrderStatus; late?: boolean; className?: string | undefined }) {
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      <StatusBadge look={orderStatusLook(status)} />
      {late && <StatusBadge look={STATUS_LOOK.late} />}
    </span>
  );
}

/** An order's payment: Unpaid, To verify, Paid (Pay on delivery for unpaid cash on delivery). */
export function PaymentBadge({ status, method, className }: { status: PaymentStatus; method: PaymentMethod | null; className?: string | undefined }) {
  return <StatusBadge look={paymentLook(status, method)} className={className} />;
}
