-- SF2 Step 6: Push subscriptions and outbox
-- push_subscriptions, order_push_subscriptions, notification_outbox,
-- subscribe_order_push, status change trigger, claim_push_batch, finish_push.

-- 1. Tables
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique check (endpoint ~ '^https://.+'),
  p256dh text not null check (char_length(btrim(p256dh)) between 1 and 200),
  auth text not null check (char_length(btrim(auth)) between 1 and 100),
  customer_id uuid references public.customers on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create table if not exists public.order_push_subscriptions (
  tenant_id uuid not null references public.tenants on delete cascade,
  order_id uuid not null,
  subscription_id uuid not null references public.push_subscriptions on delete cascade,
  primary key (order_id, subscription_id),
  constraint order_push_subscriptions_order_fk foreign key (tenant_id, order_id) references public.orders (tenant_id, id) on delete cascade
);

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  subscription_id uuid references public.push_subscriptions on delete set null,
  payload jsonb not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- 2. RLS & Permissions
alter table public.push_subscriptions enable row level security;
alter table public.order_push_subscriptions enable row level security;
alter table public.notification_outbox enable row level security;

-- Owner can read their shop's subscriptions, order links, and outbox
drop policy if exists order_push_subscriptions_select_member on public.order_push_subscriptions;
create policy order_push_subscriptions_select_member on public.order_push_subscriptions
  for select to authenticated
  using (private.is_shop_member(tenant_id));

drop policy if exists notification_outbox_select_member on public.notification_outbox;
create policy notification_outbox_select_member on public.notification_outbox
  for select to authenticated
  using (private.is_shop_member(tenant_id));

drop policy if exists push_subscriptions_select_member on public.push_subscriptions;
create policy push_subscriptions_select_member on public.push_subscriptions
  for select to authenticated
  using (
    exists (
      select 1 from public.order_push_subscriptions ops
      where ops.subscription_id = public.push_subscriptions.id
        and private.is_shop_member(ops.tenant_id)
    )
  );

-- No direct client insert/update/delete
revoke all on public.push_subscriptions from public, anon, authenticated;
revoke all on public.order_push_subscriptions from public, anon, authenticated;
revoke all on public.notification_outbox from public, anon, authenticated;

grant select on public.push_subscriptions to authenticated;
grant select on public.order_push_subscriptions to authenticated;
grant select on public.notification_outbox to authenticated;

