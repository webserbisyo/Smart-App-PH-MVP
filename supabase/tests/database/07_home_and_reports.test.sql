-- P5.6: Home numbers, member insights, sales reports and demo_reset. A small hand-made set of orders in shop A across
-- two Manila dates (yesterday and today), including one at 23:30 Manila yesterday (15:30 UTC the same day) and one at
-- 00:30 Manila today (16:30 UTC the day before); each order's business date is its Manila date, as place_order sets it.
-- Shop B is another active shop; it becomes a demo shop for demo_reset.
create extension if not exists pgtap with schema extensions;

begin;
select * from no_plan();

-- ---------------------------------------------------------------------------
-- Helpers (kept in this file, rolled back with it)
-- ---------------------------------------------------------------------------

create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.create_user(p_email text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at
  ) values (
    v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, now(), '{}'::jsonb,
    '{}'::jsonb, now(), now()
  );
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

create table tests.ids (name text primary key, id uuid);
grant select on tests.ids to anon, authenticated;

create function tests.id(p_name text)
returns uuid
language sql
stable
as $$ select id from tests.ids where name = p_name $$;

-- Today's Manila date, and a Manila local date and time as an instant.
create function tests.today()
returns date
language sql
stable
as $$ select (now() at time zone 'Asia/Manila')::date $$;

create function tests.manila(p_date date, p_time text)
returns timestamptz
language sql
stable
as $$ select (p_date + p_time::time) at time zone 'Asia/Manila' $$;

-- One order in shop A placed at p_at, with one line per [item name, unit price, qty]; numbered within its Manila date.
create function tests.order(
  p_name text, p_at timestamptz, p_status text, p_payment_status text, p_lines jsonb, p_customer text default null
)
returns uuid
language plpgsql
volatile
as $$
declare
  v_date date := (p_at at time zone 'Asia/Manila')::date;
  v_total integer;
  v_id uuid;
begin
  select sum((l ->> 1)::integer * (l ->> 2)::integer) into v_total from jsonb_array_elements(p_lines) as l;
  insert into public.orders (
    tenant_id, order_no, business_date, token, fulfillment, status, payment_status, payment_method, customer_id,
    customer_name, customer_phone, subtotal, total, client_key, placed_at
  ) values (
    tests.id('shop_a'),
    (select coalesce(max(order_no), 0) + 1 from public.orders where tenant_id = tests.id('shop_a') and business_date = v_date),
    v_date, 'test-order-token-' || p_name, 'walk_in', p_status, p_payment_status, 'cash', tests.id(p_customer),
    'Guest', '+639171230000', v_total, v_total, gen_random_uuid(), p_at
  )
  returning id into v_id;
  insert into public.order_items (tenant_id, order_id, item_name, variant_name, unit_price, qty, line_total, sort)
  select tests.id('shop_a'), v_id, l ->> 0, 'Regular', (l ->> 1)::integer, (l ->> 2)::integer,
    (l ->> 1)::integer * (l ->> 2)::integer, (n - 1)::integer
  from jsonb_array_elements(p_lines) with ordinality as x (l, n);
  insert into tests.ids values ('order_' || p_name, v_id);
  return v_id;
end;
$$;

-- The three owner functions as a user.
create function tests.today_of(p_user uuid, p_shop text)
returns jsonb
language plpgsql
volatile
as $$
declare
  v_result jsonb;
begin
  perform tests.act_as(p_user);
  v_result := public.get_dashboard_today(tests.id(p_shop));
  execute 'reset role';
  return v_result;
end;
$$;

create function tests.insights_of(p_user uuid, p_shop text)
returns jsonb
language plpgsql
volatile
as $$
declare
  v_result jsonb;
begin
  perform tests.act_as(p_user);
  v_result := public.get_member_insights(tests.id(p_shop));
  execute 'reset role';
  return v_result;
end;
$$;

create function tests.report_of(p_user uuid, p_shop text, p_from date, p_to date)
returns jsonb
language plpgsql
volatile
as $$
declare
  v_result jsonb;
