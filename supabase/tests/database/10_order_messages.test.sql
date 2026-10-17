-- SF2 Step 3 tests: Order messages with payment proof first
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
  ('owner_a', tests.create_user('owner_msg_a@example.com')),
  ('owner_b', tests.create_user('owner_msg_b@example.com'));

select tests.act_as(tests.id('owner_a'));
select public.create_my_shop('food', 'Msg Cafe A', 'msg-cafe-a');
reset role;

select tests.act_as(tests.id('owner_b'));
select public.create_my_shop('food', 'Msg Cafe B', 'msg-cafe-b');
reset role;

insert into tests.ids
select 'shop_' || replace(t.slug, 'msg-cafe-', ''), t.id from public.tenants t where t.slug in ('msg-cafe-a', 'msg-cafe-b');
update public.tenants set status = 'active' where slug in ('msg-cafe-a', 'msg-cafe-b');
update public.business_hours set opens_at = '00:00', closes_at = '24:00' where tenant_id in (tests.id('shop_a'), tests.id('shop_b'));
update public.shop_settings set accepting_orders = true, pickup_enabled = true, walk_in_enabled = true where tenant_id in (tests.id('shop_a'), tests.id('shop_b'));

insert into public.payment_accounts (tenant_id, method, account_name, account_number, is_active) values
  (tests.id('shop_a'), 'gcash', 'Shop A GCash', '0917 111 0001', true),
  (tests.id('shop_b'), 'gcash', 'Shop B GCash', '0917 111 0002', true);

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

-- 1. Order 1: GCash payment proof and status transitions
select tests.act_as_anon();

insert into tests.saved values (
  'o1',
  public.place_order(
    'msg-cafe-a',
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
      'customer', jsonb_build_object('name', 'Pedro Penduko', 'phone', '+639181234567'),
      'privacyConsent', true
    )
  )
);

reset role;
-- Create fake uploaded file in storage
insert into storage.objects (bucket_id, name, owner)
values (
  'payment-proofs',
  tests.id('shop_a')::text || '/' || tests.order_token('o1') || '/00000000-0000-0000-0000-000000000001.webp',
  tests.id('owner_a')
);

-- Submit payment proof
select tests.act_as_anon();

select lives_ok(
  $$
  select public.submit_payment_proof(
    tests.order_token('o1'),
    'gcash',
    'REF123456',
    tests.id('shop_a')::text || '/' || tests.order_token('o1') || '/00000000-0000-0000-0000-000000000001.webp'
  )
  $$,
  'submit_payment_proof succeeds'
);

-- Check message exists via get_order_messages
select is(
  jsonb_array_length(public.get_order_messages(tests.order_token('o1'))),
  1,
  'get_order_messages returns 1 message after payment proof submission'
);

select is(
  (public.get_order_messages(tests.order_token('o1')) -> 0 ->> 'kind'),
  'payment_proof',
  'First message has kind = payment_proof'
);

select is(
  (public.get_order_messages(tests.order_token('o1')) -> 0 ->> 'sender'),
  'customer',
  'First message has sender = customer'
);

-- Owner A approves payment
reset role;
select tests.act_as(tests.id('owner_a'));

select lives_ok(
  $$
  select public.review_payment(
    (select id from public.payments where order_id = tests.order_id('o1')),
    true
  )
  $$,
  'Owner A approves payment'
);

-- Owner A advances order: preparing -> ready -> completed
select lives_ok(
  $$
  select public.advance_order(tests.order_id('o1'), 'preparing')
  $$,
  'Owner A advances to preparing'
);

select lives_ok(
  $$
  select public.advance_order(tests.order_id('o1'), 'ready')
  $$,
  'Owner A advances to ready'
);

select lives_ok(
  $$
  select public.advance_order(tests.order_id('o1'), 'completed')
  $$,
  'Owner A advances to completed'
);

-- 5 messages now: payment_proof, payment_confirmed, status:preparing, status:ready, status:completed
select tests.act_as_anon();

select is(
  jsonb_array_length(public.get_order_messages(tests.order_token('o1'))),
  5,
  'get_order_messages returns 5 messages'
);

select is(
  (public.get_order_messages(tests.order_token('o1')) -> 1 ->> 'body'),
  'payment_confirmed',
  'Message 2 is payment_confirmed'
);

select is(
  (public.get_order_messages(tests.order_token('o1')) -> 2 ->> 'body'),
  'status:preparing',
  'Message 3 is status:preparing'
);

