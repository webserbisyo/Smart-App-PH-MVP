-- P5.1: settings and catalog tables, storage, save_item, set_stock, save_sort_order, default hours.
-- Acts as owner A (active shop), owner B (active shop), owner P (pending shop) and an anonymous visitor.
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

insert into tests.ids values
  ('a', tests.create_user('owner-a@example.com')),
  ('b', tests.create_user('owner-b@example.com')),
  ('p', tests.create_user('owner-p@example.com'));

-- Three shops: A and B approved, P still pending.
select tests.act_as(tests.id('a'));
select public.create_my_shop('food', 'Shop A', 'shop-a');
reset role;
select tests.act_as(tests.id('b'));
select public.create_my_shop('retail', 'Shop B', 'shop-b');
reset role;
select tests.act_as(tests.id('p'));
select public.create_my_shop('food', 'Shop P', 'shop-p');
reset role;

insert into tests.ids
select 'shop_' || replace(t.slug, 'shop-', ''), t.id from public.tenants t where t.slug in ('shop-a', 'shop-b', 'shop-p');
update public.tenants set status = 'active' where slug in ('shop-a', 'shop-b');

-- ---------------------------------------------------------------------------
-- 1. A new shop gets 7 default hours rows, 08:00 to 20:00
-- ---------------------------------------------------------------------------

select is((select count(*)::integer from public.business_hours where tenant_id = tests.id('shop_a')), 7, 'a new shop gets 7 hours rows');
select ok(
  (select bool_and(opens_at = '08:00' and closes_at = '20:00') from public.business_hours where tenant_id = tests.id('shop_a')),
  'default hours are 08:00 to 20:00'
);

-- ---------------------------------------------------------------------------
-- 2. Owner A writes every table in shop A
-- ---------------------------------------------------------------------------

select tests.act_as(tests.id('a'));

select lives_ok($$ update public.business_hours set opens_at = '06:00', closes_at = '02:00' where tenant_id = tests.id('shop_a') and weekday = 5 $$, 'A changes hours (overnight allowed)');
select throws_ok($$ update public.business_hours set closes_at = opens_at where tenant_id = tests.id('shop_a') and weekday = 1 $$, '23514', null, 'opening and closing at the same time is refused');
select lives_ok($$ delete from public.business_hours where tenant_id = tests.id('shop_a') and weekday = 0 $$, 'A removes Sunday');
select lives_ok($$ insert into public.business_hours (tenant_id, weekday, opens_at, closes_at) values (tests.id('shop_a'), 0, '09:00', '17:00') $$, 'A adds Sunday back');
select lives_ok($$ insert into public.closures (tenant_id, closed_on, note) values (tests.id('shop_a'), '2026-12-25', 'Christmas') $$, 'A adds a closure');
select throws_ok($$ insert into public.closures (tenant_id, closed_on, note) values (tests.id('shop_a'), '2026-12-31', repeat('x', 81)) $$, '23514', null, 'a closure note over 80 characters is refused');
select lives_ok($$ insert into public.payment_accounts (tenant_id, method, account_name, account_number) values (tests.id('shop_a'), 'gcash', 'Ana Cruz', '09171234567') $$, 'A adds a GCash account');
select throws_ok($$ insert into public.payment_accounts (tenant_id, method, account_name, account_number) values (tests.id('shop_a'), 'bank', 'Ana Cruz', '0012345') $$, '23514', null, 'a bank account needs a bank name');
select throws_ok($$ insert into public.payment_accounts (tenant_id, method, account_name, account_number, qr_path) values (tests.id('shop_a'), 'maya', 'Ana', '0917', tests.id('shop_b')::text || '/qr/x.webp') $$, '23514', null, 'a QR path in another shop''s folder is refused');
select lives_ok($$ insert into public.delivery_zones (tenant_id, name, fee, eta_text) values (tests.id('shop_a'), 'Poblacion', 5000, '30 to 45 min') $$, 'A adds a delivery zone');
select throws_ok($$ insert into public.delivery_zones (tenant_id, name, fee) values (tests.id('shop_a'), 'Bad', -1) $$, '23514', null, 'a negative fee is refused');
select lives_ok($$ insert into public.categories (tenant_id, name, icon_kind, icon_value) values (tests.id('shop_a'), 'Coffee', 'fluent', 'coffee') $$, 'A adds a category with a Fluent icon');
select throws_ok($$ insert into public.categories (tenant_id, name, icon_kind) values (tests.id('shop_a'), 'Tea', 'emoji') $$, '23514', null, 'an icon kind without a value is refused');
select lives_ok($$ insert into public.option_groups (tenant_id, name, min_select, max_select) values (tests.id('shop_a'), 'Sugar', 1, 1) $$, 'A adds an option group');
select throws_ok($$ insert into public.option_groups (tenant_id, name, min_select, max_select) values (tests.id('shop_a'), 'Bad', 2, 1) $$, '23514', null, 'max below min is refused');
select lives_ok(
  $$ insert into public.options (tenant_id, group_id, name, price_delta)
     select tests.id('shop_a'), g.id, '50%', 0 from public.option_groups g where g.tenant_id = tests.id('shop_a') $$,
  'A adds an option'
);