begin
  perform tests.act_as(p_user);
  v_result := public.get_sales_report(tests.id(p_shop), p_from, p_to);
  execute 'reset role';
  return v_result;
end;
$$;

-- Row counts of one shop that demo_reset must leave alone.
create function tests.shop_rows(p_shop text)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'orders', (select count(*) from public.orders where tenant_id = tests.id(p_shop)),
    'lines', (select count(*) from public.order_items where tenant_id = tests.id(p_shop)),
    'customers', (select count(*) from public.customers where tenant_id = tests.id(p_shop)),
    'ledger', (select count(*) from public.loyalty_ledger where tenant_id = tests.id(p_shop)),
    'stock', (select coalesce(sum(stock_on_hand), 0) from public.item_variants where tenant_id = tests.id(p_shop))
  )
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Shops A and B, customers and orders
-- ---------------------------------------------------------------------------

insert into tests.ids values
  ('a', tests.create_user('owner-a@example.com')),
  ('b', tests.create_user('owner-b@example.com'));

select tests.act_as(tests.id('a'));
select public.create_my_shop('food', 'Shop A', 'shop-a');
reset role;
select tests.act_as(tests.id('b'));
select public.create_my_shop('retail', 'Shop B', 'shop-b');
reset role;

insert into tests.ids
select 'shop_' || replace(t.slug, 'shop-', ''), t.id from public.tenants t where t.slug in ('shop-a', 'shop-b');
update public.tenants set status = 'active' where slug in ('shop-a', 'shop-b');

-- Members m1 (joined 30 days ago), m2 (2 days ago), m3 (8 days ago) and guest g1.
with c as (
  insert into public.customers (tenant_id, name, phone, member_since) values
    (tests.id('shop_a'), 'Maria Santos', '+639171230001', now() - interval '30 days'),
    (tests.id('shop_a'), 'Jose Reyes', '+639171230002', now() - interval '2 days'),
    (tests.id('shop_a'), 'Ana Cruz', '+639171230003', now() - interval '8 days'),
    (tests.id('shop_a'), 'Guest Buyer', '+639171230004', null)
  returning phone, id
)
insert into tests.ids select 'm' || right(phone, 1), id from c;
update tests.ids set name = 'g1' where name = 'm4';

-- Yesterday: o1 at 23:30 completed (m1), o2 paid then cancelled, o3 expired, o9 ready and paid (still open).
select tests.order('o1', tests.manila(tests.today() - 1, '23:30'), 'completed', 'paid', '[["Latte", 5000, 2]]', 'm1');
select tests.order('o2', tests.manila(tests.today() - 1, '12:00'), 'cancelled', 'paid', '[["Cake", 5000, 1]]');
select tests.order('o3', tests.manila(tests.today() - 1, '13:00'), 'expired', 'unpaid', '[["Bun", 1400, 5]]');
select tests.order('o9', tests.manila(tests.today() - 1, '14:00'), 'ready', 'paid', '[["Bun", 3000, 2]]', 'g1');
-- Today: o4 at 00:30 completed (m1), o5 preparing and paid (m2), o6 waiting with a proof to verify, o7 waiting
-- unpaid, o8 expired.
select tests.order('o4', tests.manila(tests.today(), '00:30'), 'completed', 'paid', '[["Bun", 3000, 3], ["Cake", 11000, 1]]', 'm1');
select tests.order('o5', tests.manila(tests.today(), '09:00'), 'preparing', 'paid', '[["Latte", 5000, 3]]', 'm2');
select tests.order('o6', tests.manila(tests.today(), '10:00'), 'placed', 'pending', '[["Latte", 8000, 1]]', 'm3');
select tests.order('o7', tests.manila(tests.today(), '11:00'), 'placed', 'unpaid', '[["Bun", 4000, 1]]');
select tests.order('o8', tests.manila(tests.today(), '11:30'), 'expired', 'unpaid', '[["Bun", 3000, 9]]');

