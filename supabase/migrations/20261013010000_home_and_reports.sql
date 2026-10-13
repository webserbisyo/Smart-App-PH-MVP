-- P5.6: the numbers on the owner's Home, the members card and the basic reports (system paper 4.1, 7.4;
-- docs/api-surface.md slice 6). Everything is computed here in Manila time, so every screen shows the same numbers.
-- Order inside the file: indexes → functions → function grants.
--
-- Definitions (decision P5-12), used by every function below:
-- - Business date: the order's business_date (its Manila date, set when it is placed).
-- - Sales: the sum of total of orders with payment_status 'paid' whose status is not cancelled or expired.
-- - Orders: the count of orders that are not expired (cancelled ones count as orders, not as sales).
-- - Open orders: placed, preparing, ready, out_for_delivery. Waiting: placed. To verify: payment_status 'pending'.
-- - Low stock: tracked variants (their item counts stock), not archived, with stock_on_hand <= low_stock_at.
-- - Average order: sales ÷ paid orders (the orders counted in sales), 0 when none, rounded to whole centavos.
-- - Best sellers: by quantity from the order_items of sales orders, top 5, grouped by item_name.
-- - Top suki: the three members with the highest sales this Manila month.
-- - New members this week: member_since in the last 7 days.

-- ---------------------------------------------------------------------------
-- 1. Indexes
-- ---------------------------------------------------------------------------

-- orders (tenant_id, business_date) is already served by the unique constraint orders_tenant_day_no
-- (tenant_id, business_date, order_no), so no second copy is made.

