import type {
  BusinessHours,
  CartLine,
  Category,
  Closure,
  Customer,
  CustomerAddress,
  DeliveryZone,
  Item,
  ItemPhoto,
  LoyaltyEntry,
  Option,
  OptionGroup,
  Order,
  OrderEvent,
  OrderLine,
  OrderPayload,
  QuotePayload,
  Payment,
  PaymentAccount,
  Shop,
  ShopSettings,
  StampRule,
  Tenant,
  TenantMember,
  Variant,
} from '../index';

// Valid sample data shared by the tests: Juan's Cafe (food), one pickup order paid by GCash.
export const ids = {
  tenant: '0b6f3b9e-8f5a-4c2e-9d1a-2f3e4a5b6c7d',
  user: '1c7a4d2f-3b5e-4a6c-8d9e-0f1a2b3c4d5e',
  category: '2d8b5e3a-4c6f-4b7d-9e0f-1a2b3c4d5e6f',
  item: '3e9c6f4b-5d7a-4c8e-8f1a-2b3c4d5e6f7a',
  variant: '4fad7a5c-6e8b-4d9f-9a2b-3c4d5e6f7a8b',
  group: '5abe8b6d-7f9c-4e0a-8b3c-4d5e6f7a8b9c',
  option: '6bcf9c7e-8a0d-4f1b-9c4d-5e6f7a8b9c0d',
  order: '7cd0ad8f-9b1e-4a2c-8d5e-6f7a8b9c0d1e',
  line: '8de1be9a-0c2f-4b3d-9e6f-7a8b9c0d1e2f',
  payment: '9ef2cfab-1d3a-4c4e-8f7a-8b9c0d1e2f3a',
  customer: 'af03d0bc-2e4b-4d5f-9a8b-9c0d1e2f3a4b',
  clientKey: 'b014e1cd-3f5c-4e6a-8b9c-0d1e2f3a4b5c',
  zone: 'c125f2de-4a6d-4f7b-9cad-1e2f3a4b5c6d',
  account: 'd23603ef-5b7e-4a8c-8dbe-2f3a4b5c6d7e',
  event: 'e34714f0-6c8f-4b9d-9ecf-3a4b5c6d7e8f',
  photo: 'f4582501-7d9a-4cae-8fd0-4b5c6d7e8f9a',
  address: '05693612-8eab-4dbf-9ae1-5c6d7e8f9a0b',
} as const;

const now = '2026-10-11T07:05:00+00:00';

export const tenant = {
  id: ids.tenant,
  slug: 'juans-cafe',
  name: "Juan's Cafe",
  businessType: 'food',
  status: 'active',
  plan: 'early_599',
  paidUntil: '2026-11-11',
  isDemo: true,
  createdAt: now,
} satisfies Tenant;

export const shopSettings = {
  tenantId: ids.tenant,
  logoPath: `${ids.tenant}/logo.webp`,
  coverPath: null,
  tagline: 'Kape at tinapay',
  phone: '+639171234567',
  email: 'hello@juanscafe.ph',
  address: '12 Rizal St.',
  city: 'Quezon City',
  mapsUrl: null,
  facebookUrl: 'https://facebook.com/juanscafe',
  messengerUsername: 'juanscafe',
  colorPrimary: '#FFFFFF',
  colorSecondary: '#F3EFE7',
  colorAccent: '#1F4FD8',
  acceptingOrders: true,
  busyUntil: null,
  walkInEnabled: true,
  pickupEnabled: true,
  deliveryEnabled: true,
  codEnabled: false,
  payLaterPickup: true,
  deliveryFeeViaMessenger: false,
  unpaidExpiryMinutes: 30,
  showMemberCount: true,
} satisfies ShopSettings;

export const shop = { ...tenant, settings: shopSettings } satisfies Shop;

export const businessHours = { tenantId: ids.tenant, weekday: 1, opensAt: '07:00', closesAt: '21:00' } satisfies BusinessHours;
export const closure = { tenantId: ids.tenant, closedOn: '2026-12-25', note: 'Christmas' } satisfies Closure;

export const deliveryZone = {
  id: ids.zone,
  tenantId: ids.tenant,
  name: 'Diliman',
  fee: 6000,
  etaText: '30 to 45 min',
  isActive: true,
  sort: 0,
} satisfies DeliveryZone;

export const paymentAccount = {
  id: ids.account,
  tenantId: ids.tenant,
  method: 'gcash',
  accountName: 'Juan Dela Cruz',
  accountNumber: '09171234567',
  bankName: null,
  qrPath: `${ids.tenant}/qr/gcash.webp`,
  isActive: true,
  sort: 0,
} satisfies PaymentAccount;

export const tenantMember = { tenantId: ids.tenant, userId: ids.user, role: 'owner' } satisfies TenantMember;

export const category = {
  id: ids.category,
  tenantId: ids.tenant,
  name: 'Coffee',
  sort: 0,
  isHidden: false,
  icon: { kind: 'fluent', key: 'coffee' },
} satisfies Category;

export const item = {
  id: ids.item,
  tenantId: ids.tenant,
  categoryId: ids.category,
  name: 'Iced Latte',
  description: 'Espresso, milk, ice',
  status: 'active',
  isFeatured: true,
  trackStock: false,
  sort: 0,
} satisfies Item;

