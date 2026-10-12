-- P5.3: customers, orders, payments and the order engine (system paper 6.2 to 6.4, 6.6, 6.8, 6.9, 7.1, 7.3, 7.4, 10;
-- docs/api-surface.md slice 3). quote_order and place_order share one engine (private.build_order); every amount and
-- every stock change happens here. Guests upload a payment proof through the receipt link and watch it update live.
-- Order inside the file: tables → indexes → RLS, grants and policies → functions → function grants → storage →
-- live updates.

-- ---------------------------------------------------------------------------
-- 1. Tables (decision P5-1: composite foreign keys keep every row under a parent of the same shop)
-- ---------------------------------------------------------------------------

-- Zones were created without unique (id, tenant_id); orders point at them with a composite key like every other child.
alter table public.delivery_zones add constraint delivery_zones_id_tenant_key unique (id, tenant_id);

-- One person per shop, found by phone. A member is a row with user_id (one per login per shop); a guest has none.
-- Stats (order_count, total_spent, last_order_at) are kept by the owner's order actions (P5.4).
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  user_id uuid references auth.users on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  phone text not null check (phone ~ '^\+639\d{9}$'),
  email text check (char_length(email) between 3 and 254),
  member_since timestamptz,
  order_count integer not null default 0 check (order_count >= 0),
  total_spent bigint not null default 0 check (total_spent >= 0),
  last_order_at timestamptz,
  notes text check (char_length(notes) <= 500),
  tags text[] not null default '{}' check (cardinality(tags) <= 20 and array_position(tags, '') is null),
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  constraint customers_tenant_phone unique (tenant_id, phone)
);
create unique index customers_tenant_user_idx on public.customers (tenant_id, user_id) where user_id is not null;

-- Append-only: a new row for every grant or withdrawal.
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  customer_id uuid not null,
  channel text not null check (channel in ('privacy', 'sms', 'email', 'push')),
  granted boolean not null,
  source text not null check (char_length(source) between 1 and 40),
  created_at timestamptz not null default now(),
  foreign key (customer_id, tenant_id) references public.customers (id, tenant_id) on delete cascade
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  -- Gap-free per shop per Manila business date (order_counters).
  order_no integer not null check (order_no > 0),
  business_date date not null,
  -- The receipt link's secret: 16 random bytes, base64url.
  token text not null unique check (char_length(token) between 16 and 64),
  fulfillment text not null check (fulfillment in ('walk_in', 'pickup', 'delivery')),
  status text not null default 'placed'
    check (status in ('placed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'expired')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid')),
  payment_method text not null check (payment_method in ('cash', 'cod', 'gcash', 'maya', 'bank')),
  customer_id uuid,
  customer_name text not null check (char_length(btrim(customer_name)) between 1 and 80),
  customer_phone text not null check (customer_phone ~ '^\+639\d{9}$'),
  address_line text check (char_length(btrim(address_line)) between 1 and 200),
  landmark text check (char_length(landmark) <= 200),
  delivery_zone_id uuid,
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  pickup_at timestamptz,
  notes text check (char_length(notes) <= 500),
  subtotal integer not null check (subtotal >= 0),
  discount_total integer not null default 0 check (discount_total >= 0),
  total integer not null check (total >= 0),
  tracking_url text check (tracking_url like 'https://%'),
  cancel_reason text check (char_length(cancel_reason) <= 200),
  client_key uuid not null,
  -- When an unpaid transfer order expires; null for cash and COD, and once a proof is in.
  expires_at timestamptz,
  placed_at timestamptz not null default now(),
  paid_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  unique (id, tenant_id),
  constraint orders_tenant_day_no unique (tenant_id, business_date, order_no),
  constraint orders_tenant_client_key unique (tenant_id, client_key),
  constraint orders_total check (total = subtotal - discount_total + delivery_fee),
  constraint orders_discount check (discount_total <= subtotal),
  constraint orders_delivery_address check ((fulfillment = 'delivery') = (address_line is not null)),
  constraint orders_pickup_at check (fulfillment = 'pickup' or pickup_at is null),
  constraint orders_cod check (payment_method <> 'cod' or fulfillment = 'delivery'),
  foreign key (customer_id, tenant_id) references public.customers (id, tenant_id) on delete set null (customer_id),
  foreign key (delivery_zone_id, tenant_id) references public.delivery_zones (id, tenant_id) on delete set null (delivery_zone_id)
);

