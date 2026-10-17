-- SF2 Step 1: Shop content, banners, zone centres
-- Additive & backward compatible: new nullable columns, shop_banners table with RLS, updated get_storefront.

-- 1. shop_settings: announcement, about, google review url
alter table public.shop_settings
  add column if not exists announcement_text text check (announcement_text is null or char_length(btrim(announcement_text)) <= 160),
  add column if not exists announcement_tone text not null default 'info' check (announcement_tone in ('info', 'promo', 'warning')),
  add column if not exists announcement_ends_at timestamptz,
  add column if not exists about_text text check (about_text is null or char_length(btrim(about_text)) <= 600),
  add column if not exists google_review_url text check (
    google_review_url is null or google_review_url ~ '^https://(g\.page|search\.google\.com|maps\.app\.goo\.gl)/'
  );

grant update (
  announcement_text, announcement_tone, announcement_ends_at, about_text, google_review_url
) on public.shop_settings to authenticated;

-- 2. delivery_zones: center coordinates
alter table public.delivery_zones
  add column if not exists center_lat numeric(9,6),
  add column if not exists center_lng numeric(9,6),
  add constraint delivery_zones_center check (
    (center_lat is null and center_lng is null) or
    (center_lat between -90 and 90 and center_lng between -180 and 180 and center_lat is not null and center_lng is not null)
  );

grant update (center_lat, center_lng) on public.delivery_zones to authenticated;

