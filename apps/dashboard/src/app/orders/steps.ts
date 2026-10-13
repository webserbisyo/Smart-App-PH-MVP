import { ACTION_TO_STATUS, recordMethod } from '@smartapp/core';
import type { AdvanceStatus, CashMethod, Order, OrderAction } from '@smartapp/core';

// An order's next steps as database calls, shared by the orders board and Home's In progress (decision P4-36).
// Which steps an order has always comes from packages/core (nextActions); nothing here looks at a status itself.

/** What a next step does in the database. */
export type StepCall =
  | { kind: 'review' }
  | { kind: 'record'; method: CashMethod }
  | { kind: 'advance'; toStatus: AdvanceStatus; askTracking: boolean };

/**
 * A next step as a database call: Verify payment opens the proof; Mark paid records `recordMethod` (decision P5-28);
 * every other step moves the status (ACTION_TO_STATUS).
 */
export function stepCall(action: OrderAction, order: Pick<Order, 'fulfillment'>): StepCall {
  if (action === 'verify_payment') return { kind: 'review' };
  if (action === 'mark_paid') return { kind: 'record', method: recordMethod(order) };
  const target = ACTION_TO_STATUS[action];
  if (target === undefined) throw new Error(`No database call for ${action}`);
  return { kind: 'advance', toStatus: target, askTracking: action === 'out_for_delivery' };
}
