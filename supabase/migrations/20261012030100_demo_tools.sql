-- P5.2: the two demo shops, juans-cafe (food) and tala-apparel (retail), from one line in the SQL editor:
--   select private.demo_setup();
-- System paper Appendix B (catalog part; demo_reset for orders comes in P5.6). Execute is granted to nobody, so only
-- the SQL editor and supabase/seed.sql (local db reset) can run these. Prices are centavos; numbers are fake.

-- ---------------------------------------------------------------------------
-- 1. Shop
-- ---------------------------------------------------------------------------

-- Keeps an existing shop with that slug and its owner (probably the founder's P3b sign-up); otherwise creates it
-- with no owner. Either way it becomes an active demo shop with these settings and hours.
-- p_settings: tagline, phone, city, colors [primary, secondary, accent], cod, payLaterPickup, opensAt, closesAt,
-- closedWeekdays (0 = Sunday).
create function private.demo_ensure_shop(p_slug text, p_name text, p_business_type text, p_settings jsonb)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_tenant_id uuid;
begin
  select t.id into v_tenant_id from public.tenants t where t.slug = p_slug;
  if v_tenant_id is null then
    insert into public.tenants (slug, name, business_type) values (p_slug, p_name, p_business_type)
    returning id into v_tenant_id;
  end if;

  update public.tenants
  set is_demo = true, status = 'active', plan = 'demo', paid_until = current_date + 365
  where id = v_tenant_id;

  insert into public.shop_settings (tenant_id) values (v_tenant_id) on conflict (tenant_id) do nothing;
  update public.shop_settings
  set tagline = p_settings ->> 'tagline',
      phone = p_settings ->> 'phone',
      city = p_settings ->> 'city',
      messenger_username = 'smartappph',
      color_primary = p_settings -> 'colors' ->> 0,
      color_secondary = p_settings -> 'colors' ->> 1,
      color_accent = p_settings -> 'colors' ->> 2,
      accepting_orders = true,
      busy_until = null,
      walk_in_enabled = true,
      pickup_enabled = true,
      delivery_enabled = true,
      cod_enabled = (p_settings ->> 'cod')::boolean,
      pay_later_pickup = (p_settings ->> 'payLaterPickup')::boolean,
      delivery_fee_via_messenger = false
  where tenant_id = v_tenant_id;

  delete from public.business_hours where tenant_id = v_tenant_id;
  insert into public.business_hours (tenant_id, weekday, opens_at, closes_at)
  select v_tenant_id, d, (p_settings ->> 'opensAt')::time, (p_settings ->> 'closesAt')::time
  from generate_series(0, 6) as d
  where not (p_settings -> 'closedWeekdays') @> to_jsonb(d);

  return v_tenant_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Catalog helpers
-- ---------------------------------------------------------------------------

create function private.demo_category(p_tenant_id uuid, p_name text, p_icon_kind text, p_icon_value text, p_sort integer)
returns uuid
language sql
volatile
set search_path = ''
as $$
  insert into public.categories (tenant_id, name, icon_kind, icon_value, sort)
  values (p_tenant_id, p_name, p_icon_kind, p_icon_value, p_sort)
  returning id;
$$;

-- One option group with its choices: p_options is [[name, price_delta], ...] in order.
create function private.demo_option_group(p_tenant_id uuid, p_name text, p_min integer, p_max integer, p_options jsonb)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  insert into public.option_groups (tenant_id, name, min_select, max_select)
  values (p_tenant_id, p_name, p_min, p_max)
  returning id into v_group_id;

  insert into public.options (tenant_id, group_id, name, price_delta, sort)
  select p_tenant_id, v_group_id, o.value ->> 0, (o.value ->> 1)::integer, (o.ordinality - 1)::integer
  from jsonb_array_elements(p_options) with ordinality as o (value, ordinality);

  return v_group_id;
end;
$$;

-- One item: p_variants is [[name, price, stock or null, sold_out], ...] in order; p_group_ids in order.
create function private.demo_item(
  p_tenant_id uuid,
  p_category_id uuid,
  p_sort integer,
  p_name text,
  p_description text,
  p_featured boolean,
  p_track_stock boolean,
  p_variants jsonb,
  p_group_ids uuid[]
)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_item_id uuid;
begin
  insert into public.items (tenant_id, category_id, name, description, is_featured, track_stock, sort)
  values (p_tenant_id, p_category_id, p_name, p_description, p_featured, p_track_stock, p_sort)
  returning id into v_item_id;

  insert into public.item_variants (tenant_id, item_id, name, price, stock_on_hand, low_stock_at, is_sold_out, sort)
  select
    p_tenant_id, v_item_id, v.value ->> 0, (v.value ->> 1)::integer,
    case when p_track_stock then (v.value ->> 2)::integer end,
    case when p_track_stock then 2 end,
    coalesce((v.value ->> 3)::boolean, false),
    (v.ordinality - 1)::integer
  from jsonb_array_elements(p_variants) with ordinality as v (value, ordinality);

  insert into public.item_option_groups (tenant_id, item_id, group_id, sort)
  select p_tenant_id, v_item_id, g.group_id, (g.ordinality - 1)::integer
  from unnest(coalesce(p_group_ids, '{}'::uuid[])) with ordinality as g (group_id, ordinality);

  return v_item_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Catalogs
-- ---------------------------------------------------------------------------

-- Replaces the catalog, payment accounts and delivery zones of a demo shop. Refuses any other shop.
create function private.demo_seed_catalog(p_slug text)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_cat uuid;
  v_sugar uuid;
  v_addons uuid;
  v_color uuid;
begin
  select t.id into v_tenant_id from public.tenants t where t.slug = p_slug and t.is_demo;
  if v_tenant_id is null then
    raise exception 'not_allowed';
  end if;

  delete from public.items where tenant_id = v_tenant_id;
  delete from public.option_groups where tenant_id = v_tenant_id;
  delete from public.categories where tenant_id = v_tenant_id;
  delete from public.payment_accounts where tenant_id = v_tenant_id;
  delete from public.delivery_zones where tenant_id = v_tenant_id;

  if p_slug = 'juans-cafe' then
    v_sugar := private.demo_option_group(v_tenant_id, 'Sugar level', 1, 1,
      '[["0%", 0], ["25%", 0], ["50%", 0], ["75%", 0], ["100%", 0]]');
    v_addons := private.demo_option_group(v_tenant_id, 'Add-ons', 0, 2,
      '[["Extra shot", 3000], ["Oat milk", 2500], ["Pearls", 1500]]');

    v_cat := private.demo_category(v_tenant_id, 'Coffee', 'fluent', 'coffee', 0);
    perform private.demo_item(v_tenant_id, v_cat, 0, 'Iced Latte', 'Espresso and fresh milk over ice.', true, false,
      '[["Regular", 12000], ["Large", 15000]]', array[v_sugar, v_addons]);
    perform private.demo_item(v_tenant_id, v_cat, 1, 'Spanish Latte', 'Sweet and creamy, with condensed milk.', true, false,
      '[["Regular", 13000], ["Large", 16000]]', array[v_sugar, v_addons]);
    perform private.demo_item(v_tenant_id, v_cat, 2, 'Americano', 'Espresso and water, hot or iced.', false, false,
      '[["Hot", 9000], ["Iced", 10000]]', array[v_sugar, v_addons]);
    perform private.demo_item(v_tenant_id, v_cat, 3, 'Caramel Macchiato', null, false, false,
      '[["Regular", 14000], ["Large", 17000]]', array[v_sugar, v_addons]);
    perform private.demo_item(v_tenant_id, v_cat, 4, 'Cafe Mocha', 'Espresso, chocolate and milk.', false, false,
      '[["Regular", 13500], ["Large", 16500]]', array[v_sugar, v_addons]);

    v_cat := private.demo_category(v_tenant_id, 'Milk tea', 'fluent', 'milk-tea', 1);
    perform private.demo_item(v_tenant_id, v_cat, 0, 'Wintermelon Milk Tea', null, true, false,
      '[["Medium", 9900], ["Large", 11900]]', array[v_sugar, v_addons]);
    perform private.demo_item(v_tenant_id, v_cat, 1, 'Okinawa Milk Tea', 'Roasted brown sugar flavour.', false, false,
      '[["Medium", 9900], ["Large", 11900]]', array[v_sugar, v_addons]);
    perform private.demo_item(v_tenant_id, v_cat, 2, 'Taro Milk Tea', null, false, false,
      '[["Medium", 10900], ["Large", 12900]]', array[v_sugar, v_addons]);
    perform private.demo_item(v_tenant_id, v_cat, 3, 'Brown Sugar Milk Tea', 'With pearls already in.', false, false,
      '[["Medium", 10900], ["Large", 12900]]', array[v_sugar, v_addons]);

    v_cat := private.demo_category(v_tenant_id, 'Pastries', 'fluent', 'croissant', 2);
    perform private.demo_item(v_tenant_id, v_cat, 0, 'Ube Cheese Pandesal', 'Soft pandesal with ube and cheese.', true, true,
      '[["Piece", 6500, 8]]', null);
    perform private.demo_item(v_tenant_id, v_cat, 1, 'Ensaymada', 'Buttered, sugared and topped with cheese.', false, true,
      '[["Piece", 4500, 3]]', null);
    perform private.demo_item(v_tenant_id, v_cat, 2, 'Butter Croissant', null, false, true,
      '[["Piece", 8500, 0]]', null);
    perform private.demo_item(v_tenant_id, v_cat, 3, 'Banana Bread', 'One thick slice.', false, true,
      '[["Slice", 7500, 6]]', null);

    v_cat := private.demo_category(v_tenant_id, 'Rice meals', 'fluent', 'rice', 3);
    perform private.demo_item(v_tenant_id, v_cat, 0, 'Chicken Adobo Rice', 'Classic adobo with garlic rice.', true, false,
      '[["Regular", 14900]]', null);
    perform private.demo_item(v_tenant_id, v_cat, 1, 'Tapsilog', 'Beef tapa, garlic rice and egg.', false, false,
      '[["Regular", 15900]]', null);
    perform private.demo_item(v_tenant_id, v_cat, 2, 'Longsilog', 'Sweet longganisa, garlic rice and egg.', false, false,
      '[["Regular", 14900]]', null);
    perform private.demo_item(v_tenant_id, v_cat, 3, 'Bangsilog', 'Fried bangus, garlic rice and egg.', false, false,
      '[["Regular", 16900]]', null);

    insert into public.payment_accounts (tenant_id, method, account_name, account_number, sort) values
      (v_tenant_id, 'gcash', 'Juan''s Cafe (demo)', '0917 000 0001', 0),
      (v_tenant_id, 'maya', 'Juan''s Cafe (demo)', '0917 000 0002', 1);
    insert into public.delivery_zones (tenant_id, name, fee, eta_text, is_active, sort) values
      (v_tenant_id, 'Poblacion', 5000, '20 to 30 min', true, 0),
      (v_tenant_id, 'Barangay San Roque', 7000, '30 to 45 min', true, 1),
      (v_tenant_id, 'Outside town', 12000, null, false, 2);

  elsif p_slug = 'tala-apparel' then
    v_color := private.demo_option_group(v_tenant_id, 'Color', 1, 1, '[["Black", 0], ["White", 0], ["Sage", 0]]');

    v_cat := private.demo_category(v_tenant_id, 'Tops', 'fluent', 'tshirt', 0);
    perform private.demo_item(v_tenant_id, v_cat, 0, 'Basic Cotton Tee', 'Soft cotton, regular fit.', true, true,
      '[["S", 39900, 8], ["M", 39900, 12], ["L", 39900, 10], ["XL", 39900, 2]]', null);
    perform private.demo_item(v_tenant_id, v_cat, 1, 'Oversized Graphic Tee', 'Boxy fit with a small sampaguita print.', false, true,
      '[["S", 49900, 5], ["M", 49900, 7], ["L", 49900, 6], ["XL", 49900, 1]]', array[v_color]);
    perform private.demo_item(v_tenant_id, v_cat, 2, 'Linen Button-down', null, false, true,
      '[["S", 89900, 4], ["M", 89900, 6], ["L", 89900, 3], ["XL", 89900, 2]]', null);
    perform private.demo_item(v_tenant_id, v_cat, 3, 'Ribbed Tank Top', null, false, true,
      '[["S", 29900, 9], ["M", 29900, 11], ["L", 29900, 7], ["XL", 29900, 4]]', null);

    v_cat := private.demo_category(v_tenant_id, 'Dresses', 'fluent', 'dress', 1);
    perform private.demo_item(v_tenant_id, v_cat, 0, 'Floral Midi Dress', 'Light and flowy, with pockets.', true, true,
      '[["S", 129900, 3], ["M", 129900, 5], ["L", 129900, 2], ["XL", 129900, 1]]', null);
    perform private.demo_item(v_tenant_id, v_cat, 1, 'Linen Wrap Dress', null, false, true,
      '[["S", 149900, 2], ["M", 149900, 4], ["L", 149900, 3], ["XL", 149900, 2]]', null);
    perform private.demo_item(v_tenant_id, v_cat, 2, 'Satin Slip Dress', 'For weddings and dinners.', true, true,
      '[["S", 119900, 0], ["M", 119900, 3], ["L", 119900, 2], ["XL", 119900, 1]]', null);

    v_cat := private.demo_category(v_tenant_id, 'Bottoms', 'fluent', 'jeans', 2);
    perform private.demo_item(v_tenant_id, v_cat, 0, 'High-waist Mom Jeans', 'Rigid denim that softens with wear.', true, true,
      '[["S", 99900, 6], ["M", 99900, 8], ["L", 99900, 5], ["XL", 99900, 3]]', null);
    perform private.demo_item(v_tenant_id, v_cat, 1, 'Wide-leg Trousers', null, false, true,
      '[["S", 89900, 4], ["M", 89900, 6], ["L", 89900, 4], ["XL", 89900, 2]]', null);
    perform private.demo_item(v_tenant_id, v_cat, 2, 'Pleated Skirt', null, false, true,
      '[["S", 69900, 5], ["M", 69900, 7], ["L", 69900, 3], ["XL", 69900, 1]]', null);
    perform private.demo_item(v_tenant_id, v_cat, 3, 'Denim Shorts', null, false, true,
      '[["S", 59900, 6], ["M", 59900, 9], ["L", 59900, 6], ["XL", 59900, 2]]', null);

    v_cat := private.demo_category(v_tenant_id, 'Accessories', 'fluent', 'handbag', 3);
    perform private.demo_item(v_tenant_id, v_cat, 0, 'Woven Tote Bag', 'Handwoven buri, lined inside.', true, true,
      '[["One size", 59900, 6]]', null);
    perform private.demo_item(v_tenant_id, v_cat, 1, 'Pearl Hair Clip Set', 'Set of three.', false, true,
      '[["One size", 19900, 15]]', null);
    perform private.demo_item(v_tenant_id, v_cat, 2, 'Canvas Bucket Hat', null, false, true,
      '[["One size", 34900, 2]]', array[v_color]);

    insert into public.payment_accounts (tenant_id, method, account_name, account_number, bank_name, sort) values
      (v_tenant_id, 'bank', 'Tala Apparel (demo)', '0000 1111 22', 'BPI', 0),
      (v_tenant_id, 'gcash', 'Tala Apparel (demo)', '0917 000 0003', null, 1);
    insert into public.delivery_zones (tenant_id, name, fee, eta_text, sort) values
      (v_tenant_id, 'Metro Manila', 12000, '1 to 2 days', 0),
      (v_tenant_id, 'Provinces', 25000, '3 to 5 days', 1);
  end if;

end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Both demo shops
-- ---------------------------------------------------------------------------

create function private.demo_setup()
returns void
language plpgsql
volatile
set search_path = ''
as $$
begin
  perform private.demo_ensure_shop('juans-cafe', 'Juan''s Cafe', 'food', jsonb_build_object(
    'tagline', 'Coffee, milk tea and silog on Mabini St.',
    'phone', '+639170000001',
    'city', 'Batangas City',
    'colors', jsonb_build_array('#FBF6F0', '#EFE3D3', '#6F4E37'),
    'cod', false,
    'payLaterPickup', true,
    'opensAt', '07:00',
    'closesAt', '21:00',
    'closedWeekdays', jsonb_build_array()
  ));
  perform private.demo_seed_catalog('juans-cafe');

  perform private.demo_ensure_shop('tala-apparel', 'Tala Apparel', 'retail', jsonb_build_object(
    'tagline', 'Everyday outfits, made in Manila.',
    'phone', '+639170000002',
    'city', 'Quezon City',
    'colors', jsonb_build_array('#FAF7FD', '#EDE5F7', '#6B3FA0'),
    'cod', true,
    'payLaterPickup', false,
    'opensAt', '10:00',
    'closesAt', '19:00',
    'closedWeekdays', jsonb_build_array(0)
  ));
  perform private.demo_seed_catalog('tala-apparel');
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Function grants: nobody (SQL editor and seed.sql only)
-- ---------------------------------------------------------------------------

revoke execute on function private.demo_ensure_shop(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function private.demo_category(uuid, text, text, text, integer) from public, anon, authenticated;
revoke execute on function private.demo_option_group(uuid, text, integer, integer, jsonb) from public, anon, authenticated;
revoke execute on function private.demo_item(uuid, uuid, integer, text, text, boolean, boolean, jsonb, uuid[]) from public, anon, authenticated;
revoke execute on function private.demo_seed_catalog(text) from public, anon, authenticated;
revoke execute on function private.demo_setup() from public, anon, authenticated;
