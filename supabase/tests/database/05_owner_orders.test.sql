-- P5.4: the owner's order actions (review_payment, record_payment, advance_order, cancel_order), set_stock's audit
-- line, the expiry job and audit_log. Shop A is open all day and takes cash, GCash, pickup and delivery; shop B is
-- another active shop; shop C is still pending.
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

create table tests.saved (name text primary key, body jsonb);
grant select, insert on tests.saved to anon, authenticated;

create function tests.saved(p_name text)
returns jsonb
language sql
stable
as $$ select body from tests.saved where name = p_name $$;

-- Numbers far above what place_order hands out today.
create sequence tests.order_no start 1000;
create sequence tests.phone;
grant usage on sequence tests.phone to anon, authenticated;

-- An order in any state, written directly (placed two hours ago, so the shop's per-minute limit stays free).
create function tests.make_order(p_tenant uuid, p_status text, p_payment text, p_method text, p_fulfillment text)
returns uuid
language sql
volatile
security definer
as $$
  insert into public.orders (
    tenant_id, order_no, business_date, token, fulfillment, status, payment_status, payment_method, customer_name,
    customer_phone, address_line, subtotal, total, client_key, placed_at
  ) values (
    p_tenant, nextval('tests.order_no')::integer, (now() at time zone 'Asia/Manila')::date, md5(random()::text),
    p_fulfillment, p_status, p_payment, p_method, 'Case', '+639170000001',
    case when p_fulfillment = 'delivery' then '1 Test St.' end, 10000, 10000, gen_random_uuid(), now() - interval '2 hours'
  )
  returning id
$$;

-- A proof waiting for the owner on an order, written directly.
create function tests.make_pending_payment(p_order uuid)
returns uuid
language sql
volatile
security definer
as $$
  insert into public.payments (tenant_id, order_id, method, amount, status, reference_no, reference_norm)
  select o.tenant_id, o.id, o.payment_method, o.total, 'pending', v.ref, v.ref
  from public.orders o, (select 'REF' || substr(md5(random()::text), 1, 10) as ref) as v
  where o.id = p_order
  returning id
$$;

-- One transition case (packages/core/src/test/transition-cases.ts) against the database, as shop A's owner.
create function tests.run_case(
  p_name text, p_status text, p_payment text, p_method text, p_fulfillment text, p_pay_later boolean, p_action text,
  p_expected text
)
returns setof text
language plpgsql
as $$
declare
  v_order uuid := tests.make_order(tests.id('shop_a'), p_status, p_payment, p_method, p_fulfillment);
  v_payment uuid;
  v_sql text;
begin
  update public.shop_settings set pay_later_pickup = p_pay_later where tenant_id = tests.id('shop_a');
  if p_payment = 'pending' then
    v_payment := tests.make_pending_payment(v_order);
  end if;
  v_sql := case p_action
    when 'verify_payment' then format('select public.review_payment(%L, true, null)', v_payment)
    when 'mark_paid' then format(
      'select public.record_payment(%L, %L)', v_order, case when p_fulfillment = 'delivery' then 'cod' else 'cash' end
    )
    else format(
      'select public.advance_order(%L, %L, null)', v_order,
      case p_action when 'start' then 'preparing' when 'mark_ready' then 'ready' when 'complete' then 'completed' else p_action end
    )
  end;
  perform tests.act_as(tests.id('a'));
  if p_expected = 'ok' then
    return next lives_ok(v_sql, p_name);
  else
    return next throws_ok(v_sql, 'P0001', p_expected, p_name);
  end if;
  execute 'reset role';
end;
$$;

create function tests.payload(p_lines jsonb, p_changes jsonb default '{}')
returns jsonb
language sql
volatile
as $$
  select jsonb_build_object(
    'clientKey', gen_random_uuid(),
    'fulfillment', 'walk_in',
    'paymentMethod', 'cash',
    'customer', jsonb_build_object('name', 'Guest', 'phone', '+6391755' || lpad(nextval('tests.phone')::text, 5, '0'), 'email', null),
    'lines', p_lines,
    'pickupAt', null,
    'delivery', null,
    'notes', null,
    'useReward', false,
    'privacyConsent', true
  ) || p_changes
$$;

create function tests.lines(p_variant text, p_qty integer)
returns jsonb
language sql
stable
as $$
  select jsonb_build_array(jsonb_build_object(
    'itemId', (select v.item_id from public.item_variants v where v.id = tests.id(p_variant)),
    'variantId', tests.id(p_variant), 'qty', p_qty, 'note', null, 'optionIds', '[]'::jsonb
  ))
$$;

-- Places an order in shop A as a visitor and saves it under p_name; returns the order id.
create function tests.place(p_name text, p_payload jsonb)
returns uuid
language plpgsql
volatile
as $$
declare
  v_result jsonb;
begin
  perform tests.act_as_anon();
  v_result := public.place_order('shop-a', p_payload);
  execute 'reset role';
  insert into tests.saved values (p_name, v_result);
  return (v_result ->> 'orderId')::uuid;
end;
$$;

create function tests.order_id(p_name text)
returns uuid
language sql
stable
as $$ select (tests.saved(p_name) ->> 'orderId')::uuid $$;

create function tests.order_row(p_name text)
returns public.orders
language sql
stable
security definer
as $$ select * from public.orders where id = tests.order_id(p_name) $$;

-- Sends a proof as the customer: the photo is stored first (as the storage policy would allow), then submitted.
create function tests.send_proof(p_name text, p_reference text)
returns uuid
language plpgsql
volatile
as $$
declare
  v_order public.orders := tests.order_row(p_name);
  v_path text := v_order.tenant_id::text || '/' || v_order.token || '/' || gen_random_uuid()::text || '.webp';
  v_payment jsonb;
begin
  insert into storage.objects (bucket_id, name) values ('payment-proofs', v_path);
  perform tests.act_as_anon();
  v_payment := public.submit_payment_proof(v_order.token, v_order.payment_method, p_reference, v_path);
  execute 'reset role';
  return (v_payment ->> 'id')::uuid;
end;
$$;

create function tests.stock(p_variant text)
returns integer
language sql
stable
security definer
as $$ select stock_on_hand from public.item_variants where id = tests.id(p_variant) $$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Shops A, B and C
-- ---------------------------------------------------------------------------

insert into tests.ids values
  ('a', tests.create_user('owner-a@example.com')),
  ('b', tests.create_user('owner-b@example.com')),
  ('c', tests.create_user('owner-c@example.com'));

select tests.act_as(tests.id('a'));
select public.create_my_shop('food', 'Shop A', 'shop-a');
reset role;
select tests.act_as(tests.id('b'));
select public.create_my_shop('retail', 'Shop B', 'shop-b');
reset role;
select tests.act_as(tests.id('c'));
select public.create_my_shop('food', 'Shop C', 'shop-c');
reset role;

insert into tests.ids
select 'shop_' || replace(t.slug, 'shop-', ''), t.id from public.tenants t where t.slug in ('shop-a', 'shop-b', 'shop-c');
update public.tenants set status = 'active' where slug in ('shop-a', 'shop-b');

update public.business_hours set opens_at = '00:00', closes_at = '24:00' where tenant_id = tests.id('shop_a');
update public.shop_settings
set delivery_enabled = true, cod_enabled = true, delivery_fee_via_messenger = true, pay_later_pickup = true
where tenant_id = tests.id('shop_a');

insert into public.payment_accounts (tenant_id, method, account_name, account_number, bank_name, is_active) values
  (tests.id('shop_a'), 'gcash', 'Shop A GCash', '0917 000 0001', null, true),
  (tests.id('shop_a'), 'bank', 'Shop A', '0001 0002 0003', 'BPI', true);

with i as (
  insert into public.items (tenant_id, name, status, track_stock) values
    (tests.id('shop_a'), 'Bread', 'active', true),
    (tests.id('shop_a'), 'Cookie', 'active', true),
    (tests.id('shop_a'), 'Latte', 'active', false)
  returning name, id
)
insert into tests.ids select 'item_' || lower(name), id from i;

with v as (
  insert into public.item_variants (tenant_id, item_id, name, price, stock_on_hand) values
    (tests.id('shop_a'), tests.id('item_bread'), 'Piece', 5000, 10),
    (tests.id('shop_a'), tests.id('item_cookie'), 'Piece', 4000, 10),
    (tests.id('shop_a'), tests.id('item_latte'), 'Regular', 12000, null)
  returning item_id, id
)
insert into tests.ids select 'var_' || replace(t.name, 'item_', ''), v.id from v join tests.ids t on t.id = v.item_id;

-- ---------------------------------------------------------------------------
-- Every transition case, as shop A's owner (decision P5-9: the same rows as packages/core)
-- ---------------------------------------------------------------------------

select tests.run_case(c.name, c.status, c.payment, c.method, c.fulfillment, c.pay_later, c.action, c.expected)
from (values
-- transition-cases:start
('walk-in cash starts unpaid', 'placed', 'unpaid', 'cash', 'walk_in', false, 'start', 'ok'),
('pickup cash starts unpaid when paying later is on', 'placed', 'unpaid', 'cash', 'pickup', true, 'start', 'ok'),
('pickup cash waits for payment when paying later is off', 'placed', 'unpaid', 'cash', 'pickup', false, 'start', 'not_paid'),
('cash on delivery starts unpaid', 'placed', 'unpaid', 'cod', 'delivery', false, 'start', 'ok'),
('unpaid GCash cannot start', 'placed', 'unpaid', 'gcash', 'pickup', true, 'start', 'not_paid'),
('Maya with a proof waiting cannot start', 'placed', 'pending', 'maya', 'delivery', true, 'start', 'not_paid'),
('paid bank transfer starts', 'placed', 'paid', 'bank', 'walk_in', false, 'start', 'ok'),
('paid GCash pickup gets ready', 'preparing', 'paid', 'gcash', 'pickup', true, 'mark_ready', 'ok'),
('unpaid walk-in cash gets ready', 'preparing', 'unpaid', 'cash', 'walk_in', false, 'mark_ready', 'ok'),
('a new order cannot skip to ready', 'placed', 'paid', 'cash', 'walk_in', false, 'mark_ready', 'invalid_transition'),
('ready cash on delivery goes out unpaid', 'ready', 'unpaid', 'cod', 'delivery', false, 'out_for_delivery', 'ok'),
('pickup never goes out for delivery', 'ready', 'paid', 'cash', 'pickup', true, 'out_for_delivery', 'invalid_transition'),
('delivery goes out only once ready', 'preparing', 'paid', 'gcash', 'delivery', false, 'out_for_delivery', 'invalid_transition'),
('paid walk-in completes from ready', 'ready', 'paid', 'cash', 'walk_in', false, 'complete', 'ok'),
('unpaid pickup cash cannot complete', 'ready', 'unpaid', 'cash', 'pickup', true, 'complete', 'not_paid'),
('delivery completes only after going out', 'ready', 'paid', 'gcash', 'delivery', false, 'complete', 'invalid_transition'),
('paid cash on delivery completes', 'out_for_delivery', 'paid', 'cod', 'delivery', false, 'complete', 'ok'),
('unpaid cash on delivery cannot complete', 'out_for_delivery', 'unpaid', 'cod', 'delivery', false, 'complete', 'not_paid'),
('preparing cannot skip to completed', 'preparing', 'paid', 'cash', 'walk_in', false, 'complete', 'invalid_transition'),
('completed is the end', 'completed', 'paid', 'cash', 'walk_in', false, 'complete', 'invalid_transition'),
('cancelled never starts', 'cancelled', 'unpaid', 'gcash', 'pickup', true, 'start', 'invalid_transition'),
('expired never starts', 'expired', 'unpaid', 'gcash', 'delivery', true, 'start', 'invalid_transition'),
('walk-in cash is marked paid', 'placed', 'unpaid', 'cash', 'walk_in', false, 'mark_paid', 'ok'),
('unpaid GCash paid in cash at the counter', 'placed', 'unpaid', 'gcash', 'pickup', true, 'mark_paid', 'ok'),
('cash on delivery is marked paid at the door', 'out_for_delivery', 'unpaid', 'cod', 'delivery', false, 'mark_paid', 'ok'),
('unpaid Maya delivery paid in cash at the door', 'placed', 'unpaid', 'maya', 'delivery', false, 'mark_paid', 'ok'),
('a paid order is not paid twice', 'ready', 'paid', 'cash', 'pickup', true, 'mark_paid', 'already_paid'),
('a proof waiting is checked, not marked paid', 'placed', 'pending', 'gcash', 'walk_in', false, 'mark_paid', 'payment_not_pending'),
('a cancelled order takes no payment', 'cancelled', 'unpaid', 'cash', 'walk_in', false, 'mark_paid', 'order_not_payable'),
('an expired order takes no payment', 'expired', 'unpaid', 'bank', 'pickup', true, 'mark_paid', 'order_not_payable'),
('a waiting GCash proof is approved', 'placed', 'pending', 'gcash', 'pickup', true, 'verify_payment', 'ok'),
('a cancelled order proof is not approved', 'cancelled', 'pending', 'bank', 'pickup', true, 'verify_payment', 'order_not_payable')
-- transition-cases:end
) as c(name, status, payment, method, fulfillment, pay_later, action, expected);

update public.shop_settings set pay_later_pickup = true where tenant_id = tests.id('shop_a');

-- ---------------------------------------------------------------------------
-- Approve and reject a proof
-- ---------------------------------------------------------------------------

select tests.place('approve', tests.payload(tests.lines('var_latte', 1), '{"fulfillment": "pickup", "paymentMethod": "gcash"}'));
insert into tests.ids values ('pay_approve', tests.send_proof('approve', 'ABC-1234'));

select tests.act_as(tests.id('b'));
select throws_ok(
  format('select public.review_payment(%L, true, null)', tests.id('pay_approve')), 'P0001', 'not_allowed',
  'another shop''s owner cannot review the proof'
);
reset role;

select tests.act_as(tests.id('a'));
select lives_ok(format('select public.review_payment(%L, true, null)', tests.id('pay_approve')), 'the owner approves the proof');
select throws_ok(
  format('select public.review_payment(%L, true, null)', tests.id('pay_approve')), 'P0001', 'payment_not_pending',
  'a checked proof is not checked again'
);
reset role;

select is(
  (select status from public.payments where id = tests.id('pay_approve')), 'confirmed', 'approving confirms the payment'
);
select ok(
  (select payment_status = 'paid' and paid_at is not null and expires_at is null from public.orders where id = tests.order_id('approve')),
  'approving marks the order paid and stops its expiry'
);
select is(
  (select array_agg(kind || ':' || actor order by created_at) from public.order_events where order_id = tests.order_id('approve')),
  array['status:customer', 'payment_submitted:customer', 'payment_confirmed:owner'],
  'the timeline shows the owner confirmed the payment'
);
select ok(
  exists (
    select 1 from public.audit_log
    where action = 'payment_approved' and target_id = tests.id('pay_approve') and actor_id = tests.id('a')
      and meta ->> 'orderId' = tests.order_id('approve')::text
  ),
  'approving writes an audit line by the owner'
);

select tests.place('reject', tests.payload(tests.lines('var_latte', 1), '{"fulfillment": "pickup", "paymentMethod": "gcash"}'));
insert into tests.ids values ('pay_reject', tests.send_proof('reject', 'REJ 5555'));

select tests.act_as(tests.id('a'));
select throws_ok(
  format('select public.review_payment(%L, false, %L)', tests.id('pay_reject'), 'no'), 'P0001', 'invalid',
  'a rejection needs a reason of at least 3 characters'
);
select throws_ok(
  format('select public.review_payment(%L, false, null)', tests.id('pay_reject')), 'P0001', 'invalid',
  'a rejection without a reason is refused'
);
select lives_ok(
  format('select public.review_payment(%L, false, %L)', tests.id('pay_reject'), ' Wrong amount '),
  'the owner rejects the proof with a reason'
);
reset role;

select is(
  (select status || ':' || reject_reason from public.payments where id = tests.id('pay_reject')),
  'rejected:Wrong amount', 'the payment is rejected with the trimmed reason'
);
select ok(
  (select payment_status = 'unpaid' and expires_at > now() + interval '29 minutes' from public.orders where id = tests.order_id('reject')),
  'rejecting puts the order back to unpaid with a fresh expiry'
);
select is(
  (select note from public.order_events where order_id = tests.order_id('reject') and kind = 'payment_rejected'),
  'Wrong amount', 'the timeline carries the reason for the receipt'
);
select ok(
  exists (select 1 from public.audit_log where action = 'payment_rejected' and target_id = tests.id('pay_reject') and meta ->> 'reason' = 'Wrong amount'),
  'rejecting writes an audit line with the reason'
);
select lives_ok(
  $$ select tests.send_proof('reject', 'REJ-5555') $$,
  'a rejected reference number can be sent again'
);

-- ---------------------------------------------------------------------------
-- Record a payment by hand
-- ---------------------------------------------------------------------------

select tests.place('cash', tests.payload(tests.lines('var_latte', 2)));
select tests.place('gcash_counter', tests.payload(tests.lines('var_latte', 1), '{"fulfillment": "pickup", "paymentMethod": "gcash"}'));

select tests.act_as(tests.id('a'));
select throws_ok(
  format('select public.record_payment(%L, %L)', tests.order_id('cash'), 'cod'), 'P0001', 'payment_unavailable',
  'cash on delivery is only for delivery orders'
);
select throws_ok(
  format('select public.record_payment(%L, %L)', tests.order_id('cash'), 'gcash'), 'P0001', 'invalid',
  'only cash or cash on delivery is recorded by hand'
);
select lives_ok(format('select public.record_payment(%L, %L)', tests.order_id('cash'), 'cash'), 'the owner records cash');
select lives_ok(
  format('select public.record_payment(%L, %L)', tests.order_id('gcash_counter'), 'cash'),
  'a GCash customer who pays at the counter is recorded as cash'
);
reset role;

select is(
  (select array_agg(p.method || ':' || p.status || ':' || (p.amount = o.total)::text)
   from public.payments p join public.orders o on o.id = p.order_id where o.id = tests.order_id('cash')),
  array['cash:confirmed:true'], 'a confirmed cash payment of the order total'
);
select ok(
  (select payment_status = 'paid' and paid_at is not null from public.orders where id = tests.order_id('cash')),
  'recording marks the order paid'
);
select ok(
  (select payment_method = 'cash' and payment_status = 'paid' and expires_at is null from public.orders where id = tests.order_id('gcash_counter')),
  'the order''s method becomes cash and it no longer expires'
);
select is(
  (select count(*)::integer from public.audit_log where action = 'payment_recorded' and meta ->> 'orderId' in (tests.order_id('cash')::text, tests.order_id('gcash_counter')::text)),
  2, 'each recorded payment writes an audit line'
);

-- ---------------------------------------------------------------------------
-- Move an order along; customer totals change only on completion
-- ---------------------------------------------------------------------------

select tests.place('walk', tests.payload(tests.lines('var_latte', 1)));
select tests.place('walk_cancel', tests.payload(tests.lines('var_latte', 1), jsonb_build_object(
  'customer', jsonb_build_object('name', 'Guest', 'phone', (tests.order_row('walk')).customer_phone, 'email', null)
)));
insert into tests.ids values ('customer', (tests.order_row('walk')).customer_id);

select tests.act_as(tests.id('a'));
select lives_ok(format('select public.advance_order(%L, %L, null)', tests.order_id('walk'), 'preparing'), 'start');
select lives_ok(format('select public.advance_order(%L, %L, null)', tests.order_id('walk'), 'ready'), 'mark ready');
select throws_ok(
  format('select public.advance_order(%L, %L, null)', tests.order_id('walk'), 'completed'), 'P0001', 'not_paid',
  'an unpaid order is marked paid before it completes'
);
select throws_ok(
  format('select public.advance_order(%L, %L, null)', tests.order_id('walk'), 'placed'), 'P0001', 'invalid_transition',
  'steps never go back'
);
reset role;

select is(
  (select order_count || ':' || total_spent from public.customers where id = tests.id('customer')), '0:0',
  'starting and getting ready do not count toward the customer''s totals'
);
select ok((select ready_at is not null from public.orders where id = tests.order_id('walk')), 'ready sets ready_at');

select tests.act_as(tests.id('a'));
select lives_ok(format('select public.record_payment(%L, %L)', tests.order_id('walk'), 'cash'), 'mark paid');
select is(
  (public.advance_order(tests.order_id('walk'), 'completed', null)) ->> 'status', 'completed',
  'complete returns the order'
);
select lives_ok(format('select public.cancel_order(%L, %L)', tests.order_id('walk_cancel'), 'Changed mind'), 'cancel the other order');
reset role;

select ok(
  (select order_count = 1 and total_spent = (tests.order_row('walk')).total and last_order_at is not null
   from public.customers where id = tests.id('customer')),
  'completing adds the order to the customer''s totals; cancelling does not'
);
select ok((select completed_at is not null from public.orders where id = tests.order_id('walk')), 'completed sets completed_at');
select is(
  (select array_agg(coalesce(from_status, '-') || '>' || to_status || ':' || actor order by created_at)
   from public.order_events where order_id = tests.order_id('walk') and kind = 'status'),
  array['->placed:customer', 'placed>preparing:owner', 'preparing>ready:owner', 'ready>completed:owner'],
  'every step is on the timeline with the owner as actor'
);

-- Delivery with a tracking link.
select tests.place('deliver', tests.payload(tests.lines('var_latte', 1), '{"fulfillment": "delivery", "paymentMethod": "cod", "delivery": {"addressLine": "1 Rizal St.", "landmark": null, "deliveryZoneId": null}}'));

select tests.act_as(tests.id('a'));
select lives_ok(format('select public.advance_order(%L, %L, null)', tests.order_id('deliver'), 'preparing'), 'cash on delivery starts unpaid');
select lives_ok(format('select public.advance_order(%L, %L, null)', tests.order_id('deliver'), 'ready'), 'delivery gets ready');
select throws_ok(
  format('select public.advance_order(%L, %L, %L)', tests.order_id('deliver'), 'out_for_delivery', 'http://track.example.com/1'),
  'P0001', 'invalid', 'a tracking link must be https'
);
select lives_ok(
  format('select public.advance_order(%L, %L, %L)', tests.order_id('deliver'), 'out_for_delivery', 'https://track.example.com/1'),
  'out for delivery with a tracking link'
);
reset role;

select is(
  (select tracking_url from public.orders where id = tests.order_id('deliver')), 'https://track.example.com/1',
  'the tracking link is saved'
);

-- ---------------------------------------------------------------------------
-- Cancel: stock comes back once, proofs are closed, paid orders keep their payment
-- ---------------------------------------------------------------------------

select tests.place('bread', tests.payload(tests.lines('var_bread', 2)));
select is(tests.stock('var_bread'), 8, 'placing took 2 bread');

select tests.act_as(tests.id('a'));
select throws_ok(
  format('select public.cancel_order(%L, %L)', tests.order_id('bread'), '  '), 'P0001', 'invalid', 'a cancel needs a reason'
);
select lives_ok(format('select public.cancel_order(%L, %L)', tests.order_id('bread'), 'Customer left'), 'the owner cancels');
select throws_ok(
  format('select public.cancel_order(%L, %L)', tests.order_id('bread'), 'Again'), 'P0001', 'invalid_transition',
  'a cancelled order is not cancelled again'
);
reset role;

select is(tests.stock('var_bread'), 10, 'cancelling returns the 2 bread, once');
select ok(
  (select status = 'cancelled' and cancel_reason = 'Customer left' and cancelled_at is not null from public.orders where id = tests.order_id('bread')),
  'the order is cancelled with its reason'
);
select ok(
  exists (select 1 from public.audit_log where action = 'order_cancelled' and target_id = tests.order_id('bread') and meta ->> 'reason' = 'Customer left'),
  'cancelling writes an audit line'
);

-- The owner recounted the stock while the order was open: the cancel adds back exactly what the order took.
select tests.place('recount', tests.payload(tests.lines('var_cookie', 3)));
select tests.act_as(tests.id('a'));
select lives_ok(format('select public.set_stock(%L, 5)', tests.id('var_cookie')), 'the owner recounts the cookies');
select lives_ok(format('select public.cancel_order(%L, %L)', tests.order_id('recount'), 'Out of time'), 'cancel after the recount');
reset role;
select is(tests.stock('var_cookie'), 8, 'the 3 cookies come back on top of the recount');

-- A paid order keeps its payment; the refund is by hand.
select tests.place('paid_cancel', tests.payload(tests.lines('var_latte', 1)));
select tests.act_as(tests.id('a'));
select lives_ok(format('select public.record_payment(%L, %L)', tests.order_id('paid_cancel'), 'cash'), 'paid in cash');
select lives_ok(format('select public.cancel_order(%L, %L)', tests.order_id('paid_cancel'), 'Kitchen fire'), 'cancel a paid order');
reset role;
select ok(
  (select o.payment_status = 'paid' and p.status = 'confirmed'
   from public.orders o join public.payments p on p.order_id = o.id where o.id = tests.order_id('paid_cancel')),
  'a paid order keeps its confirmed payment'
);
select is(
  (select note from public.order_events where order_id = tests.order_id('paid_cancel') and to_status = 'cancelled'),
  'Kitchen fire (paid: refund by hand)', 'the timeline says the refund is by hand'
);

-- A proof still waiting is closed.
select tests.place('proof_cancel', tests.payload(tests.lines('var_latte', 1), '{"fulfillment": "pickup", "paymentMethod": "bank"}'));
insert into tests.ids values ('pay_cancel', tests.send_proof('proof_cancel', 'BANK-777'));
select tests.act_as(tests.id('a'));
select lives_ok(format('select public.cancel_order(%L, %L)', tests.order_id('proof_cancel'), 'Sold out'), 'cancel with a proof waiting');
reset role;
select is(
  (select status || ':' || reject_reason from public.payments where id = tests.id('pay_cancel')), 'rejected:Order cancelled',
  'the waiting proof is rejected with "Order cancelled"'
);
select is(
  (select payment_status from public.orders where id = tests.order_id('proof_cancel')), 'unpaid',
  'the cancelled order is no longer waiting on a payment'
);

-- A line whose variant was deleted is skipped.
select tests.place('gone', tests.payload(tests.lines('var_cookie', 1)));
delete from public.item_variants where id = tests.id('var_cookie');
select tests.act_as(tests.id('a'));
select lives_ok(format('select public.cancel_order(%L, %L)', tests.order_id('gone'), 'Removed'), 'cancel when the variant is gone');
reset role;

-- ---------------------------------------------------------------------------
-- Who may act: another shop's owner, a pending shop's owner, a visitor
-- ---------------------------------------------------------------------------

insert into tests.ids values
  ('open_a', tests.make_order(tests.id('shop_a'), 'placed', 'unpaid', 'cash', 'walk_in')),
  ('order_c', tests.make_order(tests.id('shop_c'), 'placed', 'unpaid', 'cash', 'walk_in'));

select tests.act_as(tests.id('b'));
select throws_ok(format('select public.record_payment(%L, %L)', tests.id('open_a'), 'cash'), 'P0001', 'not_allowed', 'owner B: record_payment');
select throws_ok(format('select public.advance_order(%L, %L, null)', tests.id('open_a'), 'preparing'), 'P0001', 'not_allowed', 'owner B: advance_order');
select throws_ok(format('select public.cancel_order(%L, %L)', tests.id('open_a'), 'No'), 'P0001', 'not_allowed', 'owner B: cancel_order');
select throws_ok(format('select public.set_stock(%L, 1)', tests.id('var_bread')), 'P0001', 'not_allowed', 'owner B: set_stock');
select throws_ok(format('select public.advance_order(%L, %L, null)', gen_random_uuid(), 'preparing'), 'P0001', 'not_allowed', 'an unknown order gets the same answer');
select throws_ok(format('select public.review_payment(%L, true, null)', gen_random_uuid()), 'P0001', 'not_allowed', 'an unknown payment gets the same answer');
reset role;

select tests.act_as(tests.id('c'));
select throws_ok(format('select public.record_payment(%L, %L)', tests.id('order_c'), 'cash'), 'P0001', 'not_allowed', 'a pending shop''s owner: record_payment');
select throws_ok(format('select public.advance_order(%L, %L, null)', tests.id('order_c'), 'preparing'), 'P0001', 'not_allowed', 'a pending shop''s owner: advance_order');
select throws_ok(format('select public.cancel_order(%L, %L)', tests.id('order_c'), 'No'), 'P0001', 'not_allowed', 'a pending shop''s owner: cancel_order');
reset role;

select tests.act_as_anon();
select throws_ok(format('select public.advance_order(%L, %L, null)', tests.id('open_a'), 'preparing'), '42501', null, 'visitors cannot run owner actions');
select throws_ok($$ select private.expire_unpaid_orders() $$, '42501', null, 'visitors cannot run the expiry job');
reset role;

select tests.act_as(tests.id('a'));
select throws_ok($$ select private.expire_unpaid_orders() $$, '42501', null, 'owners cannot run the expiry job');
reset role;

select is((select status from public.orders where id = tests.id('open_a')), 'placed', 'refused calls changed nothing');

-- ---------------------------------------------------------------------------
-- Expiry job
-- ---------------------------------------------------------------------------

select tests.place('late_gcash', tests.payload(tests.lines('var_bread', 1), '{"fulfillment": "pickup", "paymentMethod": "gcash"}'));
select tests.place('fresh_gcash', tests.payload(tests.lines('var_bread', 1), '{"fulfillment": "pickup", "paymentMethod": "gcash"}'));
select tests.place('late_cash', tests.payload(tests.lines('var_bread', 1)));
select tests.place('late_cod', tests.payload(tests.lines('var_bread', 1), '{"fulfillment": "delivery", "paymentMethod": "cod", "delivery": {"addressLine": "2 Rizal St.", "landmark": null, "deliveryZoneId": null}}'));
select tests.place('late_proof', tests.payload(tests.lines('var_bread', 1), '{"fulfillment": "pickup", "paymentMethod": "gcash"}'));
select tests.send_proof('late_proof', 'LATE-0001');
select is(tests.stock('var_bread'), 5, 'five orders took one bread each');

-- Time runs out for every one of them except fresh_gcash; only the unpaid transfer may expire.
update public.orders set expires_at = now() - interval '1 minute'
where id in (tests.order_id('late_gcash'), tests.order_id('late_cash'), tests.order_id('late_cod'), tests.order_id('late_proof'));

select is((private.expire_unpaid_orders()) ->> 'expiredCount', '1', 'the job expires one order');
select is(
  (select array_agg(status order by placed_at, order_no) from public.orders
   where id in (tests.order_id('late_gcash'), tests.order_id('fresh_gcash'), tests.order_id('late_cash'), tests.order_id('late_cod'), tests.order_id('late_proof'))),
  array['expired', 'placed', 'placed', 'placed', 'placed'],
  'only the unpaid GCash order past its time expired; cash, COD, a waiting proof and a fresh order stay'
);
select is(tests.stock('var_bread'), 6, 'the expired order gave its bread back');
select ok(
  exists (select 1 from public.order_events where order_id = tests.order_id('late_gcash') and to_status = 'expired' and actor = 'system'),
  'the timeline shows the system expired it'
);
select is((private.expire_unpaid_orders()) ->> 'expiredCount', '0', 'running again expires nothing more');

select is(
  (select schedule || ' ' || command from cron.job where jobname = 'expire-unpaid-orders'),
  '* * * * * select private.expire_unpaid_orders()', 'the expiry job runs every minute'
);

-- ---------------------------------------------------------------------------
-- audit_log: owners read their shop's lines; nobody writes them directly
-- ---------------------------------------------------------------------------

select ok(
  exists (select 1 from public.audit_log where action = 'stock_set' and target_id = tests.id('var_cookie') and meta ->> 'to' = '5'),
  'set_stock writes an audit line'
);

select tests.act_as(tests.id('a'));
select ok((select count(*) from public.audit_log) > 0, 'owner A reads shop A''s audit lines');
select throws_ok(
  format($$ insert into public.audit_log (tenant_id, action, target_type, target_id) values (%L, 'stock_set', 'variant', %L) $$, tests.id('shop_a'), gen_random_uuid()),
  '42501', null, 'owners cannot write audit lines'
);
select throws_ok($$ delete from public.audit_log $$, '42501', null, 'owners cannot delete audit lines');
reset role;

select tests.act_as(tests.id('b'));
select is((select count(*)::integer from public.audit_log), 0, 'owner B reads none of shop A''s audit lines');
reset role;

select * from finish();
rollback;