export const itemPhoto = { id: ids.photo, tenantId: ids.tenant, itemId: ids.item, path: `${ids.tenant}/items/latte.webp`, sort: 0 } satisfies ItemPhoto;

export const variant = {
  id: ids.variant,
  tenantId: ids.tenant,
  itemId: ids.item,
  name: 'Large',
  price: 15000,
  stockOnHand: null,
  lowStockAt: null,
  isSoldOut: false,
  sort: 1,
  archivedAt: null,
} satisfies Variant;

export const option = {
  id: ids.option,
  tenantId: ids.tenant,
  groupId: ids.group,
  name: 'Extra shot',
  priceDelta: 3000,
  isSoldOut: false,
} satisfies Option;

export const optionGroup = {
  id: ids.group,
  tenantId: ids.tenant,
  name: 'Add-ons',
  minSelect: 0,
  maxSelect: 2,
  options: [option],
} satisfies OptionGroup;

export const cartLine = { itemId: ids.item, variantId: ids.variant, optionIds: [ids.option], qty: 2, note: 'less ice' } satisfies CartLine;

export const orderPayload = {
  clientKey: ids.clientKey,
  fulfillment: 'pickup',
  customer: { name: 'Maria Santos', phone: '+639171234567', email: null },
  lines: [cartLine],
  paymentMethod: 'gcash',
  pickupAt: '2026-10-11T07:30:00+00:00',
  delivery: null,
  notes: null,
  useReward: false,
  privacyConsent: true,
} satisfies OrderPayload;

export const quotePayload = {
  fulfillment: orderPayload.fulfillment,
  lines: orderPayload.lines,
  paymentMethod: orderPayload.paymentMethod,
  pickupAt: orderPayload.pickupAt,
  delivery: orderPayload.delivery,
  useReward: orderPayload.useReward,
} satisfies QuotePayload;

export const order = {
  id: ids.order,
  tenantId: ids.tenant,
  orderNo: 42,
  businessDate: '2026-10-11',
  token: 'abc123def456',
  fulfillment: 'pickup',
  status: 'preparing',
  paymentStatus: 'paid',
  paymentMethod: 'gcash',
  customerId: ids.customer,
  customerName: 'Maria Santos',
  customerPhone: '+639171234567',
  addressLine: null,
  landmark: null,
  deliveryZoneId: null,
  deliveryFee: 0,
  pickupAt: '2026-10-11T07:30:00+00:00',
  notes: null,
  subtotal: 36000,
  discountTotal: 0,
  total: 36000,
  trackingUrl: null,
  cancelReason: null,
  clientKey: ids.clientKey,
  expiresAt: null,
  placedAt: now,
  paidAt: '2026-10-11T07:07:00+00:00',
  readyAt: null,
  completedAt: null,
  cancelledAt: null,
} satisfies Order;

export const orderLine = {
  id: ids.line,
  tenantId: ids.tenant,
  orderId: ids.order,
  itemId: ids.item,
  variantId: ids.variant,
  itemName: 'Iced Latte',
  variantName: 'Large',
  unitPrice: 15000,
  options: [{ optionId: ids.option, name: 'Extra shot', priceDelta: 3000 }],
  optionsTotal: 3000,
  qty: 2,
  lineTotal: 36000,
  note: 'less ice',
} satisfies OrderLine;

export const orderEvent = {
  id: ids.event,
  orderId: ids.order,
  kind: 'status',
  fromStatus: 'placed',
  toStatus: 'preparing',
  actor: 'owner',
  note: null,
  createdAt: now,
} satisfies OrderEvent;

export const payment = {
  id: ids.payment,
  tenantId: ids.tenant,
  orderId: ids.order,
  method: 'gcash',
  amount: 36000,
  status: 'confirmed',
  referenceNo: '1234 567 890',
  referenceNorm: '1234567890',
  proofPath: `${ids.tenant}/proofs/${ids.order}.webp`,
  reviewedAt: '2026-10-11T07:07:00+00:00',
  rejectReason: null,
  createdAt: now,
} satisfies Payment;

export const customer = {
  id: ids.customer,
  tenantId: ids.tenant,
  userId: ids.user,
  name: 'Maria Santos',
  phone: '+639171234567',
  email: 'maria@example.com',
  memberSince: now,
  orderCount: 5,
  totalSpent: 234000,
  lastOrderAt: now,
  notes: null,
  tags: [],
} satisfies Customer;

export const customerAddress = {
  id: ids.address,
  tenantId: ids.tenant,
  customerId: ids.customer,
  label: 'Home',
  addressLine: '34 Mabini St.',
  landmark: 'Blue gate',
  isDefault: true,
} satisfies CustomerAddress;

export const stampRule = {
  tenantId: ids.tenant,
  isActive: true,
  minOrderTotal: 10000,
  stampsNeeded: 8,
  rewardLabel: '₱100 off',
  rewardAmount: 10000,
} satisfies StampRule;

export const loyaltyEntry = {
  tenantId: ids.tenant,
  customerId: ids.customer,
  orderId: ids.order,
  delta: 1,
  reason: 'earned',
  createdAt: now,
} satisfies LoyaltyEntry;
