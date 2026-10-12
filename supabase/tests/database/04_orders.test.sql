-- P5.3: the order engine (quote_order, place_order), payment proofs, the receipt, RLS on the order tables and the
-- live update trigger. Shop A is open all day with a small catalog; shop B is another active shop. Calls run as a
-- visitor (anon) unless a check says otherwise.
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

create table tests.ids (name text primary key, id uuid);
grant select on tests.ids to anon, authenticated;

create function tests.id(p_name text)
returns uuid
language sql
stable
as $$ select id from tests.ids where name = p_name $$;

-- What the calls returned, saved so later checks can read them.
create table tests.saved (name text primary key, body jsonb);
grant select, insert on tests.saved to anon, authenticated;

create function tests.saved(p_name text)
returns jsonb
language sql
stable
as $$ select body from tests.saved where name = p_name $$;

-- One cart line by test names: item, variant, quantity, add-ons.
create function tests.line(p_item text, p_variant text, p_qty integer, p_options text[] default '{}')
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'itemId', tests.id(p_item),
    'variantId', tests.id(p_variant),
    'qty', p_qty,
    'note', null,
    'optionIds', coalesce((select jsonb_agg(tests.id(o) order by n) from unnest(p_options) with ordinality as u(o, n)), '[]'::jsonb)
  )
$$;

-- An OrderPayload: walk-in, cash, a guest whose phone ends in p_phone; p_changes overrides any key.
create function tests.payload(p_lines jsonb, p_phone integer, p_changes jsonb default '{}')
returns jsonb
language sql
volatile
as $$
  select jsonb_build_object(
    'clientKey', gen_random_uuid(),
    'fulfillment', 'walk_in',
    'paymentMethod', 'cash',
    'customer', jsonb_build_object('name', 'Guest ' || p_phone, 'phone', '+6391700' || lpad(p_phone::text, 5, '0'), 'email', null),
    'lines', p_lines,
    'pickupAt', null,
    'delivery', null,
    'notes', null,
    'useReward', false,
    'privacyConsent', true
  ) || p_changes
$$;

create function tests.latte(p_qty integer default 1)
returns jsonb
language sql
stable
as $$ select jsonb_build_array(tests.line('item_latte', 'var_latte', p_qty, '{opt_half}')) $$;

create function tests.quote(p_payload jsonb)
returns jsonb
language sql
volatile
as $$ select public.quote_order('shop-a', p_payload) $$;

create function tests.place(p_name text, p_payload jsonb)
returns jsonb
language plpgsql
volatile
as $$
declare
  v_result jsonb := public.place_order('shop-a', p_payload);
begin
  insert into tests.saved values (p_name, v_result);
  return v_result;
end;
$$;

-- Security definer, so checks running as a visitor can still name an order's token and folder.
create function tests.order_row(p_name text)
returns public.orders
language sql
stable
security definer
as $$ select * from public.orders where id = (tests.saved(p_name) ->> 'orderId')::uuid $$;

create function tests.proof_path(p_name text)
returns text
language sql
volatile
as $$ select tenant_id::text || '/' || token || '/' || gen_random_uuid()::text || '.webp' from tests.order_row(p_name) $$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Shops A and B
-- ---------------------------------------------------------------------------

insert into tests.ids values
  ('a', tests.create_user('owner-a@example.com')),
  ('b', tests.create_user('owner-b@example.com')),
  ('member', tests.create_user('member@example.com'));

select tests.act_as(tests.id('a'));
select public.create_my_shop('food', 'Shop A', 'shop-a');
reset role;
select tests.act_as(tests.id('b'));
select public.create_my_shop('retail', 'Shop B', 'shop-b');
reset role;

insert into tests.ids select 'shop_' || replace(t.slug, 'shop-', ''), t.id from public.tenants t where t.slug in ('shop-a', 'shop-b');
update public.tenants set status = 'active' where slug in ('shop-a', 'shop-b');

-- Open all day, every day, so the checks do not depend on the clock.
update public.business_hours set opens_at = '00:00', closes_at = '24:00' where tenant_id in (tests.id('shop_a'), tests.id('shop_b'));
update public.shop_settings set delivery_enabled = true where tenant_id = tests.id('shop_a');

insert into public.payment_accounts (tenant_id, method, account_name, account_number, is_active) values
  (tests.id('shop_a'), 'gcash', 'Shop A GCash', '0917 000 0001', true),
  (tests.id('shop_a'), 'maya', 'Shop A Maya', '0917 000 0002', false),
  (tests.id('shop_b'), 'gcash', 'Shop B GCash', '0917 000 0003', true);

with z as (
  insert into public.delivery_zones (tenant_id, name, fee, is_active) values
    (tests.id('shop_a'), 'Near', 5000, true),
    (tests.id('shop_a'), 'Off', 7000, false),
    (tests.id('shop_b'), 'B zone', 4000, true)
  returning name, id
)
insert into tests.ids select 'zone_' || lower(split_part(name, ' ', 1)), id from z;

