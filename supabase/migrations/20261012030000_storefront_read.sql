-- P5.2: get_storefront, the one call a shop page makes (system paper 4.1, 6.3, 7.4; docs/api-surface.md slice 2).
-- Anyone may call it. It reads past RLS (security definer) and returns only what a customer may see: no plan,
-- paid_until or status, nothing hidden or archived, only active payment accounts and zones.

-- ---------------------------------------------------------------------------
-- 1. get_storefront
-- ---------------------------------------------------------------------------

-- The Storefront contract (packages/core/src/contracts/db-functions.ts), camelCase so the core schema parses it.
-- Only active shops; any other slug raises shop_not_found. stampRule is null and memberCount 0 until P5.5
-- replaces this function.
create function public.get_storefront(p_slug text)
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
        'showMemberCount', v_settings.show_member_count
      )
    ),
    'isOpen', v_settings.accepting_orders
      and (v_settings.busy_until is null or v_settings.busy_until <= now())
      and private.is_open_now(v_tenant.id),
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
    -- Active items with at least one variant for sale, outside hidden categories.
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
          'isActive', z.is_active, 'sort', z.sort
        )
        order by z.sort, z.name
      )
      from public.delivery_zones z
      where z.tenant_id = v_tenant.id and z.is_active
    ), '[]'::jsonb),
    'stampRule', null,
    'memberCount', case when v_settings.show_member_count then 0 end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Function grants
-- ---------------------------------------------------------------------------

revoke execute on function public.get_storefront(text) from public;
grant execute on function public.get_storefront(text) to anon, authenticated;