reset role;
insert into tests.ids
select 'cat_a', id from public.categories where tenant_id = tests.id('shop_a') and name = 'Coffee'
union all select 'group_a', id from public.option_groups where tenant_id = tests.id('shop_a') and name = 'Sugar';

-- save_item: one transaction for the item, variants, photos and option groups.
select tests.act_as(tests.id('a'));
select lives_ok(
  format(
    $$ select public.save_item(%L::jsonb) $$,
    jsonb_build_object(
      'tenantId', tests.id('shop_a'), 'categoryId', tests.id('cat_a'), 'name', 'Iced Latte', 'description', null,
      'status', 'active', 'isFeatured', true, 'trackStock', true,
      'variants', jsonb_build_array(
        jsonb_build_object('name', 'Regular', 'price', 12000, 'lowStockAt', 5, 'isSoldOut', false),
        jsonb_build_object('name', 'Large', 'price', 15000, 'lowStockAt', null, 'isSoldOut', false)
      ),
      'photoPaths', jsonb_build_array(tests.id('shop_a')::text || '/items/one.webp', tests.id('shop_a')::text || '/items/two.webp'),
      'optionGroupIds', jsonb_build_array(tests.id('group_a'))
    )
  ),
  'A saves an item with 2 variants, 2 photos and an option group'
);
reset role;

insert into tests.ids select 'item_a', id from public.items where tenant_id = tests.id('shop_a') and name = 'Iced Latte';
insert into tests.ids select 'variant_a', id from public.item_variants where item_id = tests.id('item_a') and name = 'Regular';
insert into tests.ids select 'variant_a_large', id from public.item_variants where item_id = tests.id('item_a') and name = 'Large';

select is((select count(*)::integer from public.item_variants where item_id = tests.id('item_a')), 2, 'save_item made 2 variants');
select is((select path from public.item_photos where item_id = tests.id('item_a') and sort = 0), tests.id('shop_a')::text || '/items/one.webp', 'the first photo is sort 0');
select is((select count(*)::integer from public.item_option_groups where item_id = tests.id('item_a')), 1, 'save_item linked the option group');

-- The result is the CatalogItem shape.
select tests.act_as(tests.id('a'));
select is(
  (select private.catalog_item_json(tests.id('item_a')) -> 'variants' -> 1 ->> 'name'),
  'Large',
  'the CatalogItem lists variants in order'
);

-- Saving again without Large archives it (never deletes it).
select lives_ok(
  format(
    $$ select public.save_item(%L::jsonb) $$,
    jsonb_build_object(
      'id', tests.id('item_a'), 'tenantId', tests.id('shop_a'), 'categoryId', tests.id('cat_a'), 'name', 'Iced Latte',
      'status', 'active', 'isFeatured', true, 'trackStock', true,
      'variants', jsonb_build_array(jsonb_build_object('id', tests.id('variant_a'), 'name', 'Regular', 'price', 13000, 'lowStockAt', 5, 'isSoldOut', false)),
      'photoPaths', jsonb_build_array(tests.id('shop_a')::text || '/items/two.webp'),
      'optionGroupIds', '[]'::jsonb
    )
  ),
  'A saves the item again with one variant'
);
select is((select price from public.item_variants where id = tests.id('variant_a')), 13000, 'the kept variant got the new price');
select ok((select archived_at is not null from public.item_variants where id = tests.id('variant_a_large')), 'the missing variant is archived');
select is(jsonb_array_length(private.catalog_item_json(tests.id('item_a')) -> 'variants'), 1, 'archived variants are left out of the CatalogItem');
select is((select count(*)::integer from public.item_photos where item_id = tests.id('item_a')), 1, 'photos are replaced');

