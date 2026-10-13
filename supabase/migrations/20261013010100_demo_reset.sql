-- P5.6: demo_reset (system paper Appendix B). One line in the SQL editor makes a demo shop look busy and alive for
-- today, with no AI tokens:
--   select private.demo_reset('juans-cafe'); select private.demo_reset('tala-apparel');
-- It deletes only demo rows (order tokens starting with demo-, customers tagged demo) and creates fresh ones relative
-- to now(): about 120 customers (about 75 members), 30 days of orders with an upward trend, 3 orders in progress, 1
-- payment to verify, 2 pickups for tomorrow, stamps and 2 low-stock variants. Execute is granted to nobody, so only
-- the SQL editor and supabase/seed.sql (through demo_setup) can run it. Names and +63999000xxxx numbers are fake.
-- Order inside the file: replaced trigger function → demo functions → replaced demo_setup → function grants.

-- ---------------------------------------------------------------------------
-- 1. Replaced trigger function: no live nudge for each demo order a reset creates
-- ---------------------------------------------------------------------------

-- Replaces P5.3's broadcast_order (same body): while demo_reset runs (smartapp.demo_reset = on, set for its own
-- transaction only) the hundreds of demo orders it creates send no Realtime message, so an open dashboard does not
-- chime for each one. Every other insert and change still broadcasts.
create or replace function private.broadcast_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status = old.status and new.payment_status = old.payment_status then
    return null;
  end if;
  if current_setting('smartapp.demo_reset', true) = 'on' then
    return null;
  end if;
  perform realtime.send(
    jsonb_build_object('status', new.status, 'paymentStatus', new.payment_status),
    'order_changed',
    'order:' || new.token,
    false
  );
  perform realtime.send(
    jsonb_build_object('orderId', new.id, 'op', lower(tg_op), 'status', new.status, 'paymentStatus', new.payment_status),
    'order_changed',
    'shop:' || new.tenant_id::text,
    true
  );
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Demo functions
-- ---------------------------------------------------------------------------

-- Deletes the demo rows of one shop: orders whose token starts with demo- (their lines, events, payments and stamp
-- rows go with them) and customers tagged demo (their addresses, consents and stamp rows go with them). Then the
-- shop's order counters are rebuilt from the orders that remain, so the next real order number follows on.
create function private.demo_delete_rows(p_tenant_id uuid)
returns void
language plpgsql
volatile
set search_path = ''
as $$
begin
  delete from public.orders o where o.tenant_id = p_tenant_id and o.token like 'demo-%';
  delete from public.customers c where c.tenant_id = p_tenant_id and 'demo' = any (c.tags);

  delete from public.order_counters oc where oc.tenant_id = p_tenant_id;
  insert into public.order_counters (tenant_id, business_date, last_no)
  select o.tenant_id, o.business_date, max(o.order_no)
  from public.orders o
  where o.tenant_id = p_tenant_id
  group by o.tenant_id, o.business_date;
end;
$$;

