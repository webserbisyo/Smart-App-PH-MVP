-- SF2 Step 4 tests: Delivery info and private ratings
create extension if not exists pgtap with schema extensions;

begin;
select * from no_plan();

create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.create_user(p_email text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, '{}'::jsonb, '{}'::jsonb, now(), now());
  return v_id;
end;
$$;

create function tests.act_as(p_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create function tests.act_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

create table tests.ids (name text primary key, id uuid);
grant select, insert, update, delete on tests.ids to anon, authenticated;
create function tests.id(p_name text) returns uuid language sql stable as $$ select id from tests.ids where name = p_name $$;
grant execute on function tests.id(text) to anon, authenticated;

create table tests.saved (name text primary key, body jsonb);
grant select, insert, update, delete on tests.saved to anon, authenticated;
create function tests.saved(p_name text) returns jsonb language sql stable as $$ select body from tests.saved where name = p_name $$;
create function tests.order_id(p_name text) returns uuid language sql stable as $$ select (body ->> 'orderId')::uuid from tests.saved where name = p_name $$;
create function tests.order_token(p_name text) returns text language sql stable as $$ select (body ->> 'token')::text from tests.saved where name = p_name $$;
grant execute on function tests.saved(text), tests.order_id(text), tests.order_token(text) to anon, authenticated;

-- Setup test shops and owners
insert into tests.ids values
  ('owner_a', tests.create_user('owner_del_a@example.com')),
  ('owner_b', tests.create_user('owner_del_b@example.com'));

select tests.act_as(tests.id('owner_a'));
select public.create_my_shop('food', 'Del Cafe A', 'del-cafe-a');
reset role;

select tests.act_as(tests.id('owner_b'));
select public.create_my_shop('food', 'Del Cafe B', 'del-cafe-b');
reset role;

insert into tests.ids
select 'shop_' || replace(t.slug, 'del-cafe-', ''), t.id from public.tenants t where t.slug in ('del-cafe-a', 'del-cafe-b');
update public.tenants set status = 'active' where slug in ('del-cafe-a', 'del-cafe-b');
update public.business_hours set opens_at = '00:00', closes_at = '24:00' where tenant_id in (tests.id('shop_a'), tests.id('shop_b'));
update public.shop_settings set accepting_orders = true, pickup_enabled = true, walk_in_enabled = true, delivery_enabled = true where tenant_id in (tests.id('shop_a'), tests.id('shop_b'));

insert into public.payment_accounts (tenant_id, method, account_name, account_number, is_active) values
  (tests.id('shop_a'), 'gcash', 'Shop A GCash', '0917 111 0001', true),
  (tests.id('shop_b'), 'gcash', 'Shop B GCash', '0917 111 0002', true);

-- Add delivery zone
with z as (
  insert into public.delivery_zones (tenant_id, name, fee, is_active)
  values (tests.id('shop_a'), 'Zone 1', 5000, true)
  returning id
)
insert into tests.ids select 'zone_1', id from z;

-- Catalog item
with cat as (
  insert into public.categories (tenant_id, name, sort)
  values (tests.id('shop_a'), 'Drinks', 1)
  returning id
),
itm as (
  insert into public.items (tenant_id, category_id, name, status, sort)
  values (tests.id('shop_a'), (select id from cat), 'Latte', 'active', 1)
  returning id
)
insert into public.item_variants (tenant_id, item_id, name, price, sort)
values (tests.id('shop_a'), (select id from itm), 'Regular', 12000, 1);

insert into tests.ids select 'itm_latte', id from public.items where tenant_id = tests.id('shop_a') and name = 'Latte';
insert into tests.ids select 'var_latte_reg', id from public.item_variants where tenant_id = tests.id('shop_a') and name = 'Regular';

-- 1. Normal order regression test: no reward, no pin behaves exactly as before
select tests.act_as_anon();

insert into tests.saved values (
  'normal_pickup',
  public.place_order(
    'del-cafe-a',
    jsonb_build_object(
      'fulfillment', 'pickup',
      'paymentMethod', 'gcash',
      'lines', jsonb_build_array(
        jsonb_build_object(
          'itemId', tests.id('itm_latte')::text,
          'variantId', tests.id('var_latte_reg')::text,
          'qty', 1,
          'optionIds', '[]'::jsonb
        )
      ),
      'useReward', false,
      'clientKey', gen_random_uuid()::text,
      'customer', jsonb_build_object('name', 'Normal Customer', 'phone', '+639171234567'),
      'privacyConsent', true
    )
  )
);

select is(
  (tests.saved('normal_pickup') ->> 'orderNo')::integer > 0,
  true,
  'Normal pickup order creates order with positive orderNo'
);

-- Quote order regression test
select is(
  ((public.quote_order(
    'del-cafe-a',
    jsonb_build_object(
      'fulfillment', 'pickup',
      'paymentMethod', 'gcash',
      'lines', jsonb_build_array(
        jsonb_build_object(
          'itemId', tests.id('itm_latte')::text,
          'variantId', tests.id('var_latte_reg')::text,
          'qty', 2,
          'optionIds', '[]'::jsonb
        )
      ),
      'useReward', false,
      'customer', jsonb_build_object('name', 'Normal Customer', 'phone', '+639171234567'),
      'privacyConsent', true
    )
  )) ->> 'total')::integer,
  24000,
  'Normal quote calculates total correctly'
);

-- 2. Rider phone regex tests (must match +639 with a single backslash \+639)
reset role;

-- Valid +639 phone
select lives_ok(
  $$
  update public.orders
  set rider_phone = '+639171234567'
  where id = tests.order_id('normal_pickup')
  $$,
  'Valid +639 phone number is accepted by regex'
);

-- Valid 09 phone
select lives_ok(
  $$
  update public.orders
  set rider_phone = '09171234567'
  where id = tests.order_id('normal_pickup')
  $$,
  'Valid 09 phone number is accepted by regex'
);

-- Invalid +638 phone
select throws_ok(
  $$
  update public.orders
  set rider_phone = '+638171234567'
  where id = tests.order_id('normal_pickup')
  $$,
  '23514',
  null,
  'Invalid +638 phone number is rejected by regex'
);

-- Invalid short phone
select throws_ok(
  $$
  update public.orders
  set rider_phone = '12345'
  where id = tests.order_id('normal_pickup')
  $$,
  '23514',
  null,
  'Short phone number is rejected by regex'
);

-- Invalid length phone
select throws_ok(
  $$
  update public.orders
  set rider_phone = '+6391712345678'
  where id = tests.order_id('normal_pickup')
  $$,
  '23514',
  null,
  'Phone number with too many digits is rejected by regex'
);

-- 3. Delivery orders and set_delivery_info
select tests.act_as_anon();

insert into tests.saved values (
  'delivery_order',
  public.place_order(
    'del-cafe-a',
    jsonb_build_object(
      'fulfillment', 'delivery',
      'paymentMethod', 'gcash',
      'delivery', jsonb_build_object(
        'addressLine', '123 Rizal St',
        'landmark', 'Near Church',
        'deliveryZoneId', tests.id('zone_1')::text
      ),
      'lines', jsonb_build_array(
        jsonb_build_object(
          'itemId', tests.id('itm_latte')::text,
          'variantId', tests.id('var_latte_reg')::text,
          'qty', 1,
          'optionIds', '[]'::jsonb
        )
      ),
      'useReward', false,
      'clientKey', gen_random_uuid()::text,
      'customer', jsonb_build_object('name', 'Delivery Customer', 'phone', '+639171234568'),
      'privacyConsent', true
    )
  )
);

reset role;
select tests.act_as(tests.id('owner_a'));

-- set_delivery_info on pickup order fails
select throws_ok(
  $$
  select public.set_delivery_info(
    tests.order_id('normal_pickup'),
    'own',
    null,
    'Kuya Driver',
    '+639171234567'
  )
  $$,
  'invalid',
  'set_delivery_info on non-delivery order is refused'
);

-- lalamove wrong host is refused
select throws_ok(
  $$
  select public.set_delivery_info(
    tests.order_id('delivery_order'),
    'lalamove',
    'https://fake-lalamove.com/track',
    'Kuya Rider',
    '+639171234567'
  )
  $$,
  'invalid_tracking_host',
  'lalamove with invalid host is refused'
);

-- grab wrong host is refused
select throws_ok(
  $$
  select public.set_delivery_info(
    tests.order_id('delivery_order'),
    'grab',
    'https://delivery.grabby.com/track',
    'Kuya Rider',
    '+639171234567'
  )
  $$,
  'invalid_tracking_host',
  'grab with invalid host is refused'
);

-- Query parameter bypass is refused (https://evil.example?x.lalamove.com)
select throws_ok(
  $$
  select public.set_delivery_info(
    tests.order_id('delivery_order'),
    'lalamove',
    'https://evil.example?x.lalamove.com',
    'Kuya Rider',
    '+639171234567'
  )
  $$,
  'invalid_tracking_host',
  'lalamove query bypass URL is refused'
);

-- Hash fragment bypass is refused (https://evil.example#.grab.com)
select throws_ok(
  $$
  select public.set_delivery_info(
    tests.order_id('delivery_order'),
    'grab',
    'https://evil.example#.grab.com',
    'Kuya Rider',
    '+639171234567'
  )
  $$,
  'invalid_tracking_host',
  'grab hash bypass URL is refused'
);

-- URL with spaces is refused (https://a b c)
select throws_ok(
  $$
  select public.set_delivery_info(
    tests.order_id('delivery_order'),
    'own',
    'https://a b c',
    'Kuya Rider',
    '+639171234567'
  )
  $$,
  'invalid',
  'URL with spaces is refused'
);

-- URL with @ is refused
select throws_ok(
  $$
  select public.set_delivery_info(
    tests.order_id('delivery_order'),
    'lalamove',
    'https://user@lalamove.com',
    'Kuya Rider',
    '+639171234567'
  )
  $$,
  'invalid',
  'URL with @ is refused'
);

-- lalamove valid host succeeds
select lives_ok(
  $$
  select public.set_delivery_info(
    tests.order_id('delivery_order'),
    'lalamove',
    'https://m.lalamove.com/track/12345',
    'Kuya Lalamove',
    '+639171234567'
  )
  $$,
  'lalamove with valid host succeeds'
);

-- grab valid host succeeds
select lives_ok(
  $$
  select public.set_delivery_info(
    tests.order_id('delivery_order'),
    'grab',
    'https://delivery.grab.com/orders/track-xyz',
    'Kuya Grab',
    '09171234567'
  )
  $$,
  'grab with valid host succeeds'
);

-- own delivery with any https URL succeeds
select lives_ok(
  $$
  select public.set_delivery_info(
    tests.order_id('delivery_order'),
    'own',
    'https://my-shop.ph/courier/123',
    'Shop Rider',
    '+639181112233'
  )
  $$,
  'own provider with any https URL succeeds'
);

-- Verify get_order reflects deliveryProvider and rider details
select tests.act_as_anon();
select is(
  (public.get_order(tests.order_token('delivery_order')) #>> '{order,deliveryProvider}'),
  'own',
  'get_order reflects deliveryProvider'
);

select is(
  (public.get_order(tests.order_token('delivery_order')) #>> '{order,riderName}'),
  'Shop Rider',
  'get_order reflects riderName'
);

select is(
  (public.get_order(tests.order_token('delivery_order')) #>> '{order,riderPhone}'),
  '+639181112233',
  'get_order reflects riderPhone'
);

-- 4. Order Ratings
-- Rating an uncompleted order is refused
select throws_ok(
  $$
  select public.rate_order(tests.order_token('normal_pickup'), 5, 'Great coffee!')
  $$,
  'order_not_completed',
  'Rating uncompleted order raises order_not_completed'
);

-- Advance order to completed
reset role;
update public.orders
set status = 'completed', completed_at = now(), payment_status = 'paid', paid_at = now()
where id = tests.order_id('normal_pickup');

-- Rate completed order
select tests.act_as_anon();

select lives_ok(
  $$
  select public.rate_order(tests.order_token('normal_pickup'), 5, 'Masarap ang kape!')
  $$,
  'rate_order on completed order succeeds'
);

-- Rating second time is refused
select throws_ok(
  $$
  select public.rate_order(tests.order_token('normal_pickup'), 4, 'Second rating')
  $$,
  'already_rated',
  'Second rating on same order raises already_rated'
);

-- Rating with invalid stars (< 1 or > 5) is refused
select throws_ok(
  $$
  select public.rate_order(tests.order_token('normal_pickup'), 6, 'Too many stars')
  $$,
  'invalid',
  'Stars > 5 is refused'
);

-- Verify get_order includes rating
select is(
  (public.get_order(tests.order_token('normal_pickup')) #>> '{order,rating,stars}')::integer,
  5,
  'get_order exposes order.rating.stars'
);

select is(
  (public.get_order(tests.order_token('normal_pickup')) #>> '{order,rating,comment}'),
  'Masarap ang kape!',
  'get_order exposes order.rating.comment'
);

-- 5. Sales Report includes ratingAverage and ratingCount
reset role;
select tests.act_as(tests.id('owner_a'));

select is(
  (public.get_sales_report(tests.id('shop_a'), current_date, current_date) ->> 'ratingAverage')::numeric,
  5.0,
  'get_sales_report includes ratingAverage = 5.0'
);

select is(
  (public.get_sales_report(tests.id('shop_a'), current_date, current_date) ->> 'ratingCount')::integer,
  1,
  'get_sales_report includes ratingCount = 1'
);

-- 6. Cross-shop isolation and RLS
-- Owner A sees Shop A ratings
select is(
  (select count(*) > 0 from public.order_ratings where tenant_id = tests.id('shop_a')),
  true,
  'Owner A can select Shop A order ratings'
);

-- Owner B sees 0 ratings from Shop A
select tests.act_as(tests.id('owner_b'));
select is(
  (select count(*) from public.order_ratings where tenant_id = tests.id('shop_a')),
  0::bigint,
  'Cross-shop: Owner B sees 0 ratings from Shop A'
);

-- Owner B cannot set delivery info for Shop A
select throws_ok(
  $$
  select public.set_delivery_info(
    tests.order_id('delivery_order'),
    'own',
    null,
    'Hacker Rider',
    '+639171234567'
  )
  $$,
  'not_allowed',
  'Owner B cannot set delivery info for Shop A'
);

-- Direct client insert on order_ratings is refused
select throws_ok(
  $$
  insert into public.order_ratings (order_id, tenant_id, stars, comment)
  values (tests.order_id('delivery_order'), tests.id('shop_a'), 5, 'Hacked')
  $$,
  '42501',
  null,
  'Direct client insert on order_ratings is refused'
);

-- Direct anon select on order_ratings is refused
select tests.act_as_anon();
select throws_ok(
  $$ select count(*) from public.order_ratings $$,
  '42501',
  null,
  'Direct anon select on order_ratings is refused'
);

select * from finish();
rollback;
