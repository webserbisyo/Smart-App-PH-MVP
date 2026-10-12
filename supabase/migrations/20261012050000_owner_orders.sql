-- P5.4: the owner's order actions (system paper 6.4, 6.5, 6.9, 7.3, 7.4, 10). The owner checks a payment proof,
-- records a cash payment, moves an order one step at a time and cancels with a reason; unpaid transfer orders expire
-- on their own every minute; every money decision, cancel and stock count is written to audit_log.
-- packages/core order-rules.ts follows the same rules; both are tested with packages/core/src/test/transition-cases.ts
-- (decision P5-9).

-- ---------------------------------------------------------------------------
-- 1. audit_log (paper 7.3): append-only, written only by the functions below
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  -- The owner who acted; null once that login is deleted.
  actor_id uuid references auth.users on delete set null,
  action text not null
    check (action in ('payment_approved', 'payment_rejected', 'payment_recorded', 'order_cancelled', 'stock_set')),
  target_type text not null check (target_type in ('order', 'payment', 'variant')),
  target_id uuid not null,
  meta jsonb not null default '{}' check (jsonb_typeof(meta) = 'object'),
  created_at timestamptz not null default clock_timestamp()
);

create index audit_log_tenant_created_idx on public.audit_log (tenant_id, created_at desc);
create index audit_log_actor_id_idx on public.audit_log (actor_id);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create policy audit_log_select_active_owner on public.audit_log
  for select to authenticated
  using (private.is_active_shop_owner(tenant_id));

-- ---------------------------------------------------------------------------
-- 2. Helpers (private; called only by the functions below)
-- ---------------------------------------------------------------------------

-- One audit line, by the signed-in owner.
create function private.write_audit(p_tenant uuid, p_action text, p_target_type text, p_target_id uuid, p_meta jsonb)
returns void
language sql
volatile
set search_path = ''
as $$
  insert into public.audit_log (tenant_id, actor_id, action, target_type, target_id, meta)
  values (p_tenant, (select auth.uid()), p_action, p_target_type, p_target_id, coalesce(p_meta, '{}'::jsonb));
$$;

-- The caller's order, locked: the order row first, then its payments (the one lock order every function uses).
-- not_allowed when the order does not exist or the caller is not an owner of its active shop, so an id tells a
-- stranger nothing.
create function private.lock_owner_order(p_order_id uuid)
returns public.orders
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select o.* into v_order from public.orders o where o.id = p_order_id;
  if not found or not private.is_active_shop_owner(v_order.tenant_id) then
    raise exception 'not_allowed';
  end if;
  select o.* into v_order from public.orders o where o.id = p_order_id for update;
  perform 1 from public.payments p where p.order_id = p_order_id order by p.id for update;
  return v_order;
end;
$$;

-- Puts back the stock an order took (decision P5-27): every line whose variant still exists, when its item counts
-- stock. Only open orders are cancelled or expired, and both end the order, so this runs once per order.
create function private.return_order_stock(p_order_id uuid)
returns void
language sql
volatile
set search_path = ''
as $$
  update public.item_variants v
  set stock_on_hand = v.stock_on_hand + r.qty
  from (
    select oi.variant_id, oi.tenant_id, sum(oi.qty)::integer as qty
    from public.order_items oi
    where oi.order_id = p_order_id and oi.variant_id is not null
    group by oi.variant_id, oi.tenant_id
  ) as r,
  public.items i
  where v.id = r.variant_id
    and v.tenant_id = r.tenant_id
    and i.id = v.item_id
    and i.tenant_id = v.tenant_id
    and i.track_stock
    and v.stock_on_hand is not null;
$$;

-- ---------------------------------------------------------------------------
-- 3. Owner functions (system paper 7.4; contracts in packages/core/src/contracts/db-functions.ts)
-- ---------------------------------------------------------------------------