-- Stock: low (1 of 2), not low (5), archived (0), untracked item (0), at the mark (2 of 2), not counted (null).
with i as (
  insert into public.items (tenant_id, name, track_stock, status) values
    (tests.id('shop_a'), 'Tracked', true, 'active'),
    (tests.id('shop_a'), 'Untracked', false, 'active')
  returning name, id
)
insert into tests.ids select 'item_' || lower(name), id from i;
insert into public.item_variants (tenant_id, item_id, name, price, stock_on_hand, low_stock_at, archived_at) values
  (tests.id('shop_a'), tests.id('item_tracked'), 'Low', 1000, 1, 2, null),
  (tests.id('shop_a'), tests.id('item_tracked'), 'Plenty', 1000, 5, 2, null),
  (tests.id('shop_a'), tests.id('item_tracked'), 'Archived', 1000, 0, 2, now()),
  (tests.id('shop_a'), tests.id('item_untracked'), 'Untracked', 1000, 0, 2, null),
  (tests.id('shop_a'), tests.id('item_tracked'), 'At mark', 1000, 2, 2, null),
  (tests.id('shop_a'), tests.id('item_tracked'), 'No count', 1000, null, 2, null);

-- ---------------------------------------------------------------------------
-- 1. Manila dates: 23:30 Manila stays on its day, 00:30 Manila is the next day although UTC says otherwise
-- ---------------------------------------------------------------------------

select is(
  (select (placed_at at time zone 'UTC')::date from public.orders where id = tests.id('order_o1')),
  tests.today() - 1, 'the 23:30 Manila order is 15:30 UTC on the same date'
);
select is(
  (select (placed_at at time zone 'UTC')::date from public.orders where id = tests.id('order_o4')),
  tests.today() - 1, 'the 00:30 Manila order is 16:30 UTC on the date before'
);

-- ---------------------------------------------------------------------------
-- 2. get_dashboard_today
-- ---------------------------------------------------------------------------

select is(tests.today_of(tests.id('a'), 'shop_a') ->> 'businessDate', tests.today()::text, 'the business date is today in Manila');
select is((tests.today_of(tests.id('a'), 'shop_a') ->> 'salesToday')::integer, 35000, 'sales: paid orders of today not cancelled or expired, the 00:30 one included');
select is((tests.today_of(tests.id('a'), 'shop_a') ->> 'ordersToday')::integer, 4, 'orders: today''s orders except the expired one');
select is((tests.today_of(tests.id('a'), 'shop_a') ->> 'averageOrder')::integer, 17500, 'average: sales over the 2 paid orders');
select is((tests.today_of(tests.id('a'), 'shop_a') ->> 'openOrders')::integer, 4, 'open: placed, preparing and ready, yesterday''s still-open order included');
select is((tests.today_of(tests.id('a'), 'shop_a') ->> 'waiting')::integer, 2, 'waiting: placed orders');
select is((tests.today_of(tests.id('a'), 'shop_a') ->> 'toVerify')::integer, 1, 'to verify: payments pending');
select is((tests.today_of(tests.id('a'), 'shop_a') ->> 'lowStock')::integer, 2, 'low stock: tracked, not archived, at or under the mark');
select is((tests.today_of(tests.id('a'), 'shop_a') ->> 'memberCount')::integer, 3, 'members: customers with member_since');
select is((tests.today_of(tests.id('a'), 'shop_a') ->> 'newMembersThisWeek')::integer, 1, 'new this week: joined in the last 7 days');
select is((tests.today_of(tests.id('b'), 'shop_b') ->> 'averageOrder')::integer, 0, 'average is 0 with no paid orders');

-- ---------------------------------------------------------------------------
-- 3. get_member_insights
-- ---------------------------------------------------------------------------