-- 3. Vault & HTTP helpers (silently skip if missing, never fail)
create or replace function private.get_vault_secret(p_name text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  if to_regclass('vault.decrypted_secrets') is null then
    return null;
  end if;
  begin
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
      into v_secret
      using p_name;
    return v_secret;
  exception
    when others then
      return null;
  end;
end;
$$;

revoke execute on function private.get_vault_secret(text) from public, anon, authenticated;

create or replace function private.dispatch_push_http(p_url text, p_secret text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if to_regproc('net.http_post') is null then
    return;
  end if;
  begin
    execute 'select net.http_post(
      url := $1,
      headers := jsonb_build_object(
        ''Content-Type'', ''application/json'',
        ''x-push-secret'', $2
      )
    )' using p_url, p_secret;
  exception
    when others then
      return;
  end;
end;
$$;

revoke execute on function private.dispatch_push_http(text, text) from public, anon, authenticated;

-- 4. subscribe_order_push
create or replace function public.subscribe_order_push(p_token text, p_subscription jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_endpoint text;
  v_p256dh text;
  v_auth text;
  v_sub_id uuid;
begin
  if jsonb_typeof(p_subscription) is distinct from 'object' then
    raise exception 'invalid';
  end if;

  v_endpoint := btrim(p_subscription ->> 'endpoint');
  v_p256dh := btrim(p_subscription #>> '{keys,p256dh}');
  v_auth := btrim(p_subscription #>> '{keys,auth}');

  if v_endpoint is null or v_endpoint !~ '^https://.+'
    or v_p256dh is null or char_length(v_p256dh) not between 1 and 200
    or v_auth is null or char_length(v_auth) not between 1 and 100 then
    raise exception 'invalid';
  end if;

  select * into v_order from public.orders where token = p_token;
  if not found then
    raise exception 'order_not_found';
  end if;

  insert into public.push_subscriptions (endpoint, p256dh, auth, customer_id, last_used_at)
  values (v_endpoint, v_p256dh, v_auth, v_order.customer_id, now())
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        customer_id = coalesce(excluded.customer_id, public.push_subscriptions.customer_id),
        last_used_at = now()
  returning id into v_sub_id;

  insert into public.order_push_subscriptions (tenant_id, order_id, subscription_id)
  values (v_order.tenant_id, v_order.id, v_sub_id)
  on conflict (order_id, subscription_id) do nothing;

  if v_order.customer_id is not null then
    insert into public.consents (tenant_id, customer_id, channel, granted, source)
    values (v_order.tenant_id, v_order.customer_id, 'push', true, 'order_page');
  end if;

  return jsonb_build_object('ok', true, 'subscriptionId', v_sub_id);
end;
$$;

revoke execute on function public.subscribe_order_push(text, jsonb) from public;
grant execute on function public.subscribe_order_push(text, jsonb) to anon, authenticated;

-- 5. Trigger on order status change
create or replace function private.on_order_status_change_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_payload jsonb;
  v_sub record;
  v_queued boolean := false;
begin
  if OLD.status is not distinct from NEW.status then
    return NEW;
  end if;

  v_payload := jsonb_build_object(
    'title', 'order:' || NEW.order_no,
    'body', 'status:' || NEW.status,
    'url', '/orders/' || NEW.token
  );

  for v_sub in
    select ops.subscription_id
    from public.order_push_subscriptions ops
    where ops.order_id = NEW.id
  loop
    insert into public.notification_outbox (tenant_id, subscription_id, payload, status)
    values (NEW.tenant_id, v_sub.subscription_id, v_payload, 'queued');
    v_queued := true;
  end loop;

  if v_queued then
    v_url := private.get_vault_secret('push_dispatch_url');
    v_secret := private.get_vault_secret('push_dispatch_secret');
    if v_url is not null and v_secret is not null then
      perform private.dispatch_push_http(v_url, v_secret);
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_orders_push on public.orders;
create trigger trg_orders_push
  after update of status on public.orders
  for each row
  execute function private.on_order_status_change_push();

-- 6. claim_push_batch & finish_push
create or replace function public.claim_push_batch(p_secret text, p_limit integer default 50)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_expected text := private.get_vault_secret('push_dispatch_secret');
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_result jsonb;
begin
  if v_expected is null or p_secret is null or p_secret <> v_expected then
    raise exception 'unauthorized';
  end if;

  with locked_batch as (
    select o.id
    from public.notification_outbox o
    where o.status = 'queued'
    order by o.created_at asc
    limit v_limit
    for update skip locked
  ),
  updated as (
    update public.notification_outbox o
    set attempts = o.attempts + 1
    from locked_batch b
    where o.id = b.id
    returning o.id, o.tenant_id, o.subscription_id, o.payload, o.attempts
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', u.id,
      'tenantId', u.tenant_id,
      'subscription', jsonb_build_object(
        'endpoint', s.endpoint,
        'keys', jsonb_build_object(
          'p256dh', s.p256dh,
          'auth', s.auth
        )
      ),
      'payload', u.payload,
      'attempts', u.attempts
    )
  ), '[]'::jsonb)
  into v_result
  from updated u
  left join public.push_subscriptions s on s.id = u.subscription_id;

  return v_result;
end;
$$;

revoke execute on function public.claim_push_batch(text, integer) from public;
grant execute on function public.claim_push_batch(text, integer) to anon, authenticated;

create or replace function public.finish_push(p_secret text, p_id uuid, p_ok boolean, p_gone boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_expected text := private.get_vault_secret('push_dispatch_secret');
  v_sub_id uuid;
begin
  if v_expected is null or p_secret is null or p_secret <> v_expected then
    raise exception 'unauthorized';
  end if;

  select o.subscription_id into v_sub_id
  from public.notification_outbox o
  where o.id = p_id;

  if not found then
    raise exception 'outbox_not_found';
  end if;

  if p_ok then
    update public.notification_outbox
    set status = 'sent', sent_at = now()
    where id = p_id;
  else
    update public.notification_outbox
    set status = 'failed'
    where id = p_id;
  end if;

  if p_gone and v_sub_id is not null then
    delete from public.push_subscriptions where id = v_sub_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.finish_push(text, uuid, boolean, boolean) from public;
grant execute on function public.finish_push(text, uuid, boolean, boolean) to anon, authenticated;