with c as (
  insert into public.categories (tenant_id, name, is_hidden) values
    (tests.id('shop_a'), 'Main', false),
    (tests.id('shop_a'), 'Secret', true),
    (tests.id('shop_b'), 'Clothes', false)
  returning name, id
)
insert into tests.ids select 'cat_' || lower(name), id from c;

with i as (
  insert into public.items (tenant_id, category_id, name, status, track_stock) values
    (tests.id('shop_a'), tests.id('cat_main'), 'Latte', 'active', false),
    (tests.id('shop_a'), tests.id('cat_main'), 'Bread', 'active', true),
    (tests.id('shop_a'), tests.id('cat_main'), 'Cookie', 'active', true),
    (tests.id('shop_a'), tests.id('cat_main'), 'Water', 'active', false),
    (tests.id('shop_a'), tests.id('cat_main'), 'Mocha', 'hidden', false),
    (tests.id('shop_a'), tests.id('cat_secret'), 'Cortado', 'active', false),
    (tests.id('shop_b'), tests.id('cat_clothes'), 'Shirt', 'active', false)
  returning name, id
)
insert into tests.ids select 'item_' || lower(name), id from i;

with v as (
  insert into public.item_variants (tenant_id, item_id, name, price, stock_on_hand, archived_at) values
    (tests.id('shop_a'), tests.id('item_latte'), 'Regular', 12000, null, null),
    (tests.id('shop_a'), tests.id('item_latte'), 'Old', 9000, null, now()),
    (tests.id('shop_a'), tests.id('item_bread'), 'Piece', 5000, 3, null),
    (tests.id('shop_a'), tests.id('item_cookie'), 'Piece', 4000, 10, null),
    (tests.id('shop_a'), tests.id('item_water'), 'Glass', 0, null, null),
    (tests.id('shop_a'), tests.id('item_mocha'), 'Regular', 13000, null, null),
    (tests.id('shop_a'), tests.id('item_cortado'), 'Regular', 11000, null, null),
    (tests.id('shop_b'), tests.id('item_shirt'), 'M', 50000, null, null)
  returning item_id, name, id
)
insert into tests.ids
select 'var_' || replace(t.name, 'item_', '') || case when v.name = 'Old' then '_old' else '' end, v.id
from v join tests.ids t on t.id = v.item_id;

with g as (
  insert into public.option_groups (tenant_id, name, min_select, max_select) values
    (tests.id('shop_a'), 'Sugar', 1, 1),
    (tests.id('shop_a'), 'Addons', 0, 2)
  returning name, id
)
insert into tests.ids select 'group_' || lower(name), id from g;

with o as (
  insert into public.options (tenant_id, group_id, name, price_delta, is_sold_out) values
    (tests.id('shop_a'), tests.id('group_sugar'), 'Half', 0, false),
    (tests.id('shop_a'), tests.id('group_sugar'), 'Full', 0, false),
    (tests.id('shop_a'), tests.id('group_sugar'), 'Sold', 0, true),
    (tests.id('shop_a'), tests.id('group_addons'), 'Shot', 3000, false),
    (tests.id('shop_a'), tests.id('group_addons'), 'Oat', 2000, false)
  returning name, id
)
insert into tests.ids select 'opt_' || lower(name), id from o;

insert into public.item_option_groups (tenant_id, item_id, group_id) values
  (tests.id('shop_a'), tests.id('item_latte'), tests.id('group_sugar')),
  (tests.id('shop_a'), tests.id('item_latte'), tests.id('group_addons'));

-- ---------------------------------------------------------------------------
-- 4. Order numbers: 1, 2, 3 per shop per day, no gap after a failed placement
-- ---------------------------------------------------------------------------

select tests.act_as_anon();
select lives_ok($$ select tests.place('n1', tests.payload(tests.latte(), 1)) $$, 'a visitor places a walk-in order');
select throws_ok(
  $$ select tests.place('n_fail', tests.payload(jsonb_build_array(tests.line('item_bread', 'var_bread', 99)), 1)) $$,
  'P0001', 'out_of_stock', 'a placement with too little stock fails'
);
select lives_ok($$ select tests.place('n2', tests.payload(tests.latte(), 2)) $$, 'a second order');
select lives_ok($$ select tests.place('n3', tests.payload(tests.latte(), 3)) $$, 'a third order');
reset role;

select is(
  array[(tests.saved('n1') ->> 'orderNo')::integer, (tests.saved('n2') ->> 'orderNo')::integer, (tests.saved('n3') ->> 'orderNo')::integer],
  array[1, 2, 3],
  'order numbers are 1, 2, 3 with no gap after the failed placement'
);
select is((tests.order_row('n1')).business_date, (now() at time zone 'Asia/Manila')::date, 'the business date is today in Manila');
select ok(tests.saved('n1') ->> 'token' ~ '^[A-Za-z0-9_-]{22}$', 'the token is 16 random bytes in base64url without padding');
select is((select count(*) from public.order_events e where e.order_id = (tests.order_row('n1')).id and e.kind = 'status' and e.to_status = 'placed' and e.actor = 'customer'), 1::bigint, 'placing writes one placed event by the customer');
select is((select count(*) from public.consents c where c.customer_id = (tests.order_row('n1')).customer_id and c.channel = 'privacy' and c.granted), 1::bigint, 'placing records the privacy consent');
select is((tests.order_row('n1')).expires_at, null, 'a cash order never expires on its own');