select is((tests.insights_of(tests.id('a'), 'shop_a') ->> 'memberCount')::integer, 3, 'insights: member count');
select is((tests.insights_of(tests.id('a'), 'shop_a') ->> 'newMembersThisWeek')::integer, 1, 'insights: new this week');
select is(
  (select jsonb_agg(s ->> 'name') from jsonb_array_elements(tests.insights_of(tests.id('a'), 'shop_a') -> 'topSuki') as s),
  '["Maria Santos", "Jose Reyes"]'::jsonb,
  'top suki: members by sales this month; guests and unpaid orders do not count'
);
select is(
  (tests.insights_of(tests.id('a'), 'shop_a') -> 'topSuki' -> 0 ->> 'totalSpent')::integer,
  20000 + case when date_trunc('month', tests.today() - 1) = date_trunc('month', tests.today()) then 10000 else 0 end,
  'top suki: only this Manila month''s sales'
);

-- ---------------------------------------------------------------------------
-- 4. get_sales_report
-- ---------------------------------------------------------------------------

select is(
  tests.report_of(tests.id('a'), 'shop_a', tests.today() - 1, tests.today()) -> 'days',
  jsonb_build_array(
    jsonb_build_object('date', tests.today() - 1, 'orders', 3, 'sales', 16000),
    jsonb_build_object('date', tests.today(), 'orders', 4, 'sales', 35000)
  ),
  'days: yesterday holds the 23:30 order, today the 00:30 one'
);
select is(
  tests.report_of(tests.id('a'), 'shop_a', tests.today() - 1, tests.today()) -> 'totals',
  '{"orders": 7, "sales": 51000}'::jsonb,
  'totals of the range'
);
select is(
  tests.report_of(tests.id('a'), 'shop_a', tests.today() - 1, tests.today()) -> 'bestSellers',
  '[{"itemName": "Latte", "qty": 5, "sales": 25000}, {"itemName": "Bun", "qty": 5, "sales": 15000}, {"itemName": "Cake", "qty": 1, "sales": 11000}]'::jsonb,
  'best sellers: quantity of sales orders only, ties by sales'
);
select is(
  jsonb_array_length(tests.report_of(tests.id('a'), 'shop_a', tests.today() - 6, tests.today()) -> 'days'),
  7, 'every day of the range is listed'
);
select is(
  (tests.report_of(tests.id('a'), 'shop_a', tests.today() - 6, tests.today()) -> 'days' -> 0),
  jsonb_build_object('date', tests.today() - 6, 'orders', 0, 'sales', 0),
  'a day without orders shows zeros'
);
select is(
  jsonb_array_length(tests.report_of(tests.id('a'), 'shop_a', tests.today() - 91, tests.today()) -> 'days'),
  92, '92 days is allowed'
);
select throws_ok(
  format($$ select tests.report_of(%L, 'shop_a', %L, %L) $$, tests.id('a'), tests.today() - 92, tests.today()),
  'P0001', 'invalid', 'more than 92 days: invalid'
);
select throws_ok(
  format($$ select tests.report_of(%L, 'shop_a', %L, %L) $$, tests.id('a'), tests.today(), tests.today() - 1),
  'P0001', 'invalid', 'from after to: invalid'
);

-- ---------------------------------------------------------------------------
-- 5. Access: another owner gets not_allowed; visitors cannot call them
-- ---------------------------------------------------------------------------

select throws_ok(format($$ select tests.today_of(%L, 'shop_a') $$, tests.id('b')), 'P0001', 'not_allowed', 'owner B: get_dashboard_today of shop A is not allowed');
select throws_ok(format($$ select tests.insights_of(%L, 'shop_a') $$, tests.id('b')), 'P0001', 'not_allowed', 'owner B: get_member_insights of shop A is not allowed');
select throws_ok(
  format($$ select tests.report_of(%L, 'shop_a', %L, %L) $$, tests.id('b'), tests.today(), tests.today()),
  'P0001', 'not_allowed', 'owner B: get_sales_report of shop A is not allowed'
);

select tests.act_as_anon();
select throws_ok(format($$ select public.get_dashboard_today(%L) $$, tests.id('shop_a')), '42501', null, 'visitors cannot run get_dashboard_today');
select throws_ok(format($$ select public.get_member_insights(%L) $$, tests.id('shop_a')), '42501', null, 'visitors cannot run get_member_insights');
select throws_ok(
  format($$ select public.get_sales_report(%L, current_date, current_date) $$, tests.id('shop_a')),
  '42501', null, 'visitors cannot run get_sales_report'
);
reset role;

