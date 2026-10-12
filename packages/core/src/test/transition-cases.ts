import type { ApiErrorCode } from '../contracts/errors';
import type { OrderAction, RuleOrder, RuleSettings } from '../order-rules';

// Order step cases shared by the Vitest test of `nextActions` (packages/core) and the pgTAP test of
// `advance_order`, `record_payment` and `review_payment` (supabase/tests/database/05_owner_orders.test.sql), decision
// P5-9. An action the board offers must succeed in the database, and one it does not offer must fail there.
// `mark_paid` records `cod` for delivery orders and `cash` for the rest.

export interface TransitionCase {
  name: string;
  order: Pick<RuleOrder, 'status' | 'paymentStatus' | 'paymentMethod' | 'fulfillment'>;
  settings: RuleSettings;
  action: OrderAction;
  /** `ok`, or the error code the database raises. */
  expected: 'ok' | ApiErrorCode;
}

const LATER: RuleSettings = { payLaterPickup: true };
const FIRST: RuleSettings = { payLaterPickup: false };

export const TRANSITION_CASES: TransitionCase[] = [
  // Start (placed → preparing)
  {
    name: 'walk-in cash starts unpaid',
    order: { status: 'placed', paymentStatus: 'unpaid', paymentMethod: 'cash', fulfillment: 'walk_in' },
    settings: FIRST,
    action: 'start',
    expected: 'ok',
  },
  {
    name: 'pickup cash starts unpaid when paying later is on',
    order: { status: 'placed', paymentStatus: 'unpaid', paymentMethod: 'cash', fulfillment: 'pickup' },
    settings: LATER,
    action: 'start',
    expected: 'ok',
  },
  {
    name: 'pickup cash waits for payment when paying later is off',
    order: { status: 'placed', paymentStatus: 'unpaid', paymentMethod: 'cash', fulfillment: 'pickup' },
    settings: FIRST,
    action: 'start',
    expected: 'not_paid',
  },
  {
    name: 'cash on delivery starts unpaid',
    order: { status: 'placed', paymentStatus: 'unpaid', paymentMethod: 'cod', fulfillment: 'delivery' },
    settings: FIRST,
    action: 'start',
    expected: 'ok',
  },
  {
    name: 'unpaid GCash cannot start',
    order: { status: 'placed', paymentStatus: 'unpaid', paymentMethod: 'gcash', fulfillment: 'pickup' },
    settings: LATER,
    action: 'start',
    expected: 'not_paid',
  },
  {
    name: 'Maya with a proof waiting cannot start',
    order: { status: 'placed', paymentStatus: 'pending', paymentMethod: 'maya', fulfillment: 'delivery' },
    settings: LATER,
    action: 'start',
    expected: 'not_paid',
  },
  {
    name: 'paid bank transfer starts',
    order: { status: 'placed', paymentStatus: 'paid', paymentMethod: 'bank', fulfillment: 'walk_in' },
    settings: FIRST,
    action: 'start',
    expected: 'ok',
  },
  // Mark ready (preparing → ready)
  {
    name: 'paid GCash pickup gets ready',
    order: { status: 'preparing', paymentStatus: 'paid', paymentMethod: 'gcash', fulfillment: 'pickup' },
    settings: LATER,
    action: 'mark_ready',
    expected: 'ok',
  },
  {
    name: 'unpaid walk-in cash gets ready',
    order: { status: 'preparing', paymentStatus: 'unpaid', paymentMethod: 'cash', fulfillment: 'walk_in' },
    settings: FIRST,
    action: 'mark_ready',
    expected: 'ok',
  },
  {
    name: 'a new order cannot skip to ready',
    order: { status: 'placed', paymentStatus: 'paid', paymentMethod: 'cash', fulfillment: 'walk_in' },
    settings: FIRST,
    action: 'mark_ready',
    expected: 'invalid_transition',
  },
  // Out for delivery (ready → out_for_delivery)
  {
    name: 'ready cash on delivery goes out unpaid',
    order: { status: 'ready', paymentStatus: 'unpaid', paymentMethod: 'cod', fulfillment: 'delivery' },
    settings: FIRST,
    action: 'out_for_delivery',
    expected: 'ok',
  },
  {
    name: 'pickup never goes out for delivery',
    order: { status: 'ready', paymentStatus: 'paid', paymentMethod: 'cash', fulfillment: 'pickup' },
    settings: LATER,
    action: 'out_for_delivery',
    expected: 'invalid_transition',
  },
  {
    name: 'delivery goes out only once ready',
    order: { status: 'preparing', paymentStatus: 'paid', paymentMethod: 'gcash', fulfillment: 'delivery' },
    settings: FIRST,
    action: 'out_for_delivery',
    expected: 'invalid_transition',
  },
  // Complete
  {
    name: 'paid walk-in completes from ready',
    order: { status: 'ready', paymentStatus: 'paid', paymentMethod: 'cash', fulfillment: 'walk_in' },
    settings: FIRST,
    action: 'complete',
    expected: 'ok',
  },
  {
    name: 'unpaid pickup cash cannot complete',
    order: { status: 'ready', paymentStatus: 'unpaid', paymentMethod: 'cash', fulfillment: 'pickup' },
    settings: LATER,
    action: 'complete',
    expected: 'not_paid',
  },
  {
    name: 'delivery completes only after going out',
    order: { status: 'ready', paymentStatus: 'paid', paymentMethod: 'gcash', fulfillment: 'delivery' },
    settings: FIRST,
    action: 'complete',
    expected: 'invalid_transition',
  },
  {
    name: 'paid cash on delivery completes',
    order: { status: 'out_for_delivery', paymentStatus: 'paid', paymentMethod: 'cod', fulfillment: 'delivery' },
    settings: FIRST,
    action: 'complete',
    expected: 'ok',
  },
  {
    name: 'unpaid cash on delivery cannot complete',
    order: { status: 'out_for_delivery', paymentStatus: 'unpaid', paymentMethod: 'cod', fulfillment: 'delivery' },
    settings: FIRST,
    action: 'complete',
    expected: 'not_paid',
  },
  {
    name: 'preparing cannot skip to completed',
    order: { status: 'preparing', paymentStatus: 'paid', paymentMethod: 'cash', fulfillment: 'walk_in' },
    settings: FIRST,
    action: 'complete',
    expected: 'invalid_transition',
  },
  {
    name: 'completed is the end',
    order: { status: 'completed', paymentStatus: 'paid', paymentMethod: 'cash', fulfillment: 'walk_in' },
    settings: FIRST,
    action: 'complete',
    expected: 'invalid_transition',
  },
  {
    name: 'cancelled never starts',
    order: { status: 'cancelled', paymentStatus: 'unpaid', paymentMethod: 'gcash', fulfillment: 'pickup' },
    settings: LATER,
    action: 'start',
    expected: 'invalid_transition',
  },
  {
    name: 'expired never starts',
    order: { status: 'expired', paymentStatus: 'unpaid', paymentMethod: 'gcash', fulfillment: 'delivery' },
    settings: LATER,
    action: 'start',
    expected: 'invalid_transition',
  },
  // Mark paid (record_payment)
  {
    name: 'walk-in cash is marked paid',
    order: { status: 'placed', paymentStatus: 'unpaid', paymentMethod: 'cash', fulfillment: 'walk_in' },
    settings: FIRST,
    action: 'mark_paid',
    expected: 'ok',
  },
  {
    name: 'unpaid GCash paid in cash at the counter',
    order: { status: 'placed', paymentStatus: 'unpaid', paymentMethod: 'gcash', fulfillment: 'pickup' },
    settings: LATER,
    action: 'mark_paid',
    expected: 'ok',
  },
  {
    name: 'cash on delivery is marked paid at the door',
    order: { status: 'out_for_delivery', paymentStatus: 'unpaid', paymentMethod: 'cod', fulfillment: 'delivery' },
    settings: FIRST,
    action: 'mark_paid',
    expected: 'ok',
  },
  {
    name: 'unpaid Maya delivery paid in cash at the door',
    order: { status: 'placed', paymentStatus: 'unpaid', paymentMethod: 'maya', fulfillment: 'delivery' },
    settings: FIRST,
    action: 'mark_paid',
    expected: 'ok',
  },
  {
    name: 'a paid order is not paid twice',
    order: { status: 'ready', paymentStatus: 'paid', paymentMethod: 'cash', fulfillment: 'pickup' },
    settings: LATER,
    action: 'mark_paid',
    expected: 'already_paid',
  },
  {
    name: 'a proof waiting is checked, not marked paid',
    order: { status: 'placed', paymentStatus: 'pending', paymentMethod: 'gcash', fulfillment: 'walk_in' },
    settings: FIRST,
    action: 'mark_paid',
    expected: 'payment_not_pending',
  },
  {
    name: 'a cancelled order takes no payment',
    order: { status: 'cancelled', paymentStatus: 'unpaid', paymentMethod: 'cash', fulfillment: 'walk_in' },
    settings: FIRST,
    action: 'mark_paid',
    expected: 'order_not_payable',
  },
  {
    name: 'an expired order takes no payment',
    order: { status: 'expired', paymentStatus: 'unpaid', paymentMethod: 'bank', fulfillment: 'pickup' },
    settings: LATER,
    action: 'mark_paid',
    expected: 'order_not_payable',
  },
  // Verify payment (review_payment, approve)
  {
    name: 'a waiting GCash proof is approved',
    order: { status: 'placed', paymentStatus: 'pending', paymentMethod: 'gcash', fulfillment: 'pickup' },
    settings: LATER,
    action: 'verify_payment',
    expected: 'ok',
  },
  {
    name: 'a cancelled order proof is not approved',
    order: { status: 'cancelled', paymentStatus: 'pending', paymentMethod: 'bank', fulfillment: 'pickup' },
    settings: LATER,
    action: 'verify_payment',
    expected: 'order_not_payable',
  },
];
