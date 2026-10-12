-- P5.1: settings and catalog tables, storage buckets, catalog functions (system paper 4.1, 6.8, 7.1 to 7.4, 10).
-- Order inside the file: tables → indexes → RLS, grants and policies → functions → function grants → storage.
-- Cross-shop safety (decision P5-1): every parent has unique (id, tenant_id) and every child points at it with a
-- composite foreign key, so a row can never hang under another shop's parent. RLS checks the row's own tenant_id.

-- ---------------------------------------------------------------------------
-- 1. Shop settings tables
-- ---------------------------------------------------------------------------

create table public.business_hours (
  tenant_id uuid not null references public.tenants on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  opens_at time not null,
  -- Before opens_at means the shop closes after midnight (overnight hours).
  closes_at time not null,
  primary key (tenant_id, weekday),
  constraint business_hours_not_empty check (opens_at <> closes_at)
);

create table public.closures (
  tenant_id uuid not null references public.tenants on delete cascade,
  closed_on date not null,
  note text check (char_length(note) <= 80),
  primary key (tenant_id, closed_on)
);

create table public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  method text not null check (method in ('gcash', 'maya', 'bank')),
  account_name text not null check (char_length(btrim(account_name)) between 1 and 80),
  account_number text not null check (char_length(btrim(account_number)) between 1 and 40),
  bank_name text check (char_length(btrim(bank_name)) between 1 and 60),
  qr_path text,
  is_active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  constraint payment_accounts_bank_name check (method <> 'bank' or bank_name is not null),
  constraint payment_accounts_qr_path check (qr_path is null or qr_path like tenant_id::text || '/%')
);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  fee integer not null check (fee >= 0),
  eta_text text check (char_length(eta_text) <= 40),
  is_active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Catalog tables
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  sort integer not null default 0,
  is_hidden boolean not null default false,
  -- Decision UI-3: a Fluent 3D icon key, an emoji, or a shop-media path; both null for no icon.
  icon_kind text check (icon_kind in ('fluent', 'emoji', 'image')),
  icon_value text check (char_length(icon_value) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  constraint categories_icon_pair check ((icon_kind is null) = (icon_value is null)),
  constraint categories_icon_path check (icon_kind is distinct from 'image' or icon_value like tenant_id::text || '/%')
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  -- No action on delete: a category with items cannot be removed (category_not_empty).
  category_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (char_length(description) <= 500),
  status text not null default 'active' check (status in ('active', 'hidden', 'archived')),
  is_featured boolean not null default false,
  track_stock boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (category_id, tenant_id) references public.categories (id, tenant_id)
);

create table public.item_photos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  item_id uuid not null,
  path text not null check (path like tenant_id::text || '/items/%'),
  sort integer not null default 0,
  foreign key (item_id, tenant_id) references public.items (id, tenant_id) on delete cascade
);

create table public.item_variants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  item_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  price integer not null check (price >= 0),
  -- Counted only when the item tracks stock; changed only by set_stock and the order functions (decision D6).
  stock_on_hand integer check (stock_on_hand >= 0),
  low_stock_at integer check (low_stock_at >= 0),
  is_sold_out boolean not null default false,
  sort integer not null default 0,
  archived_at timestamptz,
  unique (id, tenant_id),
  foreign key (item_id, tenant_id) references public.items (id, tenant_id) on delete cascade
);

create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1 check (max_select >= 1),
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  constraint option_groups_select_range check (max_select >= min_select)
);

create table public.options (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  group_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  price_delta integer not null default 0 check (price_delta >= 0),
  is_sold_out boolean not null default false,
  sort integer not null default 0,
  foreign key (group_id, tenant_id) references public.option_groups (id, tenant_id) on delete cascade
);

