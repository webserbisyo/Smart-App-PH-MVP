-- P5.2: get_storefront (what a visitor sees), private.is_open_now against the core open-hours cases, demo tools.
-- Acts as owner A (active shop with hidden things), owners P and S (pending and suspended shops) and a visitor.
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

grant execute on all functions in schema tests to anon, authenticated;

create table tests.ids (name text primary key, id uuid);
grant select on tests.ids to anon, authenticated;

create function tests.id(p_name text)
returns uuid
language sql
stable
as $$ select id from tests.ids where name = p_name $$;
grant execute on function tests.id(text) to anon, authenticated;

-- The storefront as a visitor sees it, saved so the checks below run as the test user.
create table tests.seen (slug text primary key, body jsonb);
grant select, insert on tests.seen to anon;

insert into tests.ids values
  ('a', tests.create_user('owner-a@example.com')),
  ('p', tests.create_user('owner-p@example.com')),
  ('s', tests.create_user('owner-s@example.com'));

select tests.act_as(tests.id('a'));
select public.create_my_shop('food', 'Shop A', 'shop-a');
reset role;
select tests.act_as(tests.id('p'));
select public.create_my_shop('food', 'Shop P', 'shop-p');
reset role;
select tests.act_as(tests.id('s'));
select public.create_my_shop('retail', 'Shop S', 'shop-s');
reset role;

insert into tests.ids
select 'shop_' || replace(t.slug, 'shop-', ''), t.id from public.tenants t where t.slug in ('shop-a', 'shop-p', 'shop-s');
update public.tenants set status = 'active' where slug = 'shop-a';
update public.tenants set status = 'suspended' where slug = 'shop-s';

-- Shop A's catalog: what a visitor sees, and one of each thing a visitor must not see.
with c as (
  insert into public.categories (tenant_id, name, icon_kind, icon_value, sort)
  values (tests.id('shop_a'), 'Coffee', 'emoji', '☕', 1)
  returning id
)
insert into tests.ids select 'cat_shown', id from c;
with c as (
  insert into public.categories (tenant_id, name, is_hidden, sort) values (tests.id('shop_a'), 'Secret menu', true, 2) returning id
)
insert into tests.ids select 'cat_hidden', id from c;

insert into public.items (tenant_id, category_id, name, status, sort) values
  (tests.id('shop_a'), tests.id('cat_shown'), 'Latte', 'active', 1),
  (tests.id('shop_a'), tests.id('cat_shown'), 'Hidden Mocha', 'hidden', 2),
  (tests.id('shop_a'), tests.id('cat_shown'), 'Archived Frappe', 'archived', 3),
  (tests.id('shop_a'), tests.id('cat_hidden'), 'Off-menu Cortado', 'active', 4),
  (tests.id('shop_a'), tests.id('cat_shown'), 'No-size Tea', 'active', 5);
insert into tests.ids select 'item_' || lower(split_part(name, ' ', 1)), id from public.items where tenant_id = tests.id('shop_a');

insert into public.item_variants (tenant_id, item_id, name, price, sort, archived_at) values
  (tests.id('shop_a'), tests.id('item_latte'), 'Regular', 12000, 1, null),
  (tests.id('shop_a'), tests.id('item_latte'), 'Old size', 9000, 2, now()),
  (tests.id('shop_a'), tests.id('item_hidden'), 'Regular', 13000, 1, null),
  (tests.id('shop_a'), tests.id('item_archived'), 'Regular', 14000, 1, null),
  (tests.id('shop_a'), tests.id('item_off-menu'), 'Regular', 11000, 1, null),
  (tests.id('shop_a'), tests.id('item_no-size'), 'Retired', 8000, 1, now());

insert into public.payment_accounts (tenant_id, method, account_name, account_number, is_active, sort) values
  (tests.id('shop_a'), 'gcash', 'Shown GCash', '0917 000 0001', true, 1),
  (tests.id('shop_a'), 'maya', 'Hidden Maya', '0917 000 0002', false, 2);
insert into public.delivery_zones (tenant_id, name, fee, is_active, sort) values
  (tests.id('shop_a'), 'Shown zone', 5000, true, 1),
  (tests.id('shop_a'), 'Hidden zone', 7000, false, 2);
insert into public.closures (tenant_id, closed_on, note) values
  (tests.id('shop_a'), (now() at time zone 'Asia/Manila')::date - 1, 'Yesterday'),
  (tests.id('shop_a'), (now() at time zone 'Asia/Manila')::date + 1, 'Tomorrow');
update public.shop_settings set show_member_count = false where tenant_id = tests.id('shop_a');

-- ---------------------------------------------------------------------------
-- 1. get_storefront as a visitor
-- ---------------------------------------------------------------------------

