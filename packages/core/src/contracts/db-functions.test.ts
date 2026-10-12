import { describe, expect, it } from 'vitest';

import * as sample from '../test/samples';

import { DB_FUNCTION_NAMES, dbFunctions } from './db-functions';
import type { DbFunctionInput, DbFunctionName } from './db-functions';

const { ids } = sample;

/** System paper 7.4, in order, plus slug_available (decision P3-4) and the P5.1 catalog functions. */
const PAPER_FUNCTIONS = [
  'create_my_shop',
  'slug_available',
  'save_item',
  'set_stock',
  'save_sort_order',
  'get_storefront',
  'quote_order',
  'place_order',
  'submit_payment_proof',
  'get_order',
  'review_payment',
  'record_payment',
  'advance_order',
  'cancel_order',
  'join_as_member',
  'get_my_account',
  'get_dashboard_today',
  'get_member_insights',
  'get_sales_report',
  'expire_unpaid_orders',
];

const memberAccount = {
  customer: sample.customer,
  stamps: 3,
  stampRule: sample.stampRule,
  rewardReady: false,
  orders: [sample.order],
  addresses: [sample.customerAddress],
};

/** A valid input and output for every function. */
const valid: { [Name in DbFunctionName]: { input: DbFunctionInput<Name>; output: unknown } } = {
  create_my_shop: {
    input: { businessType: 'food', name: "Juan's Cafe", slug: 'juans-cafe' },
    output: { ...sample.tenant, status: 'pending', plan: null, paidUntil: null },
  },
  slug_available: {
    input: { slug: 'juans-cafe' },
    output: true,
  },
  save_item: {
    input: {
      id: null,
      tenantId: ids.tenant,
      categoryId: ids.category,
      name: 'Iced Latte',
      description: null,
      status: 'active',
      isFeatured: false,
      trackStock: true,
      variants: [{ id: null, name: 'Regular', price: 12000, lowStockAt: 5, isSoldOut: false }],
      photoPaths: [`${ids.tenant}/items/latte.webp`],
      optionGroupIds: [ids.group],
    },
    output: { ...sample.item, photos: [sample.itemPhoto], variants: [sample.variant], optionGroupIds: [ids.group] },
  },
  set_stock: {
    input: { variantId: ids.variant, stockOnHand: 12 },
    output: { ...sample.variant, stockOnHand: 12 },
  },
  save_sort_order: {
    input: { kind: 'categories', ids: [ids.category] },
    output: null,
  },
  get_storefront: {
    input: { slug: 'juans-cafe' },
    output: {
      shop: sample.shop,
      isOpen: true,
      hours: [sample.businessHours],
      closures: [sample.closure],
      categories: [sample.category],
      items: [{ ...sample.item, photos: [sample.itemPhoto], variants: [sample.variant], optionGroups: [sample.optionGroup] }],
      paymentAccounts: [sample.paymentAccount],
      deliveryZones: [sample.deliveryZone],
      stampRule: sample.stampRule,
      memberCount: 120,
    },
  },
  quote_order: {
    input: { slug: 'juans-cafe', payload: sample.quotePayload },
    output: {
      lines: [
        {
          lineIndex: 0,
          itemId: ids.item,
          variantId: ids.variant,
          itemName: 'Iced Latte',
          variantName: 'Large',
          unitPrice: 15000,
          options: sample.orderLine.options,
          optionsTotal: 3000,
          qty: 2,
          lineTotal: 36000,
          note: 'less ice',
        },
      ],
      subtotal: 36000,
      discountTotal: 0,
      deliveryFee: 0,
      total: 36000,
      rewardApplied: false,
      problems: [{ lineIndex: 1, code: 'out_of_stock', variantId: ids.variant }],
    },
  },
  place_order: {
    input: { slug: 'juans-cafe', payload: sample.orderPayload },
    output: { orderId: ids.order, orderNo: 42, token: 'abc123def456' },
  },
  submit_payment_proof: {
    input: { token: 'abc123def456', method: 'gcash', referenceNo: '1234 567 890', proofPath: sample.payment.proofPath },
    output: { ...sample.payment, status: 'pending', reviewedAt: null },
  },
  get_order: {
    input: { token: 'abc123def456' },
    output: { order: sample.order, lines: [sample.orderLine], events: [sample.orderEvent], payments: [sample.payment] },
  },
  review_payment: {
    input: { paymentId: ids.payment, approve: true, rejectReason: null },
    output: sample.payment,
  },
  record_payment: {
    input: { orderId: ids.order, method: 'cash' },
    output: { ...sample.payment, method: 'cash', referenceNo: null, referenceNorm: null, proofPath: null },
  },
  advance_order: {
    input: { orderId: ids.order, toStatus: 'ready', trackingUrl: null },
    output: sample.order,
  },
  cancel_order: {
    input: { orderId: ids.order, reason: 'Customer asked to cancel' },
    output: { ...sample.order, status: 'cancelled', cancelReason: 'Customer asked to cancel', cancelledAt: sample.order.placedAt },
  },
  join_as_member: {
    input: { slug: 'juans-cafe', name: 'Maria Santos', phone: '+639171234567' },
    output: memberAccount,
  },
  get_my_account: {
    input: { slug: 'juans-cafe' },
    output: memberAccount,
  },
  get_dashboard_today: {
    input: { tenantId: ids.tenant },
    output: {
      businessDate: '2026-10-11',
      salesToday: 332200,
      ordersToday: 18,
      openOrders: 3,
      averageOrder: 18500,
      toVerify: 2,
      waiting: 3,
      lowStock: 1,
      memberCount: 124,
      newMembersThisWeek: 9,
    },
  },
  get_member_insights: {
    input: { tenantId: ids.tenant },
    output: {
      memberCount: 124,
      newMembersThisWeek: 9,
      topSuki: [{ customerId: ids.customer, name: 'Maria Santos', totalSpent: 234000 }],
    },
  },
  get_sales_report: {
    input: { tenantId: ids.tenant, from: '2026-10-05', to: '2026-10-11' },
    output: {
      from: '2026-10-05',
      to: '2026-10-11',
      days: [{ date: '2026-10-11', orders: 18, sales: 332200 }],
      totals: { orders: 18, sales: 332200 },
      bestSellers: [{ itemName: 'Iced Latte', qty: 40, sales: 600000 }],
    },
  },
  expire_unpaid_orders: {
    input: {},
    output: { expiredCount: 2, ranAt: '2026-10-11T07:05:00+00:00' },
  },
};