-- 3. shop_banners: up to 3 active slides per shop
create table if not exists public.shop_banners (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  kind text not null check (kind in ('image', 'youtube')),
  image_path text,
  youtube_id text check (youtube_id is null or youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null check (char_length(btrim(title)) between 1 and 60),
  link_url text check (link_url is null or link_url ~ '^https?://'),
  sort integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint shop_banners_kind_data check (
    (kind = 'image' and image_path is not null) or
    (kind = 'youtube' and youtube_id is not null)
  ),
  constraint shop_banners_tenant_unique unique (id, tenant_id)
);

create index if not exists shop_banners_tenant_sort on public.shop_banners (tenant_id, sort, created_at);

-- Trigger: at most 3 active banners per shop
create or replace function private.check_shop_banners_active_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if new.is_active then
    select count(*) into v_count
    from public.shop_banners
    where tenant_id = new.tenant_id
      and is_active = true
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if v_count >= 3 then
      raise exception 'too_many_active_banners' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_shop_banners_active_limit on public.shop_banners;
create trigger tr_shop_banners_active_limit
before insert or update on public.shop_banners
for each row
execute function private.check_shop_banners_active_limit();

-- RLS, grants, and policies on shop_banners
alter table public.shop_banners enable row level security;

revoke all on public.shop_banners from anon, authenticated;

grant select, delete on public.shop_banners to authenticated;
grant insert (id, tenant_id, kind, image_path, youtube_id, title, link_url, sort, is_active)
  on public.shop_banners to authenticated;
grant update (kind, image_path, youtube_id, title, link_url, sort, is_active)
  on public.shop_banners to authenticated;

drop policy if exists shop_banners_select_member on public.shop_banners;
create policy shop_banners_select_member on public.shop_banners
  for select to authenticated
  using (private.is_shop_member(tenant_id));

drop policy if exists shop_banners_insert_active_owner on public.shop_banners;
create policy shop_banners_insert_active_owner on public.shop_banners
  for insert to authenticated
  with check (private.is_active_shop_owner(tenant_id));

drop policy if exists shop_banners_update_active_owner on public.shop_banners;
create policy shop_banners_update_active_owner on public.shop_banners
  for update to authenticated
  using (private.is_active_shop_owner(tenant_id))
  with check (private.is_active_shop_owner(tenant_id));

drop policy if exists shop_banners_delete_active_owner on public.shop_banners;
create policy shop_banners_delete_active_owner on public.shop_banners
  for delete to authenticated
  using (private.is_active_shop_owner(tenant_id));

-- 4. Update storefront_base and get_storefront
create or replace function private.storefront_base(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant public.tenants;
  v_settings public.shop_settings;
  v_today date := (now() at time zone 'Asia/Manila')::date;
begin
  select * into v_tenant from public.tenants t where t.slug = p_slug and t.status = 'active';
  if not found then
    raise exception 'shop_not_found';
  end if;
  select * into v_settings from public.shop_settings s where s.tenant_id = v_tenant.id;
  if not found then
    raise exception 'shop_not_found';
  end if;

  return jsonb_build_object(
    'shop', jsonb_build_object(
      'id', v_tenant.id,
      'slug', v_tenant.slug,
      'name', v_tenant.name,
      'businessType', v_tenant.business_type,
      'isDemo', v_tenant.is_demo,
      'createdAt', v_tenant.created_at,
      'settings', jsonb_build_object(
        'tenantId', v_settings.tenant_id,
        'logoPath', v_settings.logo_path,
        'coverPath', v_settings.cover_path,
        'tagline', v_settings.tagline,
        'phone', v_settings.phone,
        'email', v_settings.email,
        'address', v_settings.address,
        'city', v_settings.city,
        'mapsUrl', v_settings.maps_url,
        'facebookUrl', v_settings.facebook_url,
        'messengerUsername', v_settings.messenger_username,
        'colorPrimary', v_settings.color_primary,
        'colorSecondary', v_settings.color_secondary,
        'colorAccent', v_settings.color_accent,
        'acceptingOrders', v_settings.accepting_orders,
        'busyUntil', v_settings.busy_until,
        'walkInEnabled', v_settings.walk_in_enabled,
        'pickupEnabled', v_settings.pickup_enabled,
        'deliveryEnabled', v_settings.delivery_enabled,
        'codEnabled', v_settings.cod_enabled,
        'payLaterPickup', v_settings.pay_later_pickup,
        'deliveryFeeViaMessenger', v_settings.delivery_fee_via_messenger,
        'unpaidExpiryMinutes', v_settings.unpaid_expiry_minutes,
        'showMemberCount', v_settings.show_member_count,
        'announcementText', v_settings.announcement_text,
        'announcementTone', v_settings.announcement_tone,
        'announcementEndsAt', v_settings.announcement_ends_at,
        'aboutText', v_settings.about_text,
        'googleReviewUrl', v_settings.google_review_url
      )
    ),
    'isOpen', v_settings.accepting_orders
      and (v_settings.busy_until is null or v_settings.busy_until <= now())
      and private.is_open_now(v_tenant.id),
    'announcement', case
      when v_settings.announcement_text is not null and btrim(v_settings.announcement_text) <> ''
        and (v_settings.announcement_ends_at is null or v_settings.announcement_ends_at > now())
      then jsonb_build_object(
        'text', v_settings.announcement_text,
        'tone', v_settings.announcement_tone,
        'endsAt', v_settings.announcement_ends_at
      )
      else null
    end,
    'about', v_settings.about_text,
    'googleReviewUrl', v_settings.google_review_url,
    'banners', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'tenantId', b.tenant_id,
          'kind', b.kind,
          'imagePath', b.image_path,
          'youtubeId', b.youtube_id,
          'title', b.title,
          'linkUrl', b.link_url,
          'sort', b.sort,
          'isActive', b.is_active
        )
        order by b.sort, b.created_at
      )
      from public.shop_banners b
      where b.tenant_id = v_tenant.id and b.is_active
    ), '[]'::jsonb),
    'hours', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'tenantId', h.tenant_id, 'weekday', h.weekday,
          'opensAt', to_char(h.opens_at, 'HH24:MI'), 'closesAt', to_char(h.closes_at, 'HH24:MI')
        )
        order by h.weekday
      )
      from public.business_hours h
      where h.tenant_id = v_tenant.id
    ), '[]'::jsonb),
    'closures', coalesce((
      select jsonb_agg(
        jsonb_build_object('tenantId', c.tenant_id, 'closedOn', to_char(c.closed_on, 'YYYY-MM-DD'), 'note', c.note)
        order by c.closed_on
      )
      from public.closures c
      where c.tenant_id = v_tenant.id and c.closed_on >= v_today
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id, 'tenantId', c.tenant_id, 'name', c.name, 'sort', c.sort, 'isHidden', c.is_hidden,
          'icon', case c.icon_kind
            when 'fluent' then jsonb_build_object('kind', 'fluent', 'key', c.icon_value)
            when 'emoji' then jsonb_build_object('kind', 'emoji', 'value', c.icon_value)
            when 'image' then jsonb_build_object('kind', 'image', 'path', c.icon_value)
          end
        )
        order by c.sort, c.name
      )
      from public.categories c
      where c.tenant_id = v_tenant.id and not c.is_hidden
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', i.id, 'tenantId', i.tenant_id, 'categoryId', i.category_id, 'name', i.name,
          'description', i.description, 'status', i.status, 'isFeatured', i.is_featured,
          'trackStock', i.track_stock, 'sort', i.sort,
          'photos', coalesce((
            select jsonb_agg(
              jsonb_build_object('id', p.id, 'tenantId', p.tenant_id, 'itemId', p.item_id, 'path', p.path, 'sort', p.sort)
              order by p.sort, p.id
            )
            from public.item_photos p
            where p.item_id = i.id and p.tenant_id = i.tenant_id
          ), '[]'::jsonb),
          'variants', (
            select jsonb_agg(
              jsonb_build_object(
                'id', v.id, 'tenantId', v.tenant_id, 'itemId', v.item_id, 'name', v.name, 'price', v.price,
                'stockOnHand', v.stock_on_hand, 'lowStockAt', v.low_stock_at, 'isSoldOut', v.is_sold_out,
                'sort', v.sort, 'archivedAt', v.archived_at
              )
              order by v.sort, v.name
            )
            from public.item_variants v
            where v.item_id = i.id and v.tenant_id = i.tenant_id and v.archived_at is null
          ),
          'optionGroups', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', g.id, 'tenantId', g.tenant_id, 'name', g.name,
                'minSelect', g.min_select, 'maxSelect', g.max_select,
                'options', coalesce((
                  select jsonb_agg(
                    jsonb_build_object(
                      'id', o.id, 'tenantId', o.tenant_id, 'groupId', o.group_id, 'name', o.name,
                      'priceDelta', o.price_delta, 'isSoldOut', o.is_sold_out
                    )
                    order by o.sort, o.name
                  )
                  from public.options o
                  where o.group_id = g.id and o.tenant_id = g.tenant_id
                ), '[]'::jsonb)
              )
              order by l.sort, g.name
            )
            from public.item_option_groups l
            join public.option_groups g on g.id = l.group_id and g.tenant_id = l.tenant_id
            where l.item_id = i.id
          ), '[]'::jsonb)
        )
        order by i.sort, i.name
      )
      from public.items i
      left join public.categories c on c.id = i.category_id and c.tenant_id = i.tenant_id
      where i.tenant_id = v_tenant.id
        and i.status = 'active'
        and (c.id is null or not c.is_hidden)
        and exists (
          select 1 from public.item_variants v where v.item_id = i.id and v.tenant_id = i.tenant_id and v.archived_at is null
        )
    ), '[]'::jsonb),
    'paymentAccounts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id, 'tenantId', a.tenant_id, 'method', a.method, 'accountName', a.account_name,
          'accountNumber', a.account_number, 'bankName', a.bank_name, 'qrPath', a.qr_path,
          'isActive', a.is_active, 'sort', a.sort
        )
        order by a.sort, a.account_name
      )
      from public.payment_accounts a
      where a.tenant_id = v_tenant.id and a.is_active
    ), '[]'::jsonb),
    'deliveryZones', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', z.id, 'tenantId', z.tenant_id, 'name', z.name, 'fee', z.fee, 'etaText', z.eta_text,
          'isActive', z.is_active, 'sort', z.sort,
          'center', case
            when z.center_lat is not null and z.center_lng is not null
            then jsonb_build_object('lat', z.center_lat, 'lng', z.center_lng)
            else null
          end
        )
        order by z.sort, z.name
      )
      from public.delivery_zones z
      where z.tenant_id = v_tenant.id and z.is_active
    ), '[]'::jsonb),
    'stampRule', null,
    'memberCount', null
  );
end;
$$;

create or replace function public.get_storefront(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb := private.storefront_base(p_slug);
  v_tenant_id uuid := (v_result -> 'shop' ->> 'id')::uuid;
  v_rule public.loyalty_rules;
begin
  select * into v_rule from public.loyalty_rules r where r.tenant_id = v_tenant_id and r.is_active;
  return v_result || jsonb_build_object(
    'stampRule', case when found then private.stamp_rule_json(v_rule) end,
    'memberCount', case when (v_result -> 'shop' -> 'settings' ->> 'showMemberCount')::boolean then (
      select count(*)::integer from public.customers c where c.tenant_id = v_tenant_id and c.member_since is not null
    ) end
  );
end;
$$;