select throws_ok(
  format(
    $$ select public.save_item(%L::jsonb) $$,
    jsonb_build_object('tenantId', tests.id('shop_a'), 'name', 'No variants', 'variants', '[]'::jsonb)
  ),
  'P0001', 'variant_required', 'save_item with no variant raises variant_required'
);
select throws_ok(
  format(
    $$ select public.save_item(%L::jsonb) $$,
    jsonb_build_object(
      'tenantId', tests.id('shop_a'), 'name', 'Bad photo',
      'variants', jsonb_build_array(jsonb_build_object('name', 'Regular', 'price', 100)),
      'photoPaths', jsonb_build_array(tests.id('shop_b')::text || '/items/x.webp')
    )
  ),
  'P0001', 'invalid', 'a photo path outside the shop''s items folder raises invalid'
);
select throws_ok(
  format(
    $$ select public.save_item(%L::jsonb) $$,
    jsonb_build_object(
      'tenantId', tests.id('shop_a'), 'name', 'Negative',
      'variants', jsonb_build_array(jsonb_build_object('name', 'Regular', 'price', -5))
    )
  ),
  'P0001', 'invalid', 'a negative price raises invalid'
);

-- Owner A cannot write stock directly (decision D6).
select throws_ok($$ update public.item_variants set stock_on_hand = 99 where id = tests.id('variant_a') $$, '42501', null, 'A cannot update stock_on_hand directly');
select throws_ok(
  $$ insert into public.item_variants (tenant_id, item_id, name, price, stock_on_hand) values (tests.id('shop_a'), tests.id('item_a'), 'Hack', 100, 5) $$,
  '42501', null, 'A cannot insert a variant with stock'
);
select throws_ok($$ update public.items set tenant_id = tests.id('shop_b') where id = tests.id('item_a') $$, '42501', null, 'A cannot move an item to another shop');

-- set_stock works for A and clears sold out.
select lives_ok($$ update public.item_variants set is_sold_out = true where id = tests.id('variant_a') $$, 'A marks a variant sold out');
select is((select (public.set_stock(tests.id('variant_a'), 12)).stock_on_hand), 12, 'set_stock sets the count');
select is((select is_sold_out from public.item_variants where id = tests.id('variant_a')), false, 'stock above 0 clears sold out');
select throws_ok($$ select public.set_stock(tests.id('variant_a'), -1) $$, 'P0001', 'invalid', 'negative stock raises invalid');

-- save_sort_order rewrites sort in the given order.
select lives_ok(
  $$ insert into public.categories (tenant_id, name) values (tests.id('shop_a'), 'Tea'), (tests.id('shop_a'), 'Pastries') $$,
  'A adds two more categories'
);
select lives_ok(
  $$ select public.save_sort_order('categories', array(select id from public.categories where tenant_id = tests.id('shop_a') order by name desc)) $$,
  'A sorts the categories'
);
select is(
  (select array_agg(name order by sort) from public.categories where tenant_id = tests.id('shop_a')),
  array['Tea', 'Pastries', 'Coffee'],
  'categories follow the new order'
);
select throws_ok($$ select public.save_sort_order('tenants', array[tests.id('shop_a')]) $$, 'P0001', 'invalid', 'an unknown kind raises invalid');

-- A category with items cannot be removed.
select throws_ok($$ delete from public.categories where id = tests.id('cat_a') $$, '23503', null, 'a category with items cannot be removed');
reset role;

-- ---------------------------------------------------------------------------
-- 3. Owner B cannot read or write shop A, and cannot point at shop A's rows
-- ---------------------------------------------------------------------------

select tests.act_as(tests.id('b'));

select is((select count(*)::integer from public.items where tenant_id = tests.id('shop_a')), 0, 'B cannot read A''s items');
select is((select count(*)::integer from public.categories where tenant_id = tests.id('shop_a')), 0, 'B cannot read A''s categories');
select is((select count(*)::integer from public.business_hours where tenant_id = tests.id('shop_a')), 0, 'B cannot read A''s hours');
select is((select count(*)::integer from public.payment_accounts where tenant_id = tests.id('shop_a')), 0, 'B cannot read A''s payment accounts');
select is((select count(*)::integer from public.item_variants where tenant_id = tests.id('shop_a')), 0, 'B cannot read A''s variants');