-- Open orders of a shop (Home's open, waiting and to-verify counts): small, since orders leave it when they end.
create index orders_tenant_open_idx on public.orders (tenant_id, status)
  where status in ('placed', 'preparing', 'ready', 'out_for_delivery');

-- Members of a shop and the newest ones (member count, new this week, top suki).
create index customers_tenant_member_since_idx on public.customers (tenant_id, member_since)
  where member_since is not null;

-- ---------------------------------------------------------------------------
-- 2. Functions
-- ---------------------------------------------------------------------------

-- Shop member: Home numbers for today's Manila date (DashboardToday). Sales, orders and the average are today's;
-- open, waiting and to-verify count every open order whatever its date (a pickup for tomorrow is still open); low stock
-- and members are the shop's now. Errors: not_allowed.
create function public.get_dashboard_today(p_tenant_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_sales bigint;
  v_paid integer;
  v_orders integer;
  v_open integer;
  v_waiting integer;
  v_to_verify integer;
  v_low_stock integer;
  v_members integer;
  v_new_members integer;
begin
  if not private.is_shop_member(p_tenant_id) then
    raise exception 'not_allowed';
  end if;

  select
    coalesce(sum(o.total) filter (where o.payment_status = 'paid' and o.status not in ('cancelled', 'expired')), 0),
    count(*) filter (where o.payment_status = 'paid' and o.status not in ('cancelled', 'expired')),
    count(*) filter (where o.status <> 'expired')
  into v_sales, v_paid, v_orders
  from public.orders o
  where o.tenant_id = p_tenant_id and o.business_date = v_today;

  select
    count(*),
    count(*) filter (where o.status = 'placed'),
    count(*) filter (where o.payment_status = 'pending')
  into v_open, v_waiting, v_to_verify
  from public.orders o
  where o.tenant_id = p_tenant_id and o.status in ('placed', 'preparing', 'ready', 'out_for_delivery');

  select count(*) into v_low_stock
  from public.item_variants v
  join public.items i on i.id = v.item_id and i.tenant_id = v.tenant_id
  where v.tenant_id = p_tenant_id
    and i.track_stock
    and i.status <> 'archived'
    and v.archived_at is null
    and v.stock_on_hand <= v.low_stock_at;

  select count(*), count(*) filter (where c.member_since > now() - interval '7 days')
  into v_members, v_new_members
  from public.customers c
  where c.tenant_id = p_tenant_id and c.member_since is not null;

  return jsonb_build_object(
    'businessDate', v_today,
    'salesToday', v_sales,
    'ordersToday', v_orders,
    'openOrders', v_open,
    'averageOrder', case when v_paid = 0 then 0 else round(v_sales::numeric / v_paid)::bigint end,
    'toVerify', v_to_verify,
    'waiting', v_waiting,
    'lowStock', v_low_stock,
    'memberCount', v_members,
    'newMembersThisWeek', v_new_members
  );
end;
$$;

-- Shop member: the members card on Home (MemberInsights): member count, new this week and the top three suki, the
-- members with the highest sales this Manila month (ties by name). Errors: not_allowed.
create function public.get_member_insights(p_tenant_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_month date := date_trunc('month', (now() at time zone 'Asia/Manila')::date)::date;
  v_members integer;
  v_new_members integer;
  v_top jsonb;
begin
  if not private.is_shop_member(p_tenant_id) then
    raise exception 'not_allowed';
  end if;

  select count(*), count(*) filter (where c.member_since > now() - interval '7 days')
  into v_members, v_new_members
  from public.customers c
  where c.tenant_id = p_tenant_id and c.member_since is not null;

  select coalesce(jsonb_agg(jsonb_build_object('customerId', t.id, 'name', t.name, 'totalSpent', t.spent) order by t.spent desc, t.name), '[]')
  into v_top
  from (
    select c.id, c.name, sum(o.total) as spent
    from public.orders o
    join public.customers c on c.id = o.customer_id and c.tenant_id = o.tenant_id
    where o.tenant_id = p_tenant_id
      and o.business_date >= v_month
      and o.payment_status = 'paid'
      and o.status not in ('cancelled', 'expired')
      and c.member_since is not null
    group by c.id, c.name
    order by spent desc, c.name
    limit 3
  ) t;

  return jsonb_build_object('memberCount', v_members, 'newMembersThisWeek', v_new_members, 'topSuki', v_top);
end;
$$;

-- Shop member: sales and orders per Manila business date from p_from to p_to (both included, at most 92 days),
-- every day listed even with no orders, the totals, and the top 5 best sellers (SalesReport). Errors: not_allowed,
-- invalid (a missing date, from after to, or more than 92 days).
create function public.get_sales_report(p_tenant_id uuid, p_from date, p_to date)
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
  v_best jsonb;
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
      coalesce(sum(o.total) filter (where o.payment_status = 'paid' and o.status not in ('cancelled', 'expired')), 0) as sales
    from public.orders o
    where o.tenant_id = p_tenant_id and o.business_date between p_from and p_to
    group by o.business_date
  )
  select
    jsonb_agg(jsonb_build_object('date', d.day::date, 'orders', coalesce(p.orders, 0), 'sales', coalesce(p.sales, 0)) order by d.day),
    coalesce(sum(p.orders), 0),
    coalesce(sum(p.sales), 0)
  into v_days, v_orders, v_sales
  from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') as d (day)
  left join per_day p on p.business_date = d.day::date;

  select coalesce(jsonb_agg(jsonb_build_object('itemName', b.item_name, 'qty', b.qty, 'sales', b.sales) order by b.qty desc, b.sales desc, b.item_name), '[]')
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

  return jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'days', v_days,
    'totals', jsonb_build_object('orders', v_orders, 'sales', v_sales),
    'bestSellers', v_best
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Function grants: signed-in shop members only (each function checks the shop itself)
-- ---------------------------------------------------------------------------

revoke execute on function public.get_dashboard_today(uuid) from public, anon;
revoke execute on function public.get_member_insights(uuid) from public, anon;
revoke execute on function public.get_sales_report(uuid, date, date) from public, anon;

grant execute on function public.get_dashboard_today(uuid) to authenticated;
grant execute on function public.get_member_insights(uuid) to authenticated;
grant execute on function public.get_sales_report(uuid, date, date) to authenticated;
