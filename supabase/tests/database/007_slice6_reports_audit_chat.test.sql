-- Slice 6a: programme report (RPT-01) reconciled with the seed, CSV rows,
-- audit query (SEC-03), chat hours/override (CHT-02), chat flow (CHT-01), statistics (CHT-03).
-- Seed: 8 submitted cases (0001 submitted, 0002/0008 in evaluation, 0003 action required,
-- 0004 in adjudication, 0005 not approved, 0006 awarded BWP 250,000, 0007 closed), applicants C, D, E and A.
begin;
create extension if not exists pgtap with schema extensions;
select plan(45);

create temp table ids (k text primary key, v text);
grant all on ids to authenticated, anon;

set local role authenticated;

-- ============================================================ RPT-01 access
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select throws_ok($$select public.get_programme_report()$$, 'PT403', 'FORBIDDEN', 'a reviewer cannot read programme reports');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f2","role":"authenticated"}', true);
select throws_ok($$select public.get_programme_report()$$, 'PT403', 'FORBIDDEN', 'D-08: the committee has no report access unless CEDA confirms it');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select throws_ok($$select public.get_programme_report(null, '2026-12-01', '2026-11-01')$$, 'PT422', 'VALIDATION',
  'a period that ends before it starts is refused');
insert into ids select 'r', public.get_programme_report()::text;

-- ============================================================ RPT-01 reconciliation with the seed
select is((select (v::jsonb -> 'participation' ->> 'submitted')::int from ids where k = 'r'), 8, 'participation: 8 submitted cases');
select is((select (v::jsonb -> 'participation' ->> 'distinct_applicants')::int from ids where k = 'r'), 4, 'participation: 4 distinct applicants');
select is((select v::jsonb -> 'outcomes' -> 'by_current_stage' from ids where k = 'r'),
  '{"submission":1,"review":3,"feedback":1,"approval":1,"award":1,"closed":1}'::jsonb, 'outcomes: cases by current stage');
select is((select (v::jsonb -> 'outcomes' ->> 'approved')::int from ids where k = 'r'), 1, 'outcomes: 1 approved (and awarded)');
select is((select (v::jsonb -> 'outcomes' ->> 'not_approved')::int from ids where k = 'r'), 1, 'outcomes: 1 not approved');
select is((select (v::jsonb -> 'outcomes' ->> 'award_total_minor')::bigint from ids where k = 'r'), 25000000::bigint,
  'outcomes: award total BWP 250,000 in thebe');
select is((select (e ->> 'reached')::int from ids, jsonb_array_elements(v::jsonb -> 'funnel') e where k = 'r' and e ->> 'stage' = 'review'), 5,
  'funnel: 5 cases reached Review (0002, 0004, 0005, 0006, 0008)');
select is((select (e ->> 'reached')::int from ids, jsonb_array_elements(v::jsonb -> 'funnel') e where k = 'r' and e ->> 'stage' = 'approval'), 2,
  'funnel: 2 cases reached Approval');
select is((select (v::jsonb -> 'impact' ->> 'reached_later_stage_share')::numeric from ids where k = 'r'), 0.75,
  'impact: 6 of 8 ideas reached Review or later');
select is((select (v::jsonb -> 'impact' ->> 'resubmitted_after_feedback')::int from ids where k = 'r'), 0,
  'impact: no resubmissions in the seed yet');
select ok((select jsonb_array_length(v::jsonb -> 'time_in_stage') > 0 from ids where k = 'r'), 'time in stage is reported per status');

select is((public.get_programme_report(null, '2026-11-01T00:00:00+02:00', '2026-12-01T00:00:00+02:00') -> 'participation' ->> 'submitted')::int, 4,
  'period filter: 4 cases submitted in November (0001, 0002, 0003, 0008)');
select is((public.get_programme_report('20000000-0000-4000-8000-000000000002') -> 'participation' ->> 'submitted')::int, 0,
  'challenge filter: none for the closed challenge');

-- CSV rows match the report
select is((select count(*)::int from public.report_case_rows()), 8, 'CSV: one row per case');
select is((select count(*)::int from public.report_case_rows() where public_stage = 'review'), 3, 'CSV: stage counts match the report');
select is((select award_minor from public.report_case_rows() where reference = 'CEDA-2026-0006'), 25000000::bigint, 'CSV: award amount in thebe');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
select is((select published_outcome from public.report_case_rows() where reference = 'CEDA-2026-0005'), 'not_approved',
  'the adjudicator (programme reports) sees published outcomes');

