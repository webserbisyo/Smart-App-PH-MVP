-- SF2 Step 2: Three reward kinds and custom-prize claims
-- Additive & backward compatible: loyalty_rules columns, order_items.is_reward, reward_claims table,
-- loyalty_ledger constraint extension, updated build_order/storefront/account functions, claim_reward/settle_reward_claim RPCs.

-- 1. loyalty_rules extensions
alter table public.loyalty_rules
  add column if not exists reward_kind text not null default 'discount' check (reward_kind in ('discount', 'free_item', 'custom')),
  add column if not exists reward_item_id uuid,
  add column if not exists reward_variant_id uuid,
  add column if not exists reward_title text check (reward_title is null or char_length(btrim(reward_title)) <= 60),
  add column if not exists reward_description text check (reward_description is null or char_length(btrim(reward_description)) <= 200),
  add column if not exists reward_image_path text;

alter table public.loyalty_rules
  drop constraint if exists loyalty_rules_item_fk,
  drop constraint if exists loyalty_rules_variant_fk,
  drop constraint if exists loyalty_rules_reward_shape;

alter table public.loyalty_rules
  add constraint loyalty_rules_item_fk foreign key (reward_item_id, tenant_id) references public.items (id, tenant_id),
  add constraint loyalty_rules_variant_fk foreign key (reward_variant_id, tenant_id) references public.item_variants (id, tenant_id),
  add constraint loyalty_rules_reward_shape check (
    (reward_kind = 'discount') or
    (reward_kind = 'free_item' and reward_item_id is not null and reward_variant_id is not null) or
    (reward_kind = 'custom' and reward_title is not null and char_length(btrim(reward_title)) between 1 and 60)
  );

grant update (
  reward_kind, reward_item_id, reward_variant_id, reward_title, reward_description, reward_image_path
) on public.loyalty_rules to authenticated;

-- 2. order_items: is_reward boolean
alter table public.order_items
  add column if not exists is_reward boolean not null default false;

-- 3. reward_claims table
create table if not exists public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  customer_id uuid not null,
  code text not null check (char_length(btrim(code)) = 6),
  status text not null default 'pending' check (status in ('pending', 'given', 'cancelled')),
  created_at timestamptz not null default now(),
  given_at timestamptz,
  cancelled_at timestamptz,
  constraint reward_claims_tenant_unique unique (id, tenant_id),
  constraint reward_claims_tenant_code unique (tenant_id, code),
  foreign key (customer_id, tenant_id) references public.customers (id, tenant_id) on delete cascade
);

create index if not exists reward_claims_customer_idx on public.reward_claims (customer_id, tenant_id, status);

alter table public.reward_claims enable row level security;
revoke all on public.reward_claims from anon, authenticated;

grant select on public.reward_claims to authenticated;

drop policy if exists reward_claims_select_member on public.reward_claims;
create policy reward_claims_select_member on public.reward_claims
  for select to authenticated
  using (private.is_shop_member(tenant_id));

drop policy if exists reward_claims_select_own on public.reward_claims;
create policy reward_claims_select_own on public.reward_claims
  for select to authenticated
  using (customer_id in (select private.my_customer_ids()));

-- 4. loyalty_ledger: add claim_id and extend order_shape constraint
alter table public.loyalty_ledger
  add column if not exists claim_id uuid;

alter table public.loyalty_ledger
  drop constraint if exists loyalty_ledger_order_shape;

alter table public.loyalty_ledger
  add constraint loyalty_ledger_order_shape check (
    (reason = 'earned' and order_id is not null) or
    (reason in ('redeemed', 'reversed') and (order_id is not null or claim_id is not null)) or
    (reason in ('manual', 'welcome'))
  );

alter table public.loyalty_ledger
  drop constraint if exists loyalty_ledger_claim_fk;

alter table public.loyalty_ledger
  add constraint loyalty_ledger_claim_fk foreign key (claim_id, tenant_id) references public.reward_claims (id, tenant_id) on delete cascade;