create table public.item_option_groups (
  tenant_id uuid not null references public.tenants on delete cascade,
  item_id uuid not null,
  group_id uuid not null,
  sort integer not null default 0,
  primary key (item_id, group_id),
  foreign key (item_id, tenant_id) references public.items (id, tenant_id) on delete cascade,
  foreign key (group_id, tenant_id) references public.option_groups (id, tenant_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- 3. Indexes (every foreign key, and the sorted lists)
-- ---------------------------------------------------------------------------

create index closures_tenant_id_idx on public.closures (tenant_id);
create index payment_accounts_tenant_sort_idx on public.payment_accounts (tenant_id, sort);
create index delivery_zones_tenant_sort_idx on public.delivery_zones (tenant_id, sort);
create index categories_tenant_sort_idx on public.categories (tenant_id, sort);
create index items_tenant_sort_idx on public.items (tenant_id, sort);
create index items_category_idx on public.items (category_id, tenant_id);
create index item_photos_tenant_id_idx on public.item_photos (tenant_id);
create index item_photos_item_sort_idx on public.item_photos (item_id, tenant_id, sort);
create index item_variants_tenant_id_idx on public.item_variants (tenant_id);
create index item_variants_item_sort_idx on public.item_variants (item_id, tenant_id, sort);
create index option_groups_tenant_id_idx on public.option_groups (tenant_id);
create index options_tenant_id_idx on public.options (tenant_id);
create index options_group_sort_idx on public.options (group_id, tenant_id, sort);
create index item_option_groups_tenant_id_idx on public.item_option_groups (tenant_id);
create index item_option_groups_item_idx on public.item_option_groups (item_id, tenant_id);
create index item_option_groups_group_idx on public.item_option_groups (group_id, tenant_id);

-- ---------------------------------------------------------------------------
-- 4. RLS, grants and policies (authenticated only; anon reads through get_storefront in P5.2)
-- ---------------------------------------------------------------------------

alter table public.business_hours enable row level security;
alter table public.closures enable row level security;
alter table public.payment_accounts enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.item_photos enable row level security;
alter table public.item_variants enable row level security;
alter table public.option_groups enable row level security;
alter table public.options enable row level security;
alter table public.item_option_groups enable row level security;

revoke all on
  public.business_hours, public.closures, public.payment_accounts, public.delivery_zones, public.categories,
  public.items, public.item_photos, public.item_variants, public.option_groups, public.options,
  public.item_option_groups
from anon, authenticated;

-- Members read; owners of an active shop insert, update and delete. Updates never move a row to another shop:
-- tenant_id (and every parent key) is left out of the update grants.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'business_hours', 'closures', 'payment_accounts', 'delivery_zones', 'categories', 'items', 'item_photos',
    'item_variants', 'option_groups', 'options', 'item_option_groups'
  ] loop
    execute format('grant select, delete on public.%I to authenticated', v_table);
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.is_shop_member(tenant_id))',
      v_table || '_select_member', v_table
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.is_active_shop_owner(tenant_id))',
      v_table || '_insert_active_owner', v_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated '
      'using (private.is_active_shop_owner(tenant_id)) with check (private.is_active_shop_owner(tenant_id))',
      v_table || '_update_active_owner', v_table
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.is_active_shop_owner(tenant_id))',
      v_table || '_delete_active_owner', v_table
    );
  end loop;
end;
$$;

grant insert on public.business_hours to authenticated;
grant update (opens_at, closes_at) on public.business_hours to authenticated;

grant insert on public.closures to authenticated;
grant update (note) on public.closures to authenticated;

grant insert on public.payment_accounts to authenticated;
grant update (method, account_name, account_number, bank_name, qr_path, is_active, sort) on public.payment_accounts to authenticated;

grant insert on public.delivery_zones to authenticated;
grant update (name, fee, eta_text, is_active, sort) on public.delivery_zones to authenticated;

grant insert on public.categories to authenticated;
grant update (name, sort, is_hidden, icon_kind, icon_value) on public.categories to authenticated;

