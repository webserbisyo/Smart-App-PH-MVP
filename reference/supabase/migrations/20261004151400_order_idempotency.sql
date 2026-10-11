-- DB-6: no duplicate orders on retry. The apps send a `client_key` (a uuid made once per checkout
-- attempt); the same key at the same shop returns the first order again.
-- Order inside the file: tables → indexes → functions. No new grants: `create or replace` keeps them.

alter table public.orders add column client_key uuid;

create unique index orders_tenant_client_key on public.orders (tenant_id, client_key) where client_key is not null;

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
  v_client_key uuid;
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
    v_client_key := (p_payload->>'client_key')::uuid;

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

  -- A quote saves nothing, so it has no retry key.
  if p_quote then
    v_client_key := null;
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
    scheduled_for, notes, created_by, installed_app, client_key
  ) values (
    p_tenant_id, v_date, v_order_no, p_channel, v_fulfillment, v_payment_method,
    v_customer_id, nullif(v_name, ''), v_phone, nullif(v_email, ''),
    v_scheduled_for, v_notes, p_actor, v_installed, v_client_key
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

create or replace function public.place_order(p_slug text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant record;
  v_client_key uuid;
  v_order_id uuid;
  v_constraint text;
  v_result jsonb;
begin
  select id, status into v_tenant
  from public.tenants
  where slug = p_slug and status = 'active';

  if not found then
    raise exception 'not_found';
  end if;

  begin
    v_client_key := (p_payload->>'client_key')::uuid;
  exception
    when data_exception then
      raise exception 'invalid';
  end;

  -- A retry of a checkout that already went through: the first order again, and nothing else
  -- (no throttle, no stock, no events).
  if v_client_key is not null then
    select id into v_order_id
    from public.orders
    where tenant_id = v_tenant.id and client_key = v_client_key and channel = 'storefront';
  end if;

  if v_order_id is null then
    begin
      v_order_id := private.build_order(v_tenant.id, p_payload, 'storefront', (select auth.uid()), false);
    exception
      when unique_violation then
        -- Two identical calls at once: the second one loses on the unique index and gets the first order.
        get stacked diagnostics v_constraint = constraint_name;
        if v_constraint is distinct from 'orders_tenant_client_key' then
          raise;
        end if;

        select id into v_order_id
        from public.orders
        where tenant_id = v_tenant.id and client_key = v_client_key and channel = 'storefront';

        if v_order_id is null then
          raise exception 'invalid';
        end if;
    end;
  end if;

  select jsonb_build_object(
    'token', o.token,
    'order_no', o.order_no,
    'business_date', o.business_date,
    'total', o.total,
    'payment_status', o.payment_status,
    'expires_at', o.expires_at
  ) into v_result
  from public.orders o
  where o.id = v_order_id;

  return v_result;
end;
$$;

create or replace function public.create_pos_order(p_tenant_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_key uuid;
  v_constraint text;
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

  begin
    v_client_key := (p_payload->>'client_key')::uuid;
  exception
    when data_exception then
      raise exception 'invalid';
  end;

  -- A retry: the first order again, before the PIN is looked at (no second PIN try, no second order).
  if v_client_key is not null then
    select id into v_order_id
    from public.orders
    where tenant_id = p_tenant_id and client_key = v_client_key and channel = 'pos';

    if v_order_id is not null then
      select order_no, total into v_order_no, v_total from public.orders where id = v_order_id;
      return jsonb_build_object('ok', true, 'id', v_order_id, 'order_no', v_order_no, 'total', v_total);
    end if;
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

  begin
    v_order_id := private.build_order(p_tenant_id, p_payload, 'pos', (select auth.uid()), false);

    update public.orders
    set shift_id = v_shift_id
    where id = v_order_id;

    v_total := private.apply_pos_discounts(p_tenant_id, v_order_id, v_discounts, v_approver, false);
  exception
    when unique_violation then
      -- Two identical calls at once: the second one loses on the unique index and gets the first order.
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'orders_tenant_client_key' then
        raise;
      end if;

      select id, total into v_order_id, v_total
      from public.orders
      where tenant_id = p_tenant_id and client_key = v_client_key and channel = 'pos';

      if v_order_id is null then
        raise exception 'invalid';
      end if;
  end;

  select order_no into v_order_no from public.orders where id = v_order_id;
  return jsonb_build_object('ok', true, 'id', v_order_id, 'order_no', v_order_no, 'total', v_total);
end;
$$;