-- Names and prices are snapshots, so changing the catalog never changes an old receipt (paper 7.3).
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  order_id uuid not null,
  item_id uuid,
  variant_id uuid,
  item_name text not null check (char_length(item_name) between 1 and 80),
  variant_name text not null check (char_length(variant_name) between 1 and 60),
  unit_price integer not null check (unit_price >= 0),
  -- The chosen add-ons: [{ optionId, name, priceDelta }] in the order the customer picked them.
  options jsonb not null default '[]' check (jsonb_typeof(options) = 'array'),
  options_total integer not null default 0 check (options_total >= 0),
  qty integer not null check (qty between 1 and 99),
  line_total integer not null,
  note text check (char_length(note) <= 200),
  sort integer not null default 0,
  constraint order_items_line_total check (line_total = (unit_price + options_total) * qty),
  foreign key (order_id, tenant_id) references public.orders (id, tenant_id) on delete cascade,
  foreign key (item_id, tenant_id) references public.items (id, tenant_id) on delete set null (item_id),
  foreign key (variant_id, tenant_id) references public.item_variants (id, tenant_id) on delete set null (variant_id)
);

-- The order's timeline (decision P5-4): status steps and payment steps, each with who did it.
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  order_id uuid not null,
  kind text not null check (kind in ('status', 'payment_submitted', 'payment_confirmed', 'payment_rejected')),
  from_status text check (from_status in ('placed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'expired')),
  to_status text check (to_status in ('placed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'expired')),
  actor text not null check (actor in ('customer', 'owner', 'system')),
  note text check (char_length(note) <= 200),
  -- The clock, not the transaction start, so two steps in one transaction still sort in the order they happened.
  created_at timestamptz not null default clock_timestamp(),
  constraint order_events_status_shape check (
    (kind = 'status' and to_status is not null) or (kind <> 'status' and from_status is null and to_status is null)
  ),
  foreign key (order_id, tenant_id) references public.orders (id, tenant_id) on delete cascade
);

-- The last order number per shop per business date. No client access at all.
create table public.order_counters (
  tenant_id uuid not null references public.tenants on delete cascade,
  business_date date not null,
  last_no integer not null check (last_no > 0),
  primary key (tenant_id, business_date)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  order_id uuid not null,
  method text not null check (method in ('cash', 'cod', 'gcash', 'maya', 'bank')),
  amount integer not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  reference_no text check (char_length(reference_no) between 4 and 40),
  -- Upper case without spaces or dashes; a reference is usable once per shop (paper 6.4).
  reference_norm text check (char_length(reference_norm) between 1 and 40),
  proof_path text check (proof_path like tenant_id::text || '/%'),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users on delete set null,
  reject_reason text check (char_length(reject_reason) <= 200),
  created_at timestamptz not null default now(),
  foreign key (order_id, tenant_id) references public.orders (id, tenant_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- 2. Indexes (every foreign key, the board, the throttle and the reference check)
-- ---------------------------------------------------------------------------

create index customers_user_id_idx on public.customers (user_id);
create index consents_tenant_id_idx on public.consents (tenant_id);
create index consents_customer_idx on public.consents (customer_id, tenant_id);
create index orders_tenant_placed_idx on public.orders (tenant_id, placed_at desc);
create index orders_tenant_phone_idx on public.orders (tenant_id, customer_phone, placed_at desc);
create index orders_customer_idx on public.orders (customer_id, tenant_id);
create index orders_zone_idx on public.orders (delivery_zone_id, tenant_id);
create index order_items_tenant_id_idx on public.order_items (tenant_id);
create index order_items_order_idx on public.order_items (order_id, tenant_id, sort);
create index order_items_item_idx on public.order_items (item_id, tenant_id);
create index order_items_variant_idx on public.order_items (variant_id, tenant_id);
create index order_events_tenant_id_idx on public.order_events (tenant_id);
create index order_events_order_idx on public.order_events (order_id, tenant_id, created_at);
create index payments_tenant_id_idx on public.payments (tenant_id);
create index payments_order_idx on public.payments (order_id, tenant_id);
create index payments_reviewed_by_idx on public.payments (reviewed_by);
create unique index payments_tenant_reference_idx on public.payments (tenant_id, reference_norm) where status <> 'rejected';

-- ---------------------------------------------------------------------------
-- 3. RLS, grants and policies: owners read their shop; every write goes through the functions below
-- ---------------------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.consents enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.order_counters enable row level security;
alter table public.payments enable row level security;

revoke all on
  public.customers, public.consents, public.orders, public.order_items, public.order_events, public.order_counters,
  public.payments
from anon, authenticated;

grant select on public.customers, public.consents, public.orders, public.order_items, public.order_events, public.payments
to authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['customers', 'consents', 'orders', 'order_items', 'order_events', 'payments'] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.is_shop_member(tenant_id))',
      v_table || '_select_member', v_table
    );
  end loop;
end;
$$;

-- The owner's own notes and tags on a customer (paper 4.4).
grant update (notes, tags) on public.customers to authenticated;
create policy customers_update_active_owner on public.customers
  for update to authenticated
  using (private.is_active_shop_owner(tenant_id))
  with check (private.is_active_shop_owner(tenant_id));

-- ---------------------------------------------------------------------------
-- 4. Functions (system paper 7.4; contracts in packages/core/src/contracts/db-functions.ts)
-- ---------------------------------------------------------------------------

-- Owners archive a product that has orders instead of deleting it (paper 7.3). A whole shop being deleted is not
-- blocked: its tenant row is already gone when the cascade reaches the items.
create function private.block_item_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.order_items oi where oi.item_id = old.id and oi.tenant_id = old.tenant_id)
    and exists (select 1 from public.tenants t where t.id = old.tenant_id) then
    raise exception 'item_has_orders';
  end if;
  return old;
end;
$$;

create trigger items_block_delete_with_orders
  before delete on public.items
  for each row execute function private.block_item_delete();

-- The Order shape (packages/core Order), camelCase.
create function private.order_json(p_order public.orders)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_order.id,
    'tenantId', p_order.tenant_id,
    'orderNo', p_order.order_no,
    'businessDate', p_order.business_date,
    'token', p_order.token,
    'fulfillment', p_order.fulfillment,
    'status', p_order.status,
    'paymentStatus', p_order.payment_status,
    'paymentMethod', p_order.payment_method,
    'customerId', p_order.customer_id,
    'customerName', p_order.customer_name,
    'customerPhone', p_order.customer_phone,
    'addressLine', p_order.address_line,
    'landmark', p_order.landmark,
    'deliveryZoneId', p_order.delivery_zone_id,
    'deliveryFee', p_order.delivery_fee,
    'pickupAt', p_order.pickup_at,
    'notes', p_order.notes,
    'subtotal', p_order.subtotal,
    'discountTotal', p_order.discount_total,
    'total', p_order.total,
    'trackingUrl', p_order.tracking_url,
    'cancelReason', p_order.cancel_reason,
    'clientKey', p_order.client_key,
    'expiresAt', p_order.expires_at,
    'placedAt', p_order.placed_at,
    'paidAt', p_order.paid_at,
    'readyAt', p_order.ready_at,
    'completedAt', p_order.completed_at,
    'cancelledAt', p_order.cancelled_at
  );
$$;

-- The Payment shape (packages/core Payment). Customers never get the normalised reference back.
create function private.payment_json(p_payment public.payments, p_with_norm boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_payment.id,
    'tenantId', p_payment.tenant_id,
    'orderId', p_payment.order_id,
    'method', p_payment.method,
    'amount', p_payment.amount,
    'status', p_payment.status,
    'referenceNo', p_payment.reference_no,
    'referenceNorm', case when p_with_norm then p_payment.reference_norm end,
    'proofPath', p_payment.proof_path,
    'reviewedAt', p_payment.reviewed_at,
    'rejectReason', p_payment.reject_reason,
    'createdAt', p_payment.created_at
  );
$$;

-- One engine for quote_order (p_quote true: no locks, no writes) and place_order (p_quote false). The payload is
-- OrderPayload's camelCase shape; extra keys (a price on a line, say) are ignored, because every amount comes from
-- the catalog. Shop-level problems raise; line problems are collected in quote mode and raised (first one) when
-- placing. It all runs in the caller's transaction, so a raise after the counter moved leaves no gap.
create function private.build_order(p_tenant_id uuid, p_payload jsonb, p_quote boolean)
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

  -- 2. Settings: placing locks the shop's row, so placements in one shop run one at a time (numbers, stock).
  if p_quote then
    select * into v_settings from public.shop_settings s where s.tenant_id = p_tenant_id;
  else
    select * into v_settings from public.shop_settings s where s.tenant_id = p_tenant_id for update;
  end if;
  if not found then
    raise exception 'shop_not_found';
  end if;

  if not p_quote then
    -- A retry that waited on the lock behind its own first try gets that order.
    select jsonb_build_object('orderId', o.id, 'orderNo', o.order_no, 'token', o.token) into v_existing
    from public.orders o
    where o.tenant_id = p_tenant_id and o.client_key = v_client_key;
    if v_existing is not null then
      return v_existing;
    end if;

    -- 3. Throttle (decision P5-6: limits in the database until Turnstile).
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

  -- 5. Payment rules.
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

  -- 6. Lines. Placing locks every variant once, in id order, so two checkouts never deadlock.
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
      'note', nullif(btrim(v_line ->> 'note'), '')
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

  -- 8. Rewards arrive with members (P5.5).
  if v_use_reward then
    raise exception 'reward_unavailable';
  end if;

  v_total := v_subtotal + v_fee;
  if p_quote then
    return jsonb_build_object(
      'lines', v_priced,
      'subtotal', v_subtotal,
      'discountTotal', 0,
      'deliveryFee', v_fee,
      'total', v_total,
      'rewardApplied', false,
      'problems', v_problems
    );
  end if;

  -- 9. Place. The customer row is found by phone: a guest row is reused as it is; a member's row (a login) is
  -- not linked from a guest checkout, since a phone number proves nothing (P5.5 adds the signed-in path).
  select * into v_customer from public.customers c where c.tenant_id = p_tenant_id and c.phone = v_phone;
  if not found then
    insert into public.customers (tenant_id, name, phone, email)
    values (p_tenant_id, v_name, v_phone, v_email)
    returning id into v_customer_id;
  elsif v_customer.user_id is null then
    v_customer_id := v_customer.id;
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
    v_subtotal, 0, v_total, v_client_key,
    -- Only transfer orders expire unpaid; cash and COD never expire on their own.
    case when v_total > 0 and v_method in ('gcash', 'maya', 'bank')
      then v_now + make_interval(mins => v_settings.unpaid_expiry_minutes) end,
    v_now,
    case when v_total = 0 then v_now end
  )
  returning id into v_order_id;

  insert into public.order_items (
    tenant_id, order_id, item_id, variant_id, item_name, variant_name, unit_price, options, options_total, qty,
    line_total, note, sort
  )
  select
    p_tenant_id, v_order_id, (l ->> 'itemId')::uuid, (l ->> 'variantId')::uuid, l ->> 'itemName', l ->> 'variantName',
    (l ->> 'unitPrice')::integer, l -> 'options', (l ->> 'optionsTotal')::integer, (l ->> 'qty')::integer,
    (l ->> 'lineTotal')::integer, l ->> 'note', (l ->> 'lineIndex')::integer
  from jsonb_array_elements(v_priced) as l;

  -- The sold-out switch stays as the owner set it; the storefront reads stock 0 as sold out.
  update public.item_variants v
  set stock_on_hand = v.stock_on_hand - u.value::integer
  from jsonb_each_text(v_used) as u
  where v.id = u.key::uuid and v.tenant_id = p_tenant_id;

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

  return jsonb_build_object('orderId', v_order_id, 'orderNo', v_order_no, 'token', v_token);