-- ============================================================ SEC-03 audit query
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select throws_ok($$select * from public.query_audit()$$, 'PT403', 'FORBIDDEN', 'SEC-03: staff without audit.read cannot query the audit trail');
select public.record_screening((select id from public.proposals where reference = 'CEDA-2026-0001'), 'eligible', 'Meets the criteria (test)');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select is((select count(*)::int from public.query_audit(p_reference => 'ceda-2026-0001')), 2,
  'filter by case reference (case-insensitive): seeded submission + screening');
select is((select actor_name from public.query_audit(p_reference => 'CEDA-2026-0001', p_action => 'case.') limit 1),
  'Demo Screening Officer', 'filter by action prefix, with the actor''s name');
select is((select count(*)::int from public.query_audit(p_actor_id => '00000000-0000-4000-8000-0000000000b1')), 2,
  'filter by actor: their sign-up and the screening');
select is((select count(*)::int from public.query_audit(p_action => '%')), 0, 'wildcards in the action filter are treated literally');
insert into ids select 'top', max(id)::text from public.query_audit();
select ok((select bool_and(id < (select v::bigint from ids where k = 'top')) from public.query_audit(p_before_id => (select v::bigint from ids where k = 'top'))),
  'keyset pagination returns only older rows');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}', true);
reset role;

-- ============================================================ CHT-02 hours (Gaborone time)
select ok(private.chat_is_open_at('2026-11-18T10:00:00+02:00'), 'Wednesday 10:00 CAT: open');
select ok(not private.chat_is_open_at('2026-11-18T16:00:00+02:00'), 'Wednesday 16:00 CAT: closed (closing time)');
select ok(private.chat_is_open_at('2026-11-18T07:30:00Z'), '07:30 UTC = 09:30 CAT: open');
select ok(not private.chat_is_open_at('2026-11-21T10:00:00+02:00'), 'Saturday: closed');
select ok(not private.chat_is_open_at('2026-12-25T10:00:00+02:00'), 'public holiday: closed');

-- demo override (judges can see both states)
update public.app_settings set value = '"closed"'::jsonb where key = 'chat_demo_override';
set local role anon;
select set_config('request.jwt.claims', '', true);
select is((public.chat_status() ->> 'mode'), 'demo_override_closed', 'anyone can see the chat state before signing in');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$select public.start_chat('Hello, I need help with my upload.')$$, 'PT409', 'INVALID_STATE',
  'CHT-02: outside hours a chat cannot start');
reset role;
update public.app_settings set value = '"open"'::jsonb where key = 'chat_demo_override';

-- ============================================================ CHT-01 flow
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select throws_ok($$select public.start_chat('Hi')$$, 'PT403', 'FORBIDDEN', 'D-13: only applicants start chats');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
insert into ids select 's1', public.start_chat('Hello, I need help with my upload.') ->> 'session_id';
select is(public.start_chat('Are you there?') ->> 'session_id', (select v from ids where k = 's1'),
  'a second message joins the open conversation');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
insert into ids select 's2', public.start_chat('Question about eligibility.') ->> 'session_id';
select is((select count(*)::int from public.chat_messages), 1, 'CHT-01: Applicant B sees only their own conversation');
select throws_ok(format($$select public.send_chat_message(%L, 'intrusion')$$, (select v from ids where k = 's1')),
  'PT403', 'FORBIDDEN', 'Applicant B cannot post into A''s conversation');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}', true);
select is((select count(*)::int from public.my_chat_inbox() where status = 'queued'), 2, 'the consultant sees both waiting conversations');
select lives_ok(format($$select public.accept_chat(%L)$$, (select v from ids where k = 's1')), 'the consultant accepts A''s conversation');
select lives_ok(format($$select public.accept_chat(%L)$$, (select v from ids where k = 's2')), 'and holds B''s at the same time');
select lives_ok(format($$select public.send_chat_message(%L, 'Use the Attachments step of the form.')$$, (select v from ids where k = 's1')),
  'the consultant replies');
select is(public.close_chat((select v::uuid from ids where k = 's1')) ->> 'status', 'closed', 'the conversation is closed');
select throws_ok(format($$select public.send_chat_message(%L, 'late')$$, (select v from ids where k = 's1')),
  'PT409', 'INVALID_STATE', 'no messages after closing');

-- ============================================================ CHT-03 statistics (support lead)
insert into ids select 'st', public.chat_statistics('2026-11-01T00:00:00+02:00', '2026-11-16T00:00:00+02:00')::text;
select is((select v::jsonb ->> 'volume' || '/' || (v::jsonb ->> 'handled') || '/' || (v::jsonb ->> 'missed') from ids where k = 'st'), '6/4/2',
  'CHT-03: seeded period has 6 chats, 4 handled, 2 missed');
select is((select (v::jsonb ->> 'average_wait_seconds')::int from ids where k = 'st'), 240, 'CHT-03: average wait 4 minutes');
reset role;

select * from finish();
rollback;
