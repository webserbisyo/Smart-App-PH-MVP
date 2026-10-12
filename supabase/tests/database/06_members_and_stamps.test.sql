-- P5.5: members and stamps. join_as_member and its linking rule (decision P5-10), the welcome stamp (P5-16), earning
-- on completion, the reward in quote_order and place_order, stamps coming back on cancel and expiry (P5-11),
-- get_my_account, RLS on the new tables and get_storefront's stamp card and member count. Shop A is open all day and
-- takes cash and GCash; shop B is another active shop.
create extension if not exists pgtap with schema extensions;

begin;
select * from no_plan();

-- ---------------------------------------------------------------------------
-- Helpers (kept in this file, rolled back with it)
-- ---------------------------------------------------------------------------

create schema tests;
grant usage on schema tests to anon, authenticated;

-- A login; p_confirmed false leaves the email unverified.
create function tests.create_user(p_email text, p_confirmed boolean default true)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at
  ) values (
    v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
    case when p_confirmed then now() end, '{}'::jsonb, '{}'::jsonb, now(), now()
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

create table tests.saved (name text primary key, body jsonb);
grant select, insert on tests.saved to anon, authenticated;

create function tests.saved(p_name text)
returns jsonb
language sql
stable
as $$ select body from tests.saved where name = p_name $$;

create function tests.payload(p_variant text, p_qty integer, p_phone text, p_changes jsonb default '{}')
returns jsonb
language sql
volatile
security definer
as $$
  select jsonb_build_object(
    'clientKey', gen_random_uuid(),
    'fulfillment', 'walk_in',
    'paymentMethod', 'cash',
    'customer', jsonb_build_object('name', 'Guest', 'phone', p_phone, 'email', null),
    'lines', jsonb_build_array(jsonb_build_object(
      'itemId', (select v.item_id from public.item_variants v where v.id = tests.id(p_variant)),
      'variantId', tests.id(p_variant), 'qty', p_qty, 'note', null, 'optionIds', '[]'::jsonb
    )),
    'pickupAt', null,
    'delivery', null,
    'notes', null,
    'useReward', false,
    'privacyConsent', true
  ) || p_changes
$$;

-- Places an order in shop A as a visitor (p_user null) or as a signed-in customer and saves it under p_name.
create function tests.place(p_name text, p_payload jsonb, p_user uuid default null)
returns uuid
language plpgsql
volatile
as $$
declare
  v_result jsonb;
begin
  if p_user is null then
    perform tests.act_as_anon();
  else
    perform tests.act_as(p_user);
  end if;
  v_result := public.place_order('shop-a', p_payload);
  execute 'reset role';
  insert into tests.saved values (p_name, v_result);
  return (v_result ->> 'orderId')::uuid;
end;
$$;

create function tests.quote(p_payload jsonb, p_user uuid)
returns jsonb
language plpgsql
volatile
as $$
declare
  v_result jsonb;
begin
  perform tests.act_as(p_user);
  v_result := public.quote_order('shop-a', p_payload);
  execute 'reset role';
  return v_result;
end;
$$;

create function tests.order_id(p_name text)
returns uuid
language sql
stable
as $$ select (tests.saved(p_name) ->> 'orderId')::uuid $$;

create function tests.token(p_name text)
returns text
language sql
stable
as $$ select tests.saved(p_name) ->> 'token' $$;

create function tests.order_row(p_name text)
returns public.orders
language sql
stable
security definer
as $$ select * from public.orders where id = tests.order_id(p_name) $$;

-- Shop A's owner takes the order from placed to completed (marking it paid first when needed).
create function tests.complete(p_name text)
returns void
language plpgsql
volatile
as $$
declare
  v_order uuid := tests.order_id(p_name);
begin
  perform tests.act_as(tests.id('a'));
  if (select o.payment_status from public.orders o where o.id = v_order) <> 'paid' then
    perform public.record_payment(v_order, 'cash');
  end if;
  perform public.advance_order(v_order, 'preparing', null);
  perform public.advance_order(v_order, 'ready', null);
  perform public.advance_order(v_order, 'completed', null);
  execute 'reset role';
end;
$$;

create function tests.join(p_user uuid, p_phone text, p_token text, p_slug text default 'shop-a')
returns jsonb
language plpgsql
volatile
as $$
declare
  v_result jsonb;
begin
  perform tests.act_as(p_user);
  v_result := public.join_as_member(p_slug, 'Member', p_phone, p_token);
  execute 'reset role';
  return v_result;
end;
$$;

create function tests.account(p_user uuid)
returns jsonb
language plpgsql
volatile
as $$
declare
  v_result jsonb;
begin
  perform tests.act_as(p_user);
  v_result := public.get_my_account('shop-a');
  execute 'reset role';
  return v_result;
end;
$$;

create function tests.customer(p_phone text)
returns uuid
language sql
stable
security definer
as $$ select id from public.customers where tenant_id = tests.id('shop_a') and phone = p_phone $$;

create function tests.balance(p_customer uuid)
returns integer
language sql
stable
security definer
as $$ select coalesce(sum(delta), 0)::integer from public.loyalty_ledger where customer_id = p_customer $$;

create function tests.ledger_count(p_customer uuid, p_reason text)
returns integer
language sql
stable
security definer
as $$ select count(*)::integer from public.loyalty_ledger where customer_id = p_customer and reason = p_reason $$;

create function tests.order_ledger(p_name text, p_reason text)
returns integer
language sql
stable
security definer
as $$
  select count(*)::integer from public.loyalty_ledger where order_id = tests.order_id(p_name) and reason = p_reason
$$;

create function tests.set_rule(p_active boolean)
returns void
language sql
volatile
security definer
as $$ update public.loyalty_rules set is_active = p_active where tenant_id = tests.id('shop_a') $$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Shops A and B, members m1 to m5
-- ---------------------------------------------------------------------------

insert into tests.ids values
  ('a', tests.create_user('owner-a@example.com')),
  ('b', tests.create_user('owner-b@example.com')),
  ('m1', tests.create_user('m1@example.com')),
  ('m2', tests.create_user('m2@example.com')),
  ('m3', tests.create_user('m3@example.com')),
  ('m4', tests.create_user('m4@example.com', false)),
  ('m5', tests.create_user('m5@example.com'));

select tests.act_as(tests.id('a'));
select public.create_my_shop('food', 'Shop A', 'shop-a');
reset role;
select tests.act_as(tests.id('b'));
select public.create_my_shop('retail', 'Shop B', 'shop-b');
reset role;

insert into tests.ids
select 'shop_' || replace(t.slug, 'shop-', ''), t.id from public.tenants t where t.slug in ('shop-a', 'shop-b');
update public.tenants set status = 'active' where slug in ('shop-a', 'shop-b');
update public.business_hours set opens_at = '00:00', closes_at = '24:00' where tenant_id = tests.id('shop_a');
insert into public.payment_accounts (tenant_id, method, account_name, account_number, is_active)
values (tests.id('shop_a'), 'gcash', 'Shop A GCash', '0917 000 0001', true);

with i as (
  insert into public.items (tenant_id, name, status, track_stock) values
    (tests.id('shop_a'), 'Bread', 'active', false),
    (tests.id('shop_a'), 'Latte', 'active', false)
  returning name, id
)
insert into tests.ids select 'item_' || lower(name), id from i;
with v as (
  insert into public.item_variants (tenant_id, item_id, name, price) values
    (tests.id('shop_a'), tests.id('item_bread'), 'Piece', 5000),
    (tests.id('shop_a'), tests.id('item_latte'), 'Regular', 12000)
  returning item_id, id
)
insert into tests.ids select 'var_' || replace(t.name, 'item_', ''), v.id from v join tests.ids t on t.id = v.item_id;

-- ---------------------------------------------------------------------------
-- 0. Every shop has a stamp card, off at first; the owner turns it on with a plain update
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::integer from public.loyalty_rules where tenant_id in (tests.id('shop_a'), tests.id('shop_b')) and not is_active),
  2, 'a new shop gets a stamp card that is off'
);

