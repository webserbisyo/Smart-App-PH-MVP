begin;
select plan(33);

-- Setup Shop A
insert into public.tenants (id, name, slug, business_type, status)
values ('aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'Push Shop', 'push-shop', 'food', 'active');

insert into public.shop_settings (tenant_id, accepting_orders)
values ('aaaaaaaa-aaaa-aaaa-aaaa-000000000001', true);

insert into public.customers (id, tenant_id, name, phone, email)
values ('cccccccc-cccc-cccc-cccc-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'Push Buyer', '+639171112222', 'buyer@example.com');

insert into public.orders (
  id, tenant_id, order_no, business_date, token, fulfillment, status, payment_status, payment_method,
  customer_id, customer_name, customer_phone, delivery_fee, subtotal, discount_total, total, client_key
) values (
  '11111111-1111-1111-1111-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 1, current_date,
  'push_test_token_1', 'pickup', 'placed', 'paid', 'gcash',
  'cccccccc-cccc-cccc-cccc-000000000001', 'Push Buyer', '+639171112222', 0, 10000, 0, 10000, '22222222-2222-2222-2222-000000000001'
);

-- Test 1-5: subscribe_order_push validation
select throws_ok(
  $$ select public.subscribe_order_push('push_test_token_1', '"not_an_object"'::jsonb) $$,
  'P0001',
  'invalid',
  'subscribe with non-object throws invalid'
);

select throws_ok(
  $$ select public.subscribe_order_push('push_test_token_1', jsonb_build_object(
       'endpoint', 'http://insecure.endpoint.com',
       'keys', jsonb_build_object('p256dh', 'key123', 'auth', 'auth123')
     )) $$,
  'P0001',
  'invalid',
  'subscribe with non-https endpoint throws invalid'
);

select throws_ok(
  $$ select public.subscribe_order_push('push_test_token_1', jsonb_build_object(
       'endpoint', 'https://push.example.com/sub/1',
       'keys', jsonb_build_object('auth', 'auth123')
     )) $$,
  'P0001',
  'invalid',
  'subscribe with missing p256dh throws invalid'
);

select throws_ok(
  $$ select public.subscribe_order_push('push_test_token_1', jsonb_build_object(
       'endpoint', 'https://push.example.com/sub/1',
       'keys', jsonb_build_object('p256dh', 'key123')
     )) $$,
  'P0001',
  'invalid',
  'subscribe with missing auth throws invalid'
);

select throws_ok(
  $$ select public.subscribe_order_push('non_existent_token', jsonb_build_object(
       'endpoint', 'https://push.example.com/sub/1',
       'keys', jsonb_build_object('p256dh', 'key123', 'auth', 'auth123')
     )) $$,
  'P0001',
  'order_not_found',
  'subscribe with non-existent token throws order_not_found'
);

-- Test 6-9: subscribe happy path
do $$
declare
  v_res jsonb;
begin
  v_res := public.subscribe_order_push('push_test_token_1', jsonb_build_object(
    'endpoint', 'https://push.example.com/sub/1',
    'keys', jsonb_build_object('p256dh', 'valid_p256dh_key_abc', 'auth', 'valid_auth_secret_xyz')
  ));
  perform set_config('test.sub_res', v_res::text, true);
end;
$$;

select is(
  (current_setting('test.sub_res')::jsonb ->> 'ok')::boolean,
  true,
  'subscribe_order_push returns ok: true'
);

select is(
  (select count(*) from public.push_subscriptions where endpoint = 'https://push.example.com/sub/1'),
  1::bigint,
  'push_subscriptions row created'
);

select is(
  (select count(*) from public.order_push_subscriptions where order_id = '11111111-1111-1111-1111-000000000001'),
  1::bigint,
  'order_push_subscriptions link created'
);

select is(
  (select count(*) from public.consents where customer_id = 'cccccccc-cccc-cccc-cccc-000000000001' and channel = 'push'),
  1::bigint,
  'consents row created with channel push'
);

-- Test 10: Idempotent resubscribe
select lives_ok(
  $$ select public.subscribe_order_push('push_test_token_1', jsonb_build_object(
       'endpoint', 'https://push.example.com/sub/1',
       'keys', jsonb_build_object('p256dh', 'updated_p256dh_key', 'auth', 'updated_auth_key')
     )) $$,
  'resubscribe with same endpoint succeeds idempotently'
);

-- Test 11: Non-status update does NOT queue outbox row
update public.orders set notes = 'Customer requested fast preparation'
where id = '11111111-1111-1111-1111-000000000001';

select is(
  (select count(*) from public.notification_outbox where tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  0::bigint,
  'non-status update does not queue outbox row'
);

-- Test 12-16: Status update triggers outbox queue
update public.orders set status = 'preparing'
where id = '11111111-1111-1111-1111-000000000001';

select is(
  (select count(*) from public.notification_outbox where tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  1::bigint,
  'status update queues 1 outbox row'
);

select is(
  (select payload ->> 'title' from public.notification_outbox where tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001' limit 1),
  'order:1',
  'outbox payload title matches order:1'
);

select is(
  (select payload ->> 'body' from public.notification_outbox where tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001' limit 1),
  'status:preparing',
  'outbox payload body uses word key status:preparing'
);

select is(
  (select payload ->> 'url' from public.notification_outbox where tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001' limit 1),
  '/orders/push_test_token_1',
  'outbox payload url matches /orders/push_test_token_1'
);

select is(
  (select status || ':' || attempts::text from public.notification_outbox where tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001' limit 1),
  'queued:0',
  'outbox row is queued with attempts = 0'
);

-- Test 17-18: claim_push_batch & finish_push unauthorized without secret
select throws_ok(
  $$ select public.claim_push_batch('wrong_secret', 10) $$,
  'P0001',
  'unauthorized',
  'claim_push_batch without valid vault secret throws unauthorized'
);

select throws_ok(
  $$ select public.finish_push('wrong_secret', '33333333-3333-3333-3333-000000000001', true, false) $$,
  'P0001',
  'unauthorized',
  'finish_push without valid vault secret throws unauthorized'
);

-- Create test vault secret for worker verification
select vault.create_secret('test_push_secret_999', 'push_dispatch_secret');

-- Test 19-23: claim_push_batch & finish_push with vault secret
select throws_ok(
  $$ select public.claim_push_batch('wrong_secret', 10) $$,
  'P0001',
  'unauthorized',
  'claim_push_batch with mismatched secret throws unauthorized'
);

do $$
declare
  v_batch jsonb;
  v_outbox_id uuid;
begin
  v_batch := public.claim_push_batch('test_push_secret_999', 10);
  perform set_config('test.claim_batch', v_batch::text, true);

  v_outbox_id := (v_batch -> 0 ->> 'id')::uuid;
  perform set_config('test.claimed_outbox_id', v_outbox_id::text, true);
end;
$$;

select is(
  jsonb_array_length(current_setting('test.claim_batch')::jsonb),
  1,
  'claim_push_batch returns 1 item'
);

select is(
  current_setting('test.claim_batch')::jsonb #>> '{0,subscription,endpoint}',
  'https://push.example.com/sub/1',
  'claimed item includes subscription details'
);

select is(
  (select attempts from public.notification_outbox where id = current_setting('test.claimed_outbox_id')::uuid),
  1,
  'attempts incremented to 1 after claiming'
);

-- Finish push successfully
select lives_ok(
  $$ select public.finish_push('test_push_secret_999', current_setting('test.claimed_outbox_id')::uuid, true, false) $$,
  'finish_push succeeds with valid secret'
);

select is(
  (select status from public.notification_outbox where id = current_setting('test.claimed_outbox_id')::uuid),
  'sent',
  'outbox status updated to sent'
);

-- Test 24-27: Advance status again ('confirmed' -> 'ready') and finish with p_gone = true
update public.orders set status = 'ready'
where id = '11111111-1111-1111-1111-000000000001';

do $$
declare
  v_batch jsonb;
  v_outbox_id uuid;
begin
  v_batch := public.claim_push_batch('test_push_secret_999', 10);
  v_outbox_id := (v_batch -> 0 ->> 'id')::uuid;
  perform set_config('test.second_outbox_id', v_outbox_id::text, true);
end;
$$;

select lives_ok(
  $$ select public.finish_push('test_push_secret_999', current_setting('test.second_outbox_id')::uuid, false, true) $$,
  'finish_push with p_gone = true succeeds'
);

select is(
  (select status from public.notification_outbox where id = current_setting('test.second_outbox_id')::uuid),
  'failed',
  'outbox status updated to failed'
);

select is(
  (select count(*) from public.push_subscriptions where endpoint = 'https://push.example.com/sub/1'),
  0::bigint,
  'push subscription is removed when p_gone is true'
);

select is(
  (select count(*) from public.order_push_subscriptions where order_id = '11111111-1111-1111-1111-000000000001'),
  0::bigint,
  'order_push_subscriptions link is removed on cascade'
);

-- Test 28-30: Direct writes from client roles are forbidden
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '66666666-6666-6666-6666-000000000001', 'role', 'authenticated')::text, true);

select throws_ok(
  $$ insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://evil.com', 'a', 'b') $$,
  '42501',
  null,
  'direct insert into push_subscriptions is forbidden'
);

select throws_ok(
  $$ insert into public.notification_outbox (tenant_id, payload) values ('aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '{}'::jsonb) $$,
  '42501',
  null,
  'direct insert into notification_outbox is forbidden'
);

select throws_ok(
  $$ insert into public.order_push_subscriptions (tenant_id, order_id, subscription_id)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '11111111-1111-1111-1111-000000000001', gen_random_uuid()) $$,
  '42501',
  null,
  'direct insert into order_push_subscriptions is forbidden'
);

-- Test 31-32: Cross-shop isolation (Owner B cannot see Shop A's outbox or subscriptions)
reset role;
insert into public.tenants (id, name, slug, business_type, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-000000000002', 'Other Shop B', 'other-shop-b', 'food', 'active');
insert into auth.users (id, email) values ('77777777-7777-7777-7777-000000000001', 'owner_b_push@example.com');
insert into public.tenant_members (tenant_id, user_id, role, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-000000000002', '77777777-7777-7777-7777-000000000001', 'owner', 'active');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '77777777-7777-7777-7777-000000000001', 'role', 'authenticated')::text, true);

select is(
  (select count(*) from public.notification_outbox where tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  0::bigint,
  'owner B cannot select notification_outbox of shop A'
);

select is(
  (select count(*) from public.order_push_subscriptions where tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'),
  0::bigint,
  'owner B cannot select order_push_subscriptions of shop A'
);

rollback;
