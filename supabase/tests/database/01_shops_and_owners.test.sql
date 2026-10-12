-- P3a: shops, owners and settings. Acts as two owners and as an anonymous visitor.
create extension if not exists pgtap with schema extensions;

begin;
select * from no_plan();

-- ---------------------------------------------------------------------------
-- Helpers (kept in this file, rolled back with it)
-- ---------------------------------------------------------------------------

create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.create_user(p_email text, p_meta jsonb default '{}'::jsonb)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, p_meta, '{}'::jsonb, now(), now());
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

-- Ids shared between steps (written as postgres, read by every role).
create table tests.ids (name text primary key, id uuid);
grant select on tests.ids to anon, authenticated;

create function tests.id(p_name text)
returns uuid
language sql
stable
as $$ select id from tests.ids where name = p_name $$;
grant execute on function tests.id(text) to anon, authenticated;

insert into tests.ids values
  ('a', tests.create_user('owner-a@example.com', '{"display_name": "  Ana  "}')),
  ('b', tests.create_user('owner-b@example.com', '{"display_name": "Ben"}')),
  ('c', tests.create_user('customer@example.com'));

-- ---------------------------------------------------------------------------
-- 1. A new auth user gets a profile; no metadata means a null display name
-- ---------------------------------------------------------------------------

select is((select display_name from public.profiles where id = tests.id('a')), 'Ana', 'profile copies the trimmed display name');
select ok(exists (select 1 from public.profiles where id = tests.id('c')), 'a user with no metadata gets a profile');
select is((select display_name from public.profiles where id = tests.id('c')), null, 'no metadata means display_name is null');

-- ---------------------------------------------------------------------------
-- 2. create_my_shop creates a pending tenant, an owner membership and default settings
-- ---------------------------------------------------------------------------

select tests.act_as(tests.id('a'));
select lives_ok($$ select public.create_my_shop('food', '  Shop A  ', 'shop-a') $$, 'owner A creates a shop');
reset role;

insert into tests.ids values ('shop_a', (select id from public.tenants where slug = 'shop-a'));

select is((select status from public.tenants where id = tests.id('shop_a')), 'pending', 'a new shop is pending');
select is((select name from public.tenants where id = tests.id('shop_a')), 'Shop A', 'the shop name is trimmed');
select is(
  (select role from public.tenant_members where tenant_id = tests.id('shop_a') and user_id = tests.id('a')),
  'owner',
  'the creator is the owner'
);
select results_eq(
  $$ select color_primary, color_secondary, color_accent, accepting_orders, walk_in_enabled, pickup_enabled,
            delivery_enabled, cod_enabled, pay_later_pickup, delivery_fee_via_messenger, unpaid_expiry_minutes,
            show_member_count
     from public.shop_settings where tenant_id = tests.id('shop_a') $$,
  $$ values ('#FFFFFF', '#F4F7FA', '#2456D3', true, true, true, false, false, false, false, 30, true) $$,
  'settings row has the defaults'
);

-- ---------------------------------------------------------------------------
-- 3. One shop per owner
-- ---------------------------------------------------------------------------

select tests.act_as(tests.id('a'));
select throws_ok($$ select public.create_my_shop('retail', 'Second', 'shop-a-two') $$, 'P0001', 'already_has_shop', 'a second shop raises already_has_shop');
reset role;

-- ---------------------------------------------------------------------------
-- 4. Slug rules, and slug_available agrees
-- ---------------------------------------------------------------------------

select tests.act_as(tests.id('b'));
select throws_ok($$ select public.create_my_shop('retail', 'B', 'shop-a') $$, 'P0001', 'slug_taken', 'a taken slug raises slug_taken');
select throws_ok($$ select public.create_my_shop('retail', 'B', 'admin') $$, 'P0001', 'slug_reserved', 'a reserved slug raises slug_reserved');
select throws_ok($$ select public.create_my_shop('retail', 'B', 'Bad Slug') $$, 'P0001', 'slug_invalid', 'a badly formed slug raises slug_invalid');
select throws_ok($$ select public.create_my_shop('retail', 'B', 'ab') $$, 'P0001', 'slug_invalid', 'a short slug raises slug_invalid');
select throws_ok($$ select public.create_my_shop('cafe', 'B', 'shop-b') $$, 'P0001', 'invalid', 'a bad business type raises invalid');
select throws_ok($$ select public.create_my_shop('retail', '   ', 'shop-b') $$, 'P0001', 'invalid', 'a blank name raises invalid');
select is(public.slug_available('shop-a'), false, 'slug_available: taken');
select is(public.slug_available('admin'), false, 'slug_available: reserved');
select is(public.slug_available('Bad Slug'), false, 'slug_available: badly formed');
select is(public.slug_available('shop-b'), true, 'slug_available: free');
select lives_ok($$ select public.create_my_shop('retail', 'Shop B', 'shop-b') $$, 'owner B creates a shop');
reset role;