update public.items set name = 'hacked' where id = tests.id('item_a');
delete from public.categories where tenant_id = tests.id('shop_a');
select throws_ok(
  $$ insert into public.categories (tenant_id, name) values (tests.id('shop_a'), 'Spam') $$,
  '42501', null, 'B cannot insert into A''s shop'
);

-- B's own catalog cannot point at A's category or A's option group (composite foreign keys).
select lives_ok($$ insert into public.option_groups (tenant_id, name) values (tests.id('shop_b'), 'Size') $$, 'B adds an option group');
select throws_ok(
  $$ insert into public.items (tenant_id, category_id, name) values (tests.id('shop_b'), tests.id('cat_a'), 'Stolen category') $$,
  '23503', null, 'B cannot point an item at A''s category'
);
select lives_ok($$ insert into public.items (tenant_id, name) values (tests.id('shop_b'), 'Tee') $$, 'B adds an item');
select throws_ok(
  $$ insert into public.item_option_groups (tenant_id, item_id, group_id)
     select tests.id('shop_b'), i.id, tests.id('group_a') from public.items i where i.tenant_id = tests.id('shop_b') $$,
  '23503', null, 'B cannot link A''s option group'
);
select throws_ok(
  $$ insert into public.item_variants (tenant_id, item_id, name, price) values (tests.id('shop_b'), tests.id('item_a'), 'Hack', 1) $$,
  '23503', null, 'B cannot add a variant to A''s item'
);
select throws_ok(
  format(
    $$ select public.save_item(%L::jsonb) $$,
    jsonb_build_object('id', tests.id('item_a'), 'tenantId', tests.id('shop_a'), 'name', 'Hacked',
      'variants', jsonb_build_array(jsonb_build_object('name', 'Regular', 'price', 1)))
  ),
  'P0001', 'invalid', 'B cannot save A''s item'
);

select throws_ok($$ select public.set_stock(tests.id('variant_a'), 0) $$, 'P0001', 'not_allowed', 'set_stock raises not_allowed for B');
select throws_ok(
  $$ select public.save_sort_order('categories', array[tests.id('cat_a')]) $$,
  'P0001', 'invalid', 'B cannot sort A''s categories'
);
reset role;

select is((select name from public.items where id = tests.id('item_a')), 'Iced Latte', 'B''s update did not touch A''s item');
select is((select count(*)::integer from public.categories where tenant_id = tests.id('shop_a')), 3, 'B''s delete did not touch A''s categories');
select is((select stock_on_hand from public.item_variants where id = tests.id('variant_a')), 12, 'B''s set_stock did not change A''s stock');

-- ---------------------------------------------------------------------------
-- 4. A pending shop's owner reads but cannot write
-- ---------------------------------------------------------------------------

select tests.act_as(tests.id('p'));
select is((select count(*)::integer from public.business_hours where tenant_id = tests.id('shop_p')), 7, 'P reads their own hours');
select throws_ok(
  $$ insert into public.categories (tenant_id, name) values (tests.id('shop_p'), 'Coffee') $$,
  '42501', null, 'a pending shop cannot add categories'
);
reset role;

-- set_stock refuses an owner whose shop is no longer active.
update public.tenants set status = 'suspended' where id = tests.id('shop_a');
select tests.act_as(tests.id('a'));
select throws_ok($$ select public.set_stock(tests.id('variant_a'), 3) $$, 'P0001', 'not_allowed', 'set_stock raises not_allowed when the shop is not active');
reset role;
update public.tenants set status = 'active' where id = tests.id('shop_a');

-- ---------------------------------------------------------------------------
-- 5. anon reads none of these tables and calls none of the functions
-- ---------------------------------------------------------------------------