select is(
  (public.get_order_messages(tests.order_token('o1')) -> 3 ->> 'body'),
  'status:ready',
  'Message 4 is status:ready'
);

select is(
  (public.get_order_messages(tests.order_token('o1')) -> 4 ->> 'body'),
  'status:completed',
  'Message 5 is status:completed'
);

-- 2. Order 2: Rejection message
select tests.act_as_anon();

insert into tests.saved values (
  'o2',
  public.place_order(
    'msg-cafe-a',
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
      'customer', jsonb_build_object('name', 'Pedro 2', 'phone', '+639181234568'),
      'privacyConsent', true
    )
  )
);

reset role;
insert into storage.objects (bucket_id, name, owner)
values (
  'payment-proofs',
  tests.id('shop_a')::text || '/' || tests.order_token('o2') || '/00000000-0000-0000-0000-000000000002.webp',
  tests.id('owner_a')
);

select tests.act_as_anon();
select public.submit_payment_proof(
  tests.order_token('o2'),
  'gcash',
  'REF654321',
  tests.id('shop_a')::text || '/' || tests.order_token('o2') || '/00000000-0000-0000-0000-000000000002.webp'
);

-- Owner rejects
reset role;
select tests.act_as(tests.id('owner_a'));
select public.review_payment(
  (select id from public.payments where order_id = tests.order_id('o2')),
  false,
  'Receipt is blurry'
);

select tests.act_as_anon();
select is(
  (public.get_order_messages(tests.order_token('o2')) -> 1 ->> 'body'),
  'payment_rejected',
  'Rejection inserts payment_rejected system message'
);

-- 3. Order 3: Cash payment recorded
select tests.act_as_anon();
insert into tests.saved values (
  'o3',
  public.place_order(
    'msg-cafe-a',
    jsonb_build_object(
      'fulfillment', 'walk_in',
      'paymentMethod', 'cash',
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
      'customer', jsonb_build_object('name', 'Pedro 3', 'phone', '+639181234569'),
      'privacyConsent', true
    )
  )
);

reset role;
select tests.act_as(tests.id('owner_a'));
select public.record_payment(tests.order_id('o3'), 'cash');

select tests.act_as_anon();
select is(
  (public.get_order_messages(tests.order_token('o3')) -> 0 ->> 'body'),
  'payment_confirmed',
  'record_payment inserts payment_confirmed system message'
);

-- 4. Order 4: Cancel order
select tests.act_as_anon();
insert into tests.saved values (
  'o4',
  public.place_order(
    'msg-cafe-a',
    jsonb_build_object(
      'fulfillment', 'walk_in',
      'paymentMethod', 'cash',
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
      'customer', jsonb_build_object('name', 'Pedro 4', 'phone', '+639181234570'),
      'privacyConsent', true
    )
  )
);

reset role;
select tests.act_as(tests.id('owner_a'));
select public.cancel_order(tests.order_id('o4'), 'Customer changed mind');

select tests.act_as_anon();
select is(
  (public.get_order_messages(tests.order_token('o4')) -> 0 ->> 'body'),
  'status:cancelled',
  'cancel_order inserts status:cancelled system message'
);

-- 5. RLS and Cross-Shop Isolation
-- Owner A sees Shop A messages
select tests.act_as(tests.id('owner_a'));
select is(
  (select count(*) > 0 from public.order_messages where tenant_id = tests.id('shop_a')),
  true,
  'Owner A can select Shop A order messages'
);

-- Owner B cannot see Shop A messages
select tests.act_as(tests.id('owner_b'));
select is(
  (select count(*) from public.order_messages where tenant_id = tests.id('shop_a')),
  0::bigint,
  'Cross-shop: Owner B sees 0 messages from Shop A'
);

-- Anon direct select is refused
select tests.act_as_anon();
select throws_ok(
  $$ select count(*) from public.order_messages $$,
  '42501',
  null,
  'Anon direct select on order_messages is refused'
);

-- Direct client insert is refused (permission denied 42501)
select throws_ok(
  $$
  insert into public.order_messages (tenant_id, order_id, sender, kind, body)
  values (tests.id('shop_a'), tests.order_id('o1'), 'customer', 'text', 'hello')
  $$,
  '42501',
  null,
  'Client direct insert on order_messages is refused'
);

-- get_order_messages on invalid token throws not_found
select throws_ok(
  $$
  select public.get_order_messages('non-existent-token')
  $$,
  'not_found',
  'get_order_messages on invalid token throws not_found'
);

select * from finish();
rollback;