insert into tests.ids values ('shop_b', (select id from public.tenants where slug = 'shop-b'));

-- ---------------------------------------------------------------------------
-- 8. A pending shop's owner cannot change settings; after approval they can
-- ---------------------------------------------------------------------------

select tests.act_as(tests.id('a'));
update public.shop_settings set tagline = 'while pending' where tenant_id = tests.id('shop_a');
reset role;
select is((select tagline from public.shop_settings where tenant_id = tests.id('shop_a')), null, 'pending owner cannot update settings');

-- The Appendix A approve query, run as the founder.
update public.tenants set status = 'active', plan = 'early_599', paid_until = current_date + interval '1 month'
where slug in ('shop-a', 'shop-b');

select tests.act_as(tests.id('a'));
update public.shop_settings set tagline = 'Fresh coffee' where tenant_id = tests.id('shop_a');
update public.tenants set name = 'Shop A Renamed' where id = tests.id('shop_a');
reset role;
select is((select tagline from public.shop_settings where tenant_id = tests.id('shop_a')), 'Fresh coffee', 'active owner updates settings');
select is((select name from public.tenants where id = tests.id('shop_a')), 'Shop A Renamed', 'active owner updates the shop name');

-- ---------------------------------------------------------------------------
-- 5. Owner A sees only shop A
-- ---------------------------------------------------------------------------

select tests.act_as(tests.id('a'));
select results_eq($$ select id from public.tenants $$, $$ select tests.id('shop_a') $$, 'owner A sees only shop A in tenants');
select results_eq($$ select tenant_id from public.shop_settings $$, $$ select tests.id('shop_a') $$, 'owner A sees only shop A settings');
select results_eq($$ select tenant_id from public.tenant_members $$, $$ select tests.id('shop_a') $$, 'owner A sees only their own membership');
select is_empty($$ select 1 from public.tenants where id = tests.id('shop_b') $$, 'shop B by id returns nothing');
select is_empty($$ select 1 from public.shop_settings where tenant_id = tests.id('shop_b') $$, 'shop B settings by id return nothing');
select is_empty($$ select 1 from public.tenant_members where tenant_id = tests.id('shop_b') $$, 'shop B members by id return nothing');
select results_eq($$ select id from public.profiles $$, $$ select tests.id('a') $$, 'owner A sees only their own profile');

-- ---------------------------------------------------------------------------
-- 6. Owner A cannot change shop B
-- ---------------------------------------------------------------------------

update public.tenants set name = 'hacked' where id = tests.id('shop_b');
update public.shop_settings set tagline = 'hacked' where tenant_id = tests.id('shop_b');
update public.profiles set display_name = 'hacked' where id = tests.id('b');
reset role;
select is((select name from public.tenants where id = tests.id('shop_b')), 'Shop B', 'owner A cannot rename shop B');
select is((select tagline from public.shop_settings where tenant_id = tests.id('shop_b')), null, 'owner A cannot change shop B settings');
select is((select display_name from public.profiles where id = tests.id('b')), 'Ben', 'owner A cannot change owner B profile');

-- ---------------------------------------------------------------------------
-- 7. Owners never change status, paid_until, plan, slug or is_demo
-- ---------------------------------------------------------------------------