select tests.act_as_anon();
select lives_ok($$ insert into tests.seen values ('shop-a', public.get_storefront('shop-a')) $$, 'a visitor can read an active shop');
select throws_ok($$ select public.get_storefront('shop-p') $$, 'P0001', 'shop_not_found', 'a pending shop is not found');
select throws_ok($$ select public.get_storefront('shop-s') $$, 'P0001', 'shop_not_found', 'a suspended shop is not found');
select throws_ok($$ select public.get_storefront('no-such-shop') $$, 'P0001', 'shop_not_found', 'an unknown slug is not found');
reset role;

create function tests.shop_a()
returns jsonb
language sql
stable
as $$ select body from tests.seen where slug = 'shop-a' $$;

select is(tests.shop_a() #>> '{shop,name}', 'Shop A', 'the shop name comes back');
select ok(not (tests.shop_a() -> 'shop') ?| array['plan', 'paidUntil', 'status'], 'no plan, paidUntil or status key');
select is(
  (select array_agg(key order by key) from jsonb_object_keys(tests.shop_a()) key),
  array['about', 'announcement', 'banners', 'categories', 'closures', 'deliveryZones', 'googleReviewUrl', 'hours', 'isOpen', 'items', 'memberCount', 'paymentAccounts', 'shop', 'stampRule'],
  'the result has the Storefront keys'
);
select is(
  (select array_agg(c ->> 'name') from jsonb_array_elements(tests.shop_a() -> 'categories') c),
  array['Coffee'],
  'hidden categories are left out'
);
select is(tests.shop_a() #>> '{categories,0,icon,value}', '☕', 'a category carries its icon');
select is(
  (select array_agg(i ->> 'name') from jsonb_array_elements(tests.shop_a() -> 'items') i),
  array['Latte'],
  'hidden and archived items, items in hidden categories and items with no variant for sale are left out'
);
select is(
  (select array_agg(v ->> 'name') from jsonb_array_elements(tests.shop_a() #> '{items,0,variants}') v),
  array['Regular'],
  'archived variants are left out'
);
select is(
  (select array_agg(a ->> 'accountName') from jsonb_array_elements(tests.shop_a() -> 'paymentAccounts') a),
  array['Shown GCash'],
  'inactive payment accounts are left out'
);
select is(
  (select array_agg(z ->> 'name') from jsonb_array_elements(tests.shop_a() -> 'deliveryZones') z),
  array['Shown zone'],
  'inactive zones are left out'
);
select is(
  (select array_agg(c ->> 'note') from jsonb_array_elements(tests.shop_a() -> 'closures') c),
  array['Tomorrow'],
  'only closures from today on'
);
select is(jsonb_array_length(tests.shop_a() -> 'hours'), 7, 'the default hours come back');
select is(tests.shop_a() -> 'memberCount', 'null'::jsonb, 'memberCount is null when the owner hides it');
select is(tests.shop_a() -> 'stampRule', 'null'::jsonb, 'stampRule is null until P5.5');

update public.shop_settings set show_member_count = true where tenant_id = tests.id('shop_a');
select is(public.get_storefront('shop-a') -> 'memberCount', '0'::jsonb, 'memberCount is 0 when shown (real count in P5.5)');

update public.shop_settings set accepting_orders = false where tenant_id = tests.id('shop_a');
select is(public.get_storefront('shop-a') -> 'isOpen', 'false'::jsonb, 'a paused shop is not open');
update public.shop_settings set accepting_orders = true, busy_until = now() + interval '30 minutes' where tenant_id = tests.id('shop_a');
select is(public.get_storefront('shop-a') -> 'isOpen', 'false'::jsonb, 'a busy shop is not open');

select tests.act_as(tests.id('a'));
select lives_ok($$ select public.get_storefront('shop-a') $$, 'a signed-in user can read it too');
reset role;

-- ---------------------------------------------------------------------------
-- 2. private.is_open_now gives the same answers as packages/core openState
-- ---------------------------------------------------------------------------

-- One row per case in packages/core/src/test/open-cases.ts, in the same order (open-cases.test.ts counts them).
-- hours: [weekday, opens, closes] rows; 'all' rows mean every weekday 0 to 6.
create table tests.open_cases (name text, hours jsonb, closures date[], at timestamptz, expected boolean);
insert into tests.open_cases values
-- open-cases:start
('inside normal hours', '[["all", "08:00", "20:00"]]', '{}', '2026-10-12T10:00:00+08:00', true),
('before opening', '[["all", "08:00", "20:00"]]', '{}', '2026-10-12T07:59:00+08:00', false),
('closing time itself is closed', '[["all", "08:00", "20:00"]]', '{}', '2026-10-12T20:00:00+08:00', false),
('overnight, before midnight', '[["all", "18:00", "02:00"]]', '{}', '2026-10-12T23:30:00+08:00', true),
('overnight, after midnight (yesterday''s hours)', '[[1, "18:00", "02:00"]]', '{}', '2026-10-13T01:00:00+08:00', true),
('overnight, after closing', '[[1, "18:00", "02:00"]]', '{}', '2026-10-13T03:00:00+08:00', false),
('closure today wins over hours', '[["all", "08:00", "20:00"]]', '{2026-10-12}', '2026-10-12T10:00:00+08:00', false),
('closure today also ends yesterday''s overnight hours', '[["all", "18:00", "02:00"]]', '{2026-10-13}', '2026-10-13T01:00:00+08:00', false),
('no hours means closed', '[]', '{}', '2026-10-12T10:00:00+08:00', false),
('Sunday to Monday: closed on Sunday, opens Monday', '[[1, "09:00", "17:00"], [2, "09:00", "17:00"], [3, "09:00", "17:00"], [4, "09:00", "17:00"], [5, "09:00", "17:00"], [6, "09:00", "17:00"]]', '{}', '2026-10-11T12:00:00+08:00', false),
('Saturday overnight runs into Sunday', '[[6, "20:00", "03:00"]]', '{}', '2026-10-11T02:30:00+08:00', true),
('device in another time zone still uses Manila time', '[["all", "08:00", "20:00"]]', '{}', '2026-10-12T01:00:00Z', true);
-- open-cases:end

-- Gives shop P one case's hours and closures, then asks private.is_open_now.
create function tests.open_case(p_hours jsonb, p_closures date[], p_at timestamptz)
returns boolean
language plpgsql
as $$
begin
  delete from public.business_hours where tenant_id = tests.id('shop_p');
  delete from public.closures where tenant_id = tests.id('shop_p');
  insert into public.business_hours (tenant_id, weekday, opens_at, closes_at)
  select tests.id('shop_p'), d.weekday, (h ->> 1)::time, (h ->> 2)::time
  from jsonb_array_elements(p_hours) h
  cross join lateral (
    select generate_series(0, 6) as weekday where h ->> 0 = 'all'
    union all
    select (h ->> 0)::integer where h ->> 0 <> 'all'
  ) d;
  insert into public.closures (tenant_id, closed_on) select tests.id('shop_p'), unnest(p_closures);
  return private.is_open_now(tests.id('shop_p'), p_at);
end;
$$;

select is(tests.open_case(c.hours, c.closures, c.at), c.expected, 'is_open_now: ' || c.name) from tests.open_cases c;

-- ---------------------------------------------------------------------------
-- 3. Demo tools
-- ---------------------------------------------------------------------------

select throws_ok($$ select private.demo_seed_catalog('shop-a') $$, 'P0001', 'not_allowed', 'demo_seed_catalog refuses a shop that is not a demo');
select is((select count(*)::integer from public.items where tenant_id = tests.id('shop_a')), 5, 'and leaves its catalog alone');

select lives_ok($$ select private.demo_setup() $$, 'demo_setup runs');
select lives_ok($$ select private.demo_setup() $$, 'and runs again (refresh)');
select is(
  (select array_agg(slug order by slug) from public.tenants where is_demo and status = 'active' and plan = 'demo'),
  array['juans-cafe', 'tala-apparel'],
  'both demo shops are active demos'
);
select ok(
  (select count(*) from public.items i join public.tenants t on t.id = i.tenant_id where t.slug = 'juans-cafe') between 14 and 20,
  'Juan''s Cafe has about 16 items'
);
select ok(
  (select count(*) from public.items i join public.tenants t on t.id = i.tenant_id where t.slug = 'tala-apparel') between 12 and 18,
  'Tala Apparel has about 14 items'
);
select ok(
  not exists (
    select 1 from public.item_variants v join public.items i on i.id = v.item_id join public.tenants t on t.id = i.tenant_id
    where t.slug = 'tala-apparel' and v.stock_on_hand is null
  ),
  'every Tala variant counts stock'
);

select tests.act_as_anon();
select lives_ok($$ select public.get_storefront('juans-cafe') $$, 'a visitor can read Juan''s Cafe');
select lives_ok($$ select public.get_storefront('tala-apparel') $$, 'a visitor can read Tala Apparel');
select throws_ok($$ select private.demo_setup() $$, '42501', null, 'a visitor cannot run demo_setup');
reset role;
select tests.act_as(tests.id('a'));
select throws_ok($$ select private.demo_seed_catalog('juans-cafe') $$, '42501', null, 'an owner cannot run demo_seed_catalog');
reset role;

select ok(
  not has_function_privilege(r.role, p.oid, 'execute'),
  r.role || ' cannot execute ' || p.proname
)
from pg_proc p
cross join (values ('anon'), ('authenticated')) r (role)
where p.pronamespace = 'private'::regnamespace and p.proname like 'demo\_%'
order by p.proname, r.role;

select * from finish();
rollback;