select tests.act_as(tests.id('a'));
update public.loyalty_rules set is_active = true, stamps_needed = 3, reward_amount = 10000, min_order_total = 10000
where tenant_id = tests.id('shop_a');
select ok((select is_active from public.loyalty_rules where tenant_id = tests.id('shop_a')), 'the owner turns the stamp card on');
select throws_ok(
  format($$ update public.loyalty_rules set tenant_id = %L where tenant_id = %L $$, tests.id('shop_b'), tests.id('shop_a')),
  '42501', null, 'the owner cannot move the stamp card to another shop'
);
select throws_ok(
  format($$ insert into public.loyalty_ledger (tenant_id, customer_id, delta, reason) values (%L, gen_random_uuid(), 5, 'manual') $$, tests.id('shop_a')),
  '42501', null, 'the owner cannot write stamps'
);
reset role;

select tests.act_as(tests.id('b'));
update public.loyalty_rules set stamps_needed = 1 where tenant_id = tests.id('shop_a');
reset role;
select is((select stamps_needed from public.loyalty_rules where tenant_id = tests.id('shop_a')), 3, 'owner B cannot change shop A''s card');

-- ---------------------------------------------------------------------------
-- 3. Earning (guests too)
-- ---------------------------------------------------------------------------

select tests.place('g1', tests.payload('var_latte', 1, '+639171110001'));
select tests.complete('g1');
select is(tests.order_ledger('g1', 'earned'), 1, 'a completed order at the minimum earns 1 stamp, for a guest too');
select is(tests.balance(tests.customer('+639171110001')), 1, 'the guest row holds the stamp');

