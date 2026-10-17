-- SF2 Step 1 tests: Shop content, banners, zone centres
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
grant select on tests.ids to anon, authenticated;
create function tests.id(p_name text) returns uuid language sql stable as $$ select id from tests.ids where name = p_name $$;
grant execute on function tests.id(text) to anon, authenticated;

-- Fixtures: Create two test shops with owners
insert into tests.ids values
  ('user_a', tests.create_user('sf2_a@example.com')),
  ('user_b', tests.create_user('sf2_b@example.com'));

select tests.act_as(tests.id('user_a'));
select public.create_my_shop('food', 'Shop Alpha', 'shop-alpha');
reset role;

select tests.act_as(tests.id('user_b'));
select public.create_my_shop('retail', 'Shop Beta', 'shop-beta');
reset role;

insert into tests.ids
select 'shop_' || replace(t.slug, 'shop-', ''), t.id from public.tenants t where t.slug in ('shop-alpha', 'shop-beta');
update public.tenants set status = 'active' where slug in ('shop-alpha', 'shop-beta');

-- 1. shop_settings announcement and review checks
select tests.act_as(tests.id('user_a'));

select lives_ok(
  $$
  update public.shop_settings
  set
    announcement_text = 'Flash sale today!',
    announcement_tone = 'promo',
    announcement_ends_at = now() + interval '1 day',
    about_text = 'Handcrafted coffee and pastries.',
    google_review_url = 'https://g.page/r/test-review'
  where tenant_id = tests.id('shop_alpha')
  $$,
  'Owner can update announcement, tone, about and google review url'
);

-- Invalid tone check
select throws_ok(
  $$
  update public.shop_settings
  set announcement_tone = 'invalid_tone'
  where tenant_id = tests.id('shop_alpha')
  $$,
  '23514',
  null,
  'Invalid announcement_tone is refused'
);

-- Invalid google review url host check
select throws_ok(
  $$
  update public.shop_settings
  set google_review_url = 'https://evil-site.com/review'
  where tenant_id = tests.id('shop_alpha')
  $$,
  '23514',
  null,
  'Non-Google review URL host is refused'
);

-- Valid alternative Google review URLs
select lives_ok(
  $$
  update public.shop_settings
  set google_review_url = 'https://search.google.com/local/writereview?placeid=123'
  where tenant_id = tests.id('shop_alpha')
  $$,
  'search.google.com review URL is accepted'
);

select lives_ok(
  $$
  update public.shop_settings
  set google_review_url = 'https://maps.app.goo.gl/abcxyz'
  where tenant_id = tests.id('shop_alpha')
  $$,
  'maps.app.goo.gl review URL is accepted'
);

-- 2. delivery_zones center checks
select lives_ok(
  $$
  insert into public.delivery_zones (tenant_id, name, fee, center_lat, center_lng)
  values (tests.id('shop_alpha'), 'Zone 1', 5000, 14.599512, 120.984222)
  $$,
  'Zone with valid lat/lng can be created'
);

-- Half center (only lat) is rejected
select throws_ok(
  $$
  insert into public.delivery_zones (tenant_id, name, fee, center_lat, center_lng)
  values (tests.id('shop_alpha'), 'Zone Half', 5000, 14.599512, null)
  $$,
  '23514',
  null,
  'Zone with only latitude is refused'
);

-- Out of range coordinates
select throws_ok(
  $$
  insert into public.delivery_zones (tenant_id, name, fee, center_lat, center_lng)
  values (tests.id('shop_alpha'), 'Zone OOB', 5000, 95.0, 120.0)
  $$,
  '23514',
  null,
  'Zone with latitude > 90 is refused'
);

-- 3. shop_banners: creation and checks
select lives_ok(
  $$
  insert into public.shop_banners (tenant_id, kind, image_path, title, sort, is_active)
  values (tests.id('shop_alpha'), 'image', 'banner1.webp', 'Banner 1', 1, true)
  $$,
  'Can create image banner'
);

select lives_ok(
  $$
  insert into public.shop_banners (tenant_id, kind, youtube_id, title, sort, is_active)
  values (tests.id('shop_alpha'), 'youtube', 'dQw4w9WgXcQ', 'Video Banner', 2, true)
  $$,
  'Can create 11-char youtube banner'
);

select lives_ok(
  $$
  insert into public.shop_banners (tenant_id, kind, image_path, title, sort, is_active)
  values (tests.id('shop_alpha'), 'image', 'banner3.webp', 'Banner 3', 3, true)
  $$,
  'Can create 3rd active banner'
);

