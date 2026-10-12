import { Order, OrderEvent, OrderLine, Payment } from '@smartapp/core';
import type { BoardOrder, OrderReceipt } from '@smartapp/core';

import type { Database } from '../database.types';

type Tables = Database['public']['Tables'];
export type OrderRow = Tables['orders']['Row'];
export type OrderItemRow = Tables['order_items']['Row'];
export type OrderEventRow = Tables['order_events']['Row'];
export type PaymentRow = Tables['payments']['Row'];

export function orderFromRow(row: OrderRow): Order {
  return Order.parse({
    id: row.id,
    tenantId: row.tenant_id,
    orderNo: row.order_no,
    businessDate: row.business_date,
    token: row.token,
    fulfillment: row.fulfillment,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    addressLine: row.address_line,
    landmark: row.landmark,
    deliveryZoneId: row.delivery_zone_id,
    deliveryFee: row.delivery_fee,
    pickupAt: row.pickup_at,
    notes: row.notes,
    subtotal: row.subtotal,
    discountTotal: row.discount_total,
    total: row.total,
    trackingUrl: row.tracking_url,
    cancelReason: row.cancel_reason,
    clientKey: row.client_key,
    expiresAt: row.expires_at,
    placedAt: row.placed_at,
    paidAt: row.paid_at,
    readyAt: row.ready_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
  });
}

export function orderLineFromRow(row: OrderItemRow): OrderLine {
  return OrderLine.parse({
    id: row.id,
    tenantId: row.tenant_id,
    orderId: row.order_id,
    itemId: row.item_id,
    variantId: row.variant_id,
    itemName: row.item_name,
    variantName: row.variant_name,
    unitPrice: row.unit_price,
    options: row.options,
    optionsTotal: row.options_total,
    qty: row.qty,
    lineTotal: row.line_total,
    note: row.note,
  });
}

export function orderEventFromRow(row: OrderEventRow): OrderEvent {
  return OrderEvent.parse({
    id: row.id,
    orderId: row.order_id,
    kind: row.kind,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    actor: row.actor,
    note: row.note,
    createdAt: row.created_at,
  });
}

export function paymentFromRow(row: PaymentRow): Payment {
  return Payment.parse({
    id: row.id,
    tenantId: row.tenant_id,
    orderId: row.order_id,
    method: row.method,
    amount: row.amount,
    status: row.status,
    referenceNo: row.reference_no,
    referenceNorm: row.reference_norm,
    proofPath: row.proof_path,
    reviewedAt: row.reviewed_at,
    rejectReason: row.reject_reason,
    createdAt: row.created_at,
  });
}

/** Lines in the order the customer added them (`sort`). */
function sortedLines(rows: OrderItemRow[]): OrderLine[] {
  return rows.toSorted((a, b) => a.sort - b.sort).map(orderLineFromRow);
}

export function boardOrderFromRow(row: OrderRow & { order_items: OrderItemRow[] }): BoardOrder {
  return { order: orderFromRow(row), lines: sortedLines(row.order_items) };
}

export function orderDetailFromRow(
  row: OrderRow & { order_items: OrderItemRow[]; order_events: OrderEventRow[]; payments: PaymentRow[] },
): OrderReceipt {
  return {
    order: orderFromRow(row),
    lines: sortedLines(row.order_items),
    events: row.order_events.toSorted((a, b) => a.created_at.localeCompare(b.created_at)).map(orderEventFromRow),
    payments: row.payments.toSorted((a, b) => a.created_at.localeCompare(b.created_at)).map(paymentFromRow),
  };
}