end;
$$;

-- Anyone: the order priced from the database, with every line problem listed. Writes nothing and takes no locks.
-- Errors: shop_not_found, invalid and the shop-level codes of build_order.
create function public.quote_order(p_slug text, p_payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
begin
  select t.id into v_tenant_id from public.tenants t where t.slug = p_slug and t.status = 'active';
  if not found then
    raise exception 'shop_not_found';
  end if;
  return private.build_order(v_tenant_id, p_payload, true);
end;
$$;

-- Anyone: places the order once. The same clientKey in the same shop returns the first order (no throttle, no
-- stock); two calls at once lose on the unique index and get the first order too. Returns { orderId, orderNo, token }.
create function public.place_order(p_slug text, p_payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_client_key uuid;
  v_result jsonb;
  v_constraint text;
begin
  select t.id into v_tenant_id from public.tenants t where t.slug = p_slug and t.status = 'active';
  if not found then
    raise exception 'shop_not_found';
  end if;

  begin
    v_client_key := (p_payload ->> 'clientKey')::uuid;
  exception when data_exception then
    raise exception 'invalid';
  end;
  if v_client_key is null then
    raise exception 'invalid';
  end if;

  select jsonb_build_object('orderId', o.id, 'orderNo', o.order_no, 'token', o.token) into v_result
  from public.orders o
  where o.tenant_id = v_tenant_id and o.client_key = v_client_key;
  if v_result is not null then
    return v_result;
  end if;

  begin
    v_result := private.build_order(v_tenant_id, p_payload, false);
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint is distinct from 'orders_tenant_client_key' then
      raise;
    end if;
    select jsonb_build_object('orderId', o.id, 'orderNo', o.order_no, 'token', o.token) into v_result
    from public.orders o
    where o.tenant_id = v_tenant_id and o.client_key = v_client_key;
    if v_result is null then
      raise exception 'invalid';
    end if;
  end;
  return v_result;
end;
$$;

-- The storage policy's check: the order waits for a payment in an active shop, and its folder holds fewer than
-- 10 files (each upload is at most 1 MB).
create function private.order_accepts_proof(p_tenant uuid, p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    join public.tenants t on t.id = o.tenant_id
    where o.tenant_id = p_tenant
      and o.token = p_token
      and o.status = 'placed'
      and o.payment_status = 'unpaid'
      and t.status = 'active'
  )
  and (
    select count(*)
    from storage.objects s
    where s.bucket_id = 'payment-proofs' and s.name like p_tenant::text || '/' || p_token || '/%'
  ) < 10;
$$;

-- Anyone with the receipt link: records a transfer proof and its reference number, then the order waits for the
-- owner's check (P5.4). Returns the Payment. Errors: order_not_payable, payment_unavailable, invalid,
-- duplicate_reference, proof_missing, too_many_proofs.
create function public.submit_payment_proof(p_token text, p_method text, p_reference_no text, p_proof_path text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_reference text := btrim(p_reference_no);
  v_norm text;
  v_prefix text;
  v_payment public.payments;
begin
  select o.* into v_order
  from public.orders o
  join public.tenants t on t.id = o.tenant_id and t.status = 'active'
  where o.token = p_token
  for update of o;
  if not found or v_order.status <> 'placed' or v_order.payment_status <> 'unpaid' then
    raise exception 'order_not_payable';
  end if;

  if p_method is null or p_method not in ('gcash', 'maya', 'bank') then
    raise exception 'invalid';
  end if;
  if not exists (
    select 1 from public.payment_accounts a where a.tenant_id = v_order.tenant_id and a.method = p_method and a.is_active
  ) then
    raise exception 'payment_unavailable';
  end if;

  v_norm := upper(regexp_replace(v_reference, '[\s-]+', '', 'g'));
  if v_reference is null or char_length(v_reference) not between 4 and 40 or v_norm = '' then
    raise exception 'invalid';
  end if;

  v_prefix := v_order.tenant_id::text || '/' || v_order.token || '/';
  if p_proof_path is null
    or left(p_proof_path, char_length(v_prefix)) <> v_prefix
    or substr(p_proof_path, char_length(v_prefix) + 1)
      !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$' then
    raise exception 'invalid';
  end if;
  if not exists (select 1 from storage.objects s where s.bucket_id = 'payment-proofs' and s.name = p_proof_path) then
    raise exception 'proof_missing';
  end if;

  if (select count(*) from public.payments p where p.order_id = v_order.id and p.proof_path is not null) >= 3 then
    raise exception 'too_many_proofs';
  end if;
  if exists (
    select 1 from public.payments p
    where p.tenant_id = v_order.tenant_id and p.reference_norm = v_norm and p.status <> 'rejected'
  ) then
    raise exception 'duplicate_reference';
  end if;

  begin
    insert into public.payments (tenant_id, order_id, method, amount, status, reference_no, reference_norm, proof_path)
    values (v_order.tenant_id, v_order.id, p_method, v_order.total, 'pending', v_reference, v_norm, p_proof_path)
    returning * into v_payment;
  exception when unique_violation then
    raise exception 'duplicate_reference';
  end;

  update public.orders o
  set payment_status = 'pending', payment_method = p_method, expires_at = null
  where o.id = v_order.id;

  insert into public.order_events (tenant_id, order_id, kind, actor)
  values (v_order.tenant_id, v_order.id, 'payment_submitted', 'customer');

  return private.payment_json(v_payment, false);
end;
$$;

-- Anyone with the receipt link: the OrderReceipt (order, lines, events oldest first, payments without the
-- normalised reference). Errors: not_found.
create function public.get_order(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders o where o.token = p_token;
  if not found then
    raise exception 'not_found';
  end if;

  return jsonb_build_object(
    'order', private.order_json(v_order),
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'tenantId', l.tenant_id,
        'orderId', l.order_id,
        'itemId', l.item_id,
        'variantId', l.variant_id,
        'itemName', l.item_name,
        'variantName', l.variant_name,
        'unitPrice', l.unit_price,
        'options', l.options,
        'optionsTotal', l.options_total,
        'qty', l.qty,
        'lineTotal', l.line_total,
        'note', l.note
      ) order by l.sort, l.id)
      from public.order_items l
      where l.order_id = v_order.id and l.tenant_id = v_order.tenant_id
    ), '[]'),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'orderId', e.order_id,
        'kind', e.kind,
        'fromStatus', e.from_status,
        'toStatus', e.to_status,
        'actor', e.actor,
        'note', e.note,
        'createdAt', e.created_at
      ) order by e.created_at, e.id)
      from public.order_events e
      where e.order_id = v_order.id and e.tenant_id = v_order.tenant_id
    ), '[]'),
    'payments', coalesce((
      select jsonb_agg(private.payment_json(p, false) order by p.created_at, p.id)
      from public.payments p
      where p.order_id = v_order.id and p.tenant_id = v_order.tenant_id
    ), '[]')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Function grants
