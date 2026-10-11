import { z } from 'zod';

import { BusinessHours, Closure } from '../schemas/business-hours';
import { Category } from '../schemas/category';
import { Customer } from '../schemas/customer';
import { CustomerAddress } from '../schemas/customer-address';
import { DeliveryZone } from '../schemas/delivery-zone';
import { BusinessType, CashMethod, OrderStatus, TransferMethod } from '../schemas/enums';
import { Item, ItemPhoto } from '../schemas/item';
import { OptionGroup } from '../schemas/option-group';
import { Order } from '../schemas/order';
import { OrderEvent } from '../schemas/order-event';
import { OrderLine, OrderLineOption } from '../schemas/order-line';
import { OrderPayload } from '../schemas/order-payload';
import { Payment } from '../schemas/payment';
import { PaymentAccount } from '../schemas/payment-account';
import { Shop, Tenant } from '../schemas/shop';
import { StampRule } from '../schemas/stamp-rule';
import { Variant } from '../schemas/variant';
import { Centavos, IsoDateTime, ManilaDate, PhPhone, Slug, Uuid } from '../schemas/primitives';

// Contracts for the database functions in system paper 7.4. Contracts only: the SQL comes in
// Phase 3 and 5, the callers in packages/api. Inputs are strict so unknown fields fail.

/** An item as the storefront menu shows it. */
export const StorefrontItem = Item.extend({
  photos: z.array(ItemPhoto),
  variants: z.array(Variant).min(1),
  optionGroups: z.array(OptionGroup),
});
export type StorefrontItem = z.infer<typeof StorefrontItem>;

export const Storefront = z.object({
  shop: Shop,
  isOpen: z.boolean(),
  hours: z.array(BusinessHours),
  closures: z.array(Closure),
  categories: z.array(Category),
  items: z.array(StorefrontItem),
  paymentAccounts: z.array(PaymentAccount),
  deliveryZones: z.array(DeliveryZone),
  stampRule: StampRule.nullable(),
  /** Null when the owner hides the members count. */
  memberCount: z.int().nonnegative().nullable(),
});
export type Storefront = z.infer<typeof Storefront>;

/** A cart line priced by the database. */
export const QuoteLine = z.object({
  itemId: Uuid,
  variantId: Uuid,
  itemName: z.string().min(1),
  variantName: z.string().min(1),
  unitPrice: Centavos,
  options: z.array(OrderLineOption),
  optionsTotal: Centavos,
  qty: z.int().positive(),
  lineTotal: Centavos,
});
export type QuoteLine = z.infer<typeof QuoteLine>;

export const Quote = z.object({
  lines: z.array(QuoteLine),
  subtotal: Centavos,
  discountTotal: Centavos,
  deliveryFee: Centavos,
  total: Centavos,
  rewardApplied: z.boolean(),
  /** Lines that cannot be ordered as they are (sold out, not enough stock, hidden). */
  problems: z.array(z.object({ lineIndex: z.int().nonnegative(), message: z.string().min(1) })),
});
export type Quote = z.infer<typeof Quote>;

/** Everything the receipt page needs. */
export const OrderReceipt = z.object({
  order: Order,
  lines: z.array(OrderLine),
  events: z.array(OrderEvent),
  payments: z.array(Payment),
});
export type OrderReceipt = z.infer<typeof OrderReceipt>;

export const MemberAccount = z.object({
  customer: Customer,
  stamps: z.int().nonnegative(),
  stampRule: StampRule.nullable(),
  rewardReady: z.boolean(),
  orders: z.array(Order),
  addresses: z.array(CustomerAddress),
});
export type MemberAccount = z.infer<typeof MemberAccount>;

export const DashboardToday = z.object({
  businessDate: ManilaDate,
  salesToday: Centavos,
  ordersToday: z.int().nonnegative(),
  openOrders: z.int().nonnegative(),
  averageOrder: Centavos,
  toVerify: z.int().nonnegative(),
  waiting: z.int().nonnegative(),
  lowStock: z.int().nonnegative(),
  memberCount: z.int().nonnegative(),
  newMembersThisWeek: z.int().nonnegative(),
});
export type DashboardToday = z.infer<typeof DashboardToday>;

export const MemberInsights = z.object({
  memberCount: z.int().nonnegative(),
  newMembersThisWeek: z.int().nonnegative(),
  /** The three members who spent the most this month. */
  topSuki: z.array(z.object({ customerId: Uuid, name: z.string().min(1), totalSpent: Centavos })).max(3),
});
export type MemberInsights = z.infer<typeof MemberInsights>;

