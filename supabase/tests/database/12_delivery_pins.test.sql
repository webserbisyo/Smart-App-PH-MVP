begin;
select plan(28);

-- Test 1-4: shop_settings constraints
-- Valid pin (Manila coordinates)
insert into public.tenants (id, name, slug, business_type, status) values ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'Pin Shop', 'pin-shop', 'food', 'active');
insert into public.shop_settings (tenant_id, shop_lat, shop_lng)
values ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 14.599512, 120.984222);
select pass('valid shop pin saved');

-- Half a pin fails
select throws_ok(
  $$ update public.shop_settings set shop_lat = 14.5, shop_lng = null where tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001' $$,
  '23514',
  null,
  'shop_settings with half a pin throws check violation'
);

-- Out of range lat fails
select throws_ok(
  $$ update public.shop_settings set shop_lat = 95.0, shop_lng = 120.0 where tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001' $$,
  '23514',
  null,
  'shop_settings with lat > 90 throws check violation'
);

-- Out of range lng fails
select throws_ok(
  $$ update public.shop_settings set shop_lat = 14.0, shop_lng = 185.0 where tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001' $$,
  '23514',
  null,
  'shop_settings with lng > 180 throws check violation'
);

-- Test 5-7: customer_addresses constraints
insert into public.customers (id, tenant_id, name, phone)
values ('cccccccc-cccc-cccc-cccc-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'Pin Customer', '+639171112222');

insert into public.customer_addresses (tenant_id, customer_id, label, address_line, lat, lng)
values ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'cccccccc-cccc-cccc-cccc-000000000001', 'Home', '123 Main St', 14.599512, 120.984222);
select pass('valid customer address pin saved');

select throws_ok(
  $$ insert into public.customer_addresses (tenant_id, customer_id, label, address_line, lat, lng)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'cccccccc-cccc-cccc-cccc-000000000001', 'Work', '456 Office Ave', 14.5, null) $$,
  '23514',
  null,
  'customer address with half a pin throws check violation'
);

select throws_ok(
  $$ insert into public.customer_addresses (tenant_id, customer_id, label, address_line, lat, lng)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'cccccccc-cccc-cccc-cccc-000000000001', 'Work', '456 Office Ave', -95.0, 120.0) $$,
  '23514',
  null,
  'customer address with lat < -90 throws check violation'
);

-- Test 8-10: orders constraints
insert into public.orders (
  id, tenant_id, order_no, business_date, token, fulfillment, status, payment_status, payment_method,
  customer_name, customer_phone, address_line, delivery_fee, subtotal, discount_total, total,
  client_key, delivery_lat, delivery_lng
) values (
  'd0000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 1, current_date,
  'test_token_pin_1', 'delivery', 'placed', 'unpaid', 'cod', 'Pin Customer', '+639171112222',
  '123 Main St', 5000, 10000, 0, 15000, '33333333-3333-3333-3333-000000000001', 14.599512, 120.984222
);
select pass('valid delivery order with pin saved');
insert into public.order_counters (tenant_id, business_date, last_no) values ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001', current_date, 1);

select throws_ok(
  $$ insert into public.orders (
       tenant_id, order_no, business_date, token, fulfillment, status, payment_status, payment_method,
       customer_name, customer_phone, address_line, delivery_fee, subtotal, discount_total, total,
       client_key, delivery_lat, delivery_lng
     ) values (
       'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 2, current_date,
       'test_token_pin_2', 'pickup', 'placed', 'unpaid', 'cash', 'Pin Customer', '+639171112222',
       null, 0, 10000, 0, 10000, '33333333-3333-3333-3333-000000000002', 14.599512, 120.984222
     ) $$,
  '23514',
  null,
  'pickup order with delivery pin throws check violation'
);

select throws_ok(
  $$ insert into public.orders (
       tenant_id, order_no, business_date, token, fulfillment, status, payment_status, payment_method,
       customer_name, customer_phone, address_line, delivery_fee, subtotal, discount_total, total,
       client_key, delivery_lat, delivery_lng
     ) values (
       'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 3, current_date,
       'test_token_pin_3', 'delivery', 'placed', 'unpaid', 'cod', 'Pin Customer', '+639171112222',
       '123 Main St', 5000, 10000, 0, 15000, '33333333-3333-3333-3333-000000000003', 14.599512, null
     ) $$,
  '23514',
  null,
  'delivery order with half a pin throws check violation'
);

-- Test 11-12: get_storefront returns pin
select is(
  (public.get_storefront('pin-shop') -> 'pin' ->> 'lat')::numeric,
  14.599512::numeric,
  'storefront pin lat matches'
);
select is(
  (public.get_storefront('pin-shop') -> 'pin' ->> 'lng')::numeric,
  120.984222::numeric,
  'storefront pin lng matches'
);

-- Setup an active item & category & zone for build_order testing on pin-shop
insert into public.business_hours (tenant_id, weekday, opens_at, closes_at)
select 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', d, '00:00'::time, '23:59'::time
from generate_series(0, 6) d;