-- Owner of an active shop: approves or rejects a pending payment proof. Approving marks the order paid; rejecting
-- (reason 3 to 200 characters) puts the order back to unpaid with a fresh expiry, frees the reference number, and
-- the receipt shows the reason. Returns the Payment. Errors: not_allowed, payment_not_pending, order_not_payable,
-- invalid.
create function public.review_payment(p_payment_id uuid, p_approve boolean, p_reject_reason text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
  v_order public.orders;
  v_reason text := btrim(p_reject_reason);
  v_minutes integer;
begin
  select p.* into v_payment from public.payments p where p.id = p_payment_id;
  if not found then
    raise exception 'not_allowed';
  end if;
  v_order := private.lock_owner_order(v_payment.order_id);
  select p.* into v_payment from public.payments p where p.id = p_payment_id;

  if v_payment.status <> 'pending' then
    raise exception 'payment_not_pending';
  end if;
  if v_order.status in ('cancelled', 'expired') then
    raise exception 'order_not_payable';
  end if;
  if p_approve is null then
    raise exception 'invalid';
  end if;

  if p_approve then
    update public.payments p
    set status = 'confirmed', reviewed_at = now(), reviewed_by = (select auth.uid())
    where p.id = v_payment.id
    returning * into v_payment;

    update public.orders o
    set payment_status = 'paid', paid_at = now(), expires_at = null
    where o.id = v_order.id;

    insert into public.order_events (tenant_id, order_id, kind, actor)
    values (v_order.tenant_id, v_order.id, 'payment_confirmed', 'owner');

    perform private.write_audit(
      v_order.tenant_id, 'payment_approved', 'payment', v_payment.id,
      jsonb_build_object('orderId', v_order.id, 'method', v_payment.method, 'amount', v_payment.amount)
    );
  else
    if v_reason is null or char_length(v_reason) not between 3 and 200 then
      raise exception 'invalid';
    end if;
    select s.unpaid_expiry_minutes into v_minutes from public.shop_settings s where s.tenant_id = v_order.tenant_id;

    update public.payments p
    set status = 'rejected', reviewed_at = now(), reviewed_by = (select auth.uid()), reject_reason = v_reason
    where p.id = v_payment.id
    returning * into v_payment;

    update public.orders o
    set payment_status = 'unpaid',
        expires_at = case when o.status = 'placed' then now() + make_interval(mins => v_minutes) end
    where o.id = v_order.id;

    insert into public.order_events (tenant_id, order_id, kind, actor, note)
    values (v_order.tenant_id, v_order.id, 'payment_rejected', 'owner', v_reason);

    perform private.write_audit(
      v_order.tenant_id, 'payment_rejected', 'payment', v_payment.id,
      jsonb_build_object('orderId', v_order.id, 'method', v_payment.method, 'amount', v_payment.amount, 'reason', v_reason)
    );
  end if;

  return private.payment_json(v_payment, true);
end;
$$;

-- Owner of an active shop: the money was received by hand. `cash` for walk-in and pickup, `cod` for delivery
-- (decision P5-28); it becomes the order's method, so a GCash customer who pays at the counter is recorded as cash.
-- Inserts a confirmed payment of the order total. Returns the Payment. Errors: not_allowed, invalid,
-- payment_unavailable, already_paid, payment_not_pending, order_not_payable.
create function public.record_payment(p_order_id uuid, p_method text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_payment public.payments;
begin
  v_order := private.lock_owner_order(p_order_id);

  if p_method is null or p_method not in ('cash', 'cod') then
    raise exception 'invalid';
  end if;
  if (p_method = 'cod') <> (v_order.fulfillment = 'delivery') then
    raise exception 'payment_unavailable';
  end if;
  if v_order.payment_status = 'paid' then
    raise exception 'already_paid';
  end if;
  if v_order.payment_status = 'pending' then
    raise exception 'payment_not_pending';
  end if;
  if v_order.status in ('cancelled', 'expired') then
    raise exception 'order_not_payable';
  end if;

  insert into public.payments (tenant_id, order_id, method, amount, status, reviewed_at, reviewed_by)
  values (v_order.tenant_id, v_order.id, p_method, v_order.total, 'confirmed', now(), (select auth.uid()))
  returning * into v_payment;

  update public.orders o
  set payment_status = 'paid', payment_method = p_method, paid_at = now(), expires_at = null
  where o.id = v_order.id;

  insert into public.order_events (tenant_id, order_id, kind, actor)
  values (v_order.tenant_id, v_order.id, 'payment_confirmed', 'owner');

  perform private.write_audit(
    v_order.tenant_id, 'payment_recorded', 'payment', v_payment.id,
    jsonb_build_object('orderId', v_order.id, 'method', p_method, 'amount', v_payment.amount)
  );

  return private.payment_json(v_payment, true);
end;
$$;

-- Owner of an active shop: moves the order one step forward (paper 6.9). placed → preparing needs the order paid, or
-- cash at a walk-in counter, cash at pickup while the shop lets customers pay later, or cash on delivery
-- (decision P5-28); preparing → ready; ready → out_for_delivery (delivery only, with an optional https tracking
-- link); ready → completed (walk-in and pickup); out_for_delivery → completed. Completing needs the order paid
-- (decision P5-8) and adds the order to the customer's totals. Returns the Order. Errors: not_allowed,
-- invalid_transition, not_paid, invalid.
create function public.advance_order(p_order_id uuid, p_to_status text, p_tracking_url text default null)
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
  end if;

  return private.order_json(v_order);
end;
$$;

-- Owner of an active shop: cancels an open order with a reason (1 to 200 characters). Tracked stock comes back, a
-- proof still waiting is rejected with "Order cancelled", and a paid order keeps its payment: the refund is by hand
-- and the timeline note says so. (P5.5 adds taking back the order's stamps.) Returns the Order. Errors: not_allowed,
-- invalid, invalid_transition.
create function public.cancel_order(p_order_id uuid, p_reason text)
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

-- Owner of an active shop: sets a variant's stock count (null stops counting). Stock above 0 clears the sold-out
-- switch. From P5.4 every change is in audit_log. Errors: not_allowed, invalid.
create or replace function public.set_stock(p_variant_id uuid, p_stock_on_hand integer)
returns public.item_variants
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_variant public.item_variants;
  v_before integer;
begin
  select * into v_variant from public.item_variants v where v.id = p_variant_id;
  if not found or not private.is_active_shop_owner(v_variant.tenant_id) then
    raise exception 'not_allowed';
  end if;
  if p_stock_on_hand is not null and p_stock_on_hand < 0 then
    raise exception 'invalid';
  end if;

  select v.stock_on_hand into v_before from public.item_variants v where v.id = p_variant_id for update;

  update public.item_variants v
  set stock_on_hand = p_stock_on_hand,
      is_sold_out = case when coalesce(p_stock_on_hand, 0) > 0 then false else v.is_sold_out end
  where v.id = p_variant_id
  returning * into v_variant;

  perform private.write_audit(
    v_variant.tenant_id, 'stock_set', 'variant', v_variant.id,
    jsonb_build_object('from', v_before, 'to', p_stock_on_hand)
  );

  return v_variant;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Expiry job (paper 6.4): unpaid transfer orders past expires_at end on their own
-- ---------------------------------------------------------------------------

-- Placed, unpaid GCash, Maya and bank orders whose time ran out become expired and give their stock back. Cash and
-- COD orders never expire. Rows another call holds are left for the next run. Returns { expiredCount, ranAt }.
create function private.expire_unpaid_orders()
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
    insert into public.order_events (tenant_id, order_id, kind, from_status, to_status, actor)
    values (v_order.tenant_id, v_order.id, 'status', 'placed', 'expired', 'system');
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('expiredCount', v_count, 'ranAt', now());
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Grants: owners run the actions; nothing in private is callable by clients
-- ---------------------------------------------------------------------------

revoke execute on function private.write_audit(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function private.lock_owner_order(uuid) from public, anon, authenticated;
revoke execute on function private.return_order_stock(uuid) from public, anon, authenticated;
revoke execute on function private.expire_unpaid_orders() from public, anon, authenticated;
revoke execute on function public.review_payment(uuid, boolean, text) from public, anon;
revoke execute on function public.record_payment(uuid, text) from public, anon;
revoke execute on function public.advance_order(uuid, text, text) from public, anon;
revoke execute on function public.cancel_order(uuid, text) from public, anon;
revoke execute on function public.set_stock(uuid, integer) from public, anon;

grant execute on function public.review_payment(uuid, boolean, text) to authenticated;
grant execute on function public.record_payment(uuid, text) to authenticated;
grant execute on function public.advance_order(uuid, text, text) to authenticated;
grant execute on function public.cancel_order(uuid, text) to authenticated;
grant execute on function public.set_stock(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Schedule: every minute (re-running this file replaces the job instead of adding a second one)
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-unpaid-orders') then
    perform cron.unschedule('expire-unpaid-orders');
  end if;
end;
$$;

select cron.schedule('expire-unpaid-orders', '* * * * *', 'select private.expire_unpaid_orders()');
