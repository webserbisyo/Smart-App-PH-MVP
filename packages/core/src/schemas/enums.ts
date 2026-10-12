import { z } from 'zod';

// Closed lists. These are the only allowed values; the database CHECK constraints mirror them.

export const BUSINESS_TYPES = ['food', 'retail'] as const;
export const BusinessType = z.enum(BUSINESS_TYPES);
export type BusinessType = z.infer<typeof BusinessType>;

export const SHOP_STATUSES = ['pending', 'active', 'suspended'] as const;
export const ShopStatus = z.enum(SHOP_STATUSES);
export type ShopStatus = z.infer<typeof ShopStatus>;

export const FULFILLMENTS = ['walk_in', 'pickup', 'delivery'] as const;
export const Fulfillment = z.enum(FULFILLMENTS);
export type Fulfillment = z.infer<typeof Fulfillment>;

export const ORDER_STATUSES = [
  'placed',
  'preparing',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled',
  'expired',
] as const;
export const OrderStatus = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const PAYMENT_STATUSES = ['unpaid', 'pending', 'paid'] as const;
export const PaymentStatus = z.enum(PAYMENT_STATUSES);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const PAYMENT_METHODS = ['cash', 'cod', 'gcash', 'maya', 'bank'] as const;
export const PaymentMethod = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

/** Methods paid by transfer: they show a shop account and need a proof and a reference number. */
export const TransferMethod = PaymentMethod.extract(['gcash', 'maya', 'bank']);
export type TransferMethod = z.infer<typeof TransferMethod>;

/** Methods the owner records by hand when the money is received. */
export const CashMethod = PaymentMethod.extract(['cash', 'cod']);
export type CashMethod = z.infer<typeof CashMethod>;

/** What an order timeline step records (decision P5-4): a status change or a payment step. */
export const ORDER_EVENT_KINDS = ['status', 'payment_submitted', 'payment_confirmed', 'payment_rejected'] as const;
export const OrderEventKind = z.enum(ORDER_EVENT_KINDS);
export type OrderEventKind = z.infer<typeof OrderEventKind>;

/** Who took an order step. */
export const ORDER_ACTORS = ['customer', 'owner', 'system'] as const;
export const OrderActor = z.enum(ORDER_ACTORS);
export type OrderActor = z.infer<typeof OrderActor>;

/** Why one cart line cannot be ordered as it is (quote_order `problems`). */
export const LINE_PROBLEMS = ['item_unavailable', 'out_of_stock', 'invalid_options'] as const;
export const LineProblem = z.enum(LINE_PROBLEMS);
export type LineProblem = z.infer<typeof LineProblem>;

/** What a customer agreed to (table `consents`, append-only). */
export const CONSENT_CHANNELS = ['privacy', 'sms', 'email', 'push'] as const;
export const ConsentChannel = z.enum(CONSENT_CHANNELS);
export type ConsentChannel = z.infer<typeof ConsentChannel>;

export const PAYMENT_REVIEW_STATUSES = ['pending', 'confirmed', 'rejected'] as const;
export const PaymentReviewStatus = z.enum(PAYMENT_REVIEW_STATUSES);
export type PaymentReviewStatus = z.infer<typeof PaymentReviewStatus>;

export const ITEM_STATUSES = ['active', 'hidden', 'archived'] as const;
export const ItemStatus = z.enum(ITEM_STATUSES);
export type ItemStatus = z.infer<typeof ItemStatus>;

export const LOYALTY_REASONS = ['earned', 'redeemed', 'reversed', 'manual'] as const;
export const LoyaltyReason = z.enum(LOYALTY_REASONS);
export type LoyaltyReason = z.infer<typeof LoyaltyReason>;

/** Later roles (cashier, prep) are added as new values, not now. */
export const MEMBER_ROLES = ['owner'] as const;
export const MemberRole = z.enum(MEMBER_ROLES);
export type MemberRole = z.infer<typeof MemberRole>;

/** What the owner can drag to sort (`save_sort_order`). */
export const SORT_KINDS = ['categories', 'items', 'variants', 'photos', 'paymentAccounts', 'deliveryZones'] as const;
export const SortKind = z.enum(SORT_KINDS);
export type SortKind = z.infer<typeof SortKind>;

/** What a shop-media upload is for; each has its own folder under the shop's id. */
export const MEDIA_KINDS = ['logo', 'cover', 'item', 'category', 'qr'] as const;
export const MediaKind = z.enum(MEDIA_KINDS);
export type MediaKind = z.infer<typeof MediaKind>;