-- Refreshes one demo shop for today (see the top of this file). Refuses any shop that is not a demo shop (not_demo)
-- and a demo shop with nothing to sell (no_catalog). Runs twice in a row the same way. The shop's stamp card is turned
-- on, since a demo shows it. Returns { customers, members, orders, today }: the demo customers and members, the demo
-- orders of the 30 days, and those of today (business date).
create function private.demo_reset(p_slug text)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_settings public.shop_settings;
  v_rule public.loyalty_rules;
  v_now timestamptz := now();
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_now_min integer := extract(hour from (now() at time zone 'Asia/Manila'))::integer * 60
    + extract(minute from (now() at time zone 'Asia/Manila'))::integer;

  v_first text[] := array[
    'Maria', 'Jose', 'Juan', 'Ana', 'Mark', 'Kristine', 'John Paul', 'Angelica', 'Carlo', 'Patricia',
    'Miguel', 'Camille', 'Paolo', 'Bea', 'Rafael', 'Joanna', 'Gabriel', 'Nicole', 'Christian', 'Andrea',
    'Jericho', 'Liza', 'Ramon', 'Grace', 'Enrico', 'Mae', 'Francis', 'Lovely', 'Danilo', 'Rosario',
    'Bong', 'Jasmine', 'Arnel', 'Princess', 'Rodel', 'Charmaine', 'Vincent', 'Aileen', 'Noel', 'Rhea'];
  v_last text[] := array[
    'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Tomas', 'Andrada',
    'Castillo', 'Flores', 'Villanueva', 'Ramos', 'Castro', 'Rivera', 'Aquino', 'Navarro', 'Salazar', 'Mercado',
    'Dela Cruz', 'Gonzales', 'Lopez', 'Pascual', 'Domingo', 'Santiago', 'Del Rosario', 'Fernandez', 'Manalo', 'Soriano',
    'Aguilar', 'Valdez', 'Panganiban', 'Dizon', 'Magbanua', 'Peña', 'Ibañez', 'Lacson', 'Tolentino', 'Macaraeg'];
  v_streets text[] := array[
    'Rizal St.', 'Mabini St.', 'Bonifacio Ave.', 'Luna St.', 'Del Pilar St.', 'Burgos St.', 'Aguinaldo Hwy.',
    'Quezon Ave.'];
  v_landmarks text[] := array['Near the chapel', 'Beside the sari-sari store', 'Green gate', 'Across the barangay hall'];
  v_cancel_reasons text[] := array['Customer asked to cancel', 'Item ran out', 'Customer did not reply'];

  v_customer_total integer := 120;
  v_member_total integer := 75;
  v_cust_id uuid[] := '{}';
  v_cust_name text[] := '{}';
  v_cust_phone text[] := '{}';
  v_cust_since timestamptz[] := '{}';
  v_balance jsonb := '{}';

  v_item_pool uuid[];
  v_transfer text[];
  v_fulfillments text[] := '{}';
  v_zone_ids uuid[];
  v_zone_fees integer[];
  v_avg_price numeric;
  v_base numeric;

  v_i integer;
  v_id uuid;
  v_since timestamptz;
  v_offset integer;
  v_date date;
  v_open integer;
  v_close integer;
  v_count integer;
  v_no integer;
  v_special_minutes integer[];
  v_special_kinds text[];
  v_rec record;

  v_kind text;
  v_ci integer;
  v_fulfillment text;
  v_methods text[];
  v_method text;
  v_zone integer;
  v_fee integer;
  v_lines jsonb;
  v_line_count integer;
  v_item_id uuid;
  v_variant public.item_variants;
  v_item_name text;
  v_qty integer;
  v_options jsonb;
  v_options_total integer;
  v_group record;
  v_option public.options;
  v_subtotal integer;
  v_discount integer;
  v_status text;
  v_payment_status text;
  v_placed timestamptz;
  v_paid timestamptz;
  v_prep timestamptz;
  v_ready timestamptz;
  v_out timestamptz;
  v_done timestamptz;
  v_pickup_at timestamptz;
  v_expires timestamptz;
  v_cancel_reason text;
  v_token text;
  v_order_id uuid;
  v_redeem boolean;
  v_normal_seen integer := 0;
  v_transfer_seen integer := 0;
  v_cancelled timestamptz;

  v_orders_made integer := 0;
  v_today_made integer := 0;
