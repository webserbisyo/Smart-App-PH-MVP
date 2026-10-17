-- SF2 Step 3: Order messages with payment proof first
-- Table public.order_messages, backfill existing payment proofs, RLS, realtime broadcast,
-- updated submit_payment_proof, review_payment, record_payment, advance_order, cancel_order,
-- and public.get_order_messages(p_token).

-- 1. Table public.order_messages
create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  order_id uuid not null,
  sender text not null check (sender in ('customer', 'owner', 'system')),
  kind text not null check (kind in ('text', 'image', 'payment_proof', 'status')),
  body text check (body is null or char_length(btrim(body)) <= 500),
  attachment_path text,
  payment_id uuid,
  created_at timestamptz not null default now(),
  constraint order_messages_tenant_unique unique (id, tenant_id),
  foreign key (order_id, tenant_id) references public.orders (id, tenant_id) on delete cascade,
  foreign key (payment_id) references public.payments (id) on delete set null
);

create index if not exists order_messages_order_idx
  on public.order_messages (order_id, tenant_id, created_at);

-- 2. Backfill existing payment proofs
insert into public.order_messages (tenant_id, order_id, sender, kind, attachment_path, payment_id, created_at)
select p.tenant_id, p.order_id, 'customer', 'payment_proof', p.proof_path, p.id, coalesce(p.reviewed_at, p.created_at, now())
from public.payments p
where p.proof_path is not null
  and not exists (
    select 1 from public.order_messages m where m.payment_id = p.id and m.kind = 'payment_proof'
  );

-- 3. RLS: Owner reads their shop; clients have no direct writes
alter table public.order_messages enable row level security;
revoke all on public.order_messages from anon, authenticated;

grant select on public.order_messages to authenticated;

drop policy if exists order_messages_select_member on public.order_messages;
create policy order_messages_select_member on public.order_messages
  for select to authenticated
  using (private.is_shop_member(tenant_id));

-- 4. Realtime Broadcast trigger on message_added
create or replace function private.broadcast_order_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  select o.token into v_token from public.orders o where o.id = new.order_id and o.tenant_id = new.tenant_id;
  if v_token is not null then
    perform realtime.send(
      jsonb_build_object(
        'id', new.id,
        'orderId', new.order_id,
        'sender', new.sender,
        'kind', new.kind,
        'body', new.body,
        'attachmentPath', new.attachment_path,
        'paymentId', new.payment_id,
        'createdAt', new.created_at
      ),
      'message_added',
      'order:' || v_token,
      false
    );
  end if;
  return null;
end;
$$;

revoke execute on function private.broadcast_order_message() from public, anon, authenticated;

drop trigger if exists order_messages_broadcast on public.order_messages;
create trigger order_messages_broadcast
  after insert on public.order_messages
  for each row execute function private.broadcast_order_message();

-- 5. get_order_messages(p_token text)
create or replace function public.get_order_messages(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_messages jsonb;
begin
  select o.* into v_order from public.orders o where o.token = p_token;
  if not found then
    raise exception 'not_found';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'sender', m.sender,
        'kind', m.kind,
        'body', m.body,
        'attachmentPath', m.attachment_path,
        'paymentId', m.payment_id,
        'createdAt', m.created_at
      ) order by m.created_at asc
    ),
    '[]'::jsonb
  ) into v_messages
  from public.order_messages m
  where m.order_id = v_order.id and m.tenant_id = v_order.tenant_id;

  return v_messages;
end;
$$;

revoke all on function public.get_order_messages(text) from public;
grant execute on function public.get_order_messages(text) to anon, authenticated;

-- 6. Update submit_payment_proof to insert payment_proof message
create or replace function public.submit_payment_proof(p_token text, p_method text, p_reference_no text, p_proof_path text)
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

  insert into public.order_messages (tenant_id, order_id, sender, kind, attachment_path, payment_id)
  values (v_order.tenant_id, v_order.id, 'customer', 'payment_proof', p_proof_path, v_payment.id);

  return private.payment_json(v_payment, false);
end;
$$;

revoke execute on function public.submit_payment_proof(text, text, text, text) from public;
grant execute on function public.submit_payment_proof(text, text, text, text) to anon, authenticated;

-- 7. Update review_payment to insert system status message
create or replace function public.review_payment(p_payment_id uuid, p_approve boolean, p_reject_reason text default null)
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

    insert into public.order_messages (tenant_id, order_id, sender, kind, body, payment_id)
    values (v_order.tenant_id, v_order.id, 'system', 'status', 'payment_confirmed', v_payment.id);

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

    insert into public.order_messages (tenant_id, order_id, sender, kind, body, payment_id)
    values (v_order.tenant_id, v_order.id, 'system', 'status', 'payment_rejected', v_payment.id);

    perform private.write_audit(
      v_order.tenant_id, 'payment_rejected', 'payment', v_payment.id,
      jsonb_build_object('orderId', v_order.id, 'method', v_payment.method, 'amount', v_payment.amount, 'reason', v_reason)
    );
  end if;

  return private.payment_json(v_payment, true);
end;
$$;

revoke execute on function public.review_payment(uuid, boolean, text) from public, anon;
grant execute on function public.review_payment(uuid, boolean, text) to authenticated;

-- 8. Update record_payment to insert system status message
create or replace function public.record_payment(p_order_id uuid, p_method text)
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

  insert into public.order_messages (tenant_id, order_id, sender, kind, body, payment_id)
  values (v_order.tenant_id, v_order.id, 'system', 'status', 'payment_confirmed', v_payment.id);

  perform private.write_audit(
    v_order.tenant_id, 'payment_recorded', 'payment', v_payment.id,
    jsonb_build_object('orderId', v_order.id, 'method', p_method, 'amount', v_payment.amount)
  );

  return private.payment_json(v_payment, true);
end;
$$;

revoke execute on function public.record_payment(uuid, text) from public, anon;
grant execute on function public.record_payment(uuid, text) to authenticated;

-- 9. Update advance_order to insert system status message
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

  insert into public.order_messages (tenant_id, order_id, sender, kind, body)
  values (v_order.tenant_id, v_order.id, 'system', 'status', 'status:' || p_to_status);

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

revoke execute on function public.advance_order(uuid, text, text) from public, anon;
grant execute on function public.advance_order(uuid, text, text) to authenticated;

-- 10. Update cancel_order to insert system status message
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

  insert into public.order_messages (tenant_id, order_id, sender, kind, body)
  values (v_order.tenant_id, v_order.id, 'system', 'status', 'status:cancelled');

  perform private.write_audit(
    v_order.tenant_id, 'order_cancelled', 'order', v_order.id,
    jsonb_build_object('reason', v_reason, 'wasPaid', v_was_paid)
  );

  return private.order_json(v_order);
end;
$$;

revoke execute on function public.cancel_order(uuid, text) from public, anon;
grant execute on function public.cancel_order(uuid, text) to authenticated;