export const SalesReport = z.object({
  from: ManilaDate,
  to: ManilaDate,
  days: z.array(z.object({ date: ManilaDate, orders: z.int().nonnegative(), sales: Centavos })),
  totals: z.object({ orders: z.int().nonnegative(), sales: Centavos }),
  bestSellers: z.array(z.object({ itemName: z.string().min(1), qty: z.int().positive(), sales: Centavos })),
});
export type SalesReport = z.infer<typeof SalesReport>;

const OwnerShop = { tenantId: Uuid };

export const dbFunctions = {
  /** Owner (shop setup): creates the tenant (pending), membership, settings and default hours. */
  create_my_shop: {
    input: z.strictObject({ businessType: BusinessType, name: z.string().trim().min(1).max(80), slug: Slug }),
    output: Tenant,
  },
  /** Anyone: shop info, open status, catalog, payment accounts, zones and members count. */
  get_storefront: {
    input: z.strictObject({ slug: Slug }),
    output: Storefront,
  },
  /** Anyone: recomputes prices, fees, reward and stock from the database before placing. */
  quote_order: {
    input: z.strictObject({ slug: Slug, payload: OrderPayload }),
    output: Quote,
  },
  /** Anyone: validates, reserves stock, numbers the order; a retry with the same clientKey returns the same order. */
  place_order: {
    input: z.strictObject({ slug: Slug, payload: OrderPayload }),
    output: z.object({ orderId: Uuid, orderNo: z.int().positive(), token: z.string().min(8) }),
  },
  /** Anyone with the order link: saves the proof and reference, blocks duplicates, sets payment to pending. */
  submit_payment_proof: {
    input: z.strictObject({
      token: z.string().min(8),
      method: TransferMethod,
      referenceNo: z.string().trim().min(4).max(40),
      proofPath: z.string().min(1),
    }),
    output: Payment,
  },
  /** Anyone with the order link: receipt and live status. */
  get_order: {
    input: z.strictObject({ token: z.string().min(8) }),
    output: OrderReceipt,
  },
  /** Owner: approves or rejects a payment proof. A rejection needs a reason. */
  review_payment: {
    input: z
      .strictObject({ paymentId: Uuid, approve: z.boolean(), rejectReason: z.string().trim().min(1).nullable() })
      .refine((input) => input.approve || input.rejectReason !== null, {
        message: 'A rejection needs a reason.',
        path: ['rejectReason'],
      }),
    output: Payment,
  },
  /** Owner: marks a cash or cash-on-delivery order paid. */
  record_payment: {
    input: z.strictObject({ orderId: Uuid, method: CashMethod }),
    output: Payment,
  },
  /** Owner: moves the order one step along the allowed transitions. */
  advance_order: {
    input: z.strictObject({
      orderId: Uuid,
      toStatus: OrderStatus.extract(['preparing', 'ready', 'out_for_delivery', 'completed']),
      trackingUrl: z.url().nullable(),
    }),
    output: Order,
  },
  /** Owner: cancels with a reason; returns stock and stamps. */
  cancel_order: {
    input: z.strictObject({ orderId: Uuid, reason: z.string().trim().min(1).max(200) }),
    output: Order,
  },
  /** Signed-in customer: links the customer row (by phone or email) to the login and sets memberSince. */
  join_as_member: {
    input: z.strictObject({ slug: Slug, name: z.string().trim().min(1).max(80), phone: PhPhone }),
    output: MemberAccount,
  },
  /** Signed-in customer: stamps, orders and saved addresses in this shop. */
  get_my_account: {
    input: z.strictObject({ slug: Slug }),
    output: MemberAccount,
  },
  /** Owner: Home numbers for today (Manila date). */
  get_dashboard_today: {
    input: z.strictObject(OwnerShop),
    output: DashboardToday,
  },
  /** Owner: members card on Home. */
  get_member_insights: {
    input: z.strictObject(OwnerShop),
    output: MemberInsights,
  },
  /** Owner: reports for a date range (today, 7 or 30 days). */
  get_sales_report: {
    input: z
      .strictObject({ ...OwnerShop, from: ManilaDate, to: ManilaDate })
      .refine((input) => input.from <= input.to, { message: 'from must not be after to.', path: ['from'] }),
    output: SalesReport,
  },
  /** Scheduled job (pg_cron): expires unpaid orders past the time limit and returns stock. */
  expire_unpaid_orders: {
    input: z.strictObject({}),
    output: z.object({ expiredCount: z.int().nonnegative(), ranAt: IsoDateTime }),
  },
} as const;

export type DbFunctionName = keyof typeof dbFunctions;
export const DB_FUNCTION_NAMES = Object.keys(dbFunctions).filter((name): name is DbFunctionName =>
  Object.hasOwn(dbFunctions, name),
);
export type DbFunctionInput<Name extends DbFunctionName> = z.input<(typeof dbFunctions)[Name]['input']>;
export type DbFunctionOutput<Name extends DbFunctionName> = z.output<(typeof dbFunctions)[Name]['output']>;