select tests.place('below', tests.payload('var_bread', 1, '+639171110001'));
select tests.complete('below');
select is(tests.order_ledger('below', 'earned'), 0, 'an order below the minimum earns nothing');

select tests.set_rule(false);
select tests.place('off', tests.payload('var_latte', 1, '+639171110009'));
select tests.complete('off');
select is(tests.order_ledger('off', 'earned'), 0, 'nothing is earned while the stamp card is off');
select tests.set_rule(true);

select tests.act_as(tests.id('a'));
select throws_ok(
  format($$ select public.advance_order(%L, 'completed', null) $$, tests.order_id('g1')),
  'P0001', 'invalid_transition', 'a completed order cannot complete again'
);
reset role;
select is(tests.order_ledger('g1', 'earned'), 1, 'the same order never earns twice');
select throws_ok(
  format($$ insert into public.loyalty_ledger (tenant_id, customer_id, order_id, delta, reason) values (%L, %L, %L, 1, 'earned') $$,
    tests.id('shop_a'), tests.customer('+639171110001'), tests.order_id('g1')),
  '23505', null, 'the ledger refuses a second earned row for one order'
);
select throws_ok(
  format($$ update public.loyalty_ledger set delta = 9 where order_id = %L $$, tests.order_id('g1')),
  'P0001', 'invalid', 'ledger rows are never changed'
);

-- ---------------------------------------------------------------------------
-- 1. Linking a guest row needs proof
-- ---------------------------------------------------------------------------

select tests.place('other', tests.payload('var_bread', 1, '+639171110002'));
-- An order in shop B with the same phone.
insert into public.customers (tenant_id, name, phone) values (tests.id('shop_b'), 'Guest', '+639171110001');
insert into public.orders (
  tenant_id, order_no, business_date, token, fulfillment, payment_method, customer_name, customer_phone, subtotal, total,
  client_key
) values (
  tests.id('shop_b'), 1, (now() at time zone 'Asia/Manila')::date, 'shopBtoken000000000', 'walk_in', 'cash', 'Guest',
  '+639171110001', 1000, 1000, gen_random_uuid()
);

select throws_ok($$ select tests.join(tests.id('m1'), '+639171110001', null) $$, 'P0001', 'phone_needs_order', 'no token and no email match: phone_needs_order');
select throws_ok(
  format($$ select tests.join(tests.id('m1'), '+639171110001', %L) $$, tests.token('other')),
  'P0001', 'phone_needs_order', 'a token of someone else''s order is no proof'
);
select throws_ok(
  $$ select tests.join(tests.id('m1'), '+639171110001', 'shopBtoken000000000') $$,
  'P0001', 'phone_needs_order', 'a token from another shop is no proof'
);
select is(tests.ledger_count(tests.customer('+639171110001'), 'welcome'), 0, 'a refused join gives no welcome stamp');

select lives_ok(
  format($$ select tests.join(tests.id('m1'), '+639171110001', %L) $$, tests.token('g1')),
  'the token of an order placed with this phone links the guest row'
);
select is(
  (select user_id from public.customers where id = tests.customer('+639171110001')), tests.id('m1'),
  'the guest row now belongs to the login'
);
select ok((select member_since is not null from public.customers where id = tests.customer('+639171110001')), 'member_since is set');

select throws_ok(
  format($$ select tests.join(tests.id('m2'), '+639171110001', %L) $$, tests.token('g1')),
  'P0001', 'phone_in_use', 'a phone that belongs to another login: phone_in_use'
);

select throws_ok(
  $$ select set_config('request.jwt.claims', '{"role": "authenticated"}', true), public.join_as_member('shop-a', 'X', '+639171110003', null) $$,
  'P0001', 'not_signed_in', 'joining needs a login'
);
reset role;
select tests.act_as_anon();
select throws_ok($$ select public.join_as_member('shop-a', 'X', '+639171110003', null) $$, '42501', null, 'anon cannot call join_as_member');
reset role;

