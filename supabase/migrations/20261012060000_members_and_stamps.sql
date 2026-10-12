-- P5.5: members, stamps and rewards (system paper 4.1, 6.7, 7.3, 7.4, 10; docs/api-surface.md slice 5). A customer
-- signed in with an email code joins a shop; earlier guest orders come along only with proof (decision P5-10);
-- completed orders earn stamps, the reward is applied by the order engine, and every stamp movement is a row in an
-- append-only ledger. Order inside the file: tables → indexes → RLS, grants and policies → functions → replaced
-- functions → function grants.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- The stamp card, one per shop (paper 7.3). Every shop gets one, off until the owner turns it on.
create table public.loyalty_rules (
  tenant_id uuid primary key references public.tenants on delete cascade,
  is_active boolean not null default false,
  min_order_total integer not null default 0 check (min_order_total >= 0),
  stamps_needed integer not null default 10 check (stamps_needed between 1 and 50),
  reward_label text not null default '₱100 off your order' check (char_length(btrim(reward_label)) between 1 and 80),
  reward_amount integer not null default 10000 check (reward_amount >= 0),
  updated_at timestamptz not null default now()
);

-- Every stamp movement (paper 7.3). The balance is the sum of delta. Rows are never changed or removed by hand: an
-- order earns or redeems once, a member gets the welcome stamp once per shop (decision P5-16).
create table public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  customer_id uuid not null,
  order_id uuid,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('earned', 'redeemed', 'reversed', 'manual', 'welcome')),
  -- The clock, not the transaction start, so a redemption and its reversal keep their order.
  created_at timestamptz not null default clock_timestamp(),
  constraint loyalty_ledger_order_shape check (reason not in ('earned', 'redeemed', 'reversed') or order_id is not null),
  foreign key (customer_id, tenant_id) references public.customers (id, tenant_id) on delete cascade,
  foreign key (order_id, tenant_id) references public.orders (id, tenant_id) on delete cascade
);

-- A member's saved addresses (paper 7.3): at most 5, one default.
create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  customer_id uuid not null,
  label text not null default 'Home' check (char_length(btrim(label)) between 1 and 40),
  address_line text not null check (char_length(btrim(address_line)) between 1 and 200),
  landmark text check (char_length(landmark) <= 200),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (customer_id, tenant_id) references public.customers (id, tenant_id) on delete cascade
);

-- Every shop has a stamp card row: the ones already here, and every new one (create_my_shop and the demo tools both
-- insert tenants, so one trigger covers both).
insert into public.loyalty_rules (tenant_id) select t.id from public.tenants t on conflict do nothing;

