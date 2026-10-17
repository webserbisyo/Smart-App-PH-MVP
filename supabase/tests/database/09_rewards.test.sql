-- SF2 Step 2 tests: Three reward kinds and custom-prize claims
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

-- Setup test shop, owner, member, and items
insert into tests.ids values
  ('owner_a', tests.create_user('owner_rw_a@example.com')),
  ('owner_b', tests.create_user('owner_rw_b@example.com')),
  ('member_m', tests.create_user('member_rw_m@example.com'));

select tests.act_as(tests.id('owner_a'));
select public.create_my_shop('food', 'Reward Cafe', 'reward-cafe');
reset role;

select tests.act_as(tests.id('owner_b'));
select public.create_my_shop('food', 'Other Cafe', 'other-cafe');
reset role;

insert into tests.ids
select 'shop_' || replace(t.slug, 'reward-', ''), t.id from public.tenants t where t.slug in ('reward-cafe', 'other-cafe');
update public.tenants set status = 'active' where slug in ('reward-cafe', 'other-cafe');
update public.business_hours set opens_at = '00:00', closes_at = '24:00' where tenant_id in (tests.id('shop_cafe'), tests.id('shop_other-cafe'));
update public.shop_settings set accepting_orders = true, pickup_enabled = true where tenant_id in (tests.id('shop_cafe'), tests.id('shop_other-cafe'));

-- Setup catalog in reward-cafe: Coffee item ($100), Donut item ($50)
select tests.act_as(tests.id('owner_a'));

insert into public.payment_accounts (tenant_id, method, account_name, account_number, is_active)
values (tests.id('shop_cafe'), 'gcash', 'Cafe GCash', '0917 111 2222', true);

with cat as (
  insert into public.categories (tenant_id, name, sort)
  values (tests.id('shop_cafe'), 'Drinks', 1)
  returning id
), itm as (
  insert into public.items (tenant_id, category_id, name, status, sort)
  values (tests.id('shop_cafe'), (select id from cat), 'Americano', 'active', 1)
  returning id
)
insert into public.item_variants (tenant_id, item_id, name, price, sort)
values (tests.id('shop_cafe'), (select id from itm), 'Hot', 10000, 1);

insert into tests.ids select 'itm_americano', id from public.items where tenant_id = tests.id('shop_cafe') and name = 'Americano';
insert into tests.ids select 'var_americano_hot', id from public.item_variants where tenant_id = tests.id('shop_cafe') and name = 'Hot';

with itm as (
  insert into public.items (tenant_id, name, status, sort)
  values (tests.id('shop_cafe'), 'Glazed Donut', 'active', 2)
  returning id
)
insert into public.item_variants (tenant_id, item_id, name, price, sort)
values (tests.id('shop_cafe'), (select id from itm), 'Single', 5000, 1);

insert into tests.ids select 'itm_donut', id from public.items where tenant_id = tests.id('shop_cafe') and name = 'Glazed Donut';
insert into tests.ids select 'var_donut_single', id from public.item_variants where tenant_id = tests.id('shop_cafe') and name = 'Single';

reset role;

-- Member joins reward-cafe
select tests.act_as(tests.id('member_m'));
select public.join_as_member('reward-cafe', 'Maria Clara', '+639171234567');
reset role;

insert into tests.ids
select 'cust_maria', c.id from public.customers c where c.user_id = tests.id('member_m');

-- 1. Normal order with no reward behaves exactly as before
select tests.act_as(tests.id('member_m'));

select lives_ok(
  $$
  select public.place_order(
    'reward-cafe',
    jsonb_build_object(
      'fulfillment', 'pickup',
      'paymentMethod', 'gcash',
      'lines', jsonb_build_array(
        jsonb_build_object(
          'itemId', tests.id('itm_americano')::text,
          'variantId', tests.id('var_americano_hot')::text,
          'qty', 1,
          'optionIds', '[]'::jsonb
        )
      ),
      'useReward', false,
      'clientKey', gen_random_uuid()::text,
      'customer', jsonb_build_object(
        'name', 'Maria Clara',
        'phone', '+639171234567'
      ),
      'privacyConsent', true
    )
  )
  $$,
  'Normal order with no reward succeeds as before'
);

-- Verify order items is_reward is false
reset role;
select is(
  (select count(*) from public.order_items where tenant_id = tests.id('shop_cafe') and is_reward = false),
  1::bigint,
  'Order item has is_reward = false'
);

-- 2. Loyalty rules constraints: free_item needs item & variant, custom needs title
select tests.act_as(tests.id('owner_a'));

-- Invalid free_item: missing item
select throws_ok(
  $$
  update public.loyalty_rules
  set reward_kind = 'free_item', reward_item_id = null, reward_variant_id = null
  where tenant_id = tests.id('shop_cafe')
  $$,
  '23514',
  null,
  'free_item without reward item is refused'
);

-- Invalid custom: missing title
select throws_ok(
  $$
  update public.loyalty_rules
  set reward_kind = 'custom', reward_title = null
  where tenant_id = tests.id('shop_cafe')
  $$,
  '23514',
  null,
  'custom reward without title is refused'
);

-- Configure loyalty_rules as free_item (Donut)
select lives_ok(
  $$
  update public.loyalty_rules
  set
    is_active = true,
    stamps_needed = 10,
    reward_kind = 'free_item',
    reward_item_id = tests.id('itm_donut'),
    reward_variant_id = tests.id('var_donut_single'),
    reward_label = 'Free Donut'
  where tenant_id = tests.id('shop_cafe')
  $$,
  'Owner can configure free_item reward rule'
);

reset role;

-- Give Maria 10 stamps
insert into public.loyalty_ledger (tenant_id, customer_id, delta, reason)
values (tests.id('shop_cafe'), tests.id('cust_maria'), 10, 'manual');

