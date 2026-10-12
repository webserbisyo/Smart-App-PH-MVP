import { paymentLook } from '@smartapp/core';
import type { Order } from '@smartapp/core';

/** The payment word for an order (Unpaid, To verify, Paid, Pay on delivery), the same one the badge shows. */
export function paymentWord(order: Pick<Order, 'paymentStatus' | 'paymentMethod'>): string {
  return paymentLook(order.paymentStatus, order.paymentMethod).word;
}
