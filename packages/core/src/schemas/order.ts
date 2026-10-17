import { z } from 'zod';

import { DeliveryProvider, Fulfillment, OrderStatus, PaymentMethod, PaymentStatus } from './enums';
import { Pin } from './pin';
import { Centavos, IsoDateTime, ManilaDate, PhPhone, Uuid } from './primitives';
import { OrderRating } from './rating';

/** A placed order (table `orders`). Amounts are computed by the database. */
export const Order = z
  .object({
    id: Uuid,
    tenantId: Uuid,
    /** Gap-free number per shop per business date, shown as #042. */
    orderNo: z.int().positive(),
    businessDate: ManilaDate,
    /** Secret link for the receipt page, /shop/o/{token}. */
    token: z.string().min(8),
    fulfillment: Fulfillment,
    status: OrderStatus,
    paymentStatus: PaymentStatus,
    paymentMethod: PaymentMethod,
    customerId: Uuid.nullable(),
    customerName: z.string().min(1),
    customerPhone: PhPhone,
    addressLine: z.string().nullable(),
    landmark: z.string().nullable(),
    deliveryZoneId: Uuid.nullable(),
    deliveryFee: Centavos,
    pickupAt: IsoDateTime.nullable(),
    notes: z.string().nullable(),
    subtotal: Centavos,
    discountTotal: Centavos,
    total: Centavos,
    trackingUrl: z.url().nullable(),
    deliveryProvider: DeliveryProvider.nullable().optional(),
    riderName: z.string().nullable().optional(),
    riderPhone: z.string().nullable().optional(),
    deliveryLat: z.number().nullable().optional(),
    deliveryLng: z.number().nullable().optional(),
    deliveryPin: Pin.nullable().optional(),
    rating: OrderRating.nullable().optional(),
    cancelReason: z.string().nullable(),
    clientKey: Uuid,
    /** When an unpaid transfer order expires; null for cash and COD, and once a proof is sent. */
    expiresAt: IsoDateTime.nullable(),
    placedAt: IsoDateTime,
    paidAt: IsoDateTime.nullable(),
    readyAt: IsoDateTime.nullable(),
    completedAt: IsoDateTime.nullable(),
    cancelledAt: IsoDateTime.nullable(),
  })

  .refine((order) => order.total === order.subtotal - order.discountTotal + order.deliveryFee, {
    message: 'total must equal subtotal - discountTotal + deliveryFee.',
    path: ['total'],
  });
export type Order = z.infer<typeof Order>;