-- ---------------------------------------------------------------------------
-- 1. Quote and place give the same totals; prices in the payload are ignored
-- ---------------------------------------------------------------------------

insert into tests.saved values ('p_same', tests.payload(
  jsonb_build_array(
    tests.line('item_latte', 'var_latte', 2, '{opt_half,opt_shot}') || '{"unitPrice": 1, "lineTotal": 1, "price": 1}',
    tests.line('item_bread', 'var_bread', 1)
  ),
  4,
  '{"total": 1, "subtotal": 1}'
));

select tests.act_as_anon();
select lives_ok($$ insert into tests.saved values ('q_same', tests.quote(tests.saved('p_same'))) $$, 'a visitor gets a quote');
select lives_ok($$ select tests.place('o_same', tests.saved('p_same')) $$, 'the same payload places');
reset role;

select is((tests.saved('q_same') ->> 'subtotal')::integer, 35000, 'the quote prices from the catalog: (120 + 30) x 2 + 50');
select is((tests.saved('q_same') ->> 'total')::integer, (tests.order_row('o_same')).total, 'quote and place give the same total');
select is((tests.saved('q_same') ->> 'subtotal')::integer, (tests.order_row('o_same')).subtotal, 'quote and place give the same subtotal');
select is(tests.saved('q_same') -> 'problems', '[]'::jsonb, 'a good cart has no problems');
select is(
  (select jsonb_agg(jsonb_build_object('name', l.item_name, 'unit', l.unit_price, 'opts', l.options_total, 'qty', l.qty, 'total', l.line_total) order by l.sort)
   from public.order_items l where l.order_id = (tests.order_row('o_same')).id),
  '[{"name": "Latte", "unit": 12000, "opts": 3000, "qty": 2, "total": 30000}, {"name": "Bread", "unit": 5000, "opts": 0, "qty": 1, "total": 5000}]'::jsonb,
  'the lines are snapshots with database prices'
);
select is(
  (select l.options from public.order_items l where l.order_id = (tests.order_row('o_same')).id and l.sort = 0),
  jsonb_build_array(
    jsonb_build_object('optionId', tests.id('opt_half'), 'name', 'Half', 'priceDelta', 0),
    jsonb_build_object('optionId', tests.id('opt_shot'), 'name', 'Shot', 'priceDelta', 3000)
  ),
  'chosen add-ons are kept as a jsonb array in the order picked'
);
select is((select stock_on_hand from public.item_variants where id = tests.id('var_bread')), 2, 'placing takes the stock');

-- A quote needs no customer yet (QuotePayload).
select tests.act_as_anon();
select is(
  (tests.quote(jsonb_build_object('fulfillment', 'walk_in', 'paymentMethod', 'cash', 'lines', tests.latte(), 'pickupAt', null, 'delivery', null, 'useReward', false)) ->> 'total')::integer,
  12000,
  'a quote without customer, clientKey or consent works'
);
reset role;

-- ---------------------------------------------------------------------------
-- 2. Every line problem in one quote; place_order raises the first
-- ---------------------------------------------------------------------------

insert into tests.saved values ('p_bad', tests.payload(
  jsonb_build_array(
    tests.line('item_latte', 'var_latte', 1, '{opt_full}'),
    tests.line('item_mocha', 'var_mocha', 1),
    tests.line('item_latte', 'var_latte_old', 1, '{opt_half}'),
    tests.line('item_latte', 'var_latte', 1, '{opt_sold}'),
    tests.line('item_latte', 'var_latte', 1),
    tests.line('item_bread', 'var_bread', 5),
    tests.line('item_cortado', 'var_cortado', 1),
    tests.line('item_shirt', 'var_shirt', 1),
    tests.line('item_latte', 'var_latte', 1, '{opt_half,opt_half}'),
    tests.line('item_latte', 'var_latte', 1, '{opt_half,opt_shot,opt_oat,opt_full}')
  ),
  5
));

select tests.act_as_anon();
select lives_ok($$ insert into tests.saved values ('q_bad', tests.quote(tests.saved('p_bad'))) $$, 'a quote with bad lines still returns');
select throws_ok($$ select tests.place('o_bad', tests.saved('p_bad')) $$, 'P0001', 'item_unavailable', 'place_order raises the first problem');
reset role;