-- 2. An email match links without a token; an unverified email does not.
insert into public.customers (tenant_id, name, phone, email) values (tests.id('shop_a'), 'Guest', '+639171110003', 'm3@example.com');
insert into public.customers (tenant_id, name, phone, email) values (tests.id('shop_a'), 'Guest', '+639171110004', 'm4@example.com');
select lives_ok($$ select tests.join(tests.id('m3'), '+639171110003', null) $$, 'the login''s verified email matching the guest row links it');
select is((select user_id from public.customers where id = tests.customer('+639171110003')), tests.id('m3'), 'the email-matched row belongs to m3');
select throws_ok($$ select tests.join(tests.id('m4'), '+639171110004', null) $$, 'P0001', 'phone_needs_order', 'an unverified email is no proof');

-- No row with this phone: a new member.
select lives_ok($$ select tests.join(tests.id('m2'), '+639171110005', null) $$, 'a new phone makes a new member row');

-- ---------------------------------------------------------------------------
-- 6. Welcome stamp
-- ---------------------------------------------------------------------------

select is(tests.ledger_count(tests.customer('+639171110001'), 'welcome'), 1, 'joining with the card on adds one welcome stamp');
select is(
  (select delta from public.loyalty_ledger where customer_id = tests.customer('+639171110001') and reason = 'welcome'), 1,
  'the welcome stamp is +1'
);
select is(
  (tests.join(tests.id('m1'), '+639171110008', null) -> 'customer' ->> 'id')::uuid, tests.customer('+639171110001'),
  'joining again, even with another phone, returns the same account'
);
select is(tests.ledger_count(tests.customer('+639171110001'), 'welcome'), 1, 'joining again adds no welcome stamp');
select is(tests.customer('+639171110008'), null, 'joining again creates no row for the other phone');
select throws_ok(
  format($$ insert into public.loyalty_ledger (tenant_id, customer_id, delta, reason) values (%L, %L, 1, 'welcome') $$,
    tests.id('shop_a'), tests.customer('+639171110001')),
  '23505', null, 'a second welcome row for the same member fails'
);

select tests.set_rule(false);
select lives_ok($$ select tests.join(tests.id('m5'), '+639171110006', null) $$, 'joining while the card is off works');
select is(tests.ledger_count(tests.customer('+639171110006'), 'welcome'), 0, 'joining while the card is off gives no welcome stamp');
select tests.set_rule(true);

-- ---------------------------------------------------------------------------
-- 5. A guest's stamps show after linking; get_my_account
-- ---------------------------------------------------------------------------

select is((tests.account(tests.id('m1')) ->> 'stamps')::integer, 2, 'the linked guest stamp and the welcome stamp both count');
select ok(
  tests.account(tests.id('m1')) -> 'history' @> '[{"reason": "welcome", "delta": 1}]'::jsonb
    and tests.account(tests.id('m1')) -> 'history' @> '[{"reason": "earned"}]'::jsonb,
  'the history shows the welcome and the earned stamp'
);
select ok(
  tests.account(tests.id('m1')) -> 'orders' @> jsonb_build_array(jsonb_build_object('id', tests.order_id('g1'))),
  'the guest orders come along'
);
select is(tests.account(tests.id('m1')) ->> 'rewardReady', 'false', 'the reward is not ready at 2 of 3');
select is(tests.account(tests.id('m1')) -> 'customer' ->> 'notes', null, 'the owner''s notes are never in the account');
select is(tests.account(tests.id('b')), null, 'signed in but not a member here: null');
select throws_ok(
  $$ select set_config('request.jwt.claims', '{"role": "authenticated"}', true), public.get_my_account('shop-a') $$,
  'P0001', 'not_signed_in', 'get_my_account needs a login'
);
reset role;

-- ---------------------------------------------------------------------------
-- 4. Reward
-- ---------------------------------------------------------------------------

select throws_ok(
  format($$ select tests.quote(%L, tests.id('m1')) $$, tests.payload('var_latte', 1, '+639171110001', '{"useReward": true}')),
  'P0001', 'reward_unavailable', 'not enough stamps: reward_unavailable'
);
select tests.act_as_anon();
select throws_ok(
  format($$ select public.quote_order('shop-a', %L) $$, tests.payload('var_latte', 1, '+639171110001', '{"useReward": true}')),
  'P0001', 'reward_unavailable', 'a visitor gets no reward'
);
reset role;