-- 5. Update private.stamp_rule_json to include reward details
create or replace function private.stamp_rule_json(p_rule public.loyalty_rules)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'tenantId', p_rule.tenant_id,
    'isActive', p_rule.is_active,
    'minOrderTotal', p_rule.min_order_total,
    'stampsNeeded', p_rule.stamps_needed,
    'rewardLabel', p_rule.reward_label,
    'rewardAmount', p_rule.reward_amount,
    'rewardKind', p_rule.reward_kind,
    'rewardTitle', p_rule.reward_title,
    'rewardDescription', p_rule.reward_description,
    'rewardImagePath', p_rule.reward_image_path,
    'rewardItemId', p_rule.reward_item_id,
    'rewardVariantId', p_rule.reward_variant_id,
    'rewardItemName', (
      select case
        when i.name is not null and v.name is not null then i.name || ' (' || v.name || ')'
        when i.name is not null then i.name
        else null
      end
      from public.items i
      left join public.item_variants v on v.id = p_rule.reward_variant_id and v.tenant_id = p_rule.tenant_id
      where i.id = p_rule.reward_item_id and i.tenant_id = p_rule.tenant_id
    )
  );
$$;

-- 6. Update private.member_account_json to include open claim
create or replace function private.member_account_json(p_customer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_customer public.customers;
  v_rule public.loyalty_rules;
  v_stamps integer;
begin
  select * into v_customer from public.customers c where c.id = p_customer_id;
  select * into v_rule from public.loyalty_rules r where r.tenant_id = v_customer.tenant_id and r.is_active;
  select coalesce(sum(l.delta), 0)::integer into v_stamps from public.loyalty_ledger l where l.customer_id = v_customer.id;

  return jsonb_build_object(
    'customer', jsonb_build_object(
      'id', v_customer.id,
      'tenantId', v_customer.tenant_id,
      'userId', v_customer.user_id,
      'name', v_customer.name,
      'phone', v_customer.phone,
      'email', v_customer.email,
      'memberSince', v_customer.member_since,
      'orderCount', v_customer.order_count,
      'totalSpent', v_customer.total_spent,
      'lastOrderAt', v_customer.last_order_at,
      'notes', null,
      'tags', '[]'::jsonb
    ),
    'stamps', greatest(v_stamps, 0),
    'stampRule', case when v_rule.tenant_id is not null then private.stamp_rule_json(v_rule) end,
    'rewardReady', v_rule.tenant_id is not null and v_stamps >= v_rule.stamps_needed,
    'openClaim', (
      select jsonb_build_object(
        'id', rc.id,
        'code', rc.code,
        'status', rc.status,
        'createdAt', rc.created_at
      )
      from public.reward_claims rc
      where rc.customer_id = v_customer.id
        and rc.tenant_id = v_customer.tenant_id
        and rc.status = 'pending'
      order by rc.created_at desc
      limit 1
    ),
    'orders', coalesce((
      select jsonb_agg(private.order_json(o) order by o.placed_at desc)
      from (
        select * from public.orders o
        where o.customer_id = v_customer.id and o.tenant_id = v_customer.tenant_id
        order by o.placed_at desc
        limit 20
      ) o
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'tenantId', l.tenant_id, 'customerId', l.customer_id, 'orderId', l.order_id, 'delta', l.delta,
          'reason', l.reason, 'createdAt', l.created_at
        )
        order by l.created_at desc
      )
      from (
        select * from public.loyalty_ledger l
        where l.customer_id = v_customer.id
        order by l.created_at desc
        limit 20
      ) l
    ), '[]'::jsonb),
    'addresses', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id, 'tenantId', a.tenant_id, 'customerId', a.customer_id, 'label', a.label,
          'addressLine', a.address_line, 'landmark', a.landmark, 'isDefault', a.is_default
        )
        order by a.is_default desc, a.created_at
      )
      from public.customer_addresses a
      where a.customer_id = v_customer.id
    ), '[]'::jsonb)
  );
end;
$$;