begin
  select t.id into v_tenant_id from public.tenants t where t.slug = p_slug and t.is_demo;
  if v_tenant_id is null then
    raise exception 'not_demo';
  end if;

  -- Items the storefront sells (active, outside hidden categories, with a variant); featured ones count twice.
  select array_agg(i.id order by i.sort), avg(p.price)
  into v_item_pool, v_avg_price
  from public.items i
  left join public.categories c on c.id = i.category_id and c.tenant_id = i.tenant_id
  cross join lateral (
    select min(v.price) as price from public.item_variants v
    where v.item_id = i.id and v.tenant_id = i.tenant_id and v.archived_at is null
  ) p
  cross join lateral generate_series(1, case when i.is_featured then 2 else 1 end)
  where i.tenant_id = v_tenant_id
    and i.status = 'active'
    and (c.id is null or not c.is_hidden)
    and p.price is not null;
  if v_item_pool is null then
    raise exception 'no_catalog';
  end if;

  perform set_config('smartapp.demo_reset', 'on', true);
  perform private.demo_delete_rows(v_tenant_id);

  update public.loyalty_rules r set is_active = true, updated_at = now() where r.tenant_id = v_tenant_id and not r.is_active;
  select * into v_settings from public.shop_settings s where s.tenant_id = v_tenant_id;
  select * into v_rule from public.loyalty_rules r where r.tenant_id = v_tenant_id;

  -- What the shop accepts: transfer methods with an active account, and its ways to order (walk-in 9 : pickup 6 :
  -- delivery 5). Delivery needs an active zone, or the fee confirmed on Messenger.
  select coalesce(array_agg(distinct a.method), '{}') into v_transfer
  from public.payment_accounts a where a.tenant_id = v_tenant_id and a.is_active;
  select coalesce(array_agg(z.id order by z.sort), '{}'), coalesce(array_agg(z.fee order by z.sort), '{}')
  into v_zone_ids, v_zone_fees
  from public.delivery_zones z where z.tenant_id = v_tenant_id and z.is_active;
  if v_settings.walk_in_enabled then
    v_fulfillments := v_fulfillments || array_fill('walk_in'::text, array[9]);
  end if;
  if v_settings.pickup_enabled then
    v_fulfillments := v_fulfillments || array_fill('pickup'::text, array[6]);
  end if;
  if v_settings.delivery_enabled and (cardinality(v_zone_ids) > 0 or v_settings.delivery_fee_via_messenger) then
    v_fulfillments := v_fulfillments || array_fill('delivery'::text, array[5]);
  end if;
  if cardinality(v_fulfillments) = 0 then
    v_fulfillments := array['walk_in'];
  end if;

  -- Orders a day before the trend: a shop with cheaper items sells more often (about 12 at a cafe, 3 at a boutique).
  v_base := greatest(3, least(12, round(150000 / greatest(v_avg_price, 1))));

  -- -------------------------------------------------------------------------
  -- Customers: 75 members (member since spread over 90 days, a welcome stamp each) and 45 guests
  -- -------------------------------------------------------------------------
  for v_i in 1 .. v_customer_total loop
    -- Members joined evenly over the 90 days (about 6 this week); the first ones, the most loyal, joined earliest.
    v_since := case when v_i <= v_member_total
      then v_now - make_interval(mins => floor((v_member_total - v_i + random()) * 90 * 1440 / v_member_total)::integer) end;
    insert into public.customers (tenant_id, name, phone, member_since, tags, created_at)
    values (
      v_tenant_id,
      v_first[1 + (v_i * 7) % 40] || ' ' || v_last[1 + (v_i * 11 + (v_i / 40) * 3) % 40],
      '+63999000' || lpad(v_i::text, 4, '0'),
      v_since,
      array['demo'],
      coalesce(v_since, v_now) - interval '40 days'
    )
    on conflict (tenant_id, phone) do nothing
    returning id into v_id;
    continue when v_id is null;

    v_cust_id := v_cust_id || v_id;
    select array_append(v_cust_name, c.name), array_append(v_cust_phone, c.phone), array_append(v_cust_since, c.member_since)
    into v_cust_name, v_cust_phone, v_cust_since
    from public.customers c where c.id = v_id;

    insert into public.consents (tenant_id, customer_id, channel, granted, source, created_at)
    values (v_tenant_id, v_id, 'privacy', true, case when v_since is null then 'checkout' else 'join' end, coalesce(v_since, v_now - interval '40 days'));

    if v_since is not null then
      insert into public.loyalty_ledger (tenant_id, customer_id, delta, reason, created_at)
      values (v_tenant_id, v_id, 1, 'welcome', v_since);
      v_balance := v_balance || jsonb_build_object(v_id::text, 1);
      if random() < 0.4 then
        insert into public.customer_addresses (tenant_id, customer_id, label, address_line, landmark, is_default)
        values (
          v_tenant_id, v_id, 'Home',
          floor(1 + random() * 200)::integer || ' ' || v_streets[1 + floor(random() * cardinality(v_streets))::integer],
          v_landmarks[1 + floor(random() * (cardinality(v_landmarks) + 1))::integer],
          true
        );
      end if;
    end if;
  end loop;
  v_member_total := (select count(*) from unnest(v_cust_since) s where s is not null);
  v_customer_total := cardinality(v_cust_id);

  -- -------------------------------------------------------------------------
  -- Orders: 30 days, oldest first, numbered after any real order of the same day
  -- -------------------------------------------------------------------------
  for v_offset in reverse 29 .. 0 loop
    v_date := v_today - v_offset;
    select extract(epoch from h.opens_at)::integer / 60, extract(epoch from h.closes_at)::integer / 60
    into v_open, v_close
    from public.business_hours h
    where h.tenant_id = v_tenant_id and h.weekday = extract(dow from v_date)::integer;
    if not found then
      continue when v_offset > 0;
      v_open := 0;
      v_close := 1440;
    end if;
    if v_close <= v_open then
      v_close := 1440;
    end if;

    -- Upward trend (+80% over the 30 days), busier Fridays and weekends, a little noise.
    v_count := round(
      v_base * (1 + 0.8 * (29 - v_offset) / 29.0)
      * case when extract(dow from v_date) in (0, 5, 6) then 1.35 else 1 end
      * (0.85 + random() * 0.3)
    );

    -- Today also gets the orders the Home shows: 3 in progress, 1 payment to verify, 2 pickups for tomorrow.
    v_special_minutes := '{}';
    v_special_kinds := '{}';
    if v_offset = 0 then
      v_special_minutes := array[
        greatest(v_now_min - 50, 0), greatest(v_now_min - 35, 0), greatest(v_now_min - 20, 0),
        greatest(v_now_min - 6, 0), greatest(v_now_min - 90, 0), greatest(v_now_min - 30, 0)];
      v_special_kinds := array['out_for_delivery', 'ready', 'preparing', 'pending', 'tomorrow', 'tomorrow'];
    end if;

    select coalesce(max(o.order_no), 0) into v_no
    from public.orders o where o.tenant_id = v_tenant_id and o.business_date = v_date;

    for v_rec in
      select m.minute, m.kind
      from (
        -- Lunch and afternoon peaks inside the opening hours.
        select (v_open + floor(least(greatest(
          case when g.r < 0.5 then 0.4 + (g.r2 - 0.5) * 0.24 when g.r < 0.85 then 0.7 + (g.r2 - 0.5) * 0.24 else g.r2 end,
          0), 0.999) * (v_close - v_open)))::integer as minute, 'normal' as kind
        from (select random() as r, random() as r2 from generate_series(1, v_count)) g
        union all
        select s.minute, s.kind from unnest(v_special_minutes, v_special_kinds) as s (minute, kind)
      ) m
      where m.kind <> 'normal' or v_offset > 0 or m.minute < v_now_min - 5
      order by m.minute, m.kind
    loop
      v_kind := v_rec.kind;
      v_no := v_no + 1;
      v_placed := least((v_date + make_interval(mins => v_rec.minute, secs => floor(random() * 60)::integer)) at time zone 'Asia/Manila', v_now);

      -- Who: members three times out of four, the most loyal ones most often.
      if v_member_total > 0 and (random() < 0.75 or v_member_total = v_customer_total) then
        v_ci := 1 + floor(v_member_total * power(random(), 1.6))::integer;
      else
        v_ci := v_member_total + 1 + floor(random() * (v_customer_total - v_member_total))::integer;
      end if;

      -- How: the special orders need their way to order; everything else follows the shop's mix.
      v_fulfillment := case
        when v_kind = 'out_for_delivery' and 'delivery' = any (v_fulfillments) then 'delivery'
        when v_kind = 'tomorrow' and 'pickup' = any (v_fulfillments) then 'pickup'
        when v_kind in ('out_for_delivery', 'tomorrow', 'pending') then v_fulfillments[1]
        else v_fulfillments[1 + floor(random() * cardinality(v_fulfillments))::integer]
      end;
      v_methods := case v_fulfillment
        when 'walk_in' then array['cash', 'cash', 'cash']
        when 'pickup' then case when v_settings.pay_later_pickup then array['cash', 'cash'] else '{}'::text[] end
        else case when v_settings.cod_enabled then array['cod', 'cod'] else '{}'::text[] end
      end || v_transfer;
      if cardinality(v_methods) = 0 then
        v_fulfillment := 'walk_in';
        v_methods := array['cash'];
      end if;
      v_method := case
        when v_kind = 'pending' and cardinality(v_transfer) > 0 then v_transfer[1]
        when v_kind = 'tomorrow' and v_rec.minute = greatest(v_now_min - 30, 0) and 'cash' = any (v_methods) then 'cash'
        when v_kind = 'tomorrow' and cardinality(v_transfer) > 0 then v_transfer[1 + floor(random() * cardinality(v_transfer))::integer]
        else v_methods[1 + floor(random() * cardinality(v_methods))::integer]
      end;
      if v_kind = 'pending' and v_method not in ('gcash', 'maya', 'bank') then
        v_kind := 'placed';
      end if;

      v_fee := 0;
      v_zone := null;
      if v_fulfillment = 'delivery' and cardinality(v_zone_ids) > 0 then
        v_zone := 1 + floor(random() * cardinality(v_zone_ids))::integer;
        v_fee := v_zone_fees[v_zone];
      end if;

      -- What: 1 to 3 lines from the real catalog, each with a variant and its required choices.
      v_lines := '[]';
      v_subtotal := 0;
      v_line_count := 1 + (random() < 0.45)::integer + (random() < 0.15)::integer;
      for v_i in 1 .. v_line_count loop
        v_item_id := v_item_pool[1 + floor(random() * cardinality(v_item_pool))::integer];
        select i.name into v_item_name from public.items i where i.id = v_item_id;
        select v.* into v_variant
        from public.item_variants v
        where v.item_id = v_item_id and v.tenant_id = v_tenant_id and v.archived_at is null
        order by random() limit 1;
        v_qty := case when random() < 0.2 then 2 else 1 end;
        v_options := '[]';
        v_options_total := 0;
        for v_group in
          select g.id, g.min_select
          from public.item_option_groups ig
          join public.option_groups g on g.id = ig.group_id and g.tenant_id = ig.tenant_id
          where ig.item_id = v_item_id and ig.tenant_id = v_tenant_id
          order by ig.sort
        loop
          continue when v_group.min_select = 0 and random() >= 0.25;
          select o.* into v_option
          from public.options o
          where o.group_id = v_group.id and o.tenant_id = v_tenant_id and not o.is_sold_out
          order by random() limit 1;
          continue when not found;
          v_options := v_options || jsonb_build_array(jsonb_build_object('optionId', v_option.id, 'name', v_option.name, 'priceDelta', v_option.price_delta));
          v_options_total := v_options_total + v_option.price_delta;
        end loop;
        v_lines := v_lines || jsonb_build_array(jsonb_build_object(
          'itemId', v_item_id, 'variantId', v_variant.id, 'itemName', v_item_name, 'variantName', v_variant.name,
          'unitPrice', v_variant.price, 'options', v_options, 'optionsTotal', v_options_total, 'qty', v_qty,
          'lineTotal', (v_variant.price + v_options_total) * v_qty, 'sort', v_i - 1
        ));
        v_subtotal := v_subtotal + (v_variant.price + v_options_total) * v_qty;
      end loop;

      -- Where it ends: most finish; every 23rd is cancelled and every 30th transfer expires unpaid (fixed steps, so
      -- every run has a few of each).
      v_status := case v_kind
        when 'out_for_delivery' then case when v_fulfillment = 'delivery' then 'out_for_delivery' else 'ready' end
        when 'ready' then 'ready'
        when 'preparing' then 'preparing'
        when 'normal' then 'completed'
        else 'placed'
      end;
      if v_kind = 'normal' then
        v_normal_seen := v_normal_seen + 1;
        if v_method in ('gcash', 'maya', 'bank') then
          v_transfer_seen := v_transfer_seen + 1;
        end if;
        if v_method in ('gcash', 'maya', 'bank') and v_transfer_seen % 30 = 7 then
          v_status := 'expired';
        elsif v_normal_seen % 23 = 11 then
          v_status := 'cancelled';
        end if;
      end if;

      -- A member who has a reward ready uses it on some completed orders.
      v_discount := 0;
      v_redeem := false;
      if v_status = 'completed' and v_rule.is_active and v_cust_since[v_ci] is not null and v_cust_since[v_ci] <= v_placed
        and coalesce((v_balance ->> v_cust_id[v_ci]::text)::integer, 0) >= v_rule.stamps_needed and random() < 0.6 then
        v_redeem := true;
        v_discount := least(v_rule.reward_amount, v_subtotal);
      end if;

      -- When: paid, started, ready, sent out and done a few minutes apart, never after now.
      v_paid := null;
      v_prep := null;
      v_ready := null;
      v_out := null;
      v_done := null;
      v_pickup_at := null;
      v_expires := null;
      v_cancel_reason := null;
      v_cancelled := null;
      v_payment_status := 'unpaid';
      -- Transfers are paid before the shop starts; tomorrow's pickups are paid already.
      if v_method in ('gcash', 'maya', 'bank') and v_status not in ('cancelled', 'expired')
        and (v_status <> 'placed' or v_kind = 'tomorrow') then
        v_paid := least(v_placed + make_interval(mins => 2 + floor(random() * 7)::integer), v_now);
      end if;
      if v_status in ('preparing', 'ready', 'out_for_delivery', 'completed') then
        v_prep := least(coalesce(v_paid, v_placed) + make_interval(mins => 1 + floor(random() * 4)::integer), v_now);
      end if;
      if v_status in ('ready', 'out_for_delivery', 'completed') then
        v_ready := least(v_prep + make_interval(mins => 5 + floor(random() * 16)::integer), v_now);
      end if;
      if v_fulfillment = 'delivery' and v_status in ('out_for_delivery', 'completed') then
        v_out := least(v_ready + make_interval(mins => 2 + floor(random() * 5)::integer), v_now);
      end if;
      if v_status = 'completed' then
        v_done := least(coalesce(v_out, v_ready) + make_interval(mins => case when v_out is null then 2 + floor(random() * 14)::integer else 15 + floor(random() * 26)::integer end), v_now);
      end if;
      if v_paid is null and v_method = 'cash' and v_status in ('preparing', 'ready', 'out_for_delivery', 'completed') then
        v_paid := case when v_fulfillment = 'walk_in' then v_prep else v_done end;
      elsif v_paid is null and v_method = 'cod' and v_status = 'completed' then
        v_paid := v_done;
      end if;
      if v_paid is not null then
        v_payment_status := 'paid';
      elsif v_kind = 'pending' then
        v_payment_status := 'pending';
      end if;
      if v_fulfillment = 'pickup' then
        v_pickup_at := case when v_kind = 'tomorrow'
          then ((v_today + 1) + make_interval(mins => coalesce(v_open, 600) + case when v_method = 'cash' then 240 else 90 end)) at time zone 'Asia/Manila'
          else date_trunc('minute', v_placed) + make_interval(mins => 30 + 15 * floor(random() * 4)::integer)
        end;
      end if;
      if v_status = 'expired' then
        v_expires := v_placed + make_interval(mins => v_settings.unpaid_expiry_minutes);
      elsif v_status = 'cancelled' then
        v_cancel_reason := v_cancel_reasons[1 + floor(random() * cardinality(v_cancel_reasons))::integer];
        v_cancelled := least(v_placed + make_interval(mins => 5 + floor(random() * 25)::integer), v_now);
      end if;

      v_token := 'demo-' || rtrim(translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/', '-_'), '=');
      insert into public.orders (
        tenant_id, order_no, business_date, token, fulfillment, status, payment_status, payment_method, customer_id,
        customer_name, customer_phone, address_line, landmark, delivery_zone_id, delivery_fee, pickup_at,
        subtotal, discount_total, total, cancel_reason, client_key, expires_at, placed_at, paid_at, ready_at,
        completed_at, cancelled_at
      ) values (
        v_tenant_id, v_no, v_date, v_token, v_fulfillment, v_status, v_payment_status, v_method, v_cust_id[v_ci],
        v_cust_name[v_ci], v_cust_phone[v_ci],
        case when v_fulfillment = 'delivery'
          then floor(1 + random() * 200)::integer || ' ' || v_streets[1 + floor(random() * cardinality(v_streets))::integer] end,
        case when v_fulfillment = 'delivery' then v_landmarks[1 + floor(random() * (cardinality(v_landmarks) + 1))::integer] end,
        v_zone_ids[v_zone], v_fee, v_pickup_at,
        v_subtotal, v_discount, v_subtotal - v_discount + v_fee, v_cancel_reason, gen_random_uuid(), v_expires, v_placed,
        v_paid, v_ready, v_done, v_cancelled
      )
      returning id into v_order_id;

      insert into public.order_items (
        tenant_id, order_id, item_id, variant_id, item_name, variant_name, unit_price, options, options_total, qty,
        line_total, sort
      )
      select
        v_tenant_id, v_order_id, (l ->> 'itemId')::uuid, (l ->> 'variantId')::uuid, l ->> 'itemName', l ->> 'variantName',
        (l ->> 'unitPrice')::integer, l -> 'options', (l ->> 'optionsTotal')::integer, (l ->> 'qty')::integer,
        (l ->> 'lineTotal')::integer, (l ->> 'sort')::integer
      from jsonb_array_elements(v_lines) as l;

      -- Payments and the timeline, as the real flow writes them.
      insert into public.order_events (tenant_id, order_id, kind, from_status, to_status, actor, created_at)
      values (v_tenant_id, v_order_id, 'status', null, 'placed', 'customer', v_placed);
      if v_kind = 'pending' then
        insert into public.payments (tenant_id, order_id, method, amount, status, reference_no, reference_norm, proof_path, created_at)
        values (
          v_tenant_id, v_order_id, v_method, v_subtotal - v_discount + v_fee, 'pending',
          upper(substr(md5(v_order_id::text), 1, 12)), upper(substr(md5(v_order_id::text), 1, 12)),
          -- No file is uploaded, so the proof viewer shows "Proof image not found".
          v_tenant_id::text || '/' || v_token || '/' || gen_random_uuid()::text || '.webp',
          least(v_placed + interval '3 minutes', v_now)
        );
        insert into public.order_events (tenant_id, order_id, kind, actor, created_at)
        values (v_tenant_id, v_order_id, 'payment_submitted', 'customer', least(v_placed + interval '3 minutes', v_now));
      elsif v_paid is not null then
        insert into public.payments (tenant_id, order_id, method, amount, status, reference_no, reference_norm, reviewed_at, created_at)
        values (
          v_tenant_id, v_order_id, v_method, v_subtotal - v_discount + v_fee, 'confirmed',
          case when v_method in ('gcash', 'maya', 'bank') then upper(substr(md5(v_order_id::text), 1, 12)) end,
          case when v_method in ('gcash', 'maya', 'bank') then upper(substr(md5(v_order_id::text), 1, 12)) end,
          v_paid, v_paid
        );
        if v_method in ('gcash', 'maya', 'bank') then
          insert into public.order_events (tenant_id, order_id, kind, actor, created_at)
          values (v_tenant_id, v_order_id, 'payment_submitted', 'customer', v_paid - interval '1 minute');
        end if;
        insert into public.order_events (tenant_id, order_id, kind, actor, created_at)
        values (v_tenant_id, v_order_id, 'payment_confirmed', 'owner', v_paid);
      end if;
      insert into public.order_events (tenant_id, order_id, kind, from_status, to_status, actor, note, created_at)
      select v_tenant_id, v_order_id, 'status', s.from_status, s.to_status, s.actor, s.note, s.at
      from (values
        ('placed', 'preparing', 'owner', null::text, v_prep),
        ('preparing', 'ready', 'owner', null, v_ready),
        ('ready', 'out_for_delivery', 'owner', null, v_out),
        (case when v_out is null then 'ready' else 'out_for_delivery' end, 'completed', 'owner', null, v_done),
        ('placed', 'cancelled', 'owner', v_cancel_reason, v_cancelled),
        ('placed', 'expired', 'system', null, v_expires)
      ) as s (from_status, to_status, actor, note, at)
      where s.at is not null;

      -- Stamps: a reward used when placed, a stamp earned when completed (guests earn too, decision P5-11).
      if v_redeem then
        insert into public.loyalty_ledger (tenant_id, customer_id, order_id, delta, reason, created_at)
        values (v_tenant_id, v_cust_id[v_ci], v_order_id, -v_rule.stamps_needed, 'redeemed', v_placed);
        v_balance := v_balance || jsonb_build_object(
          v_cust_id[v_ci]::text, coalesce((v_balance ->> v_cust_id[v_ci]::text)::integer, 0) - v_rule.stamps_needed);
      end if;
      if v_status = 'completed' and v_rule.is_active and v_subtotal - v_discount >= v_rule.min_order_total then
        insert into public.loyalty_ledger (tenant_id, customer_id, order_id, delta, reason, created_at)
        values (v_tenant_id, v_cust_id[v_ci], v_order_id, 1, 'earned', v_done);
        v_balance := v_balance || jsonb_build_object(
          v_cust_id[v_ci]::text, coalesce((v_balance ->> v_cust_id[v_ci]::text)::integer, 0) + 1);
      end if;

      v_orders_made := v_orders_made + 1;
      if v_offset = 0 then
        v_today_made := v_today_made + 1;
      end if;
    end loop;

    if v_no > 0 then
      insert into public.order_counters as oc (tenant_id, business_date, last_no)
      values (v_tenant_id, v_date, v_no)
      on conflict (tenant_id, business_date) do update set last_no = greatest(oc.last_no, excluded.last_no);
    end if;
  end loop;

  -- Each customer's totals, as completing an order keeps them.
  update public.customers c
  set order_count = s.orders, total_spent = s.spent, last_order_at = s.last_at
  from (
    select o.customer_id, count(*)::integer as orders, sum(o.total) as spent, max(o.completed_at) as last_at
    from public.orders o
    where o.tenant_id = v_tenant_id and o.token like 'demo-%' and o.status = 'completed'
    group by o.customer_id
  ) s
  where c.id = s.customer_id and c.tenant_id = v_tenant_id;

  -- Stock: every tracked variant above its low mark except two, which sit at or under it.
  with tracked as (
    select v.id, v.stock_on_hand, coalesce(v.low_stock_at, 2) as low,
      row_number() over (order by c.sort nulls last, i.sort, v.sort desc) as rn
    from public.item_variants v
    join public.items i on i.id = v.item_id and i.tenant_id = v.tenant_id
    left join public.categories c on c.id = i.category_id and c.tenant_id = i.tenant_id
    where v.tenant_id = v_tenant_id and i.track_stock and i.status <> 'archived' and v.archived_at is null
  )
  update public.item_variants v
  set low_stock_at = t.low,
      stock_on_hand = case
        when t.rn = 1 then least(1, t.low)
        when t.rn = 2 then t.low
        when coalesce(t.stock_on_hand, 0) <= t.low then t.low + 4 + (t.rn % 5)::integer
        else t.stock_on_hand
      end
  from tracked t
  where v.id = t.id;

  perform set_config('smartapp.demo_reset', 'off', true);

  return jsonb_build_object(
    'customers', v_customer_total,
    'members', v_member_total,
    'orders', v_orders_made,
    'today', v_today_made
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Replaced demo_setup: catalog, then demo orders
-- ---------------------------------------------------------------------------

-- Replaces P5.2's demo_setup (same signature). Each demo shop's demo rows go first, so its catalog can be replaced;
-- a demo shop that also has real orders (someone tried it) keeps its catalog, since those orders still point at it.
-- Then demo_reset fills both shops for today. Safe to run again.
create or replace function private.demo_setup()
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_tenant_id uuid;
begin
  v_tenant_id := private.demo_ensure_shop('juans-cafe', 'Juan''s Cafe', 'food', jsonb_build_object(
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
  perform private.demo_delete_rows(v_tenant_id);
  if not exists (select 1 from public.order_items oi where oi.tenant_id = v_tenant_id) then
    perform private.demo_seed_catalog('juans-cafe');
  end if;
  perform private.demo_reset('juans-cafe');

  v_tenant_id := private.demo_ensure_shop('tala-apparel', 'Tala Apparel', 'retail', jsonb_build_object(
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
  perform private.demo_delete_rows(v_tenant_id);
  if not exists (select 1 from public.order_items oi where oi.tenant_id = v_tenant_id) then
    perform private.demo_seed_catalog('tala-apparel');
  end if;
  perform private.demo_reset('tala-apparel');
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Function grants: nobody (SQL editor and seed.sql only)
-- ---------------------------------------------------------------------------

revoke execute on function private.demo_delete_rows(uuid) from public, anon, authenticated;
revoke execute on function private.demo_reset(text) from public, anon, authenticated;
revoke execute on function private.demo_setup() from public, anon, authenticated;