grant insert on public.items to authenticated;
grant update (category_id, name, description, status, is_featured, track_stock, sort) on public.items to authenticated;

grant insert on public.item_photos to authenticated;
grant update (path, sort) on public.item_photos to authenticated;

-- Stock is never written by a client (decision D6): not on insert, not on update. set_stock and the order
-- functions change it.
grant insert (id, tenant_id, item_id, name, price, low_stock_at, is_sold_out, sort, archived_at) on public.item_variants to authenticated;
grant update (name, price, low_stock_at, is_sold_out, sort, archived_at) on public.item_variants to authenticated;

grant insert on public.option_groups to authenticated;
grant update (name, min_select, max_select) on public.option_groups to authenticated;

grant insert on public.options to authenticated;
grant update (name, price_delta, is_sold_out, sort) on public.options to authenticated;

grant insert on public.item_option_groups to authenticated;
grant update (sort) on public.item_option_groups to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Functions (system paper 7.4; contracts in packages/core/src/contracts/db-functions.ts)
-- ---------------------------------------------------------------------------

-- Open at p_at (now by default), in Manila time. Closures first; overnight hours count for the day they start; a
-- shop with no hours rows is closed. get_storefront (P5.2) and place_order (P5.3) call it. packages/core openState
-- mirrors it, and both are tested with the cases in packages/core/src/test/open-cases.ts.
create function private.is_open_now(p_tenant_id uuid, p_at timestamptz default now())
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_now timestamp := (p_at at time zone 'Asia/Manila');
  v_today date := v_now::date;
  v_time time := v_now::time;
  v_dow integer := extract(dow from v_now)::integer;
  v_yesterday_dow integer := (extract(dow from v_now)::integer + 6) % 7;
begin
  if exists (select 1 from public.closures c where c.tenant_id = p_tenant_id and c.closed_on = v_today) then
    return false;
  end if;

  return exists (
    select 1
    from public.business_hours h
    where h.tenant_id = p_tenant_id
      and (
        (h.weekday = v_dow and h.opens_at < h.closes_at and v_time >= h.opens_at and v_time < h.closes_at)
        or (h.weekday = v_dow and h.closes_at < h.opens_at and v_time >= h.opens_at)
        -- Yesterday's overnight hours, unless yesterday was a closed day.
        or (
          h.weekday = v_yesterday_dow and h.closes_at < h.opens_at and v_time < h.closes_at
          and not exists (
            select 1 from public.closures c where c.tenant_id = p_tenant_id and c.closed_on = v_today - 1
          )
        )
      )
  );
end;
$$;

-- The CatalogItem shape (camelCase, like packages/core CatalogItem): the item, its photos in order, its variants
-- that are not archived, and its option group ids. Runs as the caller, so RLS decides what it can read.
create function private.catalog_item_json(p_item_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id,
    'tenantId', i.tenant_id,
    'categoryId', i.category_id,
    'name', i.name,
    'description', i.description,
    'status', i.status,
    'isFeatured', i.is_featured,
    'trackStock', i.track_stock,
    'sort', i.sort,
    'photos', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', p.id, 'tenantId', p.tenant_id, 'itemId', p.item_id, 'path', p.path, 'sort', p.sort)
        order by p.sort, p.id
      )
      from public.item_photos p
      where p.item_id = i.id
    ), '[]'::jsonb),
    'variants', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', v.id, 'tenantId', v.tenant_id, 'itemId', v.item_id, 'name', v.name, 'price', v.price,
          'stockOnHand', v.stock_on_hand, 'lowStockAt', v.low_stock_at, 'isSoldOut', v.is_sold_out,
          'sort', v.sort, 'archivedAt', v.archived_at
        )
        order by v.sort, v.id
      )
      from public.item_variants v
      where v.item_id = i.id and v.archived_at is null
    ), '[]'::jsonb),
    'optionGroupIds', coalesce((
      select jsonb_agg(l.group_id order by l.sort, l.group_id)
      from public.item_option_groups l
      where l.item_id = i.id
    ), '[]'::jsonb)
  )
  from public.items i
  where i.id = p_item_id;