-- 7. Update build_order with three reward kinds
create or replace function private.build_order(p_tenant_id uuid, p_payload jsonb, p_quote boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_settings public.shop_settings;
  v_fulfillment text;
  v_method text;
  v_pickup_at timestamptz;
  v_delivery jsonb;
  v_address text;
  v_landmark text;
  v_zone_id uuid;
  v_notes text;
  v_use_reward boolean := false;
  v_client_key uuid;
  v_name text;
  v_phone text;
  v_email text;
  v_lines jsonb;
  v_line jsonb;
  v_index integer;
  v_item public.items;
  v_variant public.item_variants;
  v_variant_id uuid;
  v_option_ids uuid[];
  v_qty integer;
  v_problem text;
  v_options jsonb;
  v_options_total integer;
  v_line_total integer;
  v_taken integer;
  v_used jsonb := '{}';
  v_priced jsonb := '[]';
  v_problems jsonb := '[]';
  v_subtotal integer := 0;
  v_fee integer := 0;
  v_total integer;
  v_existing jsonb;
  v_customer public.customers;
  v_customer_id uuid;
  v_order_no integer;
  v_token text;
  v_order_id uuid;
  v_member_id uuid;
  v_rule public.loyalty_rules;
  v_discount integer := 0;
  v_reward_item public.items;
  v_reward_variant public.item_variants;
begin
  -- 1. Shape (bad casts are data exceptions → invalid).
  begin
    if jsonb_typeof(p_payload) is distinct from 'object' then
      raise exception 'invalid';
    end if;

    v_fulfillment := p_payload ->> 'fulfillment';
    v_method := p_payload ->> 'paymentMethod';
    if v_fulfillment is null or v_fulfillment not in ('walk_in', 'pickup', 'delivery')
      or v_method is null or v_method not in ('cash', 'cod', 'gcash', 'maya', 'bank') then
      raise exception 'invalid';
    end if;

    v_lines := p_payload -> 'lines';
    if jsonb_typeof(v_lines) is distinct from 'array' or jsonb_array_length(v_lines) not between 1 and 50 then
      raise exception 'invalid';
    end if;
    for v_index in 0 .. jsonb_array_length(v_lines) - 1 loop
      v_line := v_lines -> v_index;
      if jsonb_typeof(v_line) is distinct from 'object'
        or jsonb_typeof(v_line -> 'itemId') is distinct from 'string'
        or jsonb_typeof(v_line -> 'variantId') is distinct from 'string'
        or jsonb_typeof(v_line -> 'optionIds') is distinct from 'array'
        or jsonb_array_length(v_line -> 'optionIds') > 20
        or jsonb_typeof(v_line -> 'qty') is distinct from 'number'
        or coalesce(jsonb_typeof(v_line -> 'note'), 'null') not in ('null', 'string')
        or char_length(v_line ->> 'note') > 200 then
        raise exception 'invalid';
      end if;
      perform (v_line ->> 'itemId')::uuid, (v_line ->> 'variantId')::uuid;
      perform x::uuid from jsonb_array_elements_text(v_line -> 'optionIds') as x;
      if (v_line ->> 'qty')::integer not between 1 and 99 then
        raise exception 'invalid';
      end if;
    end loop;

    if coalesce(jsonb_typeof(p_payload -> 'pickupAt'), 'null') = 'string' then
      v_pickup_at := (p_payload ->> 'pickupAt')::timestamptz;
    elsif coalesce(jsonb_typeof(p_payload -> 'pickupAt'), 'null') <> 'null' then
      raise exception 'invalid';
    end if;
    if v_pickup_at is not null and v_fulfillment <> 'pickup' then
      raise exception 'invalid';
    end if;

    v_delivery := p_payload -> 'delivery';
    if jsonb_typeof(v_delivery) = 'null' then
      v_delivery := null;
    end if;
    if (v_fulfillment = 'delivery') <> (v_delivery is not null) then
      raise exception 'invalid';
    end if;
    if v_delivery is not null then
      v_address := btrim(v_delivery ->> 'addressLine');
      v_landmark := nullif(btrim(v_delivery ->> 'landmark'), '');
      v_zone_id := (v_delivery ->> 'deliveryZoneId')::uuid;
      if jsonb_typeof(v_delivery) <> 'object' or jsonb_typeof(v_delivery -> 'addressLine') is distinct from 'string'
        or char_length(v_address) not between 1 and 200 or char_length(v_landmark) > 200 then
        raise exception 'invalid';
      end if;
    end if;

    if coalesce(jsonb_typeof(p_payload -> 'useReward'), 'null') not in ('null', 'boolean')
      or coalesce(jsonb_typeof(p_payload -> 'notes'), 'null') not in ('null', 'string')
      or char_length(p_payload ->> 'notes') > 500 then
      raise exception 'invalid';
    end if;
    v_use_reward := coalesce((p_payload ->> 'useReward')::boolean, false);
    v_notes := nullif(btrim(p_payload ->> 'notes'), '');

    -- Who is ordering matters only when placing; a quote can run before the form is filled.
    if not p_quote then
      v_client_key := (p_payload ->> 'clientKey')::uuid;
      v_name := btrim(p_payload -> 'customer' ->> 'name');
      v_phone := p_payload -> 'customer' ->> 'phone';
      v_email := nullif(btrim(p_payload -> 'customer' ->> 'email'), '');
      if v_client_key is null
        or jsonb_typeof(p_payload -> 'customer') is distinct from 'object'
        or v_name is null or char_length(v_name) not between 1 and 80
        or v_phone is null or v_phone !~ '^\+639\d{9}$'
        or (v_email is not null and (char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
        or (p_payload -> 'privacyConsent') is distinct from 'true'::jsonb then
        raise exception 'invalid';
      end if;
    end if;
  exception when data_exception then
    raise exception 'invalid';
  end;

  -- 2. Settings: placing locks the shop's row.
  if p_quote then
    select * into v_settings from public.shop_settings s where s.tenant_id = p_tenant_id;
  else
    select * into v_settings from public.shop_settings s where s.tenant_id = p_tenant_id for update;
  end if;
  if not found then
    raise exception 'shop_not_found';
  end if;

  if not p_quote then
    select jsonb_build_object('orderId', o.id, 'orderNo', o.order_no, 'token', o.token) into v_existing
    from public.orders o
    where o.tenant_id = p_tenant_id and o.client_key = v_client_key;
    if v_existing is not null then
      return v_existing;
    end if;

    -- 3. Throttle
    if (
      select count(*) from public.orders o
      where o.tenant_id = p_tenant_id
        and o.customer_phone = v_phone
        and o.payment_status = 'unpaid'
        and o.status not in ('cancelled', 'expired')
        and o.placed_at > v_now - interval '30 minutes'
    ) >= 3 then
      raise exception 'rate_limited';
    end if;
    if (
      select count(*) from public.orders o where o.tenant_id = p_tenant_id and o.placed_at > v_now - interval '1 minute'
    ) >= 30 then
      raise exception 'rate_limited';
    end if;
  end if;

  -- 4. Open, switches and pickup time.
  if (v_fulfillment = 'walk_in' and not v_settings.walk_in_enabled)
    or (v_fulfillment = 'pickup' and not v_settings.pickup_enabled)
    or (v_fulfillment = 'delivery' and not v_settings.delivery_enabled) then
    raise exception 'fulfillment_unavailable';
  end if;
  if not v_settings.accepting_orders then
    raise exception 'shop_closed';
  end if;
  if v_pickup_at is null then
    if not private.is_open_now(p_tenant_id, v_now) then
      raise exception 'shop_closed';
    end if;
    if v_settings.busy_until is not null and v_settings.busy_until > v_now then
      raise exception 'shop_busy';
    end if;
  elsif v_pickup_at < v_now + interval '15 minutes'
    or (v_pickup_at at time zone 'Asia/Manila')::date not in (v_today, v_today + 1)
    or not private.is_open_now(p_tenant_id, v_pickup_at) then
    raise exception 'pickup_time_invalid';
  end if;

  -- 5. Payment rules
  if v_method in ('gcash', 'maya', 'bank') then
    if not exists (
      select 1 from public.payment_accounts a where a.tenant_id = p_tenant_id and a.method = v_method and a.is_active
    ) then
      raise exception 'payment_unavailable';
    end if;
  elsif v_method = 'cash' then
    if not (v_fulfillment = 'walk_in' or (v_fulfillment = 'pickup' and v_settings.pay_later_pickup)) then
      raise exception 'payment_unavailable';
    end if;
  elsif v_fulfillment <> 'delivery' then
    raise exception 'payment_unavailable';
  elsif not v_settings.cod_enabled then
    raise exception 'cod_not_allowed';
  end if;

  -- 6. Lines. Placing locks every variant once, in id order.
  if not p_quote then
    perform 1
    from public.item_variants v
    where v.tenant_id = p_tenant_id
      and v.id in (select (l ->> 'variantId')::uuid from jsonb_array_elements(v_lines) as l)
    order by v.id
    for update;
  end if;

  for v_index in 0 .. jsonb_array_length(v_lines) - 1 loop
    v_line := v_lines -> v_index;
    v_variant_id := (v_line ->> 'variantId')::uuid;
    v_qty := (v_line ->> 'qty')::integer;
    select coalesce(array_agg(x.id::uuid order by x.n), '{}') into v_option_ids
    from jsonb_array_elements_text(v_line -> 'optionIds') with ordinality as x(id, n);
    v_problem := null;

    -- Sold only when the storefront shows it: an active item outside hidden categories.
    select i.* into v_item
    from public.items i
    left join public.categories c on c.id = i.category_id and c.tenant_id = i.tenant_id
    where i.id = (v_line ->> 'itemId')::uuid
      and i.tenant_id = p_tenant_id
      and i.status = 'active'
      and (c.id is null or not c.is_hidden);
    if not found then
      v_problem := 'item_unavailable';
    else
      select v.* into v_variant
      from public.item_variants v
      where v.id = v_variant_id and v.item_id = v_item.id and v.tenant_id = p_tenant_id and v.archived_at is null;
      if not found or v_variant.is_sold_out or (v_item.track_stock and coalesce(v_variant.stock_on_hand, 0) <= 0) then
        v_problem := 'item_unavailable';
      end if;
    end if;

    if v_problem is null and (
      -- each option once, in a group linked to this item, not sold out
      cardinality(v_option_ids) <> (select count(distinct x) from unnest(v_option_ids) as x)
      or exists (
        select 1
        from unnest(v_option_ids) as x
        where not exists (
          select 1
          from public.options o
          join public.item_option_groups g on g.group_id = o.group_id and g.tenant_id = o.tenant_id
          where o.id = x and o.tenant_id = p_tenant_id and g.item_id = v_item.id and not o.is_sold_out
        )
      )
      -- every linked group's minimum and maximum
      or exists (
        select 1
        from public.item_option_groups g
        join public.option_groups og on og.id = g.group_id and og.tenant_id = g.tenant_id
        where g.item_id = v_item.id
          and g.tenant_id = p_tenant_id
          and (select count(*) from public.options o where o.group_id = og.id and o.id = any (v_option_ids))
            not between og.min_select and og.max_select
      )
    ) then
      v_problem := 'invalid_options';
    end if;

    -- Stock counts across every line of the same variant.
    if v_problem is null and v_item.track_stock then
      v_taken := coalesce((v_used ->> v_variant.id::text)::integer, 0) + v_qty;
      if v_taken > coalesce(v_variant.stock_on_hand, 0) then
        v_problem := 'out_of_stock';
      else
        v_used := v_used || jsonb_build_object(v_variant.id::text, v_taken);
      end if;
    end if;

    if v_problem is not null then
      if not p_quote then
        raise exception '%', v_problem using detail = v_variant_id::text;
      end if;
      v_problems := v_problems || jsonb_build_array(
        jsonb_build_object('lineIndex', v_index, 'code', v_problem, 'variantId', v_variant_id)
      );
      continue;
    end if;

    select
      coalesce(jsonb_agg(jsonb_build_object('optionId', o.id, 'name', o.name, 'priceDelta', o.price_delta) order by x.n), '[]'),
      coalesce(sum(o.price_delta), 0)
    into v_options, v_options_total
    from unnest(v_option_ids) with ordinality as x(id, n)
    join public.options o on o.id = x.id and o.tenant_id = p_tenant_id;

    v_line_total := (v_variant.price + v_options_total) * v_qty;
    v_subtotal := v_subtotal + v_line_total;
    v_priced := v_priced || jsonb_build_array(jsonb_build_object(
      'lineIndex', v_index,
      'itemId', v_item.id,
      'variantId', v_variant.id,
      'itemName', v_item.name,
      'variantName', v_variant.name,
      'unitPrice', v_variant.price,
      'options', v_options,
      'optionsTotal', v_options_total,
      'qty', v_qty,
      'lineTotal', v_line_total,
      'note', nullif(btrim(v_line ->> 'note'), ''),
      'isReward', false
    ));
  end loop;

  -- 7. Delivery fee from the zone; none when the shop confirms it on Messenger.
  if v_fulfillment = 'delivery' then
    if v_zone_id is null then
      if not v_settings.delivery_fee_via_messenger then
        raise exception 'zone_required';
      end if;
    else
      select z.fee into v_fee
      from public.delivery_zones z
      where z.id = v_zone_id and z.tenant_id = p_tenant_id and z.is_active;
      if not found then
        raise exception 'zone_invalid';
      end if;
    end if;
  end if;

  -- 8. Reward (discount, free_item, custom)
  v_member_id := private.member_customer_id(p_tenant_id);
  if v_use_reward then
    if v_member_id is null then
      raise exception 'reward_unavailable';
    end if;
    if not p_quote then
      perform 1 from public.customers c where c.id = v_member_id for update;
    end if;
    select * into v_rule from public.loyalty_rules r where r.tenant_id = p_tenant_id and r.is_active;
    if not found then
      raise exception 'reward_unavailable';
    end if;
    if v_rule.reward_kind = 'custom' then
      raise exception 'reward_not_for_orders';
    end if;
    if (
      select coalesce(sum(l.delta), 0) from public.loyalty_ledger l where l.customer_id = v_member_id
    ) < v_rule.stamps_needed then
      raise exception 'reward_unavailable';
    end if;

    if v_rule.reward_kind = 'discount' then
      v_discount := least(v_rule.reward_amount, v_subtotal);
    elsif v_rule.reward_kind = 'free_item' then
      if p_quote then
        select * into v_reward_variant
        from public.item_variants v
        where v.id = v_rule.reward_variant_id and v.tenant_id = p_tenant_id and v.archived_at is null;
      else
        select * into v_reward_variant
        from public.item_variants v
        where v.id = v_rule.reward_variant_id and v.tenant_id = p_tenant_id and v.archived_at is null for update;
      end if;

      if not found or v_reward_variant.is_sold_out then
        raise exception 'reward_item_sold_out';
      end if;

      select * into v_reward_item
      from public.items i
      where i.id = v_reward_variant.item_id and i.tenant_id = p_tenant_id and i.status = 'active';
      if not found then
        raise exception 'reward_item_sold_out';
      end if;

      if v_reward_item.track_stock then
        v_taken := coalesce((v_used ->> v_reward_variant.id::text)::integer, 0) + 1;
        if v_taken > coalesce(v_reward_variant.stock_on_hand, 0) then
          raise exception 'reward_item_sold_out';
        else
          v_used := v_used || jsonb_build_object(v_reward_variant.id::text, v_taken);
        end if;
      end if;

      v_priced := v_priced || jsonb_build_array(jsonb_build_object(
        'lineIndex', jsonb_array_length(v_priced),
        'itemId', v_reward_item.id,
        'variantId', v_reward_variant.id,
        'itemName', v_reward_item.name,
        'variantName', v_reward_variant.name,
        'unitPrice', v_reward_variant.price,
        'options', '[]'::jsonb,
        'optionsTotal', 0,
        'qty', 1,
        'lineTotal', v_reward_variant.price,
        'note', null,
        'isReward', true
      ));
      v_subtotal := v_subtotal + v_reward_variant.price;
      v_discount := v_reward_variant.price;
    elsif v_rule.reward_kind = 'custom' then
      raise exception 'reward_not_for_orders';
    end if;
  end if;

  v_total := v_subtotal - v_discount + v_fee;
  if p_quote then
    return jsonb_build_object(
      'lines', v_priced,
      'subtotal', v_subtotal,
      'discountTotal', v_discount,
      'deliveryFee', v_fee,
      'total', v_total,
      'rewardApplied', v_use_reward,
      'problems', v_problems
    );
  end if;

  -- 9. Place
  if v_member_id is not null then
    v_customer_id := v_member_id;
  else
    select * into v_customer from public.customers c where c.tenant_id = p_tenant_id and c.phone = v_phone;
    if not found then
      insert into public.customers (tenant_id, name, phone, email)
      values (p_tenant_id, v_name, v_phone, v_email)
      returning id into v_customer_id;
    elsif v_customer.user_id is null then
      v_customer_id := v_customer.id;
    end if;
  end if;

  insert into public.order_counters as oc (tenant_id, business_date, last_no)
  values (p_tenant_id, v_today, 1)
  on conflict (tenant_id, business_date) do update set last_no = oc.last_no + 1
  returning oc.last_no into v_order_no;

  v_token := rtrim(translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/', '-_'), '=');

  insert into public.orders (
    tenant_id, order_no, business_date, token, fulfillment, payment_status, payment_method, customer_id,
    customer_name, customer_phone, address_line, landmark, delivery_zone_id, delivery_fee, pickup_at, notes,
    subtotal, discount_total, total, client_key, expires_at, placed_at, paid_at
  ) values (
    p_tenant_id, v_order_no, v_today, v_token, v_fulfillment, case when v_total = 0 then 'paid' else 'unpaid' end,
    v_method, v_customer_id, v_name, v_phone, v_address, v_landmark, v_zone_id, v_fee, v_pickup_at, v_notes,
    v_subtotal, v_discount, v_total, v_client_key,
    case when v_total > 0 and v_method in ('gcash', 'maya', 'bank')
      then v_now + make_interval(mins => v_settings.unpaid_expiry_minutes) end,
    v_now,
    case when v_total = 0 then v_now end
  )
  returning id into v_order_id;

  insert into public.order_items (
    tenant_id, order_id, item_id, variant_id, item_name, variant_name, unit_price, options, options_total, qty,
    line_total, note, sort, is_reward
  )
  select
    p_tenant_id, v_order_id, (l ->> 'itemId')::uuid, (l ->> 'variantId')::uuid, l ->> 'itemName', l ->> 'variantName',
    (l ->> 'unitPrice')::integer, l -> 'options', (l ->> 'optionsTotal')::integer, (l ->> 'qty')::integer,
    (l ->> 'lineTotal')::integer, l ->> 'note', (l ->> 'lineIndex')::integer,
    coalesce((l ->> 'isReward')::boolean, false)
  from jsonb_array_elements(v_priced) as l;

  update public.item_variants v
  set stock_on_hand = v.stock_on_hand - u.value::integer
  from jsonb_each_text(v_used) as u
  where v.id = u.key::uuid and v.tenant_id = p_tenant_id and v.stock_on_hand is not null;

  insert into public.order_events (tenant_id, order_id, kind, from_status, to_status, actor)
  values (p_tenant_id, v_order_id, 'status', null, 'placed', 'customer');
  if v_total = 0 then
    insert into public.order_events (tenant_id, order_id, kind, actor)
    values (p_tenant_id, v_order_id, 'payment_confirmed', 'system');
  end if;

  if v_customer_id is not null then
    insert into public.consents (tenant_id, customer_id, channel, granted, source)
    values (p_tenant_id, v_customer_id, 'privacy', true, 'checkout');
  end if;

  if v_use_reward then
    insert into public.loyalty_ledger (tenant_id, customer_id, order_id, delta, reason)
    values (p_tenant_id, v_member_id, v_order_id, -v_rule.stamps_needed, 'redeemed');
  end if;

  return jsonb_build_object('orderId', v_order_id, 'orderNo', v_order_no, 'token', v_token);
end;
$$;

-- 8. New RPCs: claim_reward and settle_reward_claim
create or replace function public.claim_reward(p_slug text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_tenant public.tenants;
  v_member_id uuid;
  v_rule public.loyalty_rules;
  v_balance integer;
  v_code text;
  v_claim_id uuid;
begin
  select * into v_tenant from public.tenants where slug = p_slug and status = 'active';
  if not found then
    raise exception 'shop_not_found';
  end if;

  v_member_id := private.member_customer_id(v_tenant.id);
  if v_member_id is null then
    raise exception 'not_signed_in';
  end if;

  perform 1 from public.customers where id = v_member_id for update;

  select * into v_rule from public.loyalty_rules where tenant_id = v_tenant.id and is_active = true;
  if not found or v_rule.reward_kind <> 'custom' then
    raise exception 'reward_unavailable';
  end if;

  if exists (
    select 1 from public.reward_claims
    where tenant_id = v_tenant.id and customer_id = v_member_id and status = 'pending'
  ) then
    raise exception 'claim_already_pending';
  end if;

  select coalesce(sum(delta), 0) into v_balance from public.loyalty_ledger where customer_id = v_member_id;
  if v_balance < v_rule.stamps_needed then
    raise exception 'reward_unavailable';
  end if;

  -- Generate 6-char unique code per shop
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.reward_claims where tenant_id = v_tenant.id and code = v_code);
  end loop;

  insert into public.reward_claims (tenant_id, customer_id, code, status, created_at)
  values (v_tenant.id, v_member_id, v_code, 'pending', now())
  returning id into v_claim_id;

  insert into public.loyalty_ledger (tenant_id, customer_id, claim_id, delta, reason)
  values (v_tenant.id, v_member_id, v_claim_id, -v_rule.stamps_needed, 'redeemed');

  return jsonb_build_object('claimId', v_claim_id, 'code', v_code);
end;
$$;

revoke all on function public.claim_reward(text) from public;
grant execute on function public.claim_reward(text) to authenticated;

create or replace function public.settle_reward_claim(p_claim_id uuid, p_given boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_claim public.reward_claims;
  v_stamps integer;
begin
  select * into v_claim from public.reward_claims where id = p_claim_id for update;
  if not found then
    raise exception 'not_found';
  end if;

  if not private.is_active_shop_owner(v_claim.tenant_id) then
    raise exception 'not_allowed';
  end if;

  if v_claim.status <> 'pending' then
    raise exception 'invalid_transition';
  end if;

  if p_given then
    update public.reward_claims
    set status = 'given', given_at = now()
    where id = p_claim_id;
  else
    update public.reward_claims
    set status = 'cancelled', cancelled_at = now()
    where id = p_claim_id;

    select abs(delta) into v_stamps
    from public.loyalty_ledger
    where claim_id = p_claim_id and reason = 'redeemed';

    insert into public.loyalty_ledger (tenant_id, customer_id, claim_id, delta, reason)
    values (v_claim.tenant_id, v_claim.customer_id, p_claim_id, coalesce(v_stamps, 0), 'reversed');
  end if;

  return jsonb_build_object('claimId', p_claim_id, 'status', case when p_given then 'given' else 'cancelled' end);
end;
$$;

revoke all on function public.settle_reward_claim(uuid, boolean) from public;
grant execute on function public.settle_reward_claim(uuid, boolean) to authenticated;
