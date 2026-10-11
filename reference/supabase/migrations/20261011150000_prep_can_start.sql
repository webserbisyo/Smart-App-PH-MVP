-- Redesign 13-fix: the kitchen can Start.
-- `prep.update` now also allows New -> Preparing (placed -> in_prep), beside Preparing -> Ready and the recall.
-- An unpaid order still can't start unless the shop's rules allow it (invalid_transition), whoever taps.
-- Every other step (out, completed) and cancel / void still need `orders.manage`.
-- Same function as in 20261007090000_audit_fixes.sql, with that one check widened.
-- Error codes: not_allowed, not_found, invalid_transition.

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
    -- Start is a prep step: the kitchen may take it too. The payment rule below is the same for everyone.
    if not (private.has_permission(p_tenant_id, 'prep.update') or private.has_permission(p_tenant_id, 'orders.manage')) then
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
  elsif v_order.status = 'ready' and p_to = 'in_prep' then
    -- Kitchen recall: a ticket bumped by mistake goes back. Only while it is still `ready`.
    if not private.has_permission(p_tenant_id, 'prep.update') then
      raise exception 'not_allowed';
    end if;
    update public.orders set ready_at = null where id = p_order_id;
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

revoke execute on function public.advance_order(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.advance_order(uuid, uuid, text) to authenticated;