-- ---------------------------------------------------------------------------
-- 6. demo_reset
-- ---------------------------------------------------------------------------

select throws_ok($$ select private.demo_reset('shop-a') $$, 'P0001', 'not_demo', 'demo_reset refuses a shop that is not a demo');
select throws_ok($$ select private.demo_reset('no-such-shop') $$, 'P0001', 'not_demo', 'demo_reset refuses an unknown shop');

select tests.act_as(tests.id('b'));
select throws_ok($$ select private.demo_reset('shop-b') $$, '42501', null, 'a signed-in client cannot run demo_reset');
reset role;
select tests.act_as_anon();
select throws_ok($$ select private.demo_reset('shop-b') $$, '42501', null, 'a visitor cannot run demo_reset');
reset role;

-- Shop B becomes a demo shop with a small catalog, a GCash account, delivery, a real customer and a real order today.
update public.tenants set is_demo = true where id = tests.id('shop_b');
update public.shop_settings set delivery_enabled = true, cod_enabled = true where tenant_id = tests.id('shop_b');
insert into public.payment_accounts (tenant_id, method, account_name, account_number)
values (tests.id('shop_b'), 'gcash', 'Shop B GCash', '0917 000 0009');
insert into public.delivery_zones (tenant_id, name, fee) values (tests.id('shop_b'), 'Town', 5000);
with i as (
  insert into public.items (tenant_id, name, track_stock, is_featured) values
    (tests.id('shop_b'), 'Shirt', true, true),
    (tests.id('shop_b'), 'Cap', false, false)
  returning name, id
)
insert into tests.ids select 'item_' || lower(name), id from i;
insert into public.item_variants (tenant_id, item_id, name, price, stock_on_hand, low_stock_at, sort) values
  (tests.id('shop_b'), tests.id('item_shirt'), 'S', 39900, 10, 2, 0),
  (tests.id('shop_b'), tests.id('item_shirt'), 'M', 39900, 10, 2, 1),
  (tests.id('shop_b'), tests.id('item_shirt'), 'L', 39900, 10, 2, 2),
  (tests.id('shop_b'), tests.id('item_cap'), 'One size', 19900, null, null, 0);
with c as (
  insert into public.customers (tenant_id, name, phone) values (tests.id('shop_b'), 'Real Customer', '+639171239999')
  returning id
)
insert into tests.ids select 'real_customer', id from c;
insert into public.orders (
  tenant_id, order_no, business_date, token, fulfillment, payment_method, customer_id, customer_name, customer_phone,
  subtotal, total, client_key
) values (
  tests.id('shop_b'), 1, tests.today(), 'real-order-token-0001', 'walk_in', 'cash', tests.id('real_customer'),
  'Real Customer', '+639171239999', 19900, 19900, gen_random_uuid()
);
insert into public.order_counters (tenant_id, business_date, last_no) values (tests.id('shop_b'), tests.today(), 1);

create table tests.before as select tests.shop_rows('shop_a') as body;

select lives_ok($$ select private.demo_reset('shop-b') $$, 'demo_reset runs on a demo shop');
create table tests.result as select private.demo_reset('shop-b') as body;
select ok(true, 'demo_reset runs twice in a row without errors');

select is((select body ->> 'customers' from tests.result)::integer, 120, 'about 120 demo customers');
select is((select body ->> 'members' from tests.result)::integer, 75, 'about 75 of them members');
select is(
  (select count(*)::integer from public.customers where tenant_id = tests.id('shop_b') and 'demo' = any (tags)),
  120, 'a second run replaces the demo customers instead of adding to them'
);
select is(
  (select count(*)::integer from public.orders where tenant_id = tests.id('shop_b') and token like 'demo-%'),
  (select body ->> 'orders' from tests.result)::integer, 'the returned order count is the demo orders'
);
select ok((select (body ->> 'orders')::integer > 60 from tests.result), '30 days of orders');
select ok((select (body ->> 'today')::integer >= 6 from tests.result), 'today has at least the 6 Home orders');
select is(
  (select count(distinct business_date)::integer from public.orders where tenant_id = tests.id('shop_b') and token like 'demo-%'),
  30, 'orders on each of the last 30 days'
);
select ok(
  (select max(placed_at) <= now() from public.orders where tenant_id = tests.id('shop_b') and token like 'demo-%'),
  'no order is placed in the future'
);