-- ---------------------------------------------------------------------------

revoke execute on function private.block_item_delete() from public, anon, authenticated;
revoke execute on function private.order_json(public.orders) from public, anon, authenticated;
revoke execute on function private.payment_json(public.payments, boolean) from public, anon, authenticated;
revoke execute on function private.build_order(uuid, jsonb, boolean) from public, anon, authenticated;
revoke execute on function private.order_accepts_proof(uuid, text) from public, anon, authenticated;
revoke execute on function public.quote_order(text, jsonb) from public;
revoke execute on function public.place_order(text, jsonb) from public;
revoke execute on function public.submit_payment_proof(text, text, text, text) from public;
revoke execute on function public.get_order(text) from public;

grant execute on function public.quote_order(text, jsonb) to anon, authenticated;
grant execute on function public.place_order(text, jsonb) to anon, authenticated;
grant execute on function public.submit_payment_proof(text, text, text, text) to anon, authenticated;
grant execute on function public.get_order(text) to anon, authenticated;

-- The proof upload policy runs as the visitor, so anon needs these two helpers (and nothing else in private).
grant usage on schema private to anon;
grant execute on function private.order_accepts_proof(uuid, text) to anon, authenticated;
grant execute on function private.try_uuid(text) to anon;

-- ---------------------------------------------------------------------------
-- 6. Storage: payment proofs (decision P5-3)
-- ---------------------------------------------------------------------------