select tests.act_as(tests.id('a'));
select throws_ok($$ update public.tenants set status = 'active' where id = tests.id('shop_a') $$, '42501', null, 'owner cannot change status');
select throws_ok($$ update public.tenants set paid_until = '2099-01-01' where id = tests.id('shop_a') $$, '42501', null, 'owner cannot change paid_until');
select throws_ok($$ update public.tenants set plan = 'free' where id = tests.id('shop_a') $$, '42501', null, 'owner cannot change plan');
select throws_ok($$ update public.tenants set slug = 'new-slug' where id = tests.id('shop_a') $$, '42501', null, 'owner cannot change slug');
select throws_ok($$ update public.tenants set is_demo = true where id = tests.id('shop_a') $$, '42501', null, 'owner cannot change is_demo');
select throws_ok($$ update public.shop_settings set tenant_id = tests.id('shop_b') where tenant_id = tests.id('shop_a') $$, '42501', null, 'owner cannot move settings to another shop');

-- ---------------------------------------------------------------------------
-- 9. No direct inserts into tenants or tenant_members
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.tenant_members (tenant_id, user_id) values (tests.id('shop_b'), tests.id('a')) $$,
  '42501', null, 'owner A cannot insert into tenant_members'
);
select throws_ok(
  $$ insert into public.tenants (slug, name, business_type) values ('sneaky', 'Sneaky', 'food') $$,
  '42501', null, 'owner A cannot insert into tenants'
);
select throws_ok(
  $$ insert into public.shop_settings (tenant_id) values (tests.id('shop_b')) $$,
  '42501', null, 'owner A cannot insert into shop_settings'
);
select throws_ok($$ delete from public.tenants where id = tests.id('shop_a') $$, '42501', null, 'owner A cannot delete their shop');
reset role;

-- ---------------------------------------------------------------------------
-- 10. anon reads nothing and calls nothing
-- ---------------------------------------------------------------------------

select tests.act_as_anon();
select throws_ok($$ select 1 from public.tenants $$, '42501', null, 'anon cannot select tenants');
select throws_ok($$ select 1 from public.profiles $$, '42501', null, 'anon cannot select profiles');
select throws_ok($$ select 1 from public.tenant_members $$, '42501', null, 'anon cannot select tenant_members');
select throws_ok($$ select 1 from public.shop_settings $$, '42501', null, 'anon cannot select shop_settings');
select throws_ok($$ select public.create_my_shop('food', 'Anon', 'anon-shop') $$, '42501', null, 'anon cannot call create_my_shop');
select throws_ok($$ select public.slug_available('anon-shop') $$, '42501', null, 'anon cannot call slug_available');
reset role;

-- A signed-in caller with no session user (no sub) gets not_signed_in.
select set_config('request.jwt.claims', json_build_object('role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok($$ select public.create_my_shop('food', 'Nobody', 'nobody-shop') $$, 'P0001', 'not_signed_in', 'no user raises not_signed_in');
reset role;

-- ---------------------------------------------------------------------------
-- 12. Default privileges: a table or function added later is closed, not open
-- ---------------------------------------------------------------------------

create table public.tests_late_table (id int);
create function public.tests_late_function() returns int language sql as $$ select 1 $$;

select tests.act_as(tests.id('a'));
select throws_ok($$ select * from public.tests_late_table $$, '42501', null, 'a later table is not selectable by authenticated');
select throws_ok($$ select public.tests_late_function() $$, '42501', null, 'a later function is not executable by authenticated');
reset role;

select tests.act_as_anon();
select throws_ok($$ select * from public.tests_late_table $$, '42501', null, 'a later table is not selectable by anon');
select throws_ok($$ select public.tests_late_function() $$, '42501', null, 'a later function is not executable by anon');
reset role;

-- Nothing in private is executable by clients except the membership helpers, the slug check and, from P5.1, the
-- path helper (storage policies) and the CatalogItem builder (save_item runs as the caller), and from P5.3 the
-- payment-proof upload check, which anon runs too.
select is(
  (select array_agg(p.proname::text order by p.proname)
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and has_function_privilege('authenticated', p.oid, 'execute')),
  array['catalog_item_json', 'is_active_shop_owner', 'is_reserved_slug', 'is_shop_member', 'order_accepts_proof', 'try_uuid'],
  'authenticated executes only the listed private helpers'
);
select is(
  (select array_agg(p.proname::text order by p.proname)
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and has_function_privilege('anon', p.oid, 'execute')),
  array['order_accepts_proof', 'try_uuid'],
  'anon executes only the payment-proof upload check and the path helper in private'
);

select * from finish();
rollback;
