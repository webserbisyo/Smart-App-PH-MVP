import { formatManilaDateTime, ticketNo, WORDS } from '@smartapp/core';
import type { OrderReceipt } from '@smartapp/core';
import { OrderLines } from '@smartapp/ui/patterns/OrderLines';

import { paymentWord } from '../payment-word';

const words = WORDS.dashboard.orders.slip;

/** The print-only order slip (80 mm friendly): shop, number, type, time, lines, total, payment. Not a receipt. */
export function PrintSlip({ receipt, shopName }: { receipt: OrderReceipt; shopName: string }) {
  const { order, lines } = receipt;
  return (
    <div className="print-slip hidden text-black print:block">
      <p className="text-center text-base font-bold">{shopName}</p>
      <p className="text-center text-3xl font-bold">{ticketNo(order.orderNo)}</p>
      <p className="text-center text-sm">
        {WORDS.order.fulfillment[order.fulfillment]} · {order.customerName}
      </p>
      <p className="text-center text-xs">{words.placed(formatManilaDateTime(order.placedAt))}</p>
      <OrderLines
        lines={lines}
        totals={{ subtotal: order.subtotal, deliveryFee: order.deliveryFee, discount: order.discountTotal, total: order.total }}
        words={WORDS.order}
        className="my-3"
      />
      <p className="text-sm">{words.payment(WORDS.order.method[order.paymentMethod], paymentWord(order))}</p>
      <p className="mt-3 border-t border-dashed border-black pt-2 text-center text-xs font-bold">{words.heading}</p>
    </div>
  );
}