-- 3. Free item order: injects free item variant with is_reward = true, discount equals price
select tests.act_as(tests.id('member_m'));

select lives_ok(
  $$
  select public.place_order(
    'reward-cafe',
    jsonb_build_object(
      'fulfillment', 'pickup',
      'paymentMethod', 'gcash',
      'lines', jsonb_build_array(
        jsonb_build_object(
          'itemId', tests.id('itm_americano')::text,
          'variantId', tests.id('var_americano_hot')::text,
          'qty', 1,
          'optionIds', '[]'::jsonb
        )
      ),
      'useReward', true,
      'clientKey', gen_random_uuid()::text,
      'customer', jsonb_build_object(
        'name', 'Maria Clara',
        'phone', '+639171234567'
      ),
      'privacyConsent', true
    )
  )
  $$,
  'Order with free_item reward succeeds'
);

-- Check that order items contains the reward item with is_reward = true
reset role;
select is(
  (select count(*) from public.order_items where tenant_id = tests.id('shop_cafe') and is_reward = true),
  1::bigint,
  'Order has exactly 1 reward line'
);

-- Check the reward item line details
select results_eq(
  $$
  select item_name, unit_price, qty, line_total, is_reward
  from public.order_items
  where tenant_id = tests.id('shop_cafe') and is_reward = true
  $$,
  $$
  values ('Glazed Donut'::text, 5000::integer, 1::integer, 5000::integer, true)
  $$,
  'Reward item is Glazed Donut at 5000 centavos with is_reward = true'
);

-- 4. Custom reward configured
select tests.act_as(tests.id('owner_a'));
update public.loyalty_rules
set
  reward_kind = 'custom',
  reward_title = 'VIP Tumbler',
  reward_description = 'Stainless steel coffee tumbler',
  reward_label = 'Free VIP Tumbler',
  stamps_needed = 5
where tenant_id = tests.id('shop_cafe');
reset role;

-- Ordering with custom reward in order is refused
select tests.act_as(tests.id('member_m'));

select throws_ok(
  $$
  select public.place_order(
    'reward-cafe',
    jsonb_build_object(
      'fulfillment', 'pickup',
      'paymentMethod', 'gcash',
      'lines', jsonb_build_array(
        jsonb_build_object(
          'itemId', tests.id('itm_americano')::text,
          'variantId', tests.id('var_americano_hot')::text,
          'qty', 1,
          'optionIds', '[]'::jsonb
        )
      ),
      'useReward', true,
      'clientKey', gen_random_uuid()::text,
      'customer', jsonb_build_object('name', 'Maria Clara', 'phone', '+639171234567'),
      'privacyConsent', true
    )
  )
  $$,
  'reward_not_for_orders',
  'Placing order with custom reward raises reward_not_for_orders'
);

-- 5. Claim custom reward
-- Give Maria 5 stamps
reset role;
insert into public.loyalty_ledger (tenant_id, customer_id, delta, reason)
values (tests.id('shop_cafe'), tests.id('cust_maria'), 5, 'manual');

select tests.act_as(tests.id('member_m'));

select lives_ok(
  $$
  select public.claim_reward('reward-cafe')
  $$,
  'Member can claim custom reward'
);

-- Second claim while pending is refused
select throws_ok(
  $$
  select public.claim_reward('reward-cafe')
  $$,
  'claim_already_pending',
  'Second claim while first is pending raises claim_already_pending'
);

-- Member account shows open claim
select is(
  (public.get_my_account('reward-cafe') -> 'openClaim' ->> 'status'),
  'pending'::text,
  'get_my_account exposes open claim with pending status'
);

reset role;
insert into tests.ids
select 'claim_1', id from public.reward_claims where customer_id = tests.id('cust_maria');

-- Cross-shop: Owner B cannot settle Owner A claim
select tests.act_as(tests.id('owner_b'));

select throws_ok(
  $$
  select public.settle_reward_claim(tests.id('claim_1'), true)
  $$,
  'not_allowed',
  'Owner B cannot settle claim for Shop A'
);

-- Owner A can settle claim (cancellation restores stamps)
select tests.act_as(tests.id('owner_a'));

select lives_ok(
  $$
  select public.settle_reward_claim(tests.id('claim_1'), false)
  $$,
  'Owner A can cancel claim'
);

-- Verify status is cancelled and reversed stamps were logged
select is(
  (select status from public.reward_claims where id = tests.id('claim_1')),
  'cancelled'::text,
  'Claim status is now cancelled'
);

select is(
  (select count(*) from public.loyalty_ledger where claim_id = tests.id('claim_1') and reason = 'reversed'),
  1::bigint,
  'Loyalty ledger has reversed entry restoring stamps'
);

-- 6. Deleting the reward variant raises foreign key error (translated to friendly error by API)
select tests.act_as(tests.id('owner_a'));
update public.loyalty_rules
set
  reward_kind = 'free_item',
  reward_item_id = tests.id('itm_donut'),
  reward_variant_id = tests.id('var_donut_single')
where tenant_id = tests.id('shop_cafe');

select throws_ok(
  $$ delete from public.item_variants where id = tests.id('var_donut_single') $$,
  '23503',
  null,
  'deleting the reward variant raises the friendly error'
);

-- 7. Deleting a customer who has a claim cascades and works
reset role;
select lives_ok(
  $$ delete from public.customers where id = tests.id('cust_maria') $$,
  'deleting a customer who has a claim still works'
);

select is(
  (select count(*) from public.reward_claims where id = tests.id('claim_1')),
  0::bigint,
  'Customer claims are removed on cascade'
);

select * from finish();
rollback;
