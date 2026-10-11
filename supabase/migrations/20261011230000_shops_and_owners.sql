-- P3a: shops, owners and settings with row-level security (system paper 5, 6.1, 7.1 to 7.4, 10, Appendix A).
-- Order inside the file: lock-down → helpers → tables → RLS, grants and policies → functions → function grants.

-- ---------------------------------------------------------------------------
-- 1. Lock down first (decision P3-1)
-- ---------------------------------------------------------------------------

-- Helpers live in `private`. It is not in [api] schemas, so the Data API cannot reach it.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- A table, sequence or function that a later migration forgets to lock is closed, not open.
-- These apply to objects created by `postgres`, the role that runs migrations. service_role keeps its defaults.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
-- Postgres grants EXECUTE to PUBLIC on every new function by a global default that a per-schema revoke cannot
-- remove, so revoke it globally too. Every function a client may call gets an explicit grant.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema private revoke execute on functions from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Helpers that the tables need
-- ---------------------------------------------------------------------------

-- Returns null instead of raising on bad input. Storage and realtime policies use it on paths and topics.
create function private.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_value::uuid;
exception when others then
  return null;
end;
$$;

-- Mirrored in packages/core/src/schemas/primitives.ts as RESERVED_SLUGS (a Vitest test keeps them equal).
create function private.is_reserved_slug(p_slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_slug = any (array[
    'app', 'api', 'admin', 'www', 'mail', 'auth', 'login', 'signup', 'account', 'orders', 'cart', 'checkout',
    'menu', 'o', 'i', 's', 'static', 'assets', '_next', 'manifest', 'sw', 'favicon', 'robots', 'sitemap',
    'privacy', 'terms', 'about', 'pricing', 'help', 'support', 'status', 'dashboard', 'demo', 'shop', 'shops'
  ]);
$$;

-- ---------------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------------

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  business_type text not null check (business_type in ('food', 'retail')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  plan text,
  paid_until date,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint tenants_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint tenants_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(slug) between 3 and 40
    and not private.is_reserved_slug(slug)
  )
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  phone text check (phone ~ '^\+639\d{9}$'),
  created_at timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id uuid not null references public.tenants on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index tenant_members_user_id_idx on public.tenant_members (user_id);

create table public.shop_settings (
  tenant_id uuid primary key references public.tenants on delete cascade,
  logo_path text,
  cover_path text,
  tagline text check (char_length(tagline) <= 160),
  phone text,
  email text,
  address text,
  city text,
  maps_url text check (maps_url like 'https://%'),
  facebook_url text check (facebook_url like 'https://%'),
  messenger_username text check (messenger_username ~ '^[A-Za-z0-9.]{1,50}$'),
  color_primary text not null default '#FFFFFF' check (color_primary ~ '^#[0-9A-Fa-f]{6}$'),
  color_secondary text not null default '#F4F7FA' check (color_secondary ~ '^#[0-9A-Fa-f]{6}$'),
  color_accent text not null default '#2456D3' check (color_accent ~ '^#[0-9A-Fa-f]{6}$'),
  accepting_orders boolean not null default true,
  busy_until timestamptz,
  walk_in_enabled boolean not null default true,
  pickup_enabled boolean not null default true,
  delivery_enabled boolean not null default false,
  cod_enabled boolean not null default false,
  pay_later_pickup boolean not null default false,
  delivery_fee_via_messenger boolean not null default false,
  unpaid_expiry_minutes integer not null default 30 check (unpaid_expiry_minutes between 5 and 1440),
  show_member_count boolean not null default true
);

-- ---------------------------------------------------------------------------
-- 4. Membership helpers (RLS policies run as the caller, so these are executable by authenticated)
-- ---------------------------------------------------------------------------

create function private.is_shop_member(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_members m
    where m.tenant_id = p_tenant
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create function private.is_active_shop_owner(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_members m
    join public.tenants t on t.id = m.tenant_id
    where m.tenant_id = p_tenant
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'owner'
      and t.status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- 5. Profiles trigger
-- ---------------------------------------------------------------------------

-- Storefront customers sign up with no metadata, so a null display name must work.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- 6. RLS, grants and policies (authenticated only; anon gets nothing here)
-- ---------------------------------------------------------------------------

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_members enable row level security;
alter table public.shop_settings enable row level security;

revoke all on public.tenants, public.profiles, public.tenant_members, public.shop_settings from anon, authenticated;

grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_shop_member(uuid), private.is_active_shop_owner(uuid) to authenticated;
-- The tenants slug check calls it, and check constraints run as the caller.
grant execute on function private.is_reserved_slug(text) to authenticated;

-- tenants: members read their shop; owners of an active shop change only the name (decision P3-2).
grant select on public.tenants to authenticated;
grant update (name) on public.tenants to authenticated;

create policy tenants_select_member on public.tenants
  for select to authenticated
  using (private.is_shop_member(id));

create policy tenants_update_active_owner on public.tenants
  for update to authenticated
  using (private.is_active_shop_owner(id))
  with check (private.is_active_shop_owner(id));

-- tenant_members: read own rows; no client writes.
grant select on public.tenant_members to authenticated;

create policy tenant_members_select_own on public.tenant_members
  for select to authenticated
  using (user_id = (select auth.uid()));

-- shop_settings: members read; owners of an active shop change every column except tenant_id.
grant select on public.shop_settings to authenticated;
grant update (
  logo_path, cover_path, tagline, phone, email, address, city, maps_url, facebook_url, messenger_username,
  color_primary, color_secondary, color_accent, accepting_orders, busy_until, walk_in_enabled, pickup_enabled,
  delivery_enabled, cod_enabled, pay_later_pickup, delivery_fee_via_messenger, unpaid_expiry_minutes,
  show_member_count
) on public.shop_settings to authenticated;

create policy shop_settings_select_member on public.shop_settings
  for select to authenticated
  using (private.is_shop_member(tenant_id));

create policy shop_settings_update_active_owner on public.shop_settings
  for update to authenticated
  using (private.is_active_shop_owner(tenant_id))
  with check (private.is_active_shop_owner(tenant_id));

-- profiles: own row only.
grant select on public.profiles to authenticated;
grant update (display_name, phone) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 7. Functions (system paper 7.4)
-- ---------------------------------------------------------------------------

-- Owner shop setup. Errors are fixed codes; the apps map them to words.
-- Default business hours come with P5.1, whose migration replaces this function (decision P3-3).
create function public.create_my_shop(p_business_type text, p_name text, p_slug text)
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

  return v_tenant;
end;
$$;

-- False for invalid, reserved or taken slugs (added beyond paper 7.4, decision P3-4).
create function public.slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_slug is not null
    and p_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(p_slug) between 3 and 40
    and not private.is_reserved_slug(p_slug)
    and not exists (select 1 from public.tenants t where t.slug = p_slug);
$$;

-- ---------------------------------------------------------------------------
-- 8. Function grants
-- ---------------------------------------------------------------------------

revoke execute on function public.create_my_shop(text, text, text) from public, anon;
revoke execute on function public.slug_available(text) from public, anon;
grant execute on function public.create_my_shop(text, text, text) to authenticated;
grant execute on function public.slug_available(text) to authenticated;