select is(
  (select jsonb_agg(jsonb_build_array(p -> 'lineIndex', p -> 'code')) from jsonb_array_elements(tests.saved('q_bad') -> 'problems') p),
  '[[1, "item_unavailable"], [2, "item_unavailable"], [3, "invalid_options"], [4, "invalid_options"], [5, "out_of_stock"], [6, "item_unavailable"], [7, "item_unavailable"], [8, "invalid_options"], [9, "invalid_options"]]'::jsonb,
  'hidden item, archived variant, sold-out add-on, missing choice, low stock, hidden category, other shop, repeated and too many add-ons'
);
select is(
  (select p ->> 'variantId' from jsonb_array_elements(tests.saved('q_bad') -> 'problems') p where (p ->> 'lineIndex')::integer = 5),
  tests.id('var_bread')::text,
  'a problem names its variant'
);
select is(
  (select jsonb_agg(l -> 'lineIndex') from jsonb_array_elements(tests.saved('q_bad') -> 'lines') l),
  '[0]'::jsonb,
  'only the good line is priced'
);
select is((tests.saved('q_bad') ->> 'total')::integer, 12000, 'the total counts the good lines only');

-- ---------------------------------------------------------------------------
-- 3. Two lines of one variant count together against stock (bread has 2 left)
-- ---------------------------------------------------------------------------

select tests.act_as_anon();
select is(
  tests.quote(tests.payload(jsonb_build_array(tests.line('item_bread', 'var_bread', 1), tests.line('item_bread', 'var_bread', 2)), 6)) -> 'problems',
  jsonb_build_array(jsonb_build_object('lineIndex', 1, 'code', 'out_of_stock', 'variantId', tests.id('var_bread'))),
  'the second line of the same variant runs out'
);
select lives_ok(
  $$ select tests.place('o_bread', tests.payload(jsonb_build_array(tests.line('item_bread', 'var_bread', 1), tests.line('item_bread', 'var_bread', 1)), 6)) $$,
  'two lines that fit together place'
);
select is(
  tests.quote(tests.payload(jsonb_build_array(tests.line('item_bread', 'var_bread', 1)), 6)) #>> '{problems,0,code}',
  'item_unavailable',
  'stock 0 reads as sold out'
);
reset role;
select is((select stock_on_hand from public.item_variants where id = tests.id('var_bread')), 0, 'both lines took stock');
select ok(not (select is_sold_out from public.item_variants where id = tests.id('var_bread')), 'the sold-out switch stays as the owner set it');

-- ---------------------------------------------------------------------------
-- 5. The same clientKey twice: one order, stock moved once
-- ---------------------------------------------------------------------------

insert into tests.saved values ('p_retry', tests.payload(jsonb_build_array(tests.line('item_cookie', 'var_cookie', 2)), 7));
select tests.act_as_anon();
select lives_ok($$ select tests.place('o_retry1', tests.saved('p_retry')) $$, 'first try');
select lives_ok($$ select tests.place('o_retry2', tests.saved('p_retry')) $$, 'retry with the same clientKey');
reset role;
select is(tests.saved('o_retry2'), tests.saved('o_retry1'), 'the retry returns the first order');
select is((select count(*) from public.orders where client_key = (tests.saved('p_retry') ->> 'clientKey')::uuid), 1::bigint, 'one order row');
select is((select stock_on_hand from public.item_variants where id = tests.id('var_cookie')), 8, 'stock moved once');
select is((select count(*) from public.customers where tenant_id = tests.id('shop_a') and phone = '+639170000007'), 1::bigint, 'one guest row per phone');

-- ---------------------------------------------------------------------------
-- 6. Payment rules, switches, open and busy, pickup time, delivery zones, reward, shape
-- ---------------------------------------------------------------------------

create function tests.quote_code(p_changes jsonb)
returns text
language plpgsql
volatile
as $$
begin
  perform public.quote_order('shop-a', tests.payload(tests.latte(), 8, p_changes));
  return 'ok';
exception when raise_exception then
  return sqlerrm;
end;
$$;
grant execute on function tests.quote_code(jsonb) to anon;