$$;

-- Owner: saves an item with its variants, photos and option groups in one transaction. Runs as the caller
-- (security invoker), so RLS and the column grants still apply. Variants left out of the payload are archived,
-- never deleted (old orders point at them). Errors: invalid, variant_required, not_signed_in.
create function public.save_item(p_item jsonb)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := private.try_uuid(p_item ->> 'tenantId');
  v_item_id uuid := private.try_uuid(p_item ->> 'id');
  v_variants jsonb := p_item -> 'variants';
  v_photos jsonb := coalesce(p_item -> 'photoPaths', '[]'::jsonb);
  v_groups jsonb := coalesce(p_item -> 'optionGroupIds', '[]'::jsonb);
  v_variant jsonb;
  v_variant_id uuid;
  v_kept uuid[] := array[]::uuid[];
  v_index integer;
  v_path text;
begin
  if (select auth.uid()) is null then
    raise exception 'not_signed_in';
  end if;
  if v_tenant is null or jsonb_typeof(p_item) <> 'object' then
    raise exception 'invalid';
  end if;
  if v_variants is null or jsonb_typeof(v_variants) <> 'array' or jsonb_array_length(v_variants) = 0 then
    raise exception 'variant_required';
  end if;
  if jsonb_typeof(v_photos) <> 'array' or jsonb_typeof(v_groups) <> 'array' then
    raise exception 'invalid';
  end if;

  if p_item ->> 'id' is not null and v_item_id is null then
    raise exception 'invalid';
  end if;

  if v_item_id is null then
    insert into public.items (tenant_id, category_id, name, description, status, is_featured, track_stock, sort)
    values (
      v_tenant,
      private.try_uuid(p_item ->> 'categoryId'),
      btrim(coalesce(p_item ->> 'name', '')),
      nullif(btrim(coalesce(p_item ->> 'description', '')), ''),
      coalesce(p_item ->> 'status', 'active'),
      coalesce((p_item ->> 'isFeatured')::boolean, false),
      coalesce((p_item ->> 'trackStock')::boolean, false),
      coalesce((select max(i.sort) + 1 from public.items i where i.tenant_id = v_tenant), 0)
    )
    returning id into v_item_id;
  else
    update public.items i
    set category_id = private.try_uuid(p_item ->> 'categoryId'),
        name = btrim(coalesce(p_item ->> 'name', '')),
        description = nullif(btrim(coalesce(p_item ->> 'description', '')), ''),
        status = coalesce(p_item ->> 'status', i.status),
        is_featured = coalesce((p_item ->> 'isFeatured')::boolean, i.is_featured),
        track_stock = coalesce((p_item ->> 'trackStock')::boolean, i.track_stock)
    where i.id = v_item_id and i.tenant_id = v_tenant;
    if not found then
      raise exception 'invalid';
    end if;
  end if;

  -- Variants in the order given.
  for v_variant, v_index in
    select value, ordinality::integer - 1 from jsonb_array_elements(v_variants) with ordinality
  loop
    v_variant_id := private.try_uuid(v_variant ->> 'id');
    if v_variant_id is null then
      insert into public.item_variants (tenant_id, item_id, name, price, low_stock_at, is_sold_out, sort)
      values (
        v_tenant,
        v_item_id,
        btrim(coalesce(v_variant ->> 'name', '')),
        (v_variant ->> 'price')::integer,
        (v_variant ->> 'lowStockAt')::integer,
        coalesce((v_variant ->> 'isSoldOut')::boolean, false),
        v_index
      )
      returning id into v_variant_id;
    else
      update public.item_variants v
      set name = btrim(coalesce(v_variant ->> 'name', '')),
          price = (v_variant ->> 'price')::integer,
          low_stock_at = (v_variant ->> 'lowStockAt')::integer,
          is_sold_out = coalesce((v_variant ->> 'isSoldOut')::boolean, v.is_sold_out),
          sort = v_index,
          archived_at = null
      where v.id = v_variant_id and v.item_id = v_item_id;
      if not found then
        raise exception 'invalid';
      end if;
    end if;
    v_kept := v_kept || v_variant_id;
  end loop;

  update public.item_variants v
  set archived_at = now()
  where v.item_id = v_item_id and v.archived_at is null and not (v.id = any (v_kept));

  -- Photos: replaced in the order given. The first is the cover.
  delete from public.item_photos p where p.item_id = v_item_id;
  for v_path, v_index in
    select value, ordinality::integer - 1 from jsonb_array_elements_text(v_photos) with ordinality
  loop
    if v_path not like v_tenant::text || '/items/%' then
      raise exception 'invalid';
    end if;
    insert into public.item_photos (tenant_id, item_id, path, sort) values (v_tenant, v_item_id, v_path, v_index);
  end loop;

  -- Option groups: replaced in the order given. The composite key refuses another shop's group.
  delete from public.item_option_groups l where l.item_id = v_item_id;
  insert into public.item_option_groups (tenant_id, item_id, group_id, sort)
  select v_tenant, v_item_id, (g.value #>> '{}')::uuid, g.ordinality::integer - 1
  from jsonb_array_elements(v_groups) with ordinality as g;

  return private.catalog_item_json(v_item_id);
exception
  when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation then
    raise exception 'invalid';
end;
$$;

-- Owner of an active shop: sets a variant's stock count (null stops counting). Stock above 0 clears the sold-out
-- switch. The audit log line comes with P5.4. Errors: not_allowed, invalid.
create function public.set_stock(p_variant_id uuid, p_stock_on_hand integer)
returns public.item_variants
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_variant public.item_variants;
begin
  select * into v_variant from public.item_variants v where v.id = p_variant_id;
  if not found or not private.is_active_shop_owner(v_variant.tenant_id) then
    raise exception 'not_allowed';
  end if;
  if p_stock_on_hand is not null and p_stock_on_hand < 0 then
    raise exception 'invalid';
  end if;

  update public.item_variants v
  set stock_on_hand = p_stock_on_hand,
      is_sold_out = case when coalesce(p_stock_on_hand, 0) > 0 then false else v.is_sold_out end
  where v.id = p_variant_id
  returning * into v_variant;

  return v_variant;
end;
$$;

-- Owner: rewrites `sort` for the listed rows in the order given (drag to sort). Runs as the caller, so RLS
-- applies; every id must be a row of one shop that the caller may change. Errors: invalid.
create function public.save_sort_order(p_kind text, p_ids uuid[])
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_table text := case p_kind
    when 'categories' then 'categories'
    when 'items' then 'items'
    when 'variants' then 'item_variants'
    when 'photos' then 'item_photos'
    when 'paymentAccounts' then 'payment_accounts'
    when 'deliveryZones' then 'delivery_zones'
  end;
  v_count integer;
  v_shops integer;
  v_updated integer;
begin
  if v_table is null or p_ids is null or cardinality(p_ids) = 0
    or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) as id) then
    raise exception 'invalid';
  end if;

  execute format('select count(*), count(distinct tenant_id) from public.%I where id = any ($1)', v_table)
    into v_count, v_shops
    using p_ids;
  if v_count <> cardinality(p_ids) or v_shops <> 1 then
    raise exception 'invalid';
  end if;

  execute format(
    'update public.%I t set sort = o.position from unnest($1) with ordinality as o (id, position) where t.id = o.id',
    v_table
  ) using p_ids;
  get diagnostics v_updated = row_count;
  if v_updated <> cardinality(p_ids) then
    raise exception 'invalid';
  end if;
