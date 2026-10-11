-- DB-FIX: audit fix-ups for DB-1 … DB-5 (no applied migration is edited).
-- Order inside the file: functions → grants.

-- ---------------------------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------------------------

-- Opening hours always use Manila time, whatever the session timezone is.
create or replace function private.is_open_now(p_tenant_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_now timestamp := (now() at time zone 'Asia/Manila');
  v_today date := v_now::date;
  v_time time := v_now::time;
  v_dow int := extract(dow from v_now)::int;
  v_yesterday_dow int := (v_dow + 6) % 7;
begin
  if exists (select 1 from public.closures c where c.tenant_id = p_tenant_id and c.closed_on = v_today) then
    return false;
  end if;

  if not exists (select 1 from public.business_hours h where h.tenant_id = p_tenant_id) then
    return true;
  end if;

  return exists (
    select 1
    from public.business_hours h
    where h.tenant_id = p_tenant_id
      and (
        (h.weekday = v_dow and h.opens_at <= h.closes_at and v_time >= h.opens_at and v_time < h.closes_at)
        or
        (h.weekday = v_dow and h.closes_at < h.opens_at and v_time >= h.opens_at)
        or
        (h.weekday = v_yesterday_dow and h.closes_at < h.opens_at and v_time < h.closes_at)
      )
  );
end;
$$;

-- For `pnpm db:smoke`: which roles can execute each function in schema private. service_role only.
create function public.get_private_function_grants()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', p.proname,
        'anon', pg_catalog.has_function_privilege('anon', p.oid, 'execute'),
        'authenticated', pg_catalog.has_function_privilege('authenticated', p.oid, 'execute')
      )
      order by p.proname
    ),
    '[]'::jsonb
  )
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private';
$$;

-- ---------------------------------------------------------------------------
-- 2. Order engine
-- ---------------------------------------------------------------------------

