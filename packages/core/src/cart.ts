import type { Storefront, StorefrontItem } from './contracts/db-functions';
import type { CartLine } from './schemas/cart-line';
import type { Option } from './schemas/option-group';
import type { Variant } from './schemas/variant';
import { nextOpeningText, openState } from './time';
import { WORDS } from './words';

// The storefront cart's rules (P4.3). The cart keeps only what the customer chose (`CartLine`); prices shown here
// come from the storefront data and are an estimate: quote_order and place_order price the order (P5.3).

/** The longest note a customer can add to a line in the item sheet. */
export const CART_NOTE_MAX = 120;
/** The most of one line. */
export const CART_QTY_MAX = 99;

/** A variant can be ordered: not marked sold out and, when the item counts stock, at least one left. */
export function variantAvailable(item: Pick<StorefrontItem, 'trackStock'>, variant: Pick<Variant, 'isSoldOut' | 'stockOnHand'>): boolean {
  return !variant.isSoldOut && (!item.trackStock || (variant.stockOnHand ?? 0) > 0);
}

/** No variant of the item can be ordered. */
export function itemSoldOut(item: StorefrontItem): boolean {
  return !item.variants.some((variant) => variantAvailable(item, variant));
}

/** The lowest price of the item's variants, and whether they differ ("from ₱120"). */
export function itemPrice(item: StorefrontItem): { price: number; varies: boolean } {
  const prices = item.variants.map((variant) => variant.price);
  const price = Math.min(...prices);
  return { price, varies: prices.some((other) => other !== price) };
}

/** The "+" on a card adds at once: one variant, available, and no add-on group the customer must choose. */
export function canQuickAdd(item: StorefrontItem): boolean {
  const [only, ...rest] = item.variants;
  return only !== undefined && rest.length === 0 && variantAvailable(item, only) && item.optionGroups.every((group) => group.minSelect === 0);
}

/** What the customer still has to choose in the item sheet, first one first; null when the choice is complete. */
export type ChoiceProblem = { kind: 'variant' } | { kind: 'group'; groupId: string; name: string };

export function choiceProblem(item: StorefrontItem, variantId: string | null, optionIds: readonly string[]): ChoiceProblem | null {
  const variant = item.variants.find((candidate) => candidate.id === variantId);
  if (!variant || !variantAvailable(item, variant)) return { kind: 'variant' };
  for (const group of item.optionGroups) {
    const chosen = group.options.filter((option) => optionIds.includes(option.id)).length;
    if (chosen < group.minSelect || chosen > group.maxSelect) return { kind: 'group', groupId: group.id, name: group.name };
  }
  return null;
}

/** The unit price of a choice: the variant plus its add-ons. */
export function unitPrice(variant: Pick<Variant, 'price'>, options: readonly Pick<Option, 'priceDelta'>[]): number {
  return options.reduce((sum, option) => sum + option.priceDelta, variant.price);
}

function sameOptions(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

/** Same item, variant, add-ons and note: adding it again only raises the quantity. */
export function sameCartLine(a: CartLine, b: CartLine): boolean {
  return a.itemId === b.itemId && a.variantId === b.variantId && sameOptions(a.optionIds, b.optionIds) && (a.note ?? '') === (b.note ?? '');
}

/** Adds a line, or raises the quantity of the same line (never above 99). */
export function addCartLine(lines: readonly CartLine[], line: CartLine): CartLine[] {
  const index = lines.findIndex((existing) => sameCartLine(existing, line));
  if (index === -1) return [...lines, line];
  return lines.map((existing, at) => (at === index ? { ...existing, qty: Math.min(CART_QTY_MAX, existing.qty + line.qty) } : existing));
}

/** Sets the quantity of one line (1 to 99). */
export function setCartLineQty(lines: readonly CartLine[], index: number, qty: number): CartLine[] {
  const clamped = Math.min(CART_QTY_MAX, Math.max(1, Math.round(qty)));
  return lines.map((line, at) => (at === index ? { ...line, qty: clamped } : line));
}

export function removeCartLine(lines: readonly CartLine[], index: number): CartLine[] {
  return lines.filter((_, at) => at !== index);
}

/** A cart line with names and prices from the storefront data. */
export interface PricedCartLine {
  line: CartLine;
  itemName: string;
  variantName: string;
  options: { id: string; name: string; priceDelta: number }[];
  unitPrice: number;
  /** Centavos; 0 when the line can no longer be ordered. */
  lineTotal: number;
  /** False when the item, variant or an add-on is gone or sold out: the customer removes the line. */
  available: boolean;
}

export interface PricedCart {
  lines: PricedCartLine[];
  /** Pieces in the lines that can be ordered. */
  count: number;
  /** Centavos, lines that can be ordered only. */
  subtotal: number;
  /** Some lines can no longer be ordered. */
  hasUnavailable: boolean;
}

/** Names and prices every line from the shop's current menu, and flags lines that can no longer be ordered. */
export function priceCart(items: readonly StorefrontItem[], lines: readonly CartLine[]): PricedCart {
  const priced = lines.map((line): PricedCartLine => {
    const item = items.find((candidate) => candidate.id === line.itemId);
    const variant = item?.variants.find((candidate) => candidate.id === line.variantId);
    const allOptions = item?.optionGroups.flatMap((group) => group.options) ?? [];
    const options = line.optionIds.flatMap((id) => allOptions.filter((option) => option.id === id));
    const available =
      item !== undefined &&
      variant !== undefined &&
      variantAvailable(item, variant) &&
      options.length === line.optionIds.length &&
      options.every((option) => !option.isSoldOut) &&
      choiceProblem(item, variant.id, line.optionIds) === null;
    const price = variant ? unitPrice(variant, options) : 0;
    return {
      line,
      itemName: item?.name ?? WORDS.storefront.cart.gone,
      variantName: variant?.name ?? WORDS.order.defaultVariant,
      options: options.map((option) => ({ id: option.id, name: option.name, priceDelta: option.priceDelta })),
      unitPrice: price,
      lineTotal: available ? price * line.qty : 0,
      available,
    };
  });
  const ready = priced.filter((line) => line.available);
  return {
    lines: priced,
    count: ready.reduce((sum, line) => sum + line.line.qty, 0),
    subtotal: ready.reduce((sum, line) => sum + line.lineTotal, 0),
    hasUnavailable: ready.length < priced.length,
  };
}

/** Why the shop takes no orders now: the alert under the header and the short reason on Add buttons. */
export interface OrderingBlock {
  alert: string;
  short: string;
}

/**
 * Null while the database says the shop is open (`isOpen` decides). Otherwise paused (orders off or busy) or
 * closed, with the next opening worded from the hours.
 */
export function orderingBlock(storefront: Pick<Storefront, 'isOpen' | 'hours' | 'closures' | 'shop'>, now: Date): OrderingBlock | null {
  if (storefront.isOpen) return null;
  const words = WORDS.storefront.status;
  const { acceptingOrders, busyUntil } = storefront.shop.settings;
  if (!acceptingOrders || (busyUntil !== null && new Date(busyUntil).getTime() > now.getTime())) {
    return { alert: words.paused, short: words.pausedShort };
  }
  const next = nextOpeningText(openState(storefront.hours, storefront.closures, now).nextOpensAt, now);
  return { alert: next === null ? words.closed : words.closedUntil(next), short: words.closedShort };
}