select ok(exists (select 1 from public.orders where id = (select id from public.orders where token = 'real-order-token-0001')), 'the real order is left alone');
select ok(exists (select 1 from public.customers where id = tests.id('real_customer')), 'the real customer is left alone');
select is(tests.shop_rows('shop_a'), (select body from tests.before), 'the other shop is left alone');

select is(
  (select array_agg(order_no order by order_no) from public.orders where tenant_id = tests.id('shop_b') and business_date = tests.today()),
  (select array_agg(n) from generate_series(1, (select count(*)::integer from public.orders where tenant_id = tests.id('shop_b') and business_date = tests.today())) as n),
  'today''s numbers run 1, 2, 3 … with no gaps, after the real order'
);
select is(
  (select last_no from public.order_counters where tenant_id = tests.id('shop_b') and business_date = tests.today()),
  (select max(order_no) from public.orders where tenant_id = tests.id('shop_b') and business_date = tests.today()),
  'the counter follows the last number, so the next real order follows on'
);

select is(
  (select count(*)::integer from public.orders where tenant_id = tests.id('shop_b') and token like 'demo-%' and business_date = tests.today()
    and status in ('preparing', 'ready', 'out_for_delivery')),
  3, 'today: 3 orders in progress'
);
select ok(
  exists (select 1 from public.orders where tenant_id = tests.id('shop_b') and token like 'demo-%' and status = 'out_for_delivery'),
  'one of them is out for delivery'
);
select is(
  (select count(*)::integer from public.orders o join public.payments p on p.order_id = o.id
    where o.tenant_id = tests.id('shop_b') and o.payment_status = 'pending' and p.status = 'pending' and p.proof_path is not null),
  1, 'today: 1 GCash proof to verify'
);
select is(
  (select count(*)::integer from public.orders where tenant_id = tests.id('shop_b') and token like 'demo-%' and status = 'placed'
    and fulfillment = 'pickup' and (pickup_at at time zone 'Asia/Manila')::date = tests.today() + 1),
  2, 'today: 2 pickups for tomorrow'
);
select ok(
  exists (select 1 from public.orders where tenant_id = tests.id('shop_b') and token like 'demo-%' and status = 'cancelled' and cancel_reason is not null)
  and exists (select 1 from public.orders where tenant_id = tests.id('shop_b') and token like 'demo-%' and status = 'expired'),
  'a few cancelled with reasons and a few expired'
);
select ok(
  (select count(distinct fulfillment) = 3 from public.orders where tenant_id = tests.id('shop_b') and token like 'demo-%'),
  'all three ways to order'
);
select is(
  (select count(*)::integer from public.loyalty_ledger l join public.orders o on o.id = l.order_id
    where o.tenant_id = tests.id('shop_b') and l.reason = 'earned' and o.status <> 'completed'),
  0, 'stamps are earned by completed orders only'
);
select ok(
  (select count(*) > 0 from public.loyalty_ledger where tenant_id = tests.id('shop_b') and reason = 'earned'),
  'completed orders earned stamps'
);
select is(
  (select count(*)::integer from public.customer_stamp_balances where tenant_id = tests.id('shop_b') and stamps < 0),
  0, 'no balance goes below zero'
);
select is((tests.today_of(tests.id('b'), 'shop_b') ->> 'lowStock')::integer, 2, 'two variants are low on stock');
select is((tests.today_of(tests.id('b'), 'shop_b') ->> 'toVerify')::integer, 1, 'Home shows the payment to verify');

select * from finish();
rollback;