select tests.act_as_anon();
select throws_ok($$ select * from public.business_hours $$, '42501', null, 'anon cannot read business_hours');
select throws_ok($$ select * from public.closures $$, '42501', null, 'anon cannot read closures');
select throws_ok($$ select * from public.payment_accounts $$, '42501', null, 'anon cannot read payment_accounts');
select throws_ok($$ select * from public.delivery_zones $$, '42501', null, 'anon cannot read delivery_zones');
select throws_ok($$ select * from public.categories $$, '42501', null, 'anon cannot read categories');
select throws_ok($$ select * from public.items $$, '42501', null, 'anon cannot read items');
select throws_ok($$ select * from public.item_photos $$, '42501', null, 'anon cannot read item_photos');
select throws_ok($$ select * from public.item_variants $$, '42501', null, 'anon cannot read item_variants');
select throws_ok($$ select * from public.option_groups $$, '42501', null, 'anon cannot read option_groups');
select throws_ok($$ select * from public.options $$, '42501', null, 'anon cannot read options');
select throws_ok($$ select * from public.item_option_groups $$, '42501', null, 'anon cannot read item_option_groups');
select throws_ok($$ select public.save_item('{}'::jsonb) $$, '42501', null, 'anon cannot call save_item');
select throws_ok($$ select public.set_stock(tests.id('variant_a'), 1) $$, '42501', null, 'anon cannot call set_stock');
reset role;

select ok(not has_function_privilege('authenticated', 'private.is_open_now(uuid, timestamptz)', 'execute'), 'clients cannot call is_open_now');

-- ---------------------------------------------------------------------------
-- 5b. is_open_now follows the cases in packages/core/src/test/open-cases.ts (shop B: 08:00 to 20:00 every day)
-- ---------------------------------------------------------------------------

select ok(private.is_open_now(tests.id('shop_b'), '2026-10-12T10:00:00+08:00'), 'open inside normal hours');
select ok(not private.is_open_now(tests.id('shop_b'), '2026-10-12T07:59:00+08:00'), 'closed before opening');
select ok(not private.is_open_now(tests.id('shop_b'), '2026-10-12T20:00:00+08:00'), 'closing time itself is closed');
select ok(private.is_open_now(tests.id('shop_b'), '2026-10-12T02:00:00Z'), 'Manila time, not UTC');
update public.business_hours set opens_at = '18:00', closes_at = '02:00' where tenant_id = tests.id('shop_b') and weekday = 1;
select ok(private.is_open_now(tests.id('shop_b'), '2026-10-12T23:30:00+08:00'), 'overnight, before midnight');
select ok(private.is_open_now(tests.id('shop_b'), '2026-10-13T01:00:00+08:00'), 'overnight, after midnight (yesterday''s hours)');
insert into public.closures (tenant_id, closed_on) values (tests.id('shop_b'), '2026-10-13');
select ok(not private.is_open_now(tests.id('shop_b'), '2026-10-13T01:00:00+08:00'), 'a closure today also ends yesterday''s overnight hours');
select ok(not private.is_open_now(tests.id('shop_b'), '2026-10-13T10:00:00+08:00'), 'closure today wins over hours');
delete from public.business_hours where tenant_id = tests.id('shop_b');
select ok(not private.is_open_now(tests.id('shop_b'), '2026-10-12T10:00:00+08:00'), 'no hours means closed');

-- ---------------------------------------------------------------------------
-- 6. Storage: owners write only their own shop's folder in shop-media
-- ---------------------------------------------------------------------------

select ok((select public from storage.buckets where id = 'shop-media'), 'shop-media is public');
select ok((select not public from storage.buckets where id = 'payment-proofs'), 'payment-proofs is private');

select tests.act_as(tests.id('a'));
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('shop-media', tests.id('shop_a')::text || '/items/a.webp', tests.id('a')) $$,
  'A uploads into shop A''s folder'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('shop-media', tests.id('shop_b')::text || '/items/a.webp', tests.id('a')) $$,
  '42501', null, 'A cannot upload into shop B''s folder'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('shop-media', 'not-a-shop/items/a.webp', tests.id('a')) $$,
  '42501', null, 'A cannot upload outside a shop folder'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('payment-proofs', tests.id('shop_a')::text || '/x/a.webp', tests.id('a')) $$,
  '42501', null, 'payment-proofs has no owner upload policy yet'
);
reset role;

select tests.act_as(tests.id('b'));
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'shop-media' and name like tests.id('shop_a')::text || '/%'),
  0,
  'B cannot list shop A''s files'
);
reset role;
-- Storage blocks deleting rows from SQL, so the delete policy is checked by its definition.
select is(
  (select qual from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'shop_media_delete_active_owner'),
  (select with_check from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'shop_media_insert_active_owner'),
  'deleting from shop-media uses the same owner-folder rule as uploading'
);

select * from finish();
rollback;
