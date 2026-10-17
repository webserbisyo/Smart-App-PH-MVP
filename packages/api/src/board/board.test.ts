import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BoardOrder, ShopOrderChange } from '@smartapp/core';


import { withStatus } from './hooks';
import { SHOP_POLL_MS, watchShopOrders } from './live';
import type { ShopChannelSource } from './live';
import { boardOrderFromRow, orderFromRow } from './mappers';
import type { OrderItemRow, OrderRow } from './mappers';

const ORDER_ID = '1b46c434-234d-4dd5-b593-328caea47fd9';
const TENANT_ID = '552157cd-0788-4a9e-834d-4e7e4b151f34';

const orderRow: OrderRow = {
  id: ORDER_ID,
  tenant_id: TENANT_ID,
  order_no: 7,
  business_date: '2026-10-12',
  token: 'pvMJIPoFaPcsBDVxhwb7gA',
  fulfillment: 'pickup',
  status: 'placed',
  payment_status: 'unpaid',
  payment_method: 'cash',
  customer_id: null,
  customer_name: 'Maria Santos',
  customer_phone: '+639171234567',
  address_line: null,
  landmark: null,
  delivery_zone_id: null,
  delivery_fee: 0,
  pickup_at: '2026-10-12T08:30:00+00:00',
  notes: null,
  subtotal: 29800,
  discount_total: 0,
  total: 29800,
  tracking_url: null,
  cancel_reason: null,
  client_key: '8e4a9e82-8a99-4fc2-b15a-adc05f6e7a81',
  expires_at: null,
  placed_at: '2026-10-12T08:00:00.123456+00:00',
  paid_at: null,
  ready_at: null,
  completed_at: null,
  cancelled_at: null,
  delivery_provider: null,
  rider_name: null,
  rider_phone: null,
  delivery_lat: null,
  delivery_lng: null,
};

function line(sort: number, itemName: string): OrderItemRow {
  return {
    id: crypto.randomUUID(),
    tenant_id: TENANT_ID,
    order_id: ORDER_ID,
    item_id: null,
    variant_id: null,
    item_name: itemName,
    variant_name: 'Regular',
    unit_price: 14900,
    options: [],
    options_total: 0,
    qty: 1,
    line_total: 14900,
    note: null,
    is_reward: false,
    sort,
  };
}

describe('board mappers', () => {
  it('read an orders row as the core Order', () => {
    expect(orderFromRow(orderRow)).toMatchObject({ id: ORDER_ID, orderNo: 7, customerName: 'Maria Santos', total: 29800 });
  });

  it('keep the lines in the order the customer added them', () => {
    const card = boardOrderFromRow({ ...orderRow, order_items: [line(1, 'Second'), line(0, 'First')] });
    expect(card.lines.map((orderLine) => orderLine.itemName)).toEqual(['First', 'Second']);
  });
});

describe('withStatus (optimistic step)', () => {
  it('moves only the chosen card', () => {
    const card = boardOrderFromRow({ ...orderRow, order_items: [] });
    const other: BoardOrder = { ...card, order: { ...card.order, id: crypto.randomUUID() } };
    const moved = withStatus([card, other], ORDER_ID, 'preparing');
    expect(moved?.map((entry) => entry.order.status)).toEqual(['preparing', 'placed']);
    expect(withStatus(undefined, ORDER_ID, 'preparing')).toBeUndefined();
  });

});

describe('watchShopOrders', () => {
  let send: (payload: unknown) => void = () => undefined;
  let setJoined: (joined: boolean) => void = () => undefined;
  const leave = vi.fn();
  const source: ShopChannelSource = {
    join: (topic, onMessage, onJoined) => {
      expect(topic).toBe(`shop:${TENANT_ID}`);
      send = onMessage;
      setJoined = onJoined;
      return leave;
    },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    leave.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls every 15 seconds until the channel is joined, and again when it drops', () => {
    const refresh = vi.fn<(orderId: string | null) => void>();
    const stop = watchShopOrders(source, TENANT_ID, { refresh });

    vi.advanceTimersByTime(SHOP_POLL_MS * 2);
    expect(refresh).toHaveBeenCalledTimes(2);

    setJoined(true);
    expect(refresh).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(SHOP_POLL_MS * 4);
    expect(refresh).toHaveBeenCalledTimes(3);

    setJoined(false);
    vi.advanceTimersByTime(SHOP_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(4);

    stop();
    vi.advanceTimersByTime(SHOP_POLL_MS * 4);
    expect(refresh).toHaveBeenCalledTimes(4);
    expect(leave).toHaveBeenCalledOnce();
  });

  it('calls back for a new order and for a proof to check', () => {
    const refresh = vi.fn<(orderId: string | null) => void>();
    const onNewOrder = vi.fn<(change: ShopOrderChange) => void>();
    const onToVerify = vi.fn<(change: ShopOrderChange) => void>();
    const stop = watchShopOrders(source, TENANT_ID, { refresh, onNewOrder, onToVerify });
    setJoined(true);

    send({ orderId: ORDER_ID, op: 'insert', status: 'placed', paymentStatus: 'unpaid' });
    send({ orderId: ORDER_ID, op: 'update', status: 'placed', paymentStatus: 'pending' });
    send({ orderId: ORDER_ID, op: 'update', status: 'preparing', paymentStatus: 'paid' });
    send({ nonsense: true });

    expect(onNewOrder).toHaveBeenCalledOnce();
    expect(onToVerify).toHaveBeenCalledOnce();
    expect(onToVerify.mock.calls[0]?.[0].paymentStatus).toBe('pending');
    expect(refresh.mock.calls.map(([orderId]) => orderId)).toEqual([null, ORDER_ID, ORDER_ID, ORDER_ID, null]);
    stop();
  });
});
