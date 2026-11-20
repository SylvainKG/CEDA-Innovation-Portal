-- set_alert_preference (NTF-02, migration 015): own setting only, audited, and it drives the e-mail queue.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

set local role anon;
select throws_ok($$select public.set_alert_preference(true)$$, '42501', null, 'signed out, set_alert_preference cannot be called');
reset role;

-- Applicant A starts with alerts off (seed default).
select is((select alerts_opt_in from public.profiles where id = '00000000-0000-4000-8000-0000000000a1'), false,
  'alerts are off by default');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select is(public.set_alert_preference(true), '{"alerts_opt_in": true}'::jsonb, 'Applicant A turns alerts on');
select throws_ok($$select public.set_alert_preference(null)$$, 'PT422', 'VALIDATION', 'a missing choice is refused');
select is((select alerts_opt_in from public.profiles where id = '00000000-0000-4000-8000-0000000000a1'), true,
  'the setting is stored on their own profile');
reset role;

select is((select alerts_opt_in from public.profiles where id = '00000000-0000-4000-8000-0000000000a2'), false,
  'Applicant B is unaffected (the function has no user parameter)');
select is((select count(*)::int from public.audit_events
           where action = 'account.alerts_changed' and target_id = '00000000-0000-4000-8000-0000000000a1'
             and metadata ->> 'alerts_opt_in' = 'true'), 1,
  'the change is audited');

-- The setting drives the e-mail queue: a notification to A now also queues an e-mail.
select private.notify('00000000-0000-4000-8000-0000000000a1', null, 'test.alert', 'Test', 'Test body (DEMO).', 'case_under_review', '{}'::jsonb);
select is((select count(*)::int from public.email_outbox where user_id = '00000000-0000-4000-8000-0000000000a1' and template = 'case_under_review'), 1,
  'with alerts on, a notification queues one e-mail');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select is(public.set_alert_preference(false), '{"alerts_opt_in": false}'::jsonb, 'Applicant A turns alerts off again');
reset role;
select private.notify('00000000-0000-4000-8000-0000000000a1', null, 'test.alert', 'Test', 'Test body (DEMO).', 'case_under_review', '{}'::jsonb);
select is((select count(*)::int from public.email_outbox where user_id = '00000000-0000-4000-8000-0000000000a1' and template = 'case_under_review'), 1,
  'with alerts off, no further e-mail is queued');

select * from finish();
rollback;