-- <tenant_id>/<token>/<uuid>.webp: only someone holding the receipt link uploads, and only while the order waits
-- for payment. Owners read through signed URLs. No update or delete for clients.
create policy payment_proofs_insert_with_link on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'payment-proofs'
    and array_length(storage.foldername(name), 1) = 2
    and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'
    and private.order_accepts_proof(private.try_uuid((storage.foldername(name))[1]), (storage.foldername(name))[2])
  );

create policy payment_proofs_select_member on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and private.is_shop_member(private.try_uuid((storage.foldername(name))[1]))
  );

-- ---------------------------------------------------------------------------
-- 7. Live updates (decision P5-7): Realtime Broadcast from a trigger
-- ---------------------------------------------------------------------------

-- order:<token> is public (the token is the secret) for the receipt; shop:<tenant_id> is private for the dashboard.
create function private.broadcast_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status = old.status and new.payment_status = old.payment_status then
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

revoke execute on function private.broadcast_order() from public, anon, authenticated;

create trigger orders_broadcast
  after insert or update of status, payment_status on public.orders
  for each row execute function private.broadcast_order();

-- Only the shop's owners may join its private channel.
create policy shop_topic_select_member on realtime.messages
  for select to authenticated
  using (
    realtime.topic() like 'shop:%'
    and private.is_shop_member(private.try_uuid(split_part(realtime.topic(), ':', 2)))
  );