create or replace function private.build_order(
  p_tenant_id uuid,
  p_payload jsonb,
  p_channel text,
  p_actor uuid,
  p_quote boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings record;
  v_fulfillment text;
  v_payment_method text;
  v_customer_id uuid;
  v_found_id uuid;
  v_found_user uuid;
  v_blocked boolean;
  v_cod_allowed boolean;
  v_phone text;
  v_name text;
  v_email text;
  v_notes text;
  v_scheduled_for timestamptz;
  v_lines jsonb;
  v_line_count int;
  v_line jsonb;
  v_idx int := 0;
  v_var_id uuid;
  v_variant record;
  v_qty int;
  v_seen jsonb := '{}'::jsonb;
  v_prev int;
  v_unit_price bigint;
  v_options_total bigint;
  v_line_total bigint;
  v_opt_ids uuid[];
  v_opt_id uuid;
  v_og record;
  v_picked_count int;
  v_order_item_id uuid;
  v_is_preorder boolean := false;
  v_table record;
  v_zone_id uuid;
  v_zone record;
  v_pick record;
  v_zone_pick uuid;
  v_zone_name text;
  v_addr_line text;
  v_landmark text;
  v_delivery_fee bigint := 0;
  v_subtotal bigint := 0;
  v_discount_total bigint := 0;
  v_total bigint := 0;
  v_order_id uuid;
  v_order_no int := 0;
  v_date date;
  v_via text;
  v_expires_at timestamptz;
  v_m jsonb;
  v_var_ids uuid[] := '{}';
  v_lat double precision;
  v_lng double precision;
  v_dist double precision;
  v_installed boolean;
  v_c_privacy boolean;
  v_c_push boolean;
  v_c_email boolean;
begin
  -- 0. Shape of the payload: bad input is `invalid`, never a raw database error.
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid';
  end if;

  v_via := case
    when private.is_member(p_tenant_id) then 'staff'
    when p_channel = 'pos' then 'support'
    else 'customer'
  end;
  v_fulfillment := p_payload->>'fulfillment';
  v_payment_method := p_payload->>'payment_method';
  v_lines := p_payload->'lines';

  if v_fulfillment is null or v_fulfillment not in ('walk_in','dine_in','pickup','delivery','shipping') then
    raise exception 'invalid';
  end if;

  if v_payment_method is not null and v_payment_method not in ('cash','gcash','maya','bank','cod') then
    raise exception 'invalid';
  end if;

  if v_lines is null or jsonb_typeof(v_lines) <> 'array' then
    raise exception 'invalid';
  end if;

  v_line_count := jsonb_array_length(v_lines);
  if v_line_count < 1 or v_line_count > 50 then
    raise exception 'invalid';
  end if;

  v_phone := nullif(btrim(coalesce(p_payload->'customer'->>'phone', '')), '');
  v_name := btrim(coalesce(p_payload->'customer'->>'name', ''));
  v_email := btrim(coalesce(p_payload->'customer'->>'email', ''));
  v_notes := nullif(btrim(coalesce(p_payload->>'notes', '')), '');
  v_addr_line := nullif(btrim(coalesce(p_payload->'address'->>'line', '')), '');
  v_landmark := nullif(btrim(coalesce(p_payload->'address'->>'landmark', '')), '');

  if char_length(v_name) > 80
     or (v_phone is not null and not (v_phone ~ '^\+639\d{9}$'))
     or char_length(v_email) > 120
     or char_length(coalesce(v_notes, '')) > 300
     or char_length(coalesce(v_addr_line, '')) > 200
     or char_length(coalesce(v_landmark, '')) > 120 then
    raise exception 'invalid';
  end if;

  begin
    v_installed := coalesce((p_payload->>'installed_app')::boolean, false);
    v_scheduled_for := (p_payload->>'scheduled_for')::timestamptz;
    v_zone_id := (p_payload->>'delivery_zone_id')::uuid;
    v_lat := (p_payload->'address'->>'lat')::double precision;
    v_lng := (p_payload->'address'->>'lng')::double precision;
    v_c_privacy := (p_payload->'consents'->>'privacy')::boolean;
    v_c_push := (p_payload->'consents'->>'push')::boolean;
    v_c_email := (p_payload->'consents'->>'email')::boolean;
    perform (p_payload->>'redeem_reward')::boolean;

    for v_line in select value from jsonb_array_elements(v_lines) loop
      if jsonb_typeof(v_line) <> 'object' then
        raise exception 'invalid';
      end if;
      v_var_id := (v_line->>'variant_id')::uuid;
      v_qty := (v_line->>'qty')::int;
      if v_var_id is null or v_qty is null or v_qty < 1 or char_length(coalesce(v_line->>'notes', '')) > 200 then
        raise exception 'invalid';
      end if;
      if jsonb_typeof(v_line->'option_ids') not in ('array', 'null') then
        raise exception 'invalid';
      end if;
      if jsonb_typeof(v_line->'option_ids') = 'array' then
        perform (o.value#>>'{}')::uuid from jsonb_array_elements(v_line->'option_ids') o;
      end if;
      v_var_ids := array_append(v_var_ids, v_var_id);
    end loop;
  exception
    when data_exception then
      raise exception 'invalid';
  end;

  if p_channel <> 'storefront' then
    v_scheduled_for := null;
  end if;

  -- 1. Throttle (storefront and not quote)
  if p_channel = 'storefront' and not p_quote then
    if v_phone is not null then
      if (
        select count(*)
        from public.orders
        where tenant_id = p_tenant_id
          and channel = 'storefront'
          and customer_phone = v_phone
          and payment_status = 'unpaid'
          and placed_at > now() - interval '30 minutes'
      ) >= 3 then
        raise exception 'rate_limited';
      end if;
    end if;

    if (
      select count(*)
      from public.orders
      where tenant_id = p_tenant_id
        and channel = 'storefront'
        and placed_at > now() - interval '1 minute'
    ) >= 30 then
      raise exception 'rate_limited';
    end if;
  end if;

  -- 2. Settings (lock tenant_settings)
  select * into v_settings
  from public.tenant_settings
  where tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  if (v_fulfillment = 'walk_in' and not v_settings.walk_in_enabled)
     or (v_fulfillment = 'dine_in' and not v_settings.dine_in_enabled)
     or (v_fulfillment = 'pickup' and not v_settings.pickup_enabled)
     or (v_fulfillment = 'delivery' and not v_settings.delivery_enabled)
     or (v_fulfillment = 'shipping' and not v_settings.shipping_enabled) then
    raise exception 'fulfillment_unavailable';
  end if;

  if p_channel = 'storefront' then
    -- A shop that stopped taking orders refuses everything, scheduled orders included.
    if not v_settings.accepting_orders then
      raise exception 'shop_closed';
    end if;

    if v_scheduled_for is not null then
      if not v_settings.scheduled_orders_enabled
         or v_scheduled_for < now() + (v_settings.schedule_lead_minutes || ' minutes')::interval then
        raise exception 'invalid';
      end if;
    else
      if not private.is_open_now(p_tenant_id) then
        raise exception 'shop_closed';
      end if;
      if v_settings.busy_until is not null and v_settings.busy_until > now() then
        raise exception 'shop_busy';
      end if;
    end if;

    -- Storefront payment methods per fulfillment. A quote may come before the method is picked.
    if v_payment_method is null then
      if not p_quote then
        raise exception 'invalid';
      end if;
    else
      if v_fulfillment in ('walk_in', 'dine_in') and v_payment_method not in ('cash','gcash','maya','bank') then
        raise exception 'invalid';
      elsif v_fulfillment = 'pickup' and (
        (v_payment_method = 'cash' and not v_settings.pickup_pay_at_counter)
        or (v_payment_method not in ('cash','gcash','maya','bank'))
      ) then
        raise exception 'invalid';
      elsif v_fulfillment in ('delivery','shipping') and v_payment_method not in ('cod','gcash','maya','bank') then
        raise exception 'invalid';
      end if;

      if v_payment_method in ('gcash','maya','bank') then
        if not exists (
          select 1 from public.payment_accounts
          where tenant_id = p_tenant_id and method = v_payment_method and is_active
        ) then
          raise exception 'invalid';
        end if;
      end if;
    end if;
  end if;

  -- 3. Customer: a signed-in member's own row first, then the guest rules (storefront and POS alike).
  v_customer_id := private.resolve_member_customer(p_tenant_id);

  if v_customer_id is null then
    if p_channel = 'storefront' and not p_quote then
      if char_length(v_name) < 1 or v_phone is null or v_c_privacy is distinct from true then
        raise exception 'invalid';
      end if;
    end if;

    if v_phone is not null then
      select id, user_id into v_found_id, v_found_user
      from public.customers
      where tenant_id = p_tenant_id and phone = v_phone;

      if found then
        -- A guest row is reused as it is (name and email never overwritten). A member's row is never linked by phone.
        if v_found_user is null then
          v_customer_id := v_found_id;
        end if;
      elsif not p_quote and char_length(v_name) >= 1 then
        insert into public.customers (tenant_id, name, phone, email)
        values (p_tenant_id, v_name, v_phone, nullif(v_email, ''))
        returning id into v_customer_id;
      end if;
    end if;
  end if;

  if v_customer_id is not null then
    select is_blocked, cod_allowed into v_blocked, v_cod_allowed
    from public.customers
    where id = v_customer_id;

    if v_blocked then
      raise exception 'customer_blocked';
    end if;
  end if;

  if v_payment_method = 'cod'
     and (not v_settings.cod_enabled or (v_customer_id is not null and not v_cod_allowed)) then
    raise exception 'cod_not_allowed';
  end if;

  -- 4. Number & date
  v_date := (now() at time zone 'Asia/Manila')::date;
  if not p_quote then
    insert into public.order_counters (tenant_id, business_date, last_no)
    values (p_tenant_id, v_date, 1)
    on conflict (tenant_id, business_date) do update
      set last_no = public.order_counters.last_no + 1
    returning last_no into v_order_no;
  end if;

  -- 5. Order row with zero totals
  insert into public.orders (
    tenant_id, business_date, order_no, channel, fulfillment, payment_method,
    customer_id, customer_name, customer_phone, customer_email,
    scheduled_for, notes, created_by, installed_app
  ) values (
    p_tenant_id, v_date, v_order_no, p_channel, v_fulfillment, v_payment_method,
    v_customer_id, nullif(v_name, ''), v_phone, nullif(v_email, ''),
    v_scheduled_for, v_notes, p_actor, v_installed
  )
  returning id into v_order_id;

  -- 6. Lines: lock every cart variant once, in id order
  perform 1 from public.item_variants where id = any(v_var_ids) order by id for update;

  for v_line in select value from jsonb_array_elements(v_lines) loop
    v_idx := v_idx + 1;
    v_var_id := (v_line->>'variant_id')::uuid;
    v_qty := (v_line->>'qty')::int;

    select iv.item_id, iv.name, iv.price, iv.is_sold_out, iv.stock_on_hand, iv.archived_at,
           i.name as item_name, i.status as item_status, i.track_stock, i.min_qty as item_min_qty,
           i.qty_step as item_qty_step, i.preorder_enabled as item_preorder
    into v_variant
    from public.item_variants iv
    join public.items i on i.id = iv.item_id
    where iv.id = v_var_id and iv.tenant_id = p_tenant_id;

    if not found or v_variant.item_status <> 'active' or v_variant.archived_at is not null or v_variant.is_sold_out then
      raise exception 'item_unavailable' using detail = v_var_id::text;
    end if;

    if v_qty < v_variant.item_min_qty or (v_qty - v_variant.item_min_qty) % v_variant.item_qty_step <> 0 then
      raise exception 'invalid_qty';
    end if;

    -- Options: no duplicates, every pick is in a group linked to the item and not sold out
    v_opt_ids := '{}';
    v_options_total := 0;
    if jsonb_typeof(v_line->'option_ids') = 'array' then
      for v_opt_id in select (o.value#>>'{}')::uuid from jsonb_array_elements(v_line->'option_ids') o loop
        if v_opt_id is null or v_opt_id = any(v_opt_ids) then
          raise exception 'invalid_options';
        end if;
        v_opt_ids := array_append(v_opt_ids, v_opt_id);
      end loop;
    end if;

    for v_og in
      select og.id, og.min_select, og.max_select
      from public.item_option_groups iog
      join public.option_groups og on og.id = iog.group_id
      where iog.item_id = v_variant.item_id
    loop
      select count(*) into v_picked_count
      from public.options o
      where o.group_id = v_og.id and o.id = any(v_opt_ids);

      if v_picked_count < v_og.min_select or v_picked_count > v_og.max_select then
        raise exception 'invalid_options';
      end if;
    end loop;

    if cardinality(v_opt_ids) > 0 then
      select count(*), coalesce(sum(o.price_delta), 0) into v_picked_count, v_options_total
      from public.options o
      join public.item_option_groups iog on iog.group_id = o.group_id and iog.item_id = v_variant.item_id
      where o.id = any(v_opt_ids) and o.tenant_id = p_tenant_id and not o.is_sold_out;

      if v_picked_count <> cardinality(v_opt_ids) then
        raise exception 'invalid_options';
      end if;
    end if;

    -- Tiered price
    select unit_price into v_unit_price
    from public.price_tiers
    where variant_id = v_var_id and min_qty <= v_qty
    order by min_qty desc
    limit 1;

    if not found then
      v_unit_price := v_variant.price;
    end if;

    v_line_total := (v_unit_price + v_options_total) * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    insert into public.order_items (
      tenant_id, order_id, item_id, variant_id, item_name, variant_name,
      unit_price, options_total, qty, line_total, notes, sort
    ) values (
      p_tenant_id, v_order_id, v_variant.item_id, v_var_id, v_variant.item_name, v_variant.name,
      v_unit_price, v_options_total, v_qty, v_line_total, nullif(btrim(coalesce(v_line->>'notes', '')), ''), v_idx
    )
    returning id into v_order_item_id;

    if cardinality(v_opt_ids) > 0 then
      insert into public.order_item_options (
        tenant_id, order_item_id, option_id, group_name, option_name, price_delta
      )
      select p_tenant_id, v_order_item_id, o.id, og.name, o.name, o.price_delta
      from public.options o
      join public.option_groups og on og.id = o.group_id
      where o.id = any(v_opt_ids);
    end if;

    -- 7. Stock. A quote moves nothing, so it counts the same variant across lines itself.
    if v_variant.track_stock then
      v_prev := case when p_quote then coalesce((v_seen->>(v_var_id::text))::int, 0) else 0 end;
      if v_variant.stock_on_hand < v_qty + v_prev and not v_variant.item_preorder then
        raise exception 'out_of_stock' using detail = v_var_id::text;
      end if;
      if not p_quote then
        perform private.move_stock(p_tenant_id, v_var_id, -v_qty, 'sale', v_order_id, null);
      end if;
      v_seen := jsonb_set(v_seen, array[v_var_id::text], to_jsonb(v_prev + v_qty));
    end if;

    if v_variant.item_preorder then
      v_is_preorder := true;
    end if;
  end loop;

  -- 8. Table / zone
  if v_fulfillment = 'dine_in' then
    select id, label into v_table
    from public.dining_tables
    where tenant_id = p_tenant_id and qr_token = (p_payload->>'table_token') and is_active;

    if not found then
      raise exception 'invalid';
    end if;

    update public.orders
    set table_id = v_table.id, table_label = v_table.label
    where id = v_order_id;
  end if;

  if v_fulfillment in ('delivery', 'shipping') then
    if v_zone_id is null then
      if not (v_fulfillment = 'delivery' and v_settings.delivery_fee_on_messenger) then
        raise exception 'zone_required';
      end if;
    else
      select id, kind, name, fee into v_zone
      from public.delivery_zones
      where id = v_zone_id and tenant_id = p_tenant_id and is_active and fulfillment = v_fulfillment;

      if not found then
        raise exception 'invalid';
      end if;

      v_zone_pick := v_zone.id;
      v_zone_name := v_zone.name;
      v_delivery_fee := v_zone.fee;

      if v_zone.kind = 'distance' then
        -- A distance zone needs the customer's pin.
        if v_lat is null or v_lng is null then
          raise exception 'invalid';
        end if;

        if v_settings.lat is not null and v_settings.lng is not null then
          v_dist := private.distance_km(v_settings.lat, v_settings.lng, v_lat, v_lng);

          select id, name, fee into v_pick
          from public.delivery_zones
          where tenant_id = p_tenant_id and is_active and fulfillment = 'delivery'
            and kind = 'distance' and max_km >= v_dist
          order by max_km asc
          limit 1;

          if not found then
            if v_settings.distance_check_mode = 'block' then
              raise exception 'too_far';
            end if;

            select id, name, fee into v_pick
            from public.delivery_zones
            where tenant_id = p_tenant_id and is_active and fulfillment = 'delivery' and kind = 'distance'
            order by max_km desc
            limit 1;
          end if;

          v_zone_pick := v_pick.id;
          v_zone_name := v_pick.name;
          v_delivery_fee := v_pick.fee;
        end if;
      elsif v_zone.kind = 'flat'
            and v_settings.max_delivery_km is not null and v_settings.distance_check_mode <> 'off'
            and v_lat is not null and v_lng is not null
            and v_settings.lat is not null and v_settings.lng is not null then
        v_dist := private.distance_km(v_settings.lat, v_settings.lng, v_lat, v_lng);
        if v_dist > v_settings.max_delivery_km and v_settings.distance_check_mode = 'block' then
          raise exception 'too_far';
        end if;
      end if;
    end if;

    -- Address and pin are kept for every delivery or shipping order, with or without a zone.
    -- The fee is written here so the marketing step can see it.
    update public.orders
    set delivery_zone_id = v_zone_pick,
        zone_name = v_zone_name,
        address_line = v_addr_line,
        landmark = v_landmark,
        lat = v_lat,
        lng = v_lng,
        distance_km = v_dist,
        delivery_fee = v_delivery_fee,
        total = v_delivery_fee
    where id = v_order_id;
  end if;

  -- 9. Marketing
  v_m := private.apply_marketing(v_order_id, p_payload);
  if coalesce((v_m->>'free_delivery')::boolean, false) then
    v_delivery_fee := 0;
  end if;
  v_discount_total := coalesce((v_m->>'discount')::bigint, 0);

  -- 10. Totals
  v_discount_total := least(v_subtotal, v_discount_total);
  v_total := v_subtotal - v_discount_total + v_delivery_fee;

  if p_channel = 'pos' or v_payment_method = 'cod' or (v_fulfillment = 'dine_in' and v_settings.dine_in_pay_later) then
    v_expires_at := null;
  elsif v_payment_method = 'cash' then
    v_expires_at := now() + (v_settings.unpaid_expiry_minutes || ' minutes')::interval;
  elsif v_payment_method in ('gcash','maya','bank') then
    v_expires_at := now() + (v_settings.proof_expiry_minutes || ' minutes')::interval;
  else
    v_expires_at := null;
  end if;

  update public.orders
  set subtotal = v_subtotal,
      discount_total = v_discount_total,
      delivery_fee = v_delivery_fee,
      total = v_total,
      is_preorder = v_is_preorder,
      expires_at = v_expires_at,
      updated_at = now()
  where id = v_order_id;

  -- 11. Not quote mode: event, consents, zero-total orders are paid at once
  if not p_quote then
    insert into public.order_events (
      tenant_id, order_id, kind, from_status, to_status, actor_id, via, meta
    ) values (
      p_tenant_id, v_order_id, 'placed', null, 'placed', p_actor, v_via, '{}'::jsonb
    );

    if v_customer_id is not null then
      if v_c_privacy is not null then
        insert into public.consents (tenant_id, customer_id, channel, granted, source)
        values (p_tenant_id, v_customer_id, 'privacy', v_c_privacy, 'checkout');
      end if;
      if v_c_push is not null then
        insert into public.consents (tenant_id, customer_id, channel, granted, source)
        values (p_tenant_id, v_customer_id, 'push', v_c_push, 'checkout');
      end if;
      if v_c_email is not null then
        insert into public.consents (tenant_id, customer_id, channel, granted, source)
        values (p_tenant_id, v_customer_id, 'email', v_c_email, 'checkout');
      end if;
    end if;

    if v_total = 0 then
      perform private.mark_paid(v_order_id, p_actor, v_via);
    end if;
  end if;

  return v_order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. POS discounts: one helper, so the quote and the real order can't differ
-- ---------------------------------------------------------------------------

create function private.apply_pos_discounts(
  p_tenant_id uuid,
  p_order_id uuid,
  p_discounts jsonb,
  p_approver uuid,
  p_quote boolean
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_vat boolean;
  v_cap int;
  v_can_manual boolean;
  v_d jsonb;
  v_kind text;
  v_holder text;
  v_id_no text;
  v_share bigint;
  v_amount bigint;
  v_percent numeric;
  v_reason text;
  v_approval_id uuid;
  v_added bigint := 0;
  v_discount_total bigint;
  v_total bigint;
begin
  select subtotal, discount_total, delivery_fee, total, payment_status into v_order
  from public.orders
  where id = p_order_id and tenant_id = p_tenant_id;

  if not found then
    raise exception 'not_found';
  end if;

  if p_discounts is null or jsonb_typeof(p_discounts) = 'null' then
    return v_order.total;
  end if;

  if jsonb_typeof(p_discounts) <> 'array' or jsonb_array_length(p_discounts) > 10 then
    raise exception 'invalid';
  end if;

  select vat_registered, manual_discount_cap_pct into v_vat, v_cap
  from public.tenant_settings
  where tenant_id = p_tenant_id;

  v_can_manual := private.has_permission(p_tenant_id, 'discount.manual');

  for v_d in select value from jsonb_array_elements(p_discounts) loop
    v_kind := v_d->>'kind';

    if v_kind in ('senior', 'pwd') then
      if not private.has_permission(p_tenant_id, 'discount.apply') then
        raise exception 'not_allowed';
      end if;

      v_holder := btrim(coalesce(v_d->>'holder_name', ''));
      v_id_no := btrim(coalesce(v_d->>'id_number', ''));
      begin
        v_share := (v_d->>'share_amount')::bigint;
      exception
        when data_exception then
          raise exception 'invalid';
      end;

      if char_length(v_holder) < 2 or char_length(v_holder) > 80
         or char_length(v_id_no) < 4 or char_length(v_id_no) > 30
         or v_share is null or v_share < 1 or v_share > v_order.subtotal then
        raise exception 'invalid';
      end if;

      v_amount := private.discount_for_id(v_share, v_vat);
      if v_amount <= 0 then
        raise exception 'invalid';
      end if;

      insert into public.applied_discounts (
        tenant_id, order_id, kind, amount, label, holder_name, id_number, share_amount, created_by
      ) values (
        p_tenant_id, p_order_id, v_kind, v_amount, upper(v_kind) || ' Discount', v_holder, v_id_no, v_share, (select auth.uid())
      );
    elsif v_kind = 'manual' then
      v_reason := btrim(coalesce(v_d->>'reason', ''));
      if char_length(v_reason) < 3 or char_length(v_reason) > 200 then
        raise exception 'invalid';
      end if;

      begin
        v_amount := (v_d->>'amount')::bigint;
        v_percent := (v_d->>'percent')::numeric;
      exception
        when data_exception then
          raise exception 'invalid';
      end;

      if v_amount is null then
        if v_percent is null or v_percent <= 0 or v_percent > 100 then
          raise exception 'invalid';
        end if;
        v_amount := round(v_order.subtotal * v_percent / 100.0)::bigint;
      end if;

      if v_amount <= 0 then
        raise exception 'invalid';
      end if;

      if v_amount > round(v_order.subtotal * v_cap / 100.0)::bigint then
        raise exception 'discount_over_cap';
      end if;

      v_approval_id := null;
      -- Without discount.manual the owner's PIN approved it (checked by the caller; never in a quote).
      if not v_can_manual and not p_quote then
        if p_approver is null then
          raise exception 'not_allowed';
        end if;

        insert into public.approvals (
          tenant_id, action, target_type, target_id, requested_by, approved_by, method, reason, meta
        ) values (
          p_tenant_id, 'manual_discount', 'order', p_order_id::text, (select auth.uid()), p_approver, 'pin', v_reason,
          jsonb_build_object('amount', v_amount)
        )
        returning id into v_approval_id;

        insert into public.alerts (tenant_id, kind, data)
        values (
          p_tenant_id,
          'manual_discount',
          jsonb_build_object('order_id', p_order_id, 'amount', v_amount, 'reason', v_reason)
        );
      end if;

      insert into public.applied_discounts (
        tenant_id, order_id, kind, amount, label, approval_id, created_by
      ) values (
        p_tenant_id, p_order_id, 'manual', v_amount,
        coalesce(nullif(btrim(coalesce(v_d->>'label', '')), ''), 'Manual Discount'),
        v_approval_id, (select auth.uid())
      );
    else
      raise exception 'invalid';
    end if;

    v_added := v_added + v_amount;
  end loop;

  if v_added = 0 then
    return v_order.total;
  end if;

  v_discount_total := least(v_order.subtotal, v_order.discount_total + v_added);
  v_total := v_order.subtotal - v_discount_total + v_order.delivery_fee;

  update public.orders
  set discount_total = v_discount_total,
      total = v_total,
      updated_at = now()
  where id = p_order_id;

  if not p_quote and v_total = 0 and v_order.payment_status <> 'paid' then
    perform private.mark_paid(p_order_id, (select auth.uid()), 'staff');
  end if;

  return v_total;
end;
$$;

create or replace function public.create_pos_order(p_tenant_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_discounts jsonb;
  v_pin text;
  v_pin_res jsonb;
  v_approver uuid;
  v_order_id uuid;
  v_order_no int;
  v_shift_id uuid;
  v_total bigint;
begin
  if not private.has_permission(p_tenant_id, 'sell.use') then
    raise exception 'not_allowed';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid';
  end if;

  v_discounts := p_payload->'discounts';
  if jsonb_typeof(v_discounts) not in ('array', 'null') then
    raise exception 'invalid';
  end if;

  -- Owner PIN for a manual discount: checked once, before any other write. A failure is returned,
  -- not raised, so the wrong-try counter is kept.
  if jsonb_typeof(v_discounts) = 'array'
     and not private.has_permission(p_tenant_id, 'discount.manual')
     and exists (select 1 from jsonb_array_elements(v_discounts) d where d.value->>'kind' = 'manual') then
    select d.value->>'pin' into v_pin
    from jsonb_array_elements(v_discounts) d
    where d.value->>'kind' = 'manual' and d.value->>'pin' is not null
    limit 1;

    if v_pin is null then
      raise exception 'not_allowed';
    end if;

    v_pin_res := private.verify_pin(p_tenant_id, v_pin);
    if not coalesce((v_pin_res->>'ok')::boolean, false) then
      return v_pin_res;
    end if;
    v_approver := (v_pin_res->>'approver')::uuid;
  end if;

  select id into v_shift_id
  from public.shifts
  where tenant_id = p_tenant_id and opened_by = (select auth.uid()) and status = 'open';

  v_order_id := private.build_order(p_tenant_id, p_payload, 'pos', (select auth.uid()), false);

  update public.orders
  set shift_id = v_shift_id
  where id = v_order_id;

  v_total := private.apply_pos_discounts(p_tenant_id, v_order_id, v_discounts, v_approver, false);

  select order_no into v_order_no from public.orders where id = v_order_id;
  return jsonb_build_object('ok', true, 'id', v_order_id, 'order_no', v_order_no, 'total', v_total);
end;
$$;

create or replace function public.quote_pos_order(p_tenant_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order record;
  v_discounts jsonb;
begin
  if not private.has_permission(p_tenant_id, 'sell.use') then
    raise exception 'not_allowed';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid';
  end if;

  begin
    v_order_id := private.build_order(p_tenant_id, p_payload, 'pos', (select auth.uid()), true);
    perform private.apply_pos_discounts(p_tenant_id, v_order_id, p_payload->'discounts', null, true);

    select subtotal, discount_total, delivery_fee, total
    into v_order
    from public.orders
    where id = v_order_id;

    select coalesce(
      jsonb_agg(
        jsonb_build_object('kind', kind, 'label', label, 'amount', amount)
      ),
      '[]'::jsonb
    ) into v_discounts
    from public.applied_discounts
    where order_id = v_order_id;

    raise exception using errcode = 'P0099';
  exception
    when sqlstate 'P0099' then
      null;
  end;

  return jsonb_build_object(
    'subtotal', v_order.subtotal,
    'discount_total', v_order.discount_total,
    'delivery_fee', v_order.delivery_fee,
    'total', v_order.total,
    'discounts', v_discounts
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Staff, payment, member, marketing and report RPCs (same signatures)
-- ---------------------------------------------------------------------------

create or replace function public.advance_order(
  p_tenant_id uuid,
  p_order_id uuid,
  p_to text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_settings record;
begin
  -- No rights in this business: same answer whether or not the order exists.
  if not (private.has_permission(p_tenant_id, 'orders.manage') or private.has_permission(p_tenant_id, 'prep.update')) then
    raise exception 'not_allowed';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id and tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  select * into v_settings
  from public.tenant_settings
  where tenant_id = p_tenant_id;

  -- Validation per status transition table 6.2
  if v_order.status = 'placed' and p_to = 'in_prep' then
    if not private.has_permission(p_tenant_id, 'orders.manage') then
      raise exception 'not_allowed';
    end if;
    if not (
      v_order.payment_status = 'paid'
      or v_order.payment_method = 'cod'
      or (v_order.fulfillment = 'dine_in' and v_settings.dine_in_pay_later)
      or (v_order.fulfillment = 'pickup' and v_order.payment_method = 'cash' and v_settings.pickup_pay_at_counter)
    ) then
      raise exception 'invalid_transition';
    end if;
  elsif v_order.status = 'in_prep' and p_to = 'ready' then
    if not private.has_permission(p_tenant_id, 'prep.update') then
      raise exception 'not_allowed';
    end if;
    update public.orders set ready_at = now() where id = p_order_id;
  elsif v_order.status = 'ready' and p_to = 'out' then
    if not private.has_permission(p_tenant_id, 'orders.manage') then
      raise exception 'not_allowed';
    end if;
    if v_order.fulfillment not in ('delivery', 'shipping') then
      raise exception 'invalid_transition';
    end if;
  elsif v_order.status = 'ready' and p_to = 'completed' then
    if not private.has_permission(p_tenant_id, 'orders.manage') then
      raise exception 'not_allowed';
    end if;
    if v_order.fulfillment in ('delivery', 'shipping') or v_order.payment_status <> 'paid' then
      raise exception 'invalid_transition';
    end if;
    update public.orders set completed_at = now() where id = p_order_id;
  elsif v_order.status = 'out' and p_to = 'completed' then
    if not private.has_permission(p_tenant_id, 'orders.manage') then
      raise exception 'not_allowed';
    end if;
    if v_order.payment_status <> 'paid' then
      raise exception 'invalid_transition';
    end if;
    update public.orders set completed_at = now() where id = p_order_id;
  else
    raise exception 'invalid_transition';
  end if;

  update public.orders
  set status = p_to, updated_at = now()
  where id = p_order_id;

  insert into public.order_events (
    tenant_id, order_id, kind, from_status, to_status, actor_id, via, meta
  ) values (
    p_tenant_id, p_order_id, 'status', v_order.status, p_to, (select auth.uid()), 'staff', '{}'::jsonb
  );

  if p_to = 'completed' then
    perform private.on_order_completed(p_order_id);
  end if;
end;
$$;

create or replace function public.add_cash_movement(
  p_tenant_id uuid,
  p_shift_id uuid,
  p_kind text,
  p_amount bigint,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shift record;
  v_via text;
begin
  if not (private.has_permission(p_tenant_id, 'shift.use') or private.has_permission(p_tenant_id, 'shift.manage')) then
    raise exception 'not_allowed';
  end if;

  select * into v_shift
  from public.shifts
  where id = p_shift_id and tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  if v_shift.status = 'closed' then
    raise exception 'shift_closed';
  end if;

  if not (
    (v_shift.opened_by = (select auth.uid()) and private.has_permission(p_tenant_id, 'shift.use'))
    or private.has_permission(p_tenant_id, 'shift.manage')
  ) then
    raise exception 'not_allowed';
  end if;

  if p_kind is null or p_amount is null or p_kind not in ('in', 'out') or p_amount <= 0 or char_length(btrim(coalesce(p_reason, ''))) < 3 or char_length(btrim(p_reason)) > 200 then
    raise exception 'invalid';
  end if;

  v_via := case when private.is_member(p_tenant_id) then 'member' else 'support' end;

  insert into public.cash_movements (
    tenant_id, shift_id, kind, amount, reason, created_by
  ) values (
    p_tenant_id, p_shift_id, p_kind, p_amount, p_reason, (select auth.uid())
  );

  perform private.write_audit(
    p_tenant_id,
    v_via,
    case when p_kind = 'in' then 'shift.cash_in' else 'shift.cash_out' end,
    'cash_movement',
    p_shift_id::text,
    jsonb_build_object('amount', p_amount, 'reason', p_reason)
  );
end;
$$;

create or replace function public.close_shift(
  p_tenant_id uuid,
  p_shift_id uuid,
  p_counted_cash bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shift record;
  v_via text;
  v_cash_sales bigint;
  v_cash_refunds bigint;
  v_cash_in bigint;
  v_cash_out bigint;
  v_expected bigint;
  v_diff bigint;
  v_report jsonb;
  v_gross bigint;
  v_net bigint;
  v_voids_count int;
  v_voids_amount bigint;
  v_order_count int;
  v_alert_threshold bigint;
  v_top_items jsonb;
  v_by_method jsonb;
  v_discounts_by_kind jsonb;
  v_sensitive jsonb;
begin
  if not (private.has_permission(p_tenant_id, 'shift.use') or private.has_permission(p_tenant_id, 'shift.manage')) then
    raise exception 'not_allowed';
  end if;

  select * into v_shift
  from public.shifts
  where id = p_shift_id and tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  if v_shift.status = 'closed' then
    raise exception 'shift_closed';
  end if;

  if not (
    (v_shift.opened_by = (select auth.uid()) and private.has_permission(p_tenant_id, 'shift.use'))
    or private.has_permission(p_tenant_id, 'shift.manage')
  ) then
    raise exception 'not_allowed';
  end if;

  if p_counted_cash is null or p_counted_cash < 0 then
    raise exception 'invalid';
  end if;

  v_via := case when private.is_member(p_tenant_id) then 'member' else 'support' end;

  select coalesce(sum(amount), 0) into v_cash_sales
  from public.payments
  where shift_id = p_shift_id and kind = 'payment' and status = 'confirmed' and method = 'cash';

  select coalesce(sum(amount), 0) into v_cash_refunds
  from public.payments
  where shift_id = p_shift_id and kind = 'refund' and status = 'confirmed' and method = 'cash';

  select coalesce(sum(amount), 0) into v_cash_in
  from public.cash_movements
  where shift_id = p_shift_id and kind = 'in';

  select coalesce(sum(amount), 0) into v_cash_out
  from public.cash_movements
  where shift_id = p_shift_id and kind = 'out';

  v_expected := v_shift.opening_cash + v_cash_sales - v_cash_refunds + v_cash_in - v_cash_out;
  v_diff := p_counted_cash - v_expected;

  -- Computations for frozen report
  select coalesce(sum(o.subtotal), 0), coalesce(sum(o.total), 0), count(distinct o.id)
  into v_gross, v_net, v_order_count
  from public.orders o
  where o.id in (
    select order_id from public.payments where shift_id = p_shift_id and status = 'confirmed'
  ) and o.status <> 'voided';

  select count(distinct o.id), coalesce(sum(p.amount), 0)
  into v_voids_count, v_voids_amount
  from public.payments p
  join public.orders o on o.id = p.order_id
  where p.shift_id = p_shift_id and p.kind = 'refund' and p.status = 'confirmed';

  select coalesce(
    jsonb_object_agg(method, total_amount),
    '{}'::jsonb
  ) into v_by_method
  from (
    select method, sum(amount) as total_amount
    from public.payments
    where shift_id = p_shift_id and kind = 'payment' and status = 'confirmed'
    group by method
  ) m;

  select coalesce(
    jsonb_object_agg(kind, total_amount),
    '{}'::jsonb
  ) into v_discounts_by_kind
  from (
    select ad.kind, sum(ad.amount) as total_amount
    from public.applied_discounts ad
    join public.orders o on o.id = ad.order_id
    where o.id in (select order_id from public.payments where shift_id = p_shift_id and status = 'confirmed')
    group by ad.kind
  ) d;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('item_name', item_name, 'qty', total_qty, 'sales', total_sales)
      order by total_qty desc
    ),
    '[]'::jsonb
  ) into v_top_items
  from (
    select oi.item_name, sum(oi.qty) as total_qty, sum(oi.line_total) as total_sales
    from public.order_items oi
    where oi.order_id in (select order_id from public.payments where shift_id = p_shift_id and status = 'confirmed')
    group by oi.item_name
    order by total_qty desc
    limit 5
  ) top;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('action', a.action, 'target_id', a.target_id, 'approved_by', a.approved_by, 'method', a.method, 'reason', a.reason, 'meta', a.meta)
      order by a.created_at
    ),
    '[]'::jsonb
  ) into v_sensitive
  from public.approvals a
  where a.tenant_id = p_tenant_id and a.created_at >= v_shift.opened_at and a.created_at <= now();

  v_report := jsonb_build_object(
    'opened_at', v_shift.opened_at,
    'closed_at', now(),
    'opened_by', v_shift.opened_by,
    'gross_sales', v_gross,
    'net_sales', v_net,
    'voids_count', v_voids_count,
    'voids_amount', v_voids_amount,
    'order_count', v_order_count,
    'sales_by_method', v_by_method,
    'discounts_by_kind', v_discounts_by_kind,
    'top_items', v_top_items,
    'cash', jsonb_build_object(
      'opening', v_shift.opening_cash,
      'cash_sales', v_cash_sales,
      'refunds', v_cash_refunds,
      'cash_in', v_cash_in,
      'cash_out', v_cash_out,
      'expected', v_expected,
      'counted', p_counted_cash,
      'difference', v_diff
    ),
    'sensitive', v_sensitive
  );

  update public.shifts
  set status = 'closed',
      closed_by = (select auth.uid()),
      closed_at = now(),
      counted_cash = p_counted_cash,
      expected_cash = v_expected,
      difference = v_diff,
      report = v_report,
      updated_at = now()
  where id = p_shift_id;

  select coalesce(cash_diff_alert, 10000) into v_alert_threshold
  from public.tenant_settings
  where tenant_id = p_tenant_id;

  if abs(v_diff) >= v_alert_threshold then
    insert into public.alerts (tenant_id, kind, data)
    values (
      p_tenant_id,
      'cash_difference',
      jsonb_build_object('shift_id', p_shift_id, 'expected', v_expected, 'counted', p_counted_cash, 'difference', v_diff)
    );
  end if;

  perform private.write_audit(
    p_tenant_id,
    v_via,
    'shift.close',
    'shift',
    p_shift_id::text,
    jsonb_build_object('difference', v_diff, 'counted', p_counted_cash)
  );

  return v_report;
end;
$$;

create or replace function public.review_payment(
  p_tenant_id uuid,
  p_payment_id uuid,
  p_approve boolean,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment record;
  v_order record;
  v_shift_id uuid;
  v_proof_exp int;
  v_order_id uuid;
begin
  if not private.has_permission(p_tenant_id, 'orders.manage') then
    raise exception 'not_allowed';
  end if;

  select order_id into v_order_id
  from public.payments
  where id = p_payment_id and tenant_id = p_tenant_id;

  if not found then
    raise exception 'payment_not_pending';
  end if;

  -- Lock order: the order row first, then the payment (the same as every other RPC).
  select * into v_order
  from public.orders
  where id = v_order_id and tenant_id = p_tenant_id
  for update;

  select * into v_payment
  from public.payments
  where id = p_payment_id and tenant_id = p_tenant_id
  for update;

  if not found or v_payment.status <> 'pending' then
    raise exception 'payment_not_pending';
  end if;

  if v_order.status in ('cancelled', 'voided', 'expired') then
    raise exception 'order_not_payable';
  end if;

  if v_order.payment_status = 'paid' then
    raise exception 'already_paid';
  end if;

  select id into v_shift_id
  from public.shifts
  where tenant_id = p_tenant_id and opened_by = (select auth.uid()) and status = 'open';

  if p_approve then
    update public.payments
    set status = 'confirmed',
        reviewed_by = (select auth.uid()),
        reviewed_at = now(),
        shift_id = v_shift_id,
        updated_at = now()
    where id = p_payment_id;

    insert into public.order_events (
      tenant_id, order_id, kind, from_status, to_status, actor_id, via, meta
    ) values (
      p_tenant_id, v_order.id, 'payment_confirmed', null, null, (select auth.uid()), 'staff', '{}'::jsonb
    );

    perform private.mark_paid(v_order.id, (select auth.uid()), 'staff');
  else
    if p_reason is null or char_length(btrim(p_reason)) < 3 or char_length(btrim(p_reason)) > 200 then
      raise exception 'invalid';
    end if;

    update public.payments
    set status = 'rejected',
        reject_reason = p_reason,
        reviewed_by = (select auth.uid()),
        reviewed_at = now(),
        updated_at = now()
    where id = p_payment_id;

    select proof_expiry_minutes into v_proof_exp
    from public.tenant_settings
    where tenant_id = p_tenant_id;

    update public.orders
    set payment_status = 'unpaid',
        expires_at = now() + (coalesce(v_proof_exp, 120) || ' minutes')::interval,
        updated_at = now()
    where id = v_order.id;

    insert into public.order_events (
      tenant_id, order_id, kind, from_status, to_status, actor_id, via, meta
    ) values (
      p_tenant_id, v_order.id, 'payment_rejected', 'pending', 'unpaid', (select auth.uid()), 'staff',
      jsonb_build_object('reason', p_reason)
    );
  end if;
end;
$$;

create or replace function public.record_payment(
  p_tenant_id uuid,
  p_order_id uuid,
  p_method text,
  p_amount bigint,
  p_tendered bigint,
  p_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_paid_so_far bigint;
  v_shift_id uuid;
  v_change_due bigint := null;
  v_norm_ref text := null;
begin
  if not private.has_permission(p_tenant_id, 'orders.manage') then
    raise exception 'not_allowed';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id and tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  if v_order.status in ('cancelled', 'voided', 'expired') then
    raise exception 'order_not_payable';
  end if;

  if v_order.payment_status = 'paid' then
    raise exception 'already_paid';
  end if;

  if v_order.payment_status = 'pending' then
    raise exception 'payment_not_pending';
  end if;

  select coalesce(sum(amount), 0) into v_paid_so_far
  from public.payments
  where order_id = p_order_id and kind = 'payment' and status = 'confirmed';

  if p_method is null or p_amount is null or p_amount <> (v_order.total - v_paid_so_far) then
    raise exception 'invalid';
  end if;

  -- Caller's open shift
  select id into v_shift_id
  from public.shifts
  where tenant_id = p_tenant_id and opened_by = (select auth.uid()) and status = 'open';

  if p_method = 'cash' then
    if v_shift_id is null then
      raise exception 'no_open_shift';
    end if;
    if p_tendered is null or p_tendered < p_amount then
      raise exception 'invalid';
    end if;
    v_change_due := p_tendered - p_amount;
  elsif p_method in ('gcash','maya','bank') then
    if p_reference is null or char_length(btrim(p_reference)) < 4 or char_length(btrim(p_reference)) > 40 then
      raise exception 'invalid';
    end if;
    v_norm_ref := upper(regexp_replace(p_reference, '[\s-]+', '', 'g'));
    if exists (
      select 1 from public.payments
      where tenant_id = p_tenant_id and reference_norm = v_norm_ref and kind = 'payment' and status <> 'rejected'
    ) then
      raise exception 'duplicate_reference';
    end if;
  elsif p_method <> 'cod' then
    raise exception 'invalid';
  end if;

  begin
    insert into public.payments (
      tenant_id, order_id, kind, method, amount, status,
      reference_no, reference_norm, tendered, change_due,
      shift_id, received_by
    ) values (
      p_tenant_id, p_order_id, 'payment', p_method, p_amount, 'confirmed',
      p_reference, v_norm_ref, p_tendered, v_change_due,
      v_shift_id, (select auth.uid())
    );
  exception
    when unique_violation then
      raise exception 'duplicate_reference';
  end;

  update public.orders
  set payment_method = p_method,
      updated_at = now()
  where id = p_order_id;

  perform private.mark_paid(p_order_id, (select auth.uid()), 'staff');

  return jsonb_build_object('change_due', v_change_due, 'paid', true);
end;
$$;

create or replace function public.submit_payment_proof(
  p_token text,
  p_method text,
  p_reference text,
  p_proof_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_norm_ref text;
  v_etag text;
  v_duplicate boolean := false;
begin
  select * into v_order from public.orders where token = p_token for update;

  if not found or v_order.payment_status <> 'unpaid' or v_order.status <> 'placed' then
    raise exception 'order_not_payable';
  end if;

  if p_method not in ('gcash','maya','bank') then
    raise exception 'invalid';
  end if;

  if not exists (select 1 from public.payment_accounts where tenant_id = v_order.tenant_id and method = p_method and is_active) then
    raise exception 'invalid';
  end if;

  if p_reference is null or p_proof_path is null or char_length(btrim(p_reference)) < 4 or char_length(btrim(p_reference)) > 40 then
    raise exception 'invalid';
  end if;

  v_norm_ref := upper(regexp_replace(p_reference, '[\s-]+', '', 'g'));

  if exists (
    select 1
    from public.payments
    where tenant_id = v_order.tenant_id
      and reference_norm = v_norm_ref
      and kind = 'payment'
      and status <> 'rejected'
  ) then
    raise exception 'duplicate_reference';
  end if;

  -- Path validation: <tenant_id>/<token>/<uuid>.(webp|jpg)
  if not (p_proof_path ~ ('^' || v_order.tenant_id::text || '/' || v_order.token || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$')) then
    raise exception 'invalid';
  end if;

  -- Object exists in storage.objects
  select (metadata->>'eTag') into v_etag
  from storage.objects
  where bucket_id = 'payment-proofs' and name = p_proof_path;

  if not found then
    raise exception 'invalid';
  end if;

  if (
    select count(*)
    from public.payments
    where order_id = v_order.id and proof_path is not null
  ) >= 3 then
    raise exception 'rate_limited';
  end if;

  if v_etag is not null and exists (
    select 1
    from public.payments
    where tenant_id = v_order.tenant_id and proof_etag = v_etag and status <> 'rejected'
  ) then
    v_duplicate := true;
    insert into public.alerts (tenant_id, kind, data)
    values (
      v_order.tenant_id,
      'duplicate_proof',
      jsonb_build_object('order_id', v_order.id, 'reference_no', p_reference, 'etag', v_etag)
    );
  end if;

  begin
    insert into public.payments (
      tenant_id, order_id, kind, method, amount, status,
      reference_no, reference_norm, proof_path, proof_etag, proof_duplicate
    ) values (
      v_order.tenant_id, v_order.id, 'payment', p_method, v_order.total, 'pending',
      p_reference, v_norm_ref, p_proof_path, v_etag, v_duplicate
    );
  exception
    when unique_violation then
      raise exception 'duplicate_reference';
  end;

  update public.orders
  set payment_status = 'pending',
      payment_method = p_method,
      expires_at = null,
      updated_at = now()
  where id = v_order.id;

  insert into public.order_events (
    tenant_id, order_id, kind, from_status, to_status, actor_id, via, meta
  ) values (
    v_order.tenant_id, v_order.id, 'payment_submitted', 'unpaid', 'pending', (select auth.uid()), 'customer',
    jsonb_build_object('method', p_method, 'reference_no', p_reference)
  );
end;
$$;

create or replace function public.save_my_shop_profile(p_slug text, p_name text, p_phone text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant record;
  v_uid uuid := (select auth.uid());
  v_name text;
  v_phone text;
  v_user_email text;
  v_email_confirmed timestamptz;
  v_existing record;
  v_guest record;
  v_cid uuid;
begin
  if v_uid is null then
    raise exception 'not_allowed';
  end if;

  select * into v_tenant from public.tenants where slug = p_slug and status = 'active';
  if not found then
    raise exception 'not_found';
  end if;

  v_name := btrim(coalesce(p_name, ''));
  v_phone := btrim(coalesce(p_phone, ''));

  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'invalid';
  end if;

  if not (v_phone ~ '^\+639\d{9}$') then
    raise exception 'invalid';
  end if;

  select email, email_confirmed_at into v_user_email, v_email_confirmed
  from auth.users
  where id = v_uid;

  -- Phone already used by another member
  if exists (
    select 1 from public.customers
    where tenant_id = v_tenant.id and phone = v_phone and user_id is not null and user_id <> v_uid
  ) then
    raise exception 'phone_in_use';
  end if;

  -- Existing customer row for this user
  select * into v_existing
  from public.customers
  where tenant_id = v_tenant.id and user_id = v_uid;

  if v_existing.id is not null then
    update public.customers
    set name = v_name, phone = v_phone, updated_at = now()
    where id = v_existing.id;
    return v_existing.id;
  end if;

  -- Check if guest row with that phone exists
  select * into v_guest
  from public.customers
  where tenant_id = v_tenant.id and phone = v_phone and user_id is null;

  if v_guest.id is not null then
    if v_email_confirmed is not null and lower(coalesce(v_guest.email, '')) = lower(coalesce(v_user_email, '')) then
      update public.customers
      set user_id = v_uid, name = v_name, updated_at = now()
      where id = v_guest.id;
      return v_guest.id;
    else
      raise exception 'phone_in_use';
    end if;
  end if;

  insert into public.customers (
    tenant_id, user_id, name, phone, email
  ) values (
    v_tenant.id, v_uid, v_name, v_phone, v_user_email
  )
  returning id into v_cid;

  return v_cid;
exception
  when unique_violation then
    raise exception 'phone_in_use';
end;
$$;

create or replace function public.get_my_shop_account(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant record;
  v_uid uuid := (select auth.uid());
  v_cust record;
  v_balance int := 0;
  v_loyalty jsonb;
  v_vouchers jsonb;
  v_addresses jsonb;
  v_orders jsonb;
  v_consents jsonb;
begin
  if v_uid is null then
    raise exception 'not_allowed';
  end if;

  select * into v_tenant from public.tenants where slug = p_slug and status = 'active';
  if not found then
    return null;
  end if;

  select * into v_cust
  from public.customers
  where tenant_id = v_tenant.id and user_id = v_uid;

  if v_cust.id is not null then
    select coalesce(sum(delta), 0) into v_balance
    from public.loyalty_ledger
    where customer_id = v_cust.id;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id, 'label', a.label, 'address_line', a.address_line,
          'landmark', a.landmark, 'lat', a.lat, 'lng', a.lng, 'is_default', a.is_default
        )
        order by a.is_default desc, a.created_at desc
      ),
      '[]'::jsonb
    ) into v_addresses
    from public.customer_addresses a
    where a.customer_id = v_cust.id;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'token', o.token, 'order_no', o.order_no, 'status', o.status,
          'payment_status', o.payment_status, 'total', o.total, 'placed_at', o.placed_at
        )
        order by o.placed_at desc
      ),
      '[]'::jsonb
    ) into v_orders
    from (
      select * from public.orders
      where customer_id = v_cust.id and tenant_id = v_tenant.id
      order by placed_at desc
      limit 20
    ) o;

    select coalesce(
      jsonb_object_agg(channel, granted),
      '{}'::jsonb
    ) into v_consents
    from (
      select distinct on (channel) channel, granted
      from public.consents
      where customer_id = v_cust.id
      order by channel, created_at desc
    ) c;
  else
    v_addresses := '[]'::jsonb;
    v_orders := '[]'::jsonb;
    v_consents := '{}'::jsonb;
  end if;

  select jsonb_build_object(
    'stamps_needed', lr.stamps_needed,
    'reward_label', lr.reward_label,
    'min_order_total', lr.min_order_total
  ) into v_loyalty
  from public.loyalty_rules lr
  where lr.tenant_id = v_tenant.id and lr.is_active;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('name', v.name, 'kind', v.kind, 'value', v.value, 'min_spend', v.min_spend)
      order by v.min_spend desc
    ),
    '[]'::jsonb
  ) into v_vouchers
  from public.vouchers v
  where v.tenant_id = v_tenant.id
    and v.is_active
    and v.audience in ('everyone', 'members')
    and (v.starts_at is null or v.starts_at <= now())
    and (v.ends_at is null or v.ends_at > now());

  return jsonb_build_object(
    -- Only what the customer typed in. Staff notes, blocked and COD flags and spend totals stay inside.
    'customer', case
      when v_cust.id is not null then jsonb_build_object(
        'id', v_cust.id, 'name', v_cust.name, 'phone', v_cust.phone, 'email', v_cust.email
      )
      else null
    end,
    'stamps_balance', v_balance,
    'loyalty_rule', v_loyalty,
    'vouchers', v_vouchers,
    'addresses', v_addresses,
    'recent_orders', v_orders,
    'consents', v_consents
  );
end;
$$;

create or replace function public.save_voucher(p_tenant_id uuid, p_row jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_code text;
  v_name text;
  v_kind text;
  v_free_var uuid;
  v_items uuid[];
  v_cats uuid[];
  v_via text;
begin
  if not private.has_permission(p_tenant_id, 'marketing.manage') then
    raise exception 'not_allowed';
  end if;

  v_id := (p_row->>'id')::uuid;
  v_code := upper(btrim(coalesce(p_row->>'code', '')));
  if v_code = '' then
    v_code := null;
  end if;

  v_name := btrim(coalesce(p_row->>'name', ''));
  v_kind := p_row->>'kind';

  if v_id is not null and not exists (select 1 from public.vouchers where id = v_id and tenant_id = p_tenant_id) then
    raise exception 'not_found';
  end if;

  v_free_var := (p_row->>'free_variant_id')::uuid;
  if v_free_var is not null and not exists (select 1 from public.item_variants where id = v_free_var and tenant_id = p_tenant_id) then
    raise exception 'invalid';
  end if;

  v_items := array(select jsonb_array_elements_text(coalesce(p_row->'item_ids', '[]'::jsonb)))::uuid[];
  if array_length(v_items, 1) is not null and exists (
    select 1 from unnest(v_items) as i_id where not exists (select 1 from public.items where id = i_id and tenant_id = p_tenant_id)
  ) then
    raise exception 'invalid';
  end if;

  v_cats := array(select jsonb_array_elements_text(coalesce(p_row->'category_ids', '[]'::jsonb)))::uuid[];
  if array_length(v_cats, 1) is not null and exists (
    select 1 from unnest(v_cats) as c_id where not exists (select 1 from public.categories where id = c_id and tenant_id = p_tenant_id)
  ) then
    raise exception 'invalid';
  end if;

  v_via := case when private.is_member(p_tenant_id) then 'member' else 'support' end;

  if v_id is null then
    insert into public.vouchers (
      tenant_id, code, name, kind, value, free_variant_id, min_spend,
      item_ids, category_ids, first_order_only, audience, auto_apply,
      starts_at, ends_at, max_uses, max_uses_per_customer, is_active
    ) values (
      p_tenant_id, v_code, v_name, v_kind, (p_row->>'value')::bigint, v_free_var,
      coalesce((p_row->>'min_spend')::bigint, 0), v_items, v_cats,
      coalesce((p_row->>'first_order_only')::boolean, false),
      coalesce(p_row->>'audience', 'everyone'),
      coalesce((p_row->>'auto_apply')::boolean, false),
      (p_row->>'starts_at')::timestamptz, (p_row->>'ends_at')::timestamptz,
      (p_row->>'max_uses')::int, (p_row->>'max_uses_per_customer')::int,
      coalesce((p_row->>'is_active')::boolean, true)
    )
    returning id into v_id;

    perform private.write_audit(p_tenant_id, v_via, 'voucher.create', 'voucher', v_id::text, jsonb_build_object('name', v_name, 'code', v_code));
  else
    update public.vouchers
    set code = v_code,
        name = v_name,
        kind = v_kind,
        value = (p_row->>'value')::bigint,
        free_variant_id = v_free_var,
        min_spend = coalesce((p_row->>'min_spend')::bigint, 0),
        item_ids = v_items,
        category_ids = v_cats,
        first_order_only = coalesce((p_row->>'first_order_only')::boolean, false),
        audience = coalesce(p_row->>'audience', 'everyone'),
        auto_apply = coalesce((p_row->>'auto_apply')::boolean, false),
        starts_at = (p_row->>'starts_at')::timestamptz,
        ends_at = (p_row->>'ends_at')::timestamptz,
        max_uses = (p_row->>'max_uses')::int,
        max_uses_per_customer = (p_row->>'max_uses_per_customer')::int,
        is_active = coalesce((p_row->>'is_active')::boolean, is_active),
        updated_at = now()
    where id = v_id and tenant_id = p_tenant_id;

    perform private.write_audit(p_tenant_id, v_via, 'voucher.update', 'voucher', v_id::text, jsonb_build_object('name', v_name, 'code', v_code));
  end if;

  return v_id;
exception
  when unique_violation then
    raise exception 'code_taken';
  when data_exception or integrity_constraint_violation then
    raise exception 'invalid';
end;
$$;

create or replace function public.save_loyalty_rule(p_tenant_id uuid, p_row jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reward_var uuid;
  v_via text;
begin
  if not private.has_permission(p_tenant_id, 'marketing.manage') then
    raise exception 'not_allowed';
  end if;

  v_reward_var := (p_row->>'reward_variant_id')::uuid;
  if v_reward_var is not null and not exists (select 1 from public.item_variants where id = v_reward_var and tenant_id = p_tenant_id) then
    raise exception 'invalid';
  end if;

  insert into public.loyalty_rules (
    tenant_id, is_active, min_order_total, stamps_per_order, stamps_needed,
    reward_kind, reward_variant_id, reward_amount, reward_label
  ) values (
    p_tenant_id,
    coalesce((p_row->>'is_active')::boolean, false),
    coalesce((p_row->>'min_order_total')::bigint, 0),
    coalesce((p_row->>'stamps_per_order')::int, 1),
    coalesce((p_row->>'stamps_needed')::int, 10),
    coalesce(p_row->>'reward_kind', 'free_item'),
    v_reward_var,
    (p_row->>'reward_amount')::bigint,
    coalesce(p_row->>'reward_label', 'Free item')
  )
  on conflict (tenant_id) do update
    set is_active = coalesce((p_row->>'is_active')::boolean, excluded.is_active),
        min_order_total = coalesce((p_row->>'min_order_total')::bigint, excluded.min_order_total),
        stamps_per_order = coalesce((p_row->>'stamps_per_order')::int, excluded.stamps_per_order),
        stamps_needed = coalesce((p_row->>'stamps_needed')::int, excluded.stamps_needed),
        reward_kind = coalesce(p_row->>'reward_kind', excluded.reward_kind),
        reward_variant_id = v_reward_var,
        reward_amount = (p_row->>'reward_amount')::bigint,
        reward_label = coalesce(p_row->>'reward_label', excluded.reward_label),
        updated_at = now();

  v_via := case when private.is_member(p_tenant_id) then 'member' else 'support' end;
  perform private.write_audit(p_tenant_id, v_via, 'loyalty.save', 'loyalty_rules', p_tenant_id::text, p_row);
exception
  when data_exception or integrity_constraint_violation then
    raise exception 'invalid';
end;
$$;

create or replace function public.save_announcement(p_tenant_id uuid, p_row jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_title text;
  v_via text;
begin
  if not private.has_permission(p_tenant_id, 'marketing.manage') then
    raise exception 'not_allowed';
  end if;

  v_id := (p_row->>'id')::uuid;
  v_title := btrim(coalesce(p_row->>'title', ''));

  if v_id is not null and not exists (select 1 from public.announcements where id = v_id and tenant_id = p_tenant_id) then
    raise exception 'not_found';
  end if;

  v_via := case when private.is_member(p_tenant_id) then 'member' else 'support' end;

  if v_id is null then
    insert into public.announcements (
      tenant_id, title, body, link_url, starts_at, ends_at, is_active, push_requested, created_by
    ) values (
      p_tenant_id, v_title, p_row->>'body', p_row->>'link_url',
      coalesce((p_row->>'starts_at')::timestamptz, now()),
      (p_row->>'ends_at')::timestamptz,
      coalesce((p_row->>'is_active')::boolean, true),
      coalesce((p_row->>'push_requested')::boolean, false),
      (select auth.uid())
    )
    returning id into v_id;

    perform private.write_audit(p_tenant_id, v_via, 'announcement.create', 'announcement', v_id::text, jsonb_build_object('title', v_title));
  else
    update public.announcements
    set title = v_title,
        body = p_row->>'body',
        link_url = p_row->>'link_url',
        starts_at = coalesce((p_row->>'starts_at')::timestamptz, starts_at),
        ends_at = (p_row->>'ends_at')::timestamptz,
        is_active = coalesce((p_row->>'is_active')::boolean, is_active),
        push_requested = coalesce((p_row->>'push_requested')::boolean, push_requested),
        updated_at = now()
    where id = v_id and tenant_id = p_tenant_id;

    perform private.write_audit(p_tenant_id, v_via, 'announcement.update', 'announcement', v_id::text, jsonb_build_object('title', v_title));
  end if;

  return v_id;
exception
  when data_exception or integrity_constraint_violation then
    raise exception 'invalid';
end;
$$;

create or replace function public.save_my_address(p_slug text, p_row jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant record;
  v_uid uuid := (select auth.uid());
  v_cust record;
  v_id uuid;
  v_count int;
  v_is_def boolean;
begin
  if v_uid is null then
    raise exception 'not_allowed';
  end if;

  select * into v_tenant from public.tenants where slug = p_slug and status = 'active';
  if not found then
    raise exception 'not_found';
  end if;

  select * into v_cust from public.customers where tenant_id = v_tenant.id and user_id = v_uid;
  if not found then
    raise exception 'not_found';
  end if;

  v_id := (p_row->>'id')::uuid;
  v_is_def := coalesce((p_row->>'is_default')::boolean, false);

  if v_id is null then
    select count(*) into v_count from public.customer_addresses where customer_id = v_cust.id;
    if v_count >= 10 then
      raise exception 'invalid';
    end if;

    if v_is_def or v_count = 0 then
      update public.customer_addresses set is_default = false where customer_id = v_cust.id;
      v_is_def := true;
    end if;

    insert into public.customer_addresses (
      tenant_id, customer_id, label, address_line, landmark, lat, lng, is_default
    ) values (
      v_tenant.id, v_cust.id,
      coalesce(p_row->>'label', 'Home'),
      p_row->>'address_line',
      p_row->>'landmark',
      (p_row->>'lat')::double precision,
      (p_row->>'lng')::double precision,
      v_is_def
    )
    returning id into v_id;
  else
    if not exists (select 1 from public.customer_addresses where id = v_id and customer_id = v_cust.id) then
      raise exception 'not_found';
    end if;

    if v_is_def then
      update public.customer_addresses set is_default = false where customer_id = v_cust.id;
    end if;

    update public.customer_addresses
    set label = coalesce(p_row->>'label', label),
        address_line = coalesce(p_row->>'address_line', address_line),
        landmark = p_row->>'landmark',
        lat = (p_row->>'lat')::double precision,
        lng = (p_row->>'lng')::double precision,
        is_default = v_is_def,
        updated_at = now()
    where id = v_id;
  end if;

  return v_id;
exception
  when data_exception or integrity_constraint_violation then
    raise exception 'invalid';
end;
$$;

create or replace function public.refresh_summary(
  p_tenant_id uuid,
  p_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission(p_tenant_id, 'reports.view') then
    raise exception 'not_allowed';
  end if;

  if p_date is null then
    raise exception 'invalid';
  end if;

  perform private.refresh_daily_summary(p_tenant_id, p_date);

  update public.tenant_settings
  set sheet_synced_at = now()
  where tenant_id = p_tenant_id;
end;
$$;

create or replace function private.apply_marketing(p_order_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_customer record;
  v_order_subtotal bigint := 0;
  v_voucher_code text;
  v_voucher record;
  v_best_id uuid := null;
  v_best_amount bigint := -1;
  v_best_free_delivery boolean := false;
  v_cand record;
  v_cand_amt bigint;
  v_cand_fd boolean;
  v_cand_elig bigint;
  v_cand_uses int;
  v_eligible_subtotal bigint := 0;
  v_voucher_amount bigint := 0;
  v_free_delivery boolean := false;
  v_total_discount bigint := 0;
  v_customer_uses int;
  v_redeem_reward boolean;
  v_loyalty record;
  v_stamp_balance int := 0;
  v_reward_amount bigint := 0;
  v_free_item_found boolean;
  v_line record;
  v_cust_user uuid;
  v_cust_orders int := 0;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    return jsonb_build_object('discount', 0, 'free_delivery', false);
  end if;

  select coalesce(sum(line_total), 0) into v_order_subtotal
  from public.order_items
  where order_id = p_order_id;

  if v_order.customer_id is not null then
    select user_id, order_count into v_cust_user, v_cust_orders
    from public.customers
    where id = v_order.customer_id;
  end if;

  v_voucher_code := upper(btrim(coalesce(p_payload->>'voucher_code', '')));

  -- 1. Voucher Selection & Validation
  if v_voucher_code <> '' then
    select * into v_voucher
    from public.vouchers
    where tenant_id = v_order.tenant_id and code = v_voucher_code
    for update;

    if not found or not v_voucher.is_active then
      raise exception 'voucher_invalid';
    end if;

    if (v_voucher.starts_at is not null and v_voucher.starts_at > now())
       or (v_voucher.ends_at is not null and v_voucher.ends_at <= now()) then
      raise exception 'voucher_expired';
    end if;

    if v_voucher.max_uses is not null and v_voucher.uses_count >= v_voucher.max_uses then
      raise exception 'voucher_used_up';
    end if;

    if v_voucher.max_uses_per_customer is not null and v_order.customer_id is not null then
      select count(*) into v_customer_uses
      from public.voucher_redemptions
      where voucher_id = v_voucher.id and customer_id = v_order.customer_id and status = 'applied';

      if v_customer_uses >= v_voucher.max_uses_per_customer then
        raise exception 'voucher_used_up';
      end if;
    end if;

    -- Calculate eligible subtotal
    if (array_length(v_voucher.item_ids, 1) is not null and array_length(v_voucher.item_ids, 1) > 0)
       or (array_length(v_voucher.category_ids, 1) is not null and array_length(v_voucher.category_ids, 1) > 0) then
      select coalesce(sum(oi.line_total), 0) into v_eligible_subtotal
      from public.order_items oi
      left join public.items i on i.id = oi.item_id
      where oi.order_id = p_order_id
        and (
          (array_length(v_voucher.item_ids, 1) > 0 and oi.item_id = any(v_voucher.item_ids))
          or (array_length(v_voucher.category_ids, 1) > 0 and i.category_id = any(v_voucher.category_ids))
        );
    else
      v_eligible_subtotal := v_order_subtotal;
    end if;

    if v_eligible_subtotal < v_voucher.min_spend then
      raise exception 'voucher_min_spend';
    end if;

    if v_voucher.audience = 'members' and v_cust_user is null then
      raise exception 'voucher_members_only';
    end if;

    if v_voucher.audience = 'install' and (not v_order.installed_app or coalesce(v_cust_orders, 0) > 0) then
      raise exception 'voucher_invalid';
    end if;

    if v_voucher.first_order_only and coalesce(v_cust_orders, 0) > 0 then
      raise exception 'voucher_invalid';
    end if;

    -- Compute amount
    if v_voucher.kind = 'percent' then
      v_voucher_amount := round(v_eligible_subtotal * (v_voucher.value::numeric / 100.0))::bigint;
    elsif v_voucher.kind = 'amount' then
      v_voucher_amount := least(v_eligible_subtotal, v_voucher.value);
    elsif v_voucher.kind = 'free_item' then
      select * into v_line
      from public.order_items
      where order_id = p_order_id and variant_id = v_voucher.free_variant_id
      limit 1;

      if not found then
        raise exception 'voucher_invalid';
      end if;
      v_voucher_amount := v_line.unit_price;
    elsif v_voucher.kind = 'free_delivery' then
      v_free_delivery := true;
      v_voucher_amount := 0;
    end if;

    update public.vouchers set uses_count = uses_count + 1 where id = v_voucher.id;

    insert into public.voucher_redemptions (
      tenant_id, voucher_id, order_id, customer_id, amount, status
    ) values (
      v_order.tenant_id, v_voucher.id, p_order_id, v_order.customer_id, v_voucher_amount, 'applied'
    );

    if v_voucher_amount > 0 then
      insert into public.applied_discounts (
        tenant_id, order_id, kind, amount, label, voucher_id, created_by
      ) values (
        v_order.tenant_id, p_order_id, 'voucher', v_voucher_amount, v_voucher.name, v_voucher.id, (select auth.uid())
      );
    end if;

    v_total_discount := v_total_discount + v_voucher_amount;

  else
    -- Best auto_apply voucher candidate
    for v_cand in
      select * from public.vouchers
      where tenant_id = v_order.tenant_id
        and auto_apply
        and is_active
        and (audience = 'everyone' or (audience = 'members' and v_cust_user is not null))
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at > now())
        and (max_uses is null or uses_count < max_uses)
      order by min_spend desc
    loop
      -- Check customer max_uses
      if v_cand.max_uses_per_customer is not null and v_order.customer_id is not null then
        select count(*) into v_cand_uses
        from public.voucher_redemptions
        where voucher_id = v_cand.id and customer_id = v_order.customer_id and status = 'applied';
        if v_cand_uses >= v_cand.max_uses_per_customer then
          continue;
        end if;
      end if;

      if v_cand.first_order_only and coalesce(v_cust_orders, 0) > 0 then
        continue;
      end if;

      -- Check eligible subtotal
      if (array_length(v_cand.item_ids, 1) is not null and array_length(v_cand.item_ids, 1) > 0)
         or (array_length(v_cand.category_ids, 1) is not null and array_length(v_cand.category_ids, 1) > 0) then
        select coalesce(sum(oi.line_total), 0) into v_cand_elig
        from public.order_items oi
        left join public.items i on i.id = oi.item_id
        where oi.order_id = p_order_id
          and (
            (array_length(v_cand.item_ids, 1) > 0 and oi.item_id = any(v_cand.item_ids))
            or (array_length(v_cand.category_ids, 1) > 0 and i.category_id = any(v_cand.category_ids))
          );
      else
        v_cand_elig := v_order_subtotal;
      end if;

      if v_cand_elig < v_cand.min_spend then
        continue;
      end if;

      v_cand_amt := 0;
      v_cand_fd := false;

      if v_cand.kind = 'percent' then
        v_cand_amt := round(v_cand_elig * (v_cand.value::numeric / 100.0))::bigint;
      elsif v_cand.kind = 'amount' then
        v_cand_amt := least(v_cand_elig, v_cand.value);
      elsif v_cand.kind = 'free_item' then
        select unit_price into v_cand_amt
        from public.order_items
        where order_id = p_order_id and variant_id = v_cand.free_variant_id
        limit 1;
        if not found then
          continue;
        end if;
      elsif v_cand.kind = 'free_delivery' then
        -- Nothing to waive: don't spend a use on an order with no delivery fee.
        if v_order.delivery_fee <= 0 then
          continue;
        end if;
        v_cand_fd := true;
        v_cand_amt := v_order.delivery_fee;
      end if;

      if v_cand_amt > v_best_amount then
        v_best_id := v_cand.id;
        v_best_amount := v_cand_amt;
        v_best_free_delivery := v_cand_fd;
      end if;
    end loop;

    if v_best_id is not null then
      select * into v_voucher from public.vouchers where id = v_best_id for update;

      update public.vouchers set uses_count = uses_count + 1 where id = v_voucher.id;

      if v_voucher.kind = 'free_delivery' then
        v_free_delivery := true;
        v_voucher_amount := 0;
      else
        v_voucher_amount := v_best_amount;
      end if;

      insert into public.voucher_redemptions (
        tenant_id, voucher_id, order_id, customer_id, amount, status
      ) values (
        v_order.tenant_id, v_voucher.id, p_order_id, v_order.customer_id, v_voucher_amount, 'applied'
      );

      if v_voucher_amount > 0 then
        insert into public.applied_discounts (
          tenant_id, order_id, kind, amount, label, voucher_id, created_by
        ) values (
          v_order.tenant_id, p_order_id, 'voucher', v_voucher_amount, v_voucher.name, v_voucher.id, (select auth.uid())
        );
      end if;

      v_total_discount := v_total_discount + v_voucher_amount;
    end if;
  end if;

  -- 2. Reward Redemption
  v_redeem_reward := coalesce((p_payload->>'redeem_reward')::boolean, false);
  if v_redeem_reward then
    if v_order.customer_id is null then
      raise exception 'reward_not_enough_stamps';
    end if;

    select * into v_customer from public.customers where id = v_order.customer_id for update;

    if v_customer.user_id is null then
      raise exception 'reward_not_enough_stamps';
    end if;

    select * into v_loyalty from public.loyalty_rules where tenant_id = v_order.tenant_id and is_active;
    if not found then
      raise exception 'reward_not_enough_stamps';
    end if;

    select coalesce(sum(delta), 0) into v_stamp_balance
    from public.loyalty_ledger
    where customer_id = v_order.customer_id;

    if v_stamp_balance < v_loyalty.stamps_needed then
      raise exception 'reward_not_enough_stamps';
    end if;

    if v_loyalty.reward_kind = 'amount' then
      v_reward_amount := least(v_order_subtotal - v_total_discount, coalesce(v_loyalty.reward_amount, 0));
    elsif v_loyalty.reward_kind = 'free_item' then
      select unit_price into v_reward_amount
      from public.order_items
      where order_id = p_order_id and variant_id = v_loyalty.reward_variant_id
      limit 1;

      if not found then
        raise exception 'reward_not_enough_stamps';
      end if;
    end if;

    insert into public.loyalty_ledger (
      tenant_id, customer_id, order_id, delta, reason, actor_id
    ) values (
      v_order.tenant_id, v_order.customer_id, p_order_id, -v_loyalty.stamps_needed, 'redeemed', (select auth.uid())
    );

    if v_reward_amount > 0 then
      insert into public.applied_discounts (
        tenant_id, order_id, kind, amount, label, created_by
      ) values (
        v_order.tenant_id, p_order_id, 'reward', v_reward_amount, v_loyalty.reward_label, (select auth.uid())
      );
    end if;

    v_total_discount := v_total_discount + v_reward_amount;
  end if;

  return jsonb_build_object('discount', v_total_discount, 'free_delivery', v_free_delivery);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Grants
-- ---------------------------------------------------------------------------

-- Every function in schema private starts from nothing: internal functions are only ever called
-- by security definer functions, triggers and cron, which run as the owner.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.signature);
  end loop;
end $$;

-- Policy helpers: only the roles whose policies call them.
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.is_member_any_status(uuid) to authenticated;
grant execute on function private.has_support_access(uuid, boolean) to authenticated;
grant execute on function private.has_permission(uuid, text) to authenticated;
grant execute on function private.can_read_tenant(uuid) to authenticated;
grant execute on function private.can_read_profile(uuid) to authenticated;
grant execute on function private.can_view(uuid, text) to authenticated;
grant execute on function private.can_read_shift(uuid) to authenticated;
-- payment_proofs_insert is `to anon, authenticated`; this is the one reason anon keeps usage on schema private.
grant execute on function private.order_accepts_proof(text, text) to anon, authenticated;

revoke execute on function public.get_private_function_grants() from public, anon, authenticated;
grant execute on function public.get_private_function_grants() to service_role;
