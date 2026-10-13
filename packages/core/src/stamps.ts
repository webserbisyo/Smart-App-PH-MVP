import { formatPeso } from './money';
import { isOpen } from './order-rules';
import type { Order } from './schemas/order';
import type { StampRule } from './schemas/stamp-rule';
import { WORDS } from './words';

/** Where a member stands on the shop's stamp card. */
export interface StampProgress {
  /** Stamps on the card toward the next reward (0 to stampsNeeded). */
  filled: number;
  stampsNeeded: number;
  /** Stamps still to collect; 0 once the reward is ready. */
  left: number;
  rewardReady: boolean;
}

/**
 * The stamp line and card (paper 6.7): stamps toward the next reward and whether the reward is ready. Null when the
 * shop's stamp card is off or missing. Extra stamps past the goal wait for the next card after the reward is used.
 */
export function stampProgress(balance: number, rule: Pick<StampRule, 'isActive' | 'stampsNeeded'> | null): StampProgress | null {
  if (rule === null || !rule.isActive) return null;
  const stamps = Math.max(0, Math.trunc(balance));
  const filled = Math.min(stamps, rule.stampsNeeded);
  return { filled, stampsNeeded: rule.stampsNeeded, left: rule.stampsNeeded - filled, rewardReady: stamps >= rule.stampsNeeded };
}

/** The reward as customers read it, from the peso amount: `10000` → "₱100 off your order". */
export function rewardLabel(amount: number): string {
  return WORDS.shared.stamps.rewardLabel(formatPeso(amount));
}

/** The shop's rule in one line: "Buy 10, get ₱100 off your order (orders of ₱150 or more)". */
export function stampRuleLine(rule: Pick<StampRule, 'stampsNeeded' | 'rewardLabel' | 'minOrderTotal'>): string {
  return WORDS.storefront.stamps.rule(rule.stampsNeeded, rule.rewardLabel, rule.minOrderTotal > 0 ? formatPeso(rule.minOrderTotal) : null);
}

/** The cart and receipt line: "2 more orders to ₱100 off your order", or "Reward ready: ₱100 off your order". */
export function stampLine(progress: StampProgress, reward: string): string {
  return progress.rewardReady ? WORDS.storefront.stamps.ready(reward) : WORDS.storefront.stamps.line(progress.left, reward);
}

/**
 * What the reward takes off this subtotal, for the cart's estimate only: the database prices the real discount
 * (quote_order) and never takes off more than the items cost.
 */
export function rewardDiscount(subtotal: number, rule: Pick<StampRule, 'rewardAmount'>): number {
  return Math.max(0, Math.min(rule.rewardAmount, subtotal));
}

/**
 * Does this order earn (or did it earn) a stamp on the card? Not when cancelled or expired, and only from the
 * minimum order (items after the reward, without the delivery fee), as advance_order counts it.
 */
export function orderEarnsStamp(
  order: Pick<Order, 'status' | 'subtotal' | 'discountTotal'>,
  rule: Pick<StampRule, 'isActive' | 'minOrderTotal'> | null,
): boolean {
  if (rule === null || !rule.isActive) return false;
  if (!isOpen(order) && order.status !== 'completed') return false;
  return order.subtotal - order.discountTotal >= rule.minOrderTotal;
}