end;
$$;

-- Replaces P3a's create_my_shop (same signature): also adds default hours, every day 08:00 to 20:00
-- (decision P3-3, now done).
create or replace function public.create_my_shop(p_business_type text, p_name text, p_slug text)
returns public.tenants
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text := coalesce(p_slug, '');
  v_tenant public.tenants;
begin
  if v_user is null then
    raise exception 'not_signed_in';
  end if;

  -- One shop per owner at launch, enforced here and not by a constraint so multi-shop can come later.
  if exists (select 1 from public.tenant_members m where m.user_id = v_user and m.status = 'active') then
    raise exception 'already_has_shop';
  end if;

  if p_business_type is null or p_business_type not in ('food', 'retail') then
    raise exception 'invalid';
  end if;
  if char_length(v_name) not between 1 and 80 then
    raise exception 'invalid';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) not between 3 and 40 then
    raise exception 'slug_invalid';
  end if;
  if private.is_reserved_slug(v_slug) then
    raise exception 'slug_reserved';
  end if;

  begin
    insert into public.tenants (slug, name, business_type)
    values (v_slug, v_name, p_business_type)
    returning * into v_tenant;
  exception when unique_violation then
    raise exception 'slug_taken';
  end;

  insert into public.tenant_members (tenant_id, user_id, role) values (v_tenant.id, v_user, 'owner');
  insert into public.shop_settings (tenant_id) values (v_tenant.id);
  insert into public.business_hours (tenant_id, weekday, opens_at, closes_at)
  select v_tenant.id, d, '08:00', '20:00' from generate_series(0, 6) as d;

  return v_tenant;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Function grants