describe('database function contracts', () => {
  it('list exactly the functions of system paper 7.4 and the P3 and P5.1 additions', () => {
    expect(DB_FUNCTION_NAMES).toEqual(PAPER_FUNCTIONS);
  });

  it.each(DB_FUNCTION_NAMES)('%s: a valid input and output parse', (name) => {
    const contract = dbFunctions[name];
    const sampleCall = valid[name];
    expect(contract.input.safeParse(sampleCall.input).error).toBeUndefined();
    expect(contract.output.safeParse(sampleCall.output).error).toBeUndefined();
  });

  it.each(DB_FUNCTION_NAMES)('%s: an unknown input field is rejected', (name) => {
    expect(dbFunctions[name].input.safeParse({ ...valid[name].input, unexpected: 1 }).success).toBe(false);
  });

  it('place_order rejects a payload with prices', () => {
    const payload = { ...sample.orderPayload, subtotal: 36000 };
    expect(dbFunctions.place_order.input.safeParse({ slug: 'juans-cafe', payload }).success).toBe(false);
  });

  it('review_payment needs a reason to reject', () => {
    const input = { paymentId: ids.payment, approve: false, rejectReason: null };
    expect(dbFunctions.review_payment.input.safeParse(input).success).toBe(false);
  });

  it('advance_order cannot jump to cancelled or expired', () => {
    for (const toStatus of ['cancelled', 'expired', 'placed']) {
      const input = { orderId: ids.order, toStatus, trackingUrl: null };
      expect(dbFunctions.advance_order.input.safeParse(input).success).toBe(false);
    }
  });
});