-- A member's own order goes on their row and earns the third stamp.
select tests.place('m1_order', tests.payload('var_latte', 1, '+639171110001'), tests.id('m1'));
select is((tests.order_row('m1_order')).customer_id, tests.customer('+639171110001'), 'a member''s order goes on their member row');
select tests.complete('m1_order');
select is(tests.balance(tests.customer('+639171110001')), 3, 'the member reaches 3 stamps');
select is(tests.account(tests.id('m1')) ->> 'rewardReady', 'true', 'the reward is ready');

select is(
  tests.quote(tests.payload('var_latte', 2, '+639171110001', '{"useReward": true}'), tests.id('m1'))
    - 'lines' - 'problems',
  '{"subtotal": 24000, "discountTotal": 10000, "deliveryFee": 0, "total": 14000, "rewardApplied": true}'::jsonb,
  'the quote applies the reward'
);
select tests.place('redeem', tests.payload('var_latte', 2, '+639171110001', '{"useReward": true}'), tests.id('m1'));
select is(
  format('%s/%s', (tests.order_row('redeem')).discount_total, (tests.order_row('redeem')).total), '10000/14000',
  'placing applies the same discount'
);
select is(
  (select delta from public.loyalty_ledger where order_id = tests.order_id('redeem') and reason = 'redeemed'), -3,
  'placing writes -3 redeemed'
);
select is(tests.balance(tests.customer('+639171110001')), 0, 'the balance is spent');
select throws_ok(
  format($$ select tests.place('again', %L, tests.id('m1')) $$, tests.payload('var_latte', 1, '+639171110001', '{"useReward": true}')),
  'P0001', 'reward_unavailable', 'a spent balance cannot pay for a second order'
);

-- Cancel gives the stamps back, once.
select tests.act_as(tests.id('a'));
select public.cancel_order(tests.order_id('redeem'), 'Out of milk');
select throws_ok(
  format($$ select public.cancel_order(%L, 'Again') $$, tests.order_id('redeem')),
  'P0001', 'invalid_transition', 'a cancelled order cannot be cancelled again'
);
reset role;
select is(tests.order_ledger('redeem', 'reversed'), 1, 'cancelling gives the stamps back once');
select is(tests.balance(tests.customer('+639171110001')), 3, 'the balance is back to 3');

-- The discount never exceeds the subtotal.
update public.loyalty_rules set reward_amount = 50000 where tenant_id = tests.id('shop_a');
select is(
  tests.quote(tests.payload('var_bread', 1, '+639171110001', '{"useReward": true}'), tests.id('m1')) - 'lines' - 'problems',
  '{"subtotal": 5000, "discountTotal": 5000, "deliveryFee": 0, "total": 0, "rewardApplied": true}'::jsonb,
  'the discount stops at the subtotal'
);
update public.loyalty_rules set reward_amount = 10000 where tenant_id = tests.id('shop_a');

-- An expired GCash order gives the stamps back, once.
select tests.place(
  'expire', tests.payload('var_latte', 1, '+639171110001', '{"useReward": true, "paymentMethod": "gcash"}'), tests.id('m1')
);
select is(tests.balance(tests.customer('+639171110001')), 0, 'the GCash order spent the stamps');
update public.orders set expires_at = now() - interval '1 minute' where id = tests.order_id('expire');
select private.expire_unpaid_orders();
select private.expire_unpaid_orders();
select is((tests.order_row('expire')).status, 'expired', 'the unpaid GCash order expired');
select is(tests.order_ledger('expire', 'reversed'), 1, 'expiry gives the stamps back once');
select is(tests.balance(tests.customer('+639171110001')), 3, 'the balance is back to 3 again');

-- ---------------------------------------------------------------------------
-- 7. Who reads what
-- ---------------------------------------------------------------------------