-- 4th active banner is refused by trigger
select throws_ok(
  $$
  insert into public.shop_banners (tenant_id, kind, image_path, title, sort, is_active)
  values (tests.id('shop_alpha'), 'image', 'banner4.webp', 'Banner 4', 4, true)
  $$,
  'too_many_active_banners',
  '4th active banner is refused by trigger'
);

-- 4th banner can be created if is_active is false
select lives_ok(
  $$
  insert into public.shop_banners (tenant_id, kind, image_path, title, sort, is_active)
  values (tests.id('shop_alpha'), 'image', 'banner4.webp', 'Banner 4 Inactive', 4, false)
  $$,
  'Inactive 4th banner is accepted'
);

-- Invalid youtube_id format
select throws_ok(
  $$
  insert into public.shop_banners (tenant_id, kind, youtube_id, title, sort, is_active)
  values (tests.id('shop_alpha'), 'youtube', 'too_short', 'Bad Video', 5, false)
  $$,
  '23514',
  null,
  'YouTube ID not matching 11 chars regex is refused'
);

-- Missing image_path for image kind
select throws_ok(
  $$
  insert into public.shop_banners (tenant_id, kind, title, sort, is_active)
  values (tests.id('shop_alpha'), 'image', 'Missing Image', 5, false)
  $$,
  '23514',
  null,
  'Image banner without image_path is refused'
);

-- 4. Cross-shop isolation tests
select tests.act_as(tests.id('user_b'));

-- Owner B cannot see Owner A banners
select is(
  (select count(*) from public.shop_banners where tenant_id = tests.id('shop_alpha')),
  0::bigint,
  'Owner B cannot select Shop A banners'
);

-- Owner B cannot update Owner A banners
select lives_ok(
  $$
  update public.shop_banners
  set title = 'Hacked Banner'
  where tenant_id = tests.id('shop_alpha')
  $$,
  'Update attempt on Shop A by Owner B succeeds with 0 rows affected'
);

select is(
  (select count(*) from public.shop_banners where title = 'Hacked Banner'),
  0::bigint,
  'Owner A banner was not modified by Owner B'
);

-- Owner B cannot insert banner into Shop A
select throws_ok(
  $$
  insert into public.shop_banners (tenant_id, kind, image_path, title, sort, is_active)
  values (tests.id('shop_alpha'), 'image', 'hack.webp', 'Hack', 1, false)
  $$,
  '42501',
  null,
  'Owner B cannot insert banner into Shop A'
);

-- Anon cannot select directly from shop_banners
select tests.act_as_anon();
select throws_ok(
  $$
  select count(*) from public.shop_banners
  $$,
  '42501',
  null,
  'Anon cannot select directly from shop_banners'
);

-- 5. get_storefront returns active banners, announcement, and zone center
select results_eq(
  $$
  select
    ((public.get_storefront('shop-alpha') -> 'announcement' ->> 'text')),
    ((public.get_storefront('shop-alpha') -> 'announcement' ->> 'tone')),
    ((public.get_storefront('shop-alpha') ->> 'about')),
    ((public.get_storefront('shop-alpha') ->> 'googleReviewUrl')),
    jsonb_array_length(public.get_storefront('shop-alpha') -> 'banners')
  $$,
  $$
  values (
    'Flash sale today!'::text,
    'promo'::text,
    'Handcrafted coffee and pastries.'::text,
    'https://maps.app.goo.gl/abcxyz'::text,
    3::integer
  )
  $$,
  'get_storefront exposes announcement, about, googleReviewUrl and active banners count'
);

-- Zone center in get_storefront
select results_eq(
  $$
  select
    ((public.get_storefront('shop-alpha') -> 'deliveryZones' -> 0 -> 'center' ->> 'lat')::numeric),
    ((public.get_storefront('shop-alpha') -> 'deliveryZones' -> 0 -> 'center' ->> 'lng')::numeric)
  $$,
  $$
  values (14.599512::numeric, 120.984222::numeric)
  $$,
  'get_storefront deliveryZones includes center coordinates'
);

-- Expired announcement returns null in get_storefront
select tests.act_as(tests.id('user_a'));
update public.shop_settings
set announcement_ends_at = now() - interval '1 hour'
where tenant_id = tests.id('shop_alpha');
reset role;

select tests.act_as_anon();
select is(
  (public.get_storefront('shop-alpha') -> 'announcement'),
  'null'::jsonb,
  'Expired announcement is not shown in get_storefront'
);

select * from finish();
rollback;