create function tests.delivery(p_zone uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object('fulfillment', 'delivery', 'delivery', jsonb_build_object('addressLine', '12 Rizal St', 'landmark', null, 'deliveryZoneId', p_zone))
$$;
grant execute on function tests.delivery(uuid) to anon;

create function tests.pickup_in(p_after interval)
returns jsonb
language sql
stable
as $$ select jsonb_build_object('fulfillment', 'pickup', 'paymentMethod', 'gcash', 'pickupAt', now() + p_after) $$;
grant execute on function tests.pickup_in(interval) to anon;

select tests.act_as_anon();
select is(tests.quote_code('{"paymentMethod": "gcash"}'), 'ok', 'walk-in may pay by GCash');
select is(tests.quote_code('{"paymentMethod": "maya"}'), 'payment_unavailable', 'a transfer needs an active account');
select is(tests.quote_code('{"paymentMethod": "cod"}'), 'payment_unavailable', 'COD is for delivery only');
select is(tests.quote_code('{"fulfillment": "pickup", "paymentMethod": "cash"}'), 'payment_unavailable', 'pickup pays first unless pay later is on');
select is(tests.quote_code('{"fulfillment": "pickup", "paymentMethod": "gcash"}'), 'ok', 'pickup by GCash');
select is(tests.quote_code(tests.delivery(tests.id('zone_near')) || '{"paymentMethod": "cod"}'), 'cod_not_allowed', 'COD needs the COD switch');
select is(tests.quote_code(tests.delivery(tests.id('zone_near')) || '{"paymentMethod": "cash"}'), 'payment_unavailable', 'delivery cannot pay cash at the counter');
select is(tests.quote_code(tests.delivery(null) || '{"paymentMethod": "gcash"}'), 'zone_required', 'delivery needs a zone');
select is(tests.quote_code(tests.delivery(tests.id('zone_off')) || '{"paymentMethod": "gcash"}'), 'zone_invalid', 'an inactive zone is refused');
select is(tests.quote_code(tests.delivery(tests.id('zone_b')) || '{"paymentMethod": "gcash"}'), 'zone_invalid', 'another shop''s zone is refused');
select is(
  (public.quote_order('shop-a', tests.payload(tests.latte(), 8, tests.delivery(tests.id('zone_near')) || '{"paymentMethod": "gcash"}')) ->> 'deliveryFee')::integer,
  5000, 'the fee comes from the zone'
);
select is(tests.quote_code('{"useReward": true}'), 'reward_unavailable', 'rewards come with members (P5.5)');
select is(tests.quote_code('{"lines": []}'), 'invalid', 'a cart needs lines');
select is(tests.quote_code('{"fulfillment": "dine_in"}'), 'invalid', 'an unknown fulfillment is invalid');
select is(tests.quote_code('{"pickupAt": "2026-01-01T00:00:00Z"}'), 'invalid', 'a pickup time only on pickup orders');
select is(tests.quote_code(jsonb_build_object('lines', jsonb_build_array(tests.line('item_latte', 'var_latte', 0, '{opt_half}')))), 'invalid', 'quantity at least 1');
select is(tests.quote_code(jsonb_build_object('lines', jsonb_build_array(jsonb_build_object('itemId', 'nope', 'variantId', 'nope', 'optionIds', '[]'::jsonb, 'qty', 1, 'note', null)))), 'invalid', 'ids must be uuids');
select throws_ok($$ select public.quote_order('no-such-shop', tests.payload(tests.latte(), 8)) $$, 'P0001', 'shop_not_found', 'an unknown shop is not found');
select throws_ok(
  $$ select public.place_order('shop-a', tests.payload(tests.latte(), 8, '{"privacyConsent": false}')) $$,
  'P0001', 'invalid', 'placing needs the privacy consent'
);
select throws_ok(
  $$ select public.place_order('shop-a', tests.payload(tests.latte(), 8, '{"customer": {"name": " ", "phone": "+639170000008", "email": null}}')) $$,
  'P0001', 'invalid', 'placing needs a name'
);
select throws_ok(
  $$ select public.place_order('shop-a', tests.payload(tests.latte(), 8, '{"customer": {"name": "X", "phone": "09170000008", "email": null}}')) $$,
  'P0001', 'invalid', 'placing needs a +639 phone'
);
select is(tests.quote_code(tests.pickup_in('5 minutes')), 'pickup_time_invalid', 'a pickup time at least 15 minutes ahead');
select is(tests.quote_code(tests.pickup_in('3 days')), 'pickup_time_invalid', 'a pickup time today or tomorrow');
select is(tests.quote_code(tests.pickup_in('1 hour')), 'ok', 'a pickup time an hour ahead');
reset role;

update public.shop_settings set pay_later_pickup = true, cod_enabled = true where tenant_id = tests.id('shop_a');
select tests.act_as_anon();
select is(tests.quote_code('{"fulfillment": "pickup", "paymentMethod": "cash"}'), 'ok', 'pay later at pickup when the switch is on');
select is(tests.quote_code(tests.delivery(tests.id('zone_near')) || '{"paymentMethod": "cod"}'), 'ok', 'COD when the switch is on');
reset role;

update public.shop_settings set delivery_fee_via_messenger = true where tenant_id = tests.id('shop_a');
select tests.act_as_anon();
select is(
  (public.quote_order('shop-a', tests.payload(tests.latte(), 8, tests.delivery(null) || '{"paymentMethod": "gcash"}')) ->> 'deliveryFee')::integer,
  0, 'no zone and no fee when the shop confirms the fee on Messenger'
);
reset role;

update public.shop_settings set walk_in_enabled = false where tenant_id = tests.id('shop_a');
select tests.act_as_anon();
select is(tests.quote_code('{}'), 'fulfillment_unavailable', 'walk-in switched off');
reset role;
update public.shop_settings set walk_in_enabled = true, accepting_orders = false where tenant_id = tests.id('shop_a');
select tests.act_as_anon();
select is(tests.quote_code('{}'), 'shop_closed', 'orders switched off');
reset role;
update public.shop_settings set accepting_orders = true, busy_until = now() + interval '10 minutes' where tenant_id = tests.id('shop_a');
select tests.act_as_anon();
select is(tests.quote_code('{}'), 'shop_busy', 'busy for now');
select is(tests.quote_code(tests.pickup_in('1 hour')), 'ok', 'a later pickup is fine while busy');
reset role;
update public.shop_settings set busy_until = null where tenant_id = tests.id('shop_a');
insert into public.closures (tenant_id, closed_on) values (tests.id('shop_a'), (now() at time zone 'Asia/Manila')::date);
select tests.act_as_anon();
select is(tests.quote_code('{}'), 'shop_closed', 'closed today');
select is(tests.quote_code(tests.pickup_in('1 day')), 'ok', 'a pickup tomorrow while closed today');
reset role;
delete from public.closures where tenant_id = tests.id('shop_a');
insert into public.closures (tenant_id, closed_on) values (tests.id('shop_a'), (now() at time zone 'Asia/Manila')::date + 1);
select tests.act_as_anon();
select is(tests.quote_code(tests.pickup_in('1 day')), 'pickup_time_invalid', 'no pickup on a closed day');
reset role;
delete from public.closures where tenant_id = tests.id('shop_a');
update public.shop_settings set pay_later_pickup = false, cod_enabled = false, delivery_fee_via_messenger = false where tenant_id = tests.id('shop_a');

-- ---------------------------------------------------------------------------
-- 7. Throttle: a 4th unpaid order from one phone in 30 minutes
-- ---------------------------------------------------------------------------

select tests.act_as_anon();
select lives_ok($$ select tests.place('t1', tests.payload(tests.latte(), 9)) $$, 'unpaid order 1');
select lives_ok($$ select tests.place('t2', tests.payload(tests.latte(), 9)) $$, 'unpaid order 2');
select lives_ok($$ select tests.place('t3', tests.payload(tests.latte(), 9)) $$, 'unpaid order 3');
select throws_ok($$ select tests.place('t4', tests.payload(tests.latte(), 9)) $$, 'P0001', 'rate_limited', 'the 4th unpaid order from one phone is refused');
reset role;

-- A member's row is never linked or changed from a guest checkout; a zero total is paid at once.
insert into public.customers (tenant_id, user_id, name, phone, member_since)
values (tests.id('shop_a'), tests.id('member'), 'Member Name', '+639170000010', now());
select tests.act_as_anon();
select lives_ok(
  $$ select tests.place('o_member', tests.payload(jsonb_build_array(tests.line('item_water', 'var_water', 1)), 10)) $$,
  'a guest checkout with a member''s phone'
);
reset role;
select is((tests.order_row('o_member')).customer_id, null, 'the order is not linked to the member');
select is((select name from public.customers where user_id = tests.id('member')), 'Member Name', 'the member''s name is unchanged');
select is((tests.order_row('o_member')).payment_status, 'paid', 'a zero total is paid at once');

-- ---------------------------------------------------------------------------
-- 8 and 9. Payment proofs: storage policy, path checks, one use per reference
-- ---------------------------------------------------------------------------

select tests.act_as_anon();
select lives_ok($$ select tests.place('g1', tests.payload(tests.latte(), 11, '{"paymentMethod": "gcash"}')) $$, 'a GCash order');
select lives_ok($$ select tests.place('g2', tests.payload(tests.latte(), 12, '{"paymentMethod": "gcash"}')) $$, 'another GCash order');
reset role;
select ok((tests.order_row('g1')).expires_at > now(), 'a transfer order expires unpaid');

insert into tests.saved values
  ('path1', to_jsonb(tests.proof_path('g1'))),
  ('path2', to_jsonb(tests.proof_path('g2'))),
  ('path_missing', to_jsonb(tests.proof_path('g2')));

select tests.act_as_anon();
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('payment-proofs', tests.saved('path1') #>> '{}') $$,
  'the receipt holder uploads a proof'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('payment-proofs', tests.saved('path2') #>> '{}') $$,
  'the second receipt holder uploads a proof'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('payment-proofs', tests.id('shop_a')::text || '/wrong-token/' || gen_random_uuid() || '.webp') $$,
  '42501', null, 'a stranger with the wrong token cannot upload'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('payment-proofs', (tests.order_row('n1')).tenant_id::text || '/' || (tests.order_row('n1')).token || '/x/' || gen_random_uuid() || '.webp') $$,
  '42501', null, 'no deeper folders'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('payment-proofs', (tests.order_row('o_member')).tenant_id::text || '/' || (tests.order_row('o_member')).token || '/' || gen_random_uuid() || '.webp') $$,
  '42501', null, 'no upload for a paid order'
);

select throws_ok(
  format($$ select public.submit_payment_proof(%L, 'gcash', '12', %L) $$, (tests.order_row('g1')).token, tests.saved('path1') #>> '{}'),
  'P0001', 'invalid', 'a reference needs 4 characters'
);
select throws_ok(
  format($$ select public.submit_payment_proof(%L, 'maya', '1234 567 890', %L) $$, (tests.order_row('g1')).token, tests.saved('path1') #>> '{}'),
  'P0001', 'payment_unavailable', 'a proof needs an active account of that method'
);
select throws_ok(
  format($$ select public.submit_payment_proof(%L, 'gcash', '1234 567 890', %L) $$, (tests.order_row('g1')).token, tests.saved('path2') #>> '{}'),
  'P0001', 'invalid', 'a proof must sit under this order''s folder'
);
select throws_ok(
  format($$ select public.submit_payment_proof(%L, 'gcash', '1234 567 890', %L) $$, (tests.order_row('g2')).token, tests.saved('path_missing') #>> '{}'),
  'P0001', 'proof_missing', 'the proof file must exist'
);
select lives_ok(
  format($$ insert into tests.saved values ('pay1', public.submit_payment_proof(%L, 'gcash', '1234 567 890', %L)) $$, (tests.order_row('g1')).token, tests.saved('path1') #>> '{}'),
  'the first proof is accepted'
);
select throws_ok(
  format($$ select public.submit_payment_proof(%L, 'gcash', '1234-567890', %L) $$, (tests.order_row('g2')).token, tests.saved('path2') #>> '{}'),
  'P0001', 'duplicate_reference', 'the same reference in this shop, spaces and dashes ignored'
);
select throws_ok(
  format($$ select public.submit_payment_proof(%L, 'gcash', '9999 0000', %L) $$, (tests.order_row('g1')).token, tests.saved('path1') #>> '{}'),
  'P0001', 'order_not_payable', 'an order waiting for its check takes no second proof'
);
reset role;

select is(tests.saved('pay1') ->> 'status', 'pending', 'the payment waits for the owner');
select is(tests.saved('pay1') -> 'referenceNorm', 'null'::jsonb, 'the normalised reference is not returned');
select is((select reference_norm from public.payments where id = (tests.saved('pay1') ->> 'id')::uuid), '1234567890', 'the reference is stored normalised');
select is((tests.order_row('g1')).payment_status, 'pending', 'the order''s payment is pending');
select is((tests.order_row('g1')).expires_at, null, 'a submitted proof stops the expiry');
select is(
  (select count(*) from public.order_events e where e.order_id = (tests.order_row('g1')).id and e.kind = 'payment_submitted' and e.to_status is null and e.actor = 'customer'),
  1::bigint, 'a payment_submitted event by the customer'
);

-- After the owner rejects the first proof (P5.4 does this; here by hand) the reference is free again.
update public.payments set status = 'rejected' where id = (tests.saved('pay1') ->> 'id')::uuid;
select tests.act_as_anon();
select lives_ok(
  format($$ select public.submit_payment_proof(%L, 'gcash', '1234-567890', %L) $$, (tests.order_row('g2')).token, tests.saved('path2') #>> '{}'),
  'a rejected reference can be used again'
);
reset role;

-- At most 3 proofs per order.
insert into public.payments (tenant_id, order_id, method, amount, status, reference_no, reference_norm, proof_path)
select o.tenant_id, o.id, 'gcash', o.total, 'rejected', 'REF' || n, 'REF' || n, o.tenant_id::text || '/' || o.token || '/old' || n || '.webp'
from tests.order_row('t1') o, generate_series(1, 3) n;
update public.orders set payment_method = 'gcash' where id = (tests.order_row('t1')).id;
insert into tests.saved values ('path_t1', to_jsonb(tests.proof_path('t1')));
select tests.act_as_anon();
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('payment-proofs', tests.saved('path_t1') #>> '{}') $$, 'upload for t1');
select throws_ok(
  format($$ select public.submit_payment_proof(%L, 'gcash', 'NEW-REF-1', %L) $$, (tests.order_row('t1')).token, tests.saved('path_t1') #>> '{}'),
  'P0001', 'too_many_proofs', 'a 4th proof is refused'
);
reset role;

-- Proof files: the shop's owners read them; another shop's owner and visitors do not.
select tests.act_as(tests.id('a'));
select is((select count(*) from storage.objects where bucket_id = 'payment-proofs'), 3::bigint, 'owner A sees shop A''s proofs');
reset role;
select tests.act_as(tests.id('b'));
select is((select count(*) from storage.objects where bucket_id = 'payment-proofs'), 0::bigint, 'owner B sees none of them');
reset role;
select tests.act_as_anon();
select is((select count(*) from storage.objects where bucket_id = 'payment-proofs'), 0::bigint, 'a visitor lists no proofs');
reset role;

-- ---------------------------------------------------------------------------
-- The receipt
-- ---------------------------------------------------------------------------

select tests.act_as_anon();
select lives_ok(
  format($$ insert into tests.saved values ('receipt', public.get_order(%L)) $$, (tests.order_row('g2')).token),
  'a visitor with the link reads the receipt'
);
select throws_ok($$ select public.get_order('no-such-token-at-all') $$, 'P0001', 'not_found', 'an unknown token is not found');
reset role;
select is(
  (select array_agg(key order by key) from jsonb_object_keys(tests.saved('receipt')) key),
  array['events', 'lines', 'order', 'payments'],
  'the receipt has the OrderReceipt keys'
);
select is(tests.saved('receipt') #>> '{order,paymentStatus}', 'pending', 'the receipt shows the payment status');
select is(
  (select jsonb_agg(e -> 'kind') from jsonb_array_elements(tests.saved('receipt') -> 'events') e),
  '["status", "payment_submitted"]'::jsonb,
  'events oldest first'
);
select is(tests.saved('receipt') #> '{payments,0,referenceNorm}', 'null'::jsonb, 'no normalised reference on the receipt');
select is(jsonb_array_length(tests.saved('receipt') -> 'lines'), 1, 'the receipt has the lines');

-- ---------------------------------------------------------------------------
-- 10. Row-level security on the order tables
-- ---------------------------------------------------------------------------

select tests.act_as_anon();
select throws_ok($$ select count(*) from public.orders $$, '42501', null, 'a visitor cannot read orders');
select throws_ok($$ select count(*) from public.customers $$, '42501', null, 'a visitor cannot read customers');
select throws_ok($$ select count(*) from public.payments $$, '42501', null, 'a visitor cannot read payments');
reset role;

-- Shop B gets one order so the cross-shop checks mean something.
select tests.act_as_anon();
select lives_ok(
  $$ insert into tests.saved values ('o_b', public.place_order('shop-b', tests.payload(jsonb_build_array(tests.line('item_shirt', 'var_shirt', 1)), 1))) $$,
  'an order in shop B'
);
reset role;
select is((tests.saved('o_b') ->> 'orderNo')::integer, 1, 'shop B numbers its own orders');

select tests.act_as(tests.id('a'));
select ok((select count(*) from public.orders) > 0, 'owner A reads shop A''s orders');
select is((select count(*) from public.orders where tenant_id = tests.id('shop_b')), 0::bigint, 'owner A cannot see shop B''s orders');
select is((select count(*) from public.order_items where tenant_id = tests.id('shop_b')), 0::bigint, 'nor its lines');
select is((select count(*) from public.customers where tenant_id = tests.id('shop_b')), 0::bigint, 'nor its customers');
select throws_ok(
  $$ insert into public.orders (tenant_id, order_no, business_date, token, fulfillment, payment_method, customer_name, customer_phone, subtotal, total, client_key)
     values (tests.id('shop_a'), 99, current_date, 'handmade-token-0001', 'walk_in', 'cash', 'X', '+639170000099', 0, 0, gen_random_uuid()) $$,
  '42501', null, 'owners cannot insert orders directly'
);
select throws_ok($$ update public.orders set status = 'completed' $$, '42501', null, 'owners cannot update orders directly');
select throws_ok($$ select count(*) from public.order_counters $$, '42501', null, 'nobody reads the counters');
select throws_ok($$ delete from public.items where id = tests.id('item_latte') $$, 'P0001', 'item_has_orders', 'a product with orders is archived, not deleted');
select lives_ok($$ update public.customers set notes = 'Regular', tags = '{vip}' where tenant_id = tests.id('shop_a') $$, 'owner A notes and tags a customer');
select throws_ok($$ update public.customers set name = 'Changed' $$, '42501', null, 'owners change only notes and tags');
reset role;
select ok((select count(*) from public.customers where notes = 'Regular') > 0, 'the note is saved');

select tests.act_as(tests.id('b'));
update public.customers set notes = 'hijack' where tenant_id = tests.id('shop_a');
reset role;
select is((select count(*) from public.customers where notes = 'hijack'), 0::bigint, 'owner B cannot note shop A''s customers');

-- ---------------------------------------------------------------------------
-- 11. Live updates
-- ---------------------------------------------------------------------------

select has_trigger('public', 'orders', 'orders_broadcast', 'orders has the broadcast trigger');
select has_function('private', 'broadcast_order', 'the broadcast function exists');
-- realtime.send writes to today's realtime.messages partition when the local stack has created it.
select ok(
  to_regclass('realtime.messages_' || to_char(now() at time zone 'utc', 'YYYY_MM_DD')) is null
  or exists (select 1 from realtime.messages m where m.topic = 'order:' || (tests.order_row('g1')).token and not m.private and m.event = 'order_changed'),
  'a receipt message on the public order topic'
);
select ok(
  to_regclass('realtime.messages_' || to_char(now() at time zone 'utc', 'YYYY_MM_DD')) is null
  or exists (
    select 1 from realtime.messages m
    where m.topic = 'shop:' || tests.id('shop_a') and m.private and m.payload ->> 'orderId' = tests.saved('g1') ->> 'orderId'
  ),
  'a dashboard message on the private shop topic'
);
select ok(
  exists (select 1 from pg_policies where schemaname = 'realtime' and tablename = 'messages' and policyname = 'shop_topic_select_member'),
  'only shop members may join the shop topic'
);

-- Deleting a whole shop is not blocked by its order lines.
select lives_ok($$ delete from public.tenants where id = tests.id('shop_b') $$, 'a shop with orders can still be deleted');

select * from finish();
rollback;
