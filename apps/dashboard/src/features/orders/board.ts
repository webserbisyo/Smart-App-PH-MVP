import { ACTION_TO_STATUS, BOARD_COLUMNS, boardColumn, recordMethod, ticketNo } from '@smartapp/core';
import type { AdvanceStatus, BoardColumn, BoardOrder, CashMethod, Order, OrderAction } from '@smartapp/core';

// The board's arranging and searching. Which column and which buttons always come from packages/core
// (boardColumn, nextActions); nothing here looks at a status itself.

export type BoardColumns = Record<BoardColumn, BoardOrder[]>;

/** Every order in its column (cancelled and expired orders are not on the board). Oldest first, as fetched. */
export function groupBoard(orders: readonly BoardOrder[]): BoardColumns {
  const columns: BoardColumns = { new: [], preparing: [], ready: [], out: [], done: [] };
  for (const card of orders) {
    const column = boardColumn(card.order);
    if (column !== null) columns[column].push(card);
  }
  // Done today: the latest first.
  columns.done.reverse();
  return columns;
}

/** Orders waiting for the owner to act on them first: the New column (the nav count and the tab title). */
export function newCount(orders: readonly BoardOrder[]): number {
  return orders.filter((card) => boardColumn(card.order) === 'new').length;
}

/** "42", "#042" or "042" → 42; anything else → null. */
export function parseTicket(text: string): number | null {
  const match = /^#?0*(\d{1,6})$/.exec(text.trim());
  return match?.[1] === undefined ? null : Number(match[1]);
}

/** Search by number ("42", "#042") or by the customer's name. */
export function searchOrders(orders: readonly BoardOrder[], query: string): BoardOrder[] {
  const text = query.trim().toLowerCase();
  if (text === '') return [...orders];
  const number = parseTicket(text);
  return orders.filter(
    (card) =>
      (number !== null && card.order.orderNo === number) ||
      card.order.customerName.toLowerCase().includes(text) ||
      ticketNo(card.order.orderNo).includes(text),
  );
}

/** The open order with this number today ("Find by number" at the counter). */
export function findByNumber(orders: readonly BoardOrder[], text: string): BoardOrder | null {
  const number = parseTicket(text);
  if (number === null) return null;
  return orders.find((card) => card.order.orderNo === number) ?? null;
}

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

export { BOARD_COLUMNS };