create function private.add_loyalty_rule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.loyalty_rules (tenant_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger tenants_add_loyalty_rule
  after insert on public.tenants
  for each row execute function private.add_loyalty_rule();

-- Append-only: no update, ever (a correction is a new `manual` row).
create function private.block_ledger_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'invalid';
end;
$$;

create trigger loyalty_ledger_no_update
  before update on public.loyalty_ledger
  for each row execute function private.block_ledger_update();

-- At most 5 addresses per member; a new default clears the old one; the first address is the default.
create function private.check_customer_address()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform 1 from public.customers c where c.id = new.customer_id for update;
    if (select count(*) from public.customer_addresses a where a.customer_id = new.customer_id) >= 5 then
      raise exception 'invalid';
    end if;
    if not exists (select 1 from public.customer_addresses a where a.customer_id = new.customer_id) then
      new.is_default := true;
    end if;
  end if;
  if new.is_default then
    update public.customer_addresses a
    set is_default = false
    where a.customer_id = new.customer_id and a.id <> new.id and a.is_default;
  end if;
  return new;
end;
$$;

create trigger customer_addresses_check
  before insert or update on public.customer_addresses
  for each row execute function private.check_customer_address();

-- Stamps per customer (owners: their shop; members: their own row). Runs as the caller, so RLS applies.
create view public.customer_stamp_balances
with (security_invoker = true)
as
  select l.customer_id, l.tenant_id, sum(l.delta)::integer as stamps
  from public.loyalty_ledger l
  group by l.customer_id, l.tenant_id;

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------

create index loyalty_ledger_tenant_id_idx on public.loyalty_ledger (tenant_id);
create index loyalty_ledger_customer_idx on public.loyalty_ledger (customer_id, tenant_id, created_at);
create index loyalty_ledger_order_idx on public.loyalty_ledger (order_id, tenant_id);
create unique index loyalty_ledger_order_reason_idx on public.loyalty_ledger (order_id, reason) where order_id is not null;
create unique index loyalty_ledger_welcome_idx on public.loyalty_ledger (customer_id) where reason = 'welcome';
create index customer_addresses_tenant_id_idx on public.customer_addresses (tenant_id);
create index customer_addresses_customer_idx on public.customer_addresses (customer_id, tenant_id);
create unique index customer_addresses_default_idx on public.customer_addresses (customer_id) where is_default;

-- ---------------------------------------------------------------------------
-- 3. RLS, grants and policies
-- ---------------------------------------------------------------------------

alter table public.loyalty_rules enable row level security;
alter table public.loyalty_ledger enable row level security;
alter table public.customer_addresses enable row level security;

revoke all on public.loyalty_rules, public.loyalty_ledger, public.customer_addresses from anon, authenticated;
revoke all on public.customer_stamp_balances from anon, authenticated;

-- Stamp card: the shop's people read it, the owner of an active shop changes it ("save_stamp_rule" is this update).
grant select on public.loyalty_rules to authenticated;
grant update (is_active, min_order_total, stamps_needed, reward_label, reward_amount) on public.loyalty_rules to authenticated;
create policy loyalty_rules_select_member on public.loyalty_rules
  for select to authenticated using (private.is_shop_member(tenant_id));
create policy loyalty_rules_update_active_owner on public.loyalty_rules
  for update to authenticated
  using (private.is_active_shop_owner(tenant_id))
  with check (private.is_active_shop_owner(tenant_id));

-- The caller's own customer rows (one per shop they joined). Members do not read the customers table itself, since it
-- holds the owner's notes and tags (decision P5-31); their policies ask this instead.
create function private.my_customer_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id from public.customers c where c.user_id = (select auth.uid());
$$;

grant execute on function private.my_customer_ids() to authenticated;

-- Ledger: read only; every row comes from the functions below.
grant select on public.loyalty_ledger to authenticated;
create policy loyalty_ledger_select_member on public.loyalty_ledger
  for select to authenticated using (private.is_shop_member(tenant_id));
create policy loyalty_ledger_select_own on public.loyalty_ledger
  for select to authenticated
  using (customer_id in (select private.my_customer_ids()));

-- Addresses: members manage their own; the shop's people read them.
grant select, delete on public.customer_addresses to authenticated;
grant insert (tenant_id, customer_id, label, address_line, landmark, is_default) on public.customer_addresses to authenticated;
grant update (label, address_line, landmark, is_default) on public.customer_addresses to authenticated;
create policy customer_addresses_select_member on public.customer_addresses
  for select to authenticated using (private.is_shop_member(tenant_id));
create policy customer_addresses_select_own on public.customer_addresses
  for select to authenticated
  using (customer_id in (select private.my_customer_ids()));
create policy customer_addresses_insert_own on public.customer_addresses
  for insert to authenticated
  with check (customer_id in (select private.my_customer_ids()));
create policy customer_addresses_update_own on public.customer_addresses
  for update to authenticated
  using (customer_id in (select private.my_customer_ids()))
  with check (customer_id in (select private.my_customer_ids()));
create policy customer_addresses_delete_own on public.customer_addresses
  for delete to authenticated
  using (customer_id in (select private.my_customer_ids()));

-- Balances follow the ledger's policies (security_invoker).
grant select on public.customer_stamp_balances to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Functions (system paper 7.4; contracts in packages/core/src/contracts/db-functions.ts)
-- ---------------------------------------------------------------------------

-- The caller's member row in this shop, or null (not signed in, or not a member here).
create function private.member_customer_id(p_tenant uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.customers c
  where c.tenant_id = p_tenant and c.user_id = (select auth.uid()) and c.member_since is not null;
$$;

-- The StampRule shape, camelCase.
create function private.stamp_rule_json(p_rule public.loyalty_rules)
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
    'rewardAmount', p_rule.reward_amount
  );
$$;

-- The MemberAccount shape: the member's own details (never the owner's notes or tags), stamps, the active stamp
-- card, whether the reward is ready, the latest 20 orders and stamp movements, and saved addresses.
create function private.member_account_json(p_customer_id uuid)
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

