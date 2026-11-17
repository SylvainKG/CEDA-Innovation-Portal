-- Scheduled maintenance: request expiry and extension (REV-04), missed chats (CHT-03),
-- email relay trigger (NTF-02). Case 0003 (Applicant E) waits on a clarification due 20 Nov 2026.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

create temp table ids (k text primary key, v text);
grant all on ids to authenticated, service_role;
insert into ids select 'c3', id::text from public.proposals where reference = 'CEDA-2026-0003';
insert into ids select 'q', id::text from public.feedback_requests
  where proposal_id = (select id from public.proposals where reference = 'CEDA-2026-0003');
-- Make the deadline certainly past, independent of the date the tests run.
update public.feedback_requests set due_at = now() - interval '1 hour' where id = (select v::uuid from ids where k = 'q');
-- A chat left waiting for an hour.
insert into public.chat_sessions (applicant_id, status, queued_at)
values ('00000000-0000-4000-8000-0000000000a1', 'queued', now() - interval '1 hour');

-- ============================================================ access
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select throws_ok($$select public.run_maintenance()$$, '42501', null, 'maintenance cannot be run from a browser, even by an admin');
reset role;
select ok(has_function_privilege('service_role', 'public.run_maintenance()', 'execute'), 'the service role (scheduler) may run maintenance');

-- ============================================================ run_maintenance
set local role service_role;
insert into ids select 'm', public.run_maintenance()::text;
reset role;
select is((select (v::jsonb ->> 'expired_requests')::int from ids where k = 'm'), 1, 'one overdue request expired');
select is((select (v::jsonb ->> 'missed_chats')::int from ids where k = 'm'), 1, 'the abandoned chat is recorded as missed');
select is((select status from public.feedback_requests where id = (select v::uuid from ids where k = 'q')), 'expired',
  'the request is now expired');
select is((select status from public.proposals where id = (select v::uuid from ids where k = 'c3')), 'action_required',
  'the case itself is unchanged: staff decide what happens next');
select is((select count(*)::int from public.notifications where proposal_id = (select v::uuid from ids where k = 'c3')
           and type = 'feedback.expired' and user_id = '00000000-0000-4000-8000-0000000000b1'), 1,
  'the screening officer who asked is told the deadline passed');
select is((select count(*)::int from public.audit_events where action = 'feedback.expired' and actor_role = 'system'), 1,
  'the expiry is audited as a system action');
set local role service_role;
select is((public.run_maintenance() ->> 'expired_requests')::int, 0, 'running again changes nothing');
reset role;

-- ============================================================ after expiry
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a5","role":"authenticated"}', true);
select throws_ok(format($$select public.respond_clarification(%L, 'Late reply from the applicant.')$$, (select v from ids where k = 'q')),
  'PT409', 'INVALID_STATE', 'an expired request no longer accepts a reply');
select throws_ok(format($$select public.extend_feedback_deadline(%L, now() + interval '3 days')$$, (select v from ids where k = 'q')),
  'PT403', 'FORBIDDEN', 'the applicant cannot extend their own deadline');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}', true);
select throws_ok(format($$select public.extend_feedback_deadline(%L, now() + interval '3 days')$$, (select v from ids where k = 'q')),
  'PT403', 'FORBIDDEN', 'an unassigned reviewer cannot extend it');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select throws_ok(format($$select public.extend_feedback_deadline(%L, now() - interval '1 day')$$, (select v from ids where k = 'q')),
  'PT422', 'VALIDATION', 'the new deadline must be in the future');
select is(public.extend_feedback_deadline((select v::uuid from ids where k = 'q'), now() + interval '3 days') ->> 'status', 'open',
  'the screening officer reopens the request with a new deadline');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a5","role":"authenticated"}', true);
select is((select count(*)::int from public.notifications where proposal_id = (select v::uuid from ids where k = 'c3')
           and type = 'feedback.extended'), 1, 'the applicant is told the new deadline');
select is(public.respond_clarification((select v::uuid from ids where k = 'q'), 'The pilot farms are in Kasane (test).') ->> 'case_status',
  'submitted', 'the applicant can answer again and the case returns to screening');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select throws_ok(format($$select public.extend_feedback_deadline(%L, now() + interval '3 days')$$, (select v from ids where k = 'q')),
  'PT409', 'INVALID_STATE', 'an answered request cannot be extended');
reset role;

-- ============================================================ email relay trigger
select ok(private.trigger_email_relay() in ('not_available', 'not_configured', 'nothing_due'),
  'without Vault secrets the relay trigger does nothing and says why');
select ok(not has_function_privilege('authenticated', 'private.trigger_email_relay()', 'execute'),
  'browsers cannot trigger the relay');

-- Schedules exist where pg_cron is installed (Supabase); elsewhere the migration skipped them.
create function pg_temp.schedules_ok() returns boolean language plpgsql as $f$
declare v boolean;
begin
  if to_regnamespace('cron') is null then return true; end if;
  execute $q$select count(*) = 2 from cron.job where jobname in ('ceda-maintenance', 'ceda-email-relay')$q$ into v;
  return v;
end $f$;
select ok(pg_temp.schedules_ok(), 'maintenance and relay schedules are registered when pg_cron is available');

select * from finish();
rollback;
