// How a status looks: one tone, one icon and one word per status (paper 9.1, UX-7). Which step comes next is in
// ./order-rules. Tones keep one meaning everywhere: success = paid or done, warning = waiting or to verify,
// danger = late or a problem, info = new or on its way, neutral = nothing to do.
import type { OrderStatus, PaymentMethod, PaymentStatus } from './schemas/enums';
import { WORDS } from './words';

export const TONES = ['success', 'warning', 'danger', 'info', 'neutral'] as const;
export type Tone = (typeof TONES)[number];

/** Icon names; `packages/ui` maps each to a Tabler icon. */
export const STATUS_ICONS = [
  'new',
  'preparing',
  'ready',
  'delivery',
  'done',
  'cancelled',
  'expired',
  'unpaid',
  'verify',
  'paid',
  'late',
] as const;
export type StatusIcon = (typeof STATUS_ICONS)[number];

export interface StatusLook {
  tone: Tone;
  icon: StatusIcon;
  word: string;
}

const order = WORDS.order.status;
const payment = WORDS.order.payment;

export const STATUS_LOOK: {
  readonly order: Readonly<Record<OrderStatus, StatusLook>>;
  readonly payment: Readonly<Record<PaymentStatus, StatusLook>>;
  readonly late: StatusLook;
} = {
  order: {
    placed: { tone: 'info', icon: 'new', word: order.placed },
    preparing: { tone: 'warning', icon: 'preparing', word: order.preparing },
    ready: { tone: 'success', icon: 'ready', word: order.ready },
    out_for_delivery: { tone: 'info', icon: 'delivery', word: order.out_for_delivery },
    completed: { tone: 'success', icon: 'done', word: order.completed },
    cancelled: { tone: 'danger', icon: 'cancelled', word: order.cancelled },
    expired: { tone: 'neutral', icon: 'expired', word: order.expired },
  },
  payment: {
    unpaid: { tone: 'neutral', icon: 'unpaid', word: payment.unpaid },
    pending: { tone: 'warning', icon: 'verify', word: payment.pending },
    paid: { tone: 'success', icon: 'paid', word: payment.paid },
  },
  late: { tone: 'danger', icon: 'late', word: WORDS.order.late },
};

export function orderStatusLook(status: OrderStatus): StatusLook {
  return STATUS_LOOK.order[status];
}

/** A cash-on-delivery order that is not paid yet reads "Pay on delivery", not "Unpaid". */
export function paymentLook(status: PaymentStatus, method: PaymentMethod | null): StatusLook {
  const look = STATUS_LOOK.payment[status];
  if (status === 'unpaid' && method === 'cod') return { ...look, word: payment.cod };
  return look;
}