-- Signed-in customer: joins this shop as a member (paper 6.7) and returns the MemberAccount. Already a member here →
-- the same account, unchanged (not an error, whatever phone is sent). A guest row with this phone is linked only with
-- proof (decision P5-10): p_order_token is an order of this shop placed with this phone, or the row's email is the
-- login's verified email. Without proof → phone_needs_order; a phone that belongs to another login → phone_in_use; no
-- row with this phone → a new member row. The first time a row becomes a member and the stamp card is on, it gets 1
-- welcome stamp (decision P5-16). Errors: not_signed_in, shop_not_found, invalid, phone_needs_order, phone_in_use.
create function public.join_as_member(p_slug text, p_name text, p_phone text, p_order_token text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_tenant_id uuid;
  v_name text := btrim(p_name);
  v_email text;
  v_customer public.customers;
  v_customer_id uuid;
  v_was_member boolean := false;
begin
  if v_user is null then
    raise exception 'not_signed_in';
  end if;
  select t.id into v_tenant_id from public.tenants t where t.slug = p_slug and t.status = 'active';
  if not found then
    raise exception 'shop_not_found';
  end if;

  v_customer_id := private.member_customer_id(v_tenant_id);
  if v_customer_id is not null then
    return private.member_account_json(v_customer_id);
  end if;

  if v_name is null or char_length(v_name) not between 1 and 80 or p_phone is null or p_phone !~ '^\+639\d{9}$' then
    raise exception 'invalid';
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_user and u.email_confirmed_at is not null;

  select * into v_customer from public.customers c where c.tenant_id = v_tenant_id and c.phone = p_phone for update;
  if found then
    if v_customer.user_id is not null then
      raise exception 'phone_in_use';
    end if;
    if not (
      (p_order_token is not null and exists (
        select 1 from public.orders o
        where o.token = p_order_token and o.tenant_id = v_tenant_id and o.customer_phone = p_phone
      ))
      or coalesce(lower(v_customer.email) = v_email, false)
    ) then
      raise exception 'phone_needs_order';
    end if;
    v_was_member := v_customer.member_since is not null;
    update public.customers c
    set user_id = v_user, member_since = coalesce(c.member_since, now()), name = v_name, email = coalesce(v_email, c.email)
    where c.id = v_customer.id
    returning c.id into v_customer_id;
  else
    insert into public.customers (tenant_id, user_id, name, phone, email, member_since)
    values (v_tenant_id, v_user, v_name, p_phone, v_email, now())
    returning id into v_customer_id;
  end if;

  if not v_was_member and exists (select 1 from public.loyalty_rules r where r.tenant_id = v_tenant_id and r.is_active) then
    insert into public.loyalty_ledger (tenant_id, customer_id, delta, reason)
    values (v_tenant_id, v_customer_id, 1, 'welcome')
    on conflict (customer_id) where reason = 'welcome' do nothing;
  end if;

  insert into public.consents (tenant_id, customer_id, channel, granted, source)
  values (v_tenant_id, v_customer_id, 'privacy', true, 'join');

  return private.member_account_json(v_customer_id);
end;
$$;

-- Signed-in customer: their MemberAccount in this shop, or null when they are not a member here.
-- Errors: not_signed_in, shop_not_found.
create function public.get_my_account(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_customer_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not_signed_in';
  end if;
  select t.id into v_tenant_id from public.tenants t where t.slug = p_slug and t.status = 'active';
  if not found then
    raise exception 'shop_not_found';
  end if;
  v_customer_id := private.member_customer_id(v_tenant_id);
  if v_customer_id is null then
    return null;
  end if;
  return private.member_account_json(v_customer_id);
end;
$$;

-- Stamps an order redeemed come back once when it is cancelled or expires (decision P5-11).
create function private.return_order_stamps(p_order_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.loyalty_ledger (tenant_id, customer_id, order_id, delta, reason)
  select l.tenant_id, l.customer_id, l.order_id, -l.delta, 'reversed'
  from public.loyalty_ledger l
  where l.order_id = p_order_id and l.reason = 'redeemed'
  on conflict (order_id, reason) where order_id is not null do nothing;
$$;

-- ---------------------------------------------------------------------------
-- 5. Replaced functions
-- ---------------------------------------------------------------------------

-- get_storefront (P5.2) now shows the active stamp card and the real member count. Its body is unchanged, so it moves
-- to private.storefront_base and the public function adds the two member fields on top.
alter function public.get_storefront(text) rename to storefront_base;
alter function public.storefront_base(text) set schema private;

-- Anyone: the Storefront (contract in packages/core). stampRule is the active stamp card or null; memberCount counts
-- members (member_since set) and is null when the owner hides it. Errors: shop_not_found.
create function public.get_storefront(p_slug text)
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

-- Replaces P5.3's build_order (same signature) with rewards (paper 6.7): useReward needs a signed-in member of this
-- shop whose stamp card is on and who has at least stamps_needed stamps (reward_unavailable otherwise); the discount
-- is the reward amount, never more than the subtotal; placing writes the redeemed stamps to the ledger. A signed-in
-- member's order goes on their member row (the name and phone on the order still come from the payload).
--
-- One engine for quote_order (p_quote true: no locks, no writes) and place_order (p_quote false). The payload is
-- OrderPayload's camelCase shape; extra keys (a price on a line, say) are ignored, because every amount comes from
-- the catalog. Shop-level problems raise; line problems are collected in quote mode and raised (first one) when
-- placing. It all runs in the caller's transaction, so a raise after the counter moved leaves no gap.
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

  -- 8. Reward (paper 6.7). Placing locks the member's row, so one balance never pays for two orders.
  v_member_id := private.member_customer_id(p_tenant_id);
  if v_use_reward then
    if v_member_id is null then
      raise exception 'reward_unavailable';
    end if;
    if not p_quote then
      perform 1 from public.customers c where c.id = v_member_id for update;
    end if;
    select * into v_rule from public.loyalty_rules r where r.tenant_id = p_tenant_id and r.is_active;
    if not found or (
      select coalesce(sum(l.delta), 0) from public.loyalty_ledger l where l.customer_id = v_member_id
    ) < v_rule.stamps_needed then
      raise exception 'reward_unavailable';
    end if;
    v_discount := least(v_rule.reward_amount, v_subtotal);
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

  -- 9. Place. A signed-in member orders on their own row. Anyone else is found by phone: a guest row is reused as it
  -- is; a member's row (a login) is not linked from a guest checkout, since a phone number proves nothing.
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

  if v_use_reward then
    insert into public.loyalty_ledger (tenant_id, customer_id, order_id, delta, reason)
    values (p_tenant_id, v_member_id, v_order_id, -v_rule.stamps_needed, 'redeemed');
  end if;

  return jsonb_build_object('orderId', v_order_id, 'orderNo', v_order_no, 'token', v_token);
end;
$$;

-- Replaces P5.4's advance_order (same signature): completing also earns a stamp (paper 6.7).
--
-- Owner of an active shop: moves the order one step forward (paper 6.9). placed → preparing needs the order paid, or
-- cash at a walk-in counter, cash at pickup while the shop lets customers pay later, or cash on delivery
-- (decision P5-28); preparing → ready; ready → out_for_delivery (delivery only, with an optional https tracking
-- link); ready → completed (walk-in and pickup); out_for_delivery → completed. Completing needs the order paid
-- (decision P5-8), adds the order to the customer's totals and, when the shop's stamp card is on and the order is at
-- least its minimum (subtotal less discount), earns the customer 1 stamp, once per order. Guests earn too; the
-- stamps show once they join (decision P5-11). Returns the Order. Errors: not_allowed,
-- invalid_transition, not_paid, invalid.
create or replace function public.advance_order(p_order_id uuid, p_to_status text, p_tracking_url text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_from text;
  v_pay_later boolean;
  v_url text := nullif(btrim(p_tracking_url), '');
  v_allowed boolean;
  v_rule public.loyalty_rules;
begin
  v_order := private.lock_owner_order(p_order_id);
  v_from := v_order.status;

  v_allowed := case
    when v_from = 'placed' and p_to_status = 'preparing' then true
    when v_from = 'preparing' and p_to_status = 'ready' then true
    when v_from = 'ready' and p_to_status = 'out_for_delivery' then v_order.fulfillment = 'delivery'
    when v_from = 'ready' and p_to_status = 'completed' then v_order.fulfillment <> 'delivery'
    when v_from = 'out_for_delivery' and p_to_status = 'completed' then true
    else false
  end;
  if not coalesce(v_allowed, false) then
    raise exception 'invalid_transition';
  end if;

  if p_to_status = 'preparing' and v_order.payment_status <> 'paid' then
    select s.pay_later_pickup into v_pay_later from public.shop_settings s where s.tenant_id = v_order.tenant_id;
    if not (
      v_order.payment_method = 'cod'
      or (v_order.payment_method = 'cash' and (v_order.fulfillment = 'walk_in' or (v_order.fulfillment = 'pickup' and v_pay_later)))
    ) then
      raise exception 'not_paid';
    end if;
  end if;
  if p_to_status = 'completed' and v_order.payment_status <> 'paid' then
    raise exception 'not_paid';
  end if;
  if p_to_status = 'out_for_delivery' and v_url is not null
    and (char_length(v_url) > 500 or v_url !~ '^https://[^\s/]+\.[^\s]+$') then
    raise exception 'invalid';
  end if;

  update public.orders o
  set status = p_to_status,
      ready_at = case when p_to_status = 'ready' then now() else o.ready_at end,
      completed_at = case when p_to_status = 'completed' then now() else o.completed_at end,
      tracking_url = case when p_to_status = 'out_for_delivery' then v_url else o.tracking_url end
  where o.id = v_order.id
  returning * into v_order;

  insert into public.order_events (tenant_id, order_id, kind, from_status, to_status, actor)
  values (v_order.tenant_id, v_order.id, 'status', v_from, p_to_status, 'owner');

  if p_to_status = 'completed' and v_order.customer_id is not null then
    update public.customers c
    set order_count = c.order_count + 1, total_spent = c.total_spent + v_order.total, last_order_at = now()
    where c.id = v_order.customer_id and c.tenant_id = v_order.tenant_id;

    select * into v_rule from public.loyalty_rules r where r.tenant_id = v_order.tenant_id and r.is_active;
    if found and v_order.subtotal - v_order.discount_total >= v_rule.min_order_total then
      insert into public.loyalty_ledger (tenant_id, customer_id, order_id, delta, reason)
      values (v_order.tenant_id, v_order.customer_id, v_order.id, 1, 'earned')
      on conflict (order_id, reason) where order_id is not null do nothing;
    end if;
  end if;

  return private.order_json(v_order);
end;
$$;

-- Replaces P5.4's cancel_order (same signature) to give back redeemed stamps.
--
-- Owner of an active shop: cancels an open order with a reason (1 to 200 characters). Tracked stock comes back, a
-- proof still waiting is rejected with "Order cancelled", and a paid order keeps its payment: the refund is by hand
-- and the timeline note says so. Stamps the order redeemed come back (P5.5). Returns the Order. Errors: not_allowed,
-- invalid, invalid_transition.
create or replace function public.cancel_order(p_order_id uuid, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_from text;
  v_was_paid boolean;
  v_reason text := btrim(p_reason);
begin
  v_order := private.lock_owner_order(p_order_id);
  v_from := v_order.status;
  v_was_paid := v_order.payment_status = 'paid';

  if v_reason is null or char_length(v_reason) not between 1 and 200 then
    raise exception 'invalid';
  end if;
  if v_from not in ('placed', 'preparing', 'ready', 'out_for_delivery') then
    raise exception 'invalid_transition';
  end if;

  update public.payments p
  set status = 'rejected', reviewed_at = now(), reviewed_by = (select auth.uid()), reject_reason = 'Order cancelled'
  where p.order_id = v_order.id and p.status = 'pending';

  update public.orders o
  set status = 'cancelled',
      cancel_reason = v_reason,
      cancelled_at = now(),
      expires_at = null,
      payment_status = case when o.payment_status = 'pending' then 'unpaid' else o.payment_status end
  where o.id = v_order.id
  returning * into v_order;

  perform private.return_order_stock(v_order.id);
  perform private.return_order_stamps(v_order.id);

  insert into public.order_events (tenant_id, order_id, kind, from_status, to_status, actor, note)
  values (
    v_order.tenant_id, v_order.id, 'status', v_from, 'cancelled', 'owner',
    left(v_reason || case when v_was_paid then ' (paid: refund by hand)' else '' end, 200)
  );

  perform private.write_audit(
    v_order.tenant_id, 'order_cancelled', 'order', v_order.id,
    jsonb_build_object('fromStatus', v_from, 'reason', v_reason, 'wasPaid', v_was_paid, 'total', v_order.total)
  );

  return private.order_json(v_order);
end;
$$;

-- Replaces P5.4's expire_unpaid_orders (same signature) to give back redeemed stamps.
--
-- Placed, unpaid GCash, Maya and bank orders whose time ran out become expired and give their stock and redeemed
-- stamps back. Cash and COD orders never expire. Rows another call holds are left for the next run.
-- Returns { expiredCount, ranAt }.
create or replace function private.expire_unpaid_orders()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_count integer := 0;
begin
  for v_order in
    select o.*
    from public.orders o
    where o.status = 'placed'
      and o.payment_status = 'unpaid'
      and o.payment_method in ('gcash', 'maya', 'bank')
      and o.expires_at < now()
    order by o.expires_at
    for update skip locked
  loop
    update public.orders o set status = 'expired' where o.id = v_order.id;
    perform private.return_order_stock(v_order.id);
    perform private.return_order_stamps(v_order.id);
    insert into public.order_events (tenant_id, order_id, kind, from_status, to_status, actor)
    values (v_order.tenant_id, v_order.id, 'status', 'placed', 'expired', 'system');
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('expiredCount', v_count, 'ranAt', now());
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Function grants
-- ---------------------------------------------------------------------------

revoke execute on function private.add_loyalty_rule() from public, anon, authenticated;
revoke execute on function private.my_customer_ids() from public, anon;
revoke execute on function private.block_ledger_update() from public, anon, authenticated;
revoke execute on function private.check_customer_address() from public, anon, authenticated;
revoke execute on function private.member_customer_id(uuid) from public, anon, authenticated;
revoke execute on function private.stamp_rule_json(public.loyalty_rules) from public, anon, authenticated;
revoke execute on function private.member_account_json(uuid) from public, anon, authenticated;
revoke execute on function private.return_order_stamps(uuid) from public, anon, authenticated;
revoke execute on function private.storefront_base(text) from public, anon, authenticated;
revoke execute on function public.join_as_member(text, text, text, text) from public, anon;
revoke execute on function public.get_my_account(text) from public, anon;
revoke execute on function public.get_storefront(text) from public;

grant execute on function public.join_as_member(text, text, text, text) to authenticated;
grant execute on function public.get_my_account(text) to authenticated;
grant execute on function public.get_storefront(text) to anon, authenticated;
