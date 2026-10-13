-- Founder operations (system paper Appendix A). Copy each block into a saved snippet in the
-- Supabase SQL editor. Replace the shop link names before running.

-- Shops waiting for approval
select t.slug, t.name, t.business_type, t.created_at, u.email
from tenants t
join tenant_members m on m.tenant_id = t.id and m.role = 'owner'
join auth.users u on u.id = m.user_id
where t.status = 'pending'
order by t.created_at;

-- Approve a shop with a first month paid
update tenants
set status = 'active', plan = 'early_599', paid_until = current_date + interval '1 month'
where slug = 'juans-cafe';

-- Record a monthly payment (extends from the later of today or the current paid_until)
update tenants
set paid_until = greatest(current_date, paid_until) + interval '1 month'
where slug = 'juans-cafe';

-- Shops due or overdue
select slug, name, paid_until, current_date - paid_until as days_overdue
from tenants
where status = 'active' and paid_until < current_date + 3
order by paid_until;

-- Suspend or restore
update tenants set status = 'suspended' where slug = 'some-shop';
update tenants set status = 'active'    where slug = 'some-shop';

-- Usage at a glance (works once the orders and customers tables exist, from P5.3)
select t.slug,
  (select count(*) from orders o where o.tenant_id = t.id and o.placed_at > now() - interval '30 days') as orders_30d,
  (select count(*) from customers c where c.tenant_id = t.id and c.member_since is not null) as members
from tenants t order by orders_30d desc;

-- Demo shops: set up both, with their catalog and 30 days of orders (juans-cafe and tala-apparel; keeps their owners)
select private.demo_setup();

-- Demo: refresh both shops for today (run each morning; deletes and remakes only demo orders and customers)
select private.demo_reset('juans-cafe');
select private.demo_reset('tala-apparel');

-- Make me the owner of a demo shop (skipped if the shop already has an owner); put your email and the slug
insert into tenant_members (tenant_id, user_id, role)
select t.id, u.id, 'owner'
from tenants t, auth.users u
where t.slug = 'juans-cafe' and u.email = 'you@example.com'
  and not exists (select 1 from tenant_members m where m.tenant_id = t.id and m.role = 'owner' and m.status = 'active');
