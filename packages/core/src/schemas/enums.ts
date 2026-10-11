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
