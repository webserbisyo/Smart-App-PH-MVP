-- SF2 Step 4: Delivery info and private ratings
-- Table order_ratings, orders columns (delivery_provider, rider_name, rider_phone),
-- set_delivery_info, rate_order, updated get_order / private.order_json, and get_sales_report.

-- 1. Extend orders table
alter table public.orders
  add column if not exists delivery_provider text check (delivery_provider is null or delivery_provider in ('own', 'lalamove', 'grab', 'other')),
  add column if not exists rider_name text check (rider_name is null or char_length(btrim(rider_name)) <= 60),
  add column if not exists rider_phone text check (rider_phone is null or rider_phone ~ '^(09|\+639)[0-9]{9}$');

-- 2. Table public.order_ratings
create table if not exists public.order_ratings (
  order_id uuid primary key references public.orders (id) on delete cascade,
  tenant_id uuid not null references public.tenants on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  comment text check (comment is null or char_length(btrim(comment)) <= 300),
  created_at timestamptz not null default now(),
  constraint order_ratings_tenant_unique unique (order_id, tenant_id),
  foreign key (order_id, tenant_id) references public.orders (id, tenant_id) on delete cascade
);

create index if not exists order_ratings_tenant_idx on public.order_ratings (tenant_id, created_at);

-- 3. RLS on order_ratings
alter table public.order_ratings enable row level security;
revoke all on public.order_ratings from anon, authenticated;

grant select on public.order_ratings to authenticated;

drop policy if exists order_ratings_select_member on public.order_ratings;
create policy order_ratings_select_member on public.order_ratings
  for select to authenticated
  using (private.is_shop_member(tenant_id));

-- 4. Update private.order_json to include delivery provider, rider, and rating
create or replace function private.order_json(p_order public.orders)
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
    'deliveryProvider', p_order.delivery_provider,
    'riderName', p_order.rider_name,
    'riderPhone', p_order.rider_phone,
    'cancelReason', p_order.cancel_reason,
    'clientKey', p_order.client_key,
    'expiresAt', p_order.expires_at,
    'placedAt', p_order.placed_at,
    'paidAt', p_order.paid_at,
    'readyAt', p_order.ready_at,
    'completedAt', p_order.completed_at,
    'cancelledAt', p_order.cancelled_at,
    'rating', (
      select jsonb_build_object(
        'stars', r.stars,
        'comment', r.comment,
        'createdAt', r.created_at
      )
      from public.order_ratings r
      where r.order_id = p_order.id
    )
  );
$$;

revoke execute on function private.order_json(public.orders) from public, anon, authenticated;

