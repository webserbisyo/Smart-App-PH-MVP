import { orderStatusLook, paymentLook, WORDS } from '@smartapp/core';
import type { OrderStatus, PaymentMethod, PaymentStatus, StatusLook } from '@smartapp/core';

// The customer's badges: the same colours and icons as the dashboard, in the customer's words ("Placed", not "New";
// "Checking payment", not "To verify").

const words = WORDS.storefront.receipt;

export function customerOrderLook(status: OrderStatus): StatusLook {
  return { ...orderStatusLook(status), word: words.steps[status] };
}

export function customerPaymentLook(status: PaymentStatus, method: PaymentMethod): StatusLook {
  const word = status === 'unpaid' && method === 'cod' ? words.paymentState.cod : words.paymentState[status];
  return { ...paymentLook(status, method), word };
}
