-- P4.7: the Reports average order needs the number of paid orders (decision P5-12: average = sales ÷ the orders
-- counted in sales), so get_sales_report's totals gain `paidOrders`. Everything else is unchanged from
-- 20261013010000_home_and_reports.sql. `create or replace` keeps the function's grants (authenticated only), which
-- are restated below so this file holds its own rules.

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
    'totals', jsonb_build_object('orders', v_orders, 'paidOrders', v_paid, 'sales', v_sales),
    'bestSellers', v_best
  );
end;
$$;

revoke execute on function public.get_sales_report(uuid, date, date) from public, anon;
grant execute on function public.get_sales_report(uuid, date, date) to authenticated;