select tests.act_as(tests.id('m1'));
select ok((select count(*) from public.loyalty_ledger) > 0, 'a member reads their own stamps');
select is(
  (select count(*)::integer from public.loyalty_ledger where customer_id <> tests.customer('+639171110001')), 0,
  'a member reads no one else''s stamps'
);
select is((select stamps from public.customer_stamp_balances), 3, 'a member reads their own balance');
select is((select count(*)::integer from public.customers), 0, 'a member reads no customer rows (their account comes from get_my_account)');
insert into public.customer_addresses (tenant_id, customer_id, label, address_line)
values (tests.id('shop_a'), tests.customer('+639171110001'), 'Home', '12 Rizal St.');
insert into public.customer_addresses (tenant_id, customer_id, label, address_line, is_default)
values (tests.id('shop_a'), tests.customer('+639171110001'), 'Work', '1 Ayala Ave.', true);
select is(
  (select label from public.customer_addresses where is_default), 'Work',
  'a new default address replaces the old default'
);
select is((select count(*)::integer from public.customer_addresses where is_default), 1, 'one default address');
insert into public.customer_addresses (tenant_id, customer_id, address_line)
select tests.id('shop_a'), tests.customer('+639171110001'), 'Extra ' || n from generate_series(1, 3) as n;
select throws_ok(
  format($$ insert into public.customer_addresses (tenant_id, customer_id, address_line) values (%L, %L, 'Sixth') $$,
    tests.id('shop_a'), tests.customer('+639171110001')),
  'P0001', 'invalid', 'at most 5 addresses'
);
reset role;

select tests.act_as(tests.id('m2'));
select is((select count(*)::integer from public.customer_addresses), 0, 'member B reads none of member A''s addresses');
select is(
  (select count(*)::integer from public.loyalty_ledger where customer_id <> tests.customer('+639171110005')), 0,
  'member B reads none of member A''s stamps'
);
select is((select count(*)::integer from public.customers), 0, 'member B reads no customer rows');
select throws_ok(
  format($$ insert into public.customer_addresses (tenant_id, customer_id, address_line) values (%L, %L, 'Not mine') $$,
    tests.id('shop_a'), tests.customer('+639171110003')),
  '42501', null, 'member B cannot add an address to another member'
);
update public.customer_addresses set address_line = 'Taken' where customer_id = tests.customer('+639171110001');
delete from public.customer_addresses where customer_id = tests.customer('+639171110001');
reset role;
select is(
  (select count(*)::integer from public.customer_addresses where customer_id = tests.customer('+639171110001') and address_line <> 'Taken'),
  5, 'member B cannot change or delete member A''s addresses'
);

select tests.act_as(tests.id('a'));
select ok((select count(*) from public.loyalty_ledger) > 0, 'owner A reads shop A''s stamps');
select ok((select count(*) from public.customer_addresses) = 5, 'owner A reads shop A''s addresses');
select ok((select count(*) from public.customer_stamp_balances) > 0, 'owner A reads shop A''s balances');
reset role;

select tests.act_as(tests.id('b'));
select is(
  (select count(*)::integer from public.loyalty_ledger where tenant_id = tests.id('shop_a')), 0, 'owner B reads none of shop A''s stamps'
);
select is(
  (select count(*)::integer from public.customer_addresses where tenant_id = tests.id('shop_a')), 0,
  'owner B reads none of shop A''s addresses'
);
select is(
  (select count(*)::integer from public.customers where tenant_id = tests.id('shop_a')), 0, 'owner B reads none of shop A''s members'
);
reset role;

select tests.act_as_anon();
select throws_ok($$ select count(*) from public.loyalty_ledger $$, '42501', null, 'anon reads no stamps');
select throws_ok($$ select count(*) from public.customer_addresses $$, '42501', null, 'anon reads no addresses');
select throws_ok($$ select count(*) from public.loyalty_rules $$, '42501', null, 'anon reads no stamp card rows');
select throws_ok($$ select count(*) from public.customer_stamp_balances $$, '42501', null, 'anon reads no balances');
select throws_ok($$ select public.get_my_account('shop-a') $$, '42501', null, 'anon cannot call get_my_account');
select throws_ok($$ select private.storefront_base('shop-a') $$, '42501', null, 'anon cannot call the storefront base');
reset role;

-- ---------------------------------------------------------------------------
-- 8. get_storefront: the stamp card and the member count
-- ---------------------------------------------------------------------------

select tests.act_as_anon();
select is((public.get_storefront('shop-a') ->> 'memberCount')::integer, 4, 'the storefront counts the members');
select is((public.get_storefront('shop-a') -> 'stampRule' ->> 'stampsNeeded')::integer, 3, 'the storefront shows the active stamp card');
select is(public.get_storefront('shop-b') -> 'stampRule', 'null'::jsonb, 'a card that is off is not shown');
reset role;
update public.shop_settings set show_member_count = false where tenant_id = tests.id('shop_a');
select tests.act_as_anon();
select is(public.get_storefront('shop-a') -> 'memberCount', 'null'::jsonb, 'no member count when the owner hides it');
reset role;

select * from finish();
rollback;