-- ---------------------------------------------------------------------------

revoke execute on function private.is_open_now(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function private.catalog_item_json(uuid) from public, anon, authenticated;
grant execute on function private.catalog_item_json(uuid) to authenticated;
-- Storage policies run as the caller and read the shop id from the path with it.
grant execute on function private.try_uuid(text) to authenticated;

revoke execute on function public.save_item(jsonb) from public, anon;
revoke execute on function public.set_stock(uuid, integer) from public, anon;
revoke execute on function public.save_sort_order(text, uuid[]) from public, anon;
revoke execute on function public.create_my_shop(text, text, text) from public, anon;
grant execute on function public.save_item(jsonb) to authenticated;
grant execute on function public.set_stock(uuid, integer) to authenticated;
grant execute on function public.save_sort_order(text, uuid[]) to authenticated;
grant execute on function public.create_my_shop(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Storage (decision P5-3): shop-media is public and immutable; payment-proofs is private (policies in P5.3)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('shop-media', 'shop-media', true, 2097152, array['image/webp', 'image/png', 'image/jpeg']),
  ('payment-proofs', 'payment-proofs', false, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- Files live under the shop's id: <tenant_id>/<folder>/<uuid>.webp. Only the owner of that active shop writes.
create policy shop_media_insert_active_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shop-media'
    and private.is_active_shop_owner(private.try_uuid((storage.foldername(name))[1]))
  );

create policy shop_media_update_active_owner on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shop-media'
    and private.is_active_shop_owner(private.try_uuid((storage.foldername(name))[1]))
  )
  with check (
    bucket_id = 'shop-media'
    and private.is_active_shop_owner(private.try_uuid((storage.foldername(name))[1]))
  );

create policy shop_media_delete_active_owner on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shop-media'
    and private.is_active_shop_owner(private.try_uuid((storage.foldername(name))[1]))
  );

-- Storage removes a file only when the caller can also select it (decision P5-4). Public URLs need no policy;
-- this one lets an owner see only their own shop's folder, so nobody can list another shop's files.
create policy shop_media_select_active_owner on storage.objects
  for select to authenticated
  using (
    bucket_id = 'shop-media'
    and private.is_active_shop_owner(private.try_uuid((storage.foldername(name))[1]))
  );