update public.shop_settings set
  accepting_orders = true,
  delivery_enabled = true,
  pickup_enabled = true,
  cod_enabled = true,
  pay_later_pickup = true
where tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001';

insert into public.delivery_zones (id, tenant_id, name, fee, is_active, sort)
values ('e0000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'Metro Zone', 5000, true, 1);

insert into public.categories (id, tenant_id, name, sort)
values ('aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'Test Category', 1);

insert into public.items (id, tenant_id, category_id, name, status, sort)
values ('11111111-1111-1111-1111-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'Item 1', 'active', 1);

insert into public.item_variants (id, tenant_id, item_id, name, price, sort)
values ('22222222-2222-2222-2222-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', '11111111-1111-1111-1111-000000000001', 'Regular', 10000, 1);

-- Test 13: quote_order with invalid pin shape throws 'invalid'
select throws_ok(
  $$ select public.quote_order('pin-shop', jsonb_build_object(
       'fulfillment', 'delivery',
       'paymentMethod', 'cod',
       'delivery', jsonb_build_object(
         'addressLine', '123 Pin St',
         'deliveryZoneId', 'e0000000-0000-0000-0000-000000000001',
         'pin', jsonb_build_object('lat', 95.0, 'lng', 120.0)
       ),
       'lines', jsonb_build_array(
         jsonb_build_object('itemId', '11111111-1111-1111-1111-000000000001', 'variantId', '22222222-2222-2222-2222-000000000001', 'qty', 1, 'optionIds', '[]'::jsonb)
       )
     )) $$,
  'P0001',
  'invalid',
  'quote_order with invalid pin lat throws invalid'
);

-- Test 14: quote_order with half a pin throws 'invalid'
select throws_ok(
  $$ select public.quote_order('pin-shop', jsonb_build_object(
       'fulfillment', 'delivery',
       'paymentMethod', 'cod',
       'delivery', jsonb_build_object(
         'addressLine', '123 Pin St',
         'deliveryZoneId', 'e0000000-0000-0000-0000-000000000001',
         'pin', jsonb_build_object('lat', 14.5)
       ),
       'lines', jsonb_build_array(
         jsonb_build_object('itemId', '11111111-1111-1111-1111-000000000001', 'variantId', '22222222-2222-2222-2222-000000000001', 'qty', 1, 'optionIds', '[]'::jsonb)
       )
     )) $$,
  'P0001',
  'invalid',
  'quote_order with half a pin throws invalid'
);

-- Test 15-18: place_order with valid pin stores delivery_lat and delivery_lng
do $$
declare
  v_res jsonb;
  v_order jsonb;
begin
  v_res := public.place_order('pin-shop', jsonb_build_object(
    'fulfillment', 'delivery',
    'paymentMethod', 'cod',
    'clientKey', '44444444-4444-4444-4444-000000000001',
    'privacyConsent', true,
    'customer', jsonb_build_object('name', 'Pin Buyer', 'phone', '+639171112222'),
    'delivery', jsonb_build_object(
      'addressLine', '123 Pin St',
      'deliveryZoneId', 'e0000000-0000-0000-0000-000000000001',
      'pin', jsonb_build_object('lat', 14.599512, 'lng', 120.984222)
    ),
    'lines', jsonb_build_array(
      jsonb_build_object('itemId', '11111111-1111-1111-1111-000000000001', 'variantId', '22222222-2222-2222-2222-000000000001', 'qty', 1, 'optionIds', '[]'::jsonb)
    )
  ));

  v_order := public.get_order(v_res ->> 'token');
  perform set_config('test.pin_token', v_res ->> 'token', true);
end;
$$;

select is(
  (public.get_order(current_setting('test.pin_token')) #>> '{order,deliveryPin,lat}')::numeric,
  14.599512::numeric,
  'get_order returns deliveryPin lat'
);
select is(
  (public.get_order(current_setting('test.pin_token')) #>> '{order,deliveryPin,lng}')::numeric,
  120.984222::numeric,
  'get_order returns deliveryPin lng'
);
select is(
  (select delivery_lat from public.orders where token = current_setting('test.pin_token')),
  14.599512::numeric,
  'orders table delivery_lat is saved'
);
select is(
  (select delivery_lng from public.orders where token = current_setting('test.pin_token')),
  120.984222::numeric,
  'orders table delivery_lng is saved'
);

-- Test 19-21: place_order with pickup ignores pin without error
do $$
declare
  v_res jsonb;
begin
  v_res := public.place_order('pin-shop', jsonb_build_object(
    'fulfillment', 'pickup',
    'paymentMethod', 'cash',
    'clientKey', '44444444-4444-4444-4444-000000000002',
    'privacyConsent', true,
    'customer', jsonb_build_object('name', 'Pickup Buyer', 'phone', '+639171112223'),
    'delivery', jsonb_build_object(
      'pin', jsonb_build_object('lat', 14.599512, 'lng', 120.984222)
    ),
    'lines', jsonb_build_array(
      jsonb_build_object('itemId', '11111111-1111-1111-1111-000000000001', 'variantId', '22222222-2222-2222-2222-000000000001', 'qty', 1, 'optionIds', '[]'::jsonb)
    )
  ));
  perform set_config('test.pickup_token', v_res ->> 'token', true);
end;
$$;

select is(
  public.get_order(current_setting('test.pickup_token')) #>> '{order,deliveryPin}',
  null,
  'pickup order ignores pin and deliveryPin is null'
);
select is(
  (select delivery_lat from public.orders where token = current_setting('test.pickup_token')),
  null::numeric,
  'orders delivery_lat is null for pickup'
);
select is(
  (select delivery_lng from public.orders where token = current_setting('test.pickup_token')),
  null::numeric,
  'orders delivery_lng is null for pickup'
);

-- Test 22-24: normal order with no pin behaves exactly as before
do $$
declare
  v_res jsonb;
begin
  v_res := public.place_order('pin-shop', jsonb_build_object(
    'fulfillment', 'delivery',
    'paymentMethod', 'cod',
    'clientKey', '44444444-4444-4444-4444-000000000003',
    'privacyConsent', true,
    'customer', jsonb_build_object('name', 'Normal Buyer', 'phone', '+639171112224'),
    'delivery', jsonb_build_object(
      'addressLine', '789 Elm St',
      'deliveryZoneId', 'e0000000-0000-0000-0000-000000000001'
    ),
    'lines', jsonb_build_array(
      jsonb_build_object('itemId', '11111111-1111-1111-1111-000000000001', 'variantId', '22222222-2222-2222-2222-000000000001', 'qty', 1, 'optionIds', '[]'::jsonb)
    )
  ));
  perform set_config('test.normal_token', v_res ->> 'token', true);
end;
$$;

select is(
  public.get_order(current_setting('test.normal_token')) #>> '{order,deliveryPin}',
  null,
  'normal order has null deliveryPin'
);
select is(
  (select delivery_lat from public.orders where token = current_setting('test.normal_token')),
  null::numeric,
  'normal order delivery_lat is null'
);
select is(
  (select delivery_lng from public.orders where token = current_setting('test.normal_token')),
  null::numeric,
  'normal order delivery_lng is null'
);

-- Test 25: member account json exposes address pin
do $$
declare
  v_auth_user_id uuid := '55555555-5555-5555-5555-000000000001';
  v_customer_id uuid;
  v_acc jsonb;
begin
  insert into auth.users (id, email) values (v_auth_user_id, 'pinmember@example.com');
  insert into public.customers (id, tenant_id, user_id, name, phone, email, member_since)
  values ('55555555-5555-5555-5555-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', v_auth_user_id, 'Pin Member', '+639171112225', 'pinmember@example.com', now())
  returning id into v_customer_id;

  insert into public.customer_addresses (tenant_id, customer_id, label, address_line, lat, lng)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001', v_customer_id, 'Condo', 'Unit 12A Tower 1', 14.599512, 120.984222);

  perform set_config('request.jwt.claims', json_build_object('sub', v_auth_user_id::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v_acc := public.get_my_account('pin-shop');
  execute 'reset role';
  perform set_config('test.member_acc', v_acc::text, true);
end;
$$;

select is(
  (current_setting('test.member_acc')::jsonb #>> '{addresses,0,pin,lat}')::numeric,
  14.599512::numeric,
  'get_my_account exposes address pin'
);

-- Test 26-28: Cross-shop isolation
-- Create another shop and owner B
insert into public.tenants (id, name, slug, business_type, status) values ('bbbbbbbb-bbbb-bbbb-bbbb-000000000002', 'Other Shop', 'other-shop', 'food', 'active');
insert into auth.users (id, email) values ('66666666-6666-6666-6666-000000000001', 'owner_b@example.com');
insert into public.tenant_members (tenant_id, user_id, role)
values ('bbbbbbbb-bbbb-bbbb-bbbb-000000000002', '66666666-6666-6666-6666-000000000001', 'owner');

-- As Owner B: cannot see Shop A's orders
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '66666666-6666-6666-6666-000000000001', 'role', 'authenticated')::text, true);

select is(
  (select count(*) from public.orders where tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001'),
  0::bigint,
  'owner B cannot select orders of shop A'
);

-- As Owner B: cannot see Shop A's customer addresses
select is(
  (select count(*) from public.customer_addresses where tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001'),
  0::bigint,
  'owner B cannot select customer_addresses of shop A'
);

-- As Owner B: cannot update Shop A's shop_lat/lng
update public.shop_settings set shop_lat = 10.0, shop_lng = 120.0 where tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001';
reset role;
select is(
  (select shop_lat from public.shop_settings where tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001'),
  14.599512::numeric,
  'owner B update on shop A settings is prevented by RLS'
);

rollback;