-- 5. RPC set_delivery_info
create or replace function public.set_delivery_info(
  p_order_id uuid,
  p_provider text,
  p_tracking_url text default null,
  p_rider_name text default null,
  p_rider_phone text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_url text := nullif(btrim(p_tracking_url), '');
  v_name text := nullif(btrim(p_rider_name), '');
  v_phone text := nullif(btrim(p_rider_phone), '');
  v_host text;
begin
  v_order := private.lock_owner_order(p_order_id);

  if v_order.fulfillment <> 'delivery' then
    raise exception 'invalid';
  end if;

  if p_provider is null or p_provider not in ('own', 'lalamove', 'grab', 'other') then
    raise exception 'invalid';
  end if;

  if v_name is not null and char_length(v_name) > 60 then
    raise exception 'invalid';
  end if;

  if v_phone is not null and v_phone !~ '^(09|\+639)[0-9]{9}$' then
    raise exception 'invalid';
  end if;

  if v_url is not null then
    if char_length(v_url) > 500 or v_url !~ '^https://[^\s/]+\.[^\s]+$' or v_url like '%@%' then
      raise exception 'invalid';
    end if;

    v_host := lower(substring(v_url from '^https://([^/:?#@]+)'));
    if v_host is null then
      raise exception 'invalid';
    end if;
    if p_provider = 'lalamove' then
      if v_host <> 'lalamove.com' and v_host !~ '\.lalamove\.com$' then
        raise exception 'invalid_tracking_host';
      end if;
    elsif p_provider = 'grab' then
      if v_host <> 'grab.com' and v_host !~ '\.grab\.com$' then
        raise exception 'invalid_tracking_host';
      end if;
    end if;
  end if;

  update public.orders o
  set delivery_provider = p_provider,
      tracking_url = coalesce(v_url, o.tracking_url),
      rider_name = v_name,
      rider_phone = v_phone
  where o.id = v_order.id
  returning * into v_order;

  return private.order_json(v_order);
end;
$$;

revoke execute on function public.set_delivery_info(uuid, text, text, text, text) from public, anon;
grant execute on function public.set_delivery_info(uuid, text, text, text, text) to authenticated;

-- 6. RPC rate_order
create or replace function public.rate_order(p_token text, p_stars integer, p_comment text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_comment text := nullif(btrim(p_comment), '');
begin
  select o.* into v_order from public.orders o where o.token = p_token;
  if not found then
    raise exception 'not_found';
  end if;

  if v_order.status <> 'completed' then
    raise exception 'order_not_completed';
  end if;

  if p_stars is null or p_stars not between 1 and 5 then
    raise exception 'invalid';
  end if;

  if v_comment is not null and char_length(v_comment) > 300 then
    raise exception 'invalid';
  end if;

  if exists (select 1 from public.order_ratings where order_id = v_order.id) then
    raise exception 'already_rated';
  end if;

  insert into public.order_ratings (order_id, tenant_id, stars, comment, created_at)
  values (v_order.id, v_order.tenant_id, p_stars, v_comment, now());

  return jsonb_build_object(
    'orderId', v_order.id,
    'stars', p_stars,
    'comment', v_comment
  );
end;
$$;

revoke all on function public.rate_order(text, integer, text) from public;
grant execute on function public.rate_order(text, integer, text) to anon, authenticated;

-- 7. Update get_sales_report to add ratingAverage and ratingCount
create or replace function public.get_sales_report(p_tenant_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days jsonb;
  v_orders integer;
  v_sales bigint;
  v_paid integer;
  v_best jsonb;
  v_rating_avg numeric;
  v_rating_count integer;
begin
  if not private.is_shop_member(p_tenant_id) then
    raise exception 'not_allowed';
  end if;
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from + 1 > 92 then
    raise exception 'invalid';
  end if;

  with per_day as (
    select
      o.business_date,
      count(*) filter (where o.status <> 'expired') as orders,
      coalesce(sum(o.total) filter (where o.payment_status = 'paid' and o.status not in ('cancelled', 'expired')), 0) as sales,
      count(*) filter (where o.payment_status = 'paid' and o.status not in ('cancelled', 'expired')) as paid
    from public.orders o
    where o.tenant_id = p_tenant_id and o.business_date between p_from and p_to
    group by o.business_date
  )
  select
    jsonb_agg(jsonb_build_object('date', d.day::date, 'orders', coalesce(p.orders, 0), 'sales', coalesce(p.sales, 0)) order by d.day),
    coalesce(sum(p.orders), 0),
    coalesce(sum(p.sales), 0),
    coalesce(sum(p.paid), 0)
  into v_days, v_orders, v_sales, v_paid
  from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') as d (day)
  left join per_day p on p.business_date = d.day::date;

  select coalesce(jsonb_agg(jsonb_build_object('itemName', b.item_name, 'qty', b.qty, 'sales', b.sales) order by b.qty desc, b.sales desc, b.item_name), '[]'::jsonb)
  into v_best
  from (
    select oi.item_name, sum(oi.qty) as qty, sum(oi.line_total) as sales
    from public.order_items oi
    join public.orders o on o.id = oi.order_id and o.tenant_id = oi.tenant_id
    where o.tenant_id = p_tenant_id
      and o.business_date between p_from and p_to
      and o.payment_status = 'paid'
      and o.status not in ('cancelled', 'expired')
    group by oi.item_name
    order by qty desc, sales desc, oi.item_name
    limit 5
  ) b;

  select
    round(avg(r.stars)::numeric, 1),
    coalesce(count(r.stars), 0)::integer
  into v_rating_avg, v_rating_count
  from public.order_ratings r
  join public.orders o on o.id = r.order_id and o.tenant_id = r.tenant_id
  where o.tenant_id = p_tenant_id
    and o.business_date between p_from and p_to;

  return jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'days', v_days,
    'totals', jsonb_build_object('orders', v_orders, 'paidOrders', v_paid, 'sales', v_sales),
    'bestSellers', v_best,
    'ratingAverage', v_rating_avg,
    'ratingCount', coalesce(v_rating_count, 0)
  );
end;
$$;

revoke execute on function public.get_sales_report(uuid, date, date) from public, anon;
grant execute on function public.get_sales_report(uuid, date, date) to authenticated;
