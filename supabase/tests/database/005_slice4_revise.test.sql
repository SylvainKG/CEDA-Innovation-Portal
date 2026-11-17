-- Slice 4: clarification, revision (V2), Feedback Roadmap (INN-02), outbox (NTF-02).
-- Case 0001 (Applicant C, submitted): clarification loop.
-- Case 0002 (Applicant D, in evaluation; Reviewer 1 scored V1, Reviewer 2 declared): revision loop.
begin;
create extension if not exists pgtap with schema extensions;
select plan(72);

create temp table ids (k text primary key, v text);
grant all on ids to authenticated, service_role;
insert into ids select 'c1', id::text from public.proposals where reference = 'CEDA-2026-0001';
insert into ids select 'c2', id::text from public.proposals where reference = 'CEDA-2026-0002';
insert into ids select 'v1', current_version_id::text from public.proposals where reference = 'CEDA-2026-0002';
insert into ids select 'ra1', a.id::text from public.assignments a join public.proposals p on p.id = a.proposal_id
  where p.reference = 'CEDA-2026-0002' and a.reviewer_id = '00000000-0000-4000-8000-0000000000c1';
insert into ids select 'ra2', a.id::text from public.assignments a join public.proposals p on p.id = a.proposal_id
  where p.reference = 'CEDA-2026-0002' and a.reviewer_id = '00000000-0000-4000-8000-0000000000c2';
update public.profiles set alerts_opt_in = true where id = '00000000-0000-4000-8000-0000000000a4';

create function pg_temp.sheet(s int) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('criterion_id', c.id, 'score', s, 'reason', 'Version 2 evidence reviewed (test).'))
  from public.rubric_criteria c where c.rubric_version_id = '11000000-0000-4000-8000-000000000001' $$;
create function pg_temp.answers(st1 text, st2 text, st3 text, ex text default 'Updated section 3 with pilot data (test).')
returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('task_id', t.id,
           'status', case t.position when 1 then st1 when 2 then st2 else st3 end, 'explanation', ex) order by t.position)
  from public.feedback_tasks t join public.feedback_requests r on r.id = t.feedback_request_id
  where r.proposal_id = (select v::uuid from ids where k = 'c2') and r.status = 'open' $$;
grant execute on function pg_temp.sheet(int), pg_temp.answers(text, text, text, text) to authenticated;

set local role authenticated;

-- ============================================================ clarification (REV-04, D-21, B1)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}', true);
select throws_ok(format($$select public.request_feedback(%L, 'clarification', 'Which site?')$$, (select v from ids where k = 'c1')),
  'PT403', 'FORBIDDEN', 'N3: an unassigned reviewer cannot request feedback');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
select throws_ok(format($$select public.request_feedback(%L, 'clarification', 'Which site?')$$, (select v from ids where k = 'c1')),
  'PT403', 'FORBIDDEN', 'the applicant cannot request feedback');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select throws_ok(format($$select public.request_feedback(%L, 'clarification', 'Which site?', null, array['a task'])$$, (select v from ids where k = 'c1')),
  'PT422', 'VALIDATION', 'D-21: a clarification has no tasks');
select throws_ok(format($$select public.request_feedback(%L, 'clarification', '  ')$$, (select v from ids where k = 'c1')),
  'PT422', 'VALIDATION', 'a request needs a message');
select throws_ok(format($$select public.request_feedback(%L, 'clarification', 'Which site?', now() - interval '1 day')$$, (select v from ids where k = 'c1')),
  'PT422', 'VALIDATION', 'the deadline must be in the future');

insert into ids select 'q1', public.request_feedback((select v::uuid from ids where k = 'c1'), 'clarification',
  'Please confirm the pilot site (test).') ->> 'feedback_request_id';
reset role;
select is((select status || '/' || return_stage from public.proposals where id = (select v::uuid from ids where k = 'c1')),
  'action_required/submitted', 'the case waits on the applicant and remembers it came from screening');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select throws_ok(format($$select public.request_feedback(%L, 'clarification', 'Another question')$$, (select v from ids where k = 'c1')),
  'PT409', 'INVALID_STATE', 'only one open request at a time');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from public.notifications where proposal_id = (select v::uuid from ids where k = 'c1')
           and title = 'Action required: answer a question'), 1, 'the applicant is told an answer is needed');
select is((select count(*)::int from public.feedback_requests where proposal_id = (select v::uuid from ids where k = 'c1')), 1,
  'the applicant can read the question');
select throws_ok(format($$select public.save_draft('{"title":"edit"}'::jsonb, %L)$$, (select v from ids where k = 'c1')),
  'PT409', 'INVALID_STATE', 'a clarification does not reopen the form');
select throws_ok(format($$select public.respond_clarification(%L, 'Too short')$$, (select v from ids where k = 'q1')),
  'PT422', 'VALIDATION', 'a reply needs at least 10 characters');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
select throws_ok(format($$select public.respond_clarification(%L, 'Hijacked reply text')$$, (select v from ids where k = 'q1')),
  'PT403', 'FORBIDDEN', 'another applicant cannot reply');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
select is(public.respond_clarification((select v::uuid from ids where k = 'q1'), 'The pilot site is Pandamatenga (test).') ->> 'case_status',
  'submitted', 'B1: answering returns the case to screening');
select throws_ok(format($$select public.respond_clarification(%L, 'A second reply here')$$, (select v from ids where k = 'q1')),
  'PT409', 'INVALID_STATE', 'a question is answered once');
reset role;
select is((select count(*)::int from public.proposal_versions where proposal_id = (select v::uuid from ids where k = 'c1')), 1,
  'D-21: a clarification reply creates no new version');
select is((select response_text from public.feedback_requests where id = (select v::uuid from ids where k = 'q1')),
  'The pilot site is Pandamatenga (test).', 'the reply is stored on the request');
select is((select return_stage from public.proposals where id = (select v::uuid from ids where k = 'c1')), null,
  'return_stage is cleared when the case leaves action_required');

-- ============================================================ revision request with roadmap tasks (INN-02)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}', true);
select is((public.request_feedback((select v::uuid from ids where k = 'c2'), 'revision',
  'Strengthen the evidence before we score again (test).', now() + interval '5 days',
  array['Add pilot yield data', 'Explain the maintenance plan', 'Update the budget']) ->> 'tasks')::int, 3,
  'D-09: an assigned reviewer requests a revision with 3 tasks');
reset role;
insert into ids select 'req', id::text from public.feedback_requests
  where proposal_id = (select v::uuid from ids where k = 'c2') and status = 'open';
select is((select status || '/' || return_stage from public.proposals where id = (select v::uuid from ids where k = 'c2')),
  'action_required/in_evaluation', 'the case waits on the applicant and will return to evaluation');
select throws_ok(
  format($$update public.feedback_tasks set text = 'changed' where feedback_request_id = %L$$, (select v from ids where k = 'req')),
  'PT409', 'IMMUTABLE', 'task wording cannot be changed once sent');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a4","role":"authenticated"}', true);
select is((select count(*)::int from public.feedback_tasks), 3, 'the applicant sees the three tasks');
select is((select count(*)::int from public.scorecards), 0, 'the applicant still sees no scores');

-- the applicant edits a revision working copy and adds a file
select is(public.save_draft(jsonb_build_object(
  'title', 'Greywater reuse for market gardens', 'applicant_name', 'Fictional applicant (DEMO)',
  'contact_email', 'demo@example.test', 'summary', 'Revised fictional summary (test).', 'sector', 'Horticulture',
  'problem', 'Fictional problem statement (DEMO).', 'solution', 'Fictional solution description (DEMO).',
  'impact', 'Revised impact with pilot yields (test).'), (select v::uuid from ids where k = 'c2')) ->> 'title',
  'Greywater reuse for market gardens', 'the applicant edits the revision working copy');
insert into ids values ('obj', (select v from ids where k = 'c2') || '/40000000-0000-4000-8000-000000000001.pdf');
select lives_ok(
  format($$insert into storage.objects (bucket_id, name, owner_id, metadata)
           values ('proposal-files', %L, '00000000-0000-4000-8000-0000000000a4', '{"size":4096,"mimetype":"application/pdf"}')$$,
         (select v from ids where k = 'obj')),
  'during a revision the applicant can upload files');
select isnt(public.register_attachment((select v::uuid from ids where k = 'c2'), (select v from ids where k = 'obj'),
  'business-plan-v2.pdf', 'business_plan') ->> 'id', null, 'and register them');

-- ============================================================ submit_revision refusals
insert into ids values ('k2', gen_random_uuid()::text);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
select throws_ok(format($$select public.submit_revision(%L, %L, 'note', '[]', 'sample-2026-11-v1')$$,
  (select v from ids where k = 'c2'), (select v from ids where k = 'k2')), 'PT403', 'FORBIDDEN', 'another applicant cannot submit the revision');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a4","role":"authenticated"}', true);
select throws_ok(format($$select public.submit_revision(%L, %L, '  ', pg_temp.answers('addressed','addressed','addressed'), 'sample-2026-11-v1')$$,
  (select v from ids where k = 'c2'), (select v from ids where k = 'k2')), 'PT422', 'VALIDATION', 'APP-04: a change note is required');
select throws_ok(format($$select public.submit_revision(%L, %L, 'Added pilot data', (pg_temp.answers('addressed','addressed','addressed')) - 2, 'sample-2026-11-v1')$$,
  (select v from ids where k = 'c2'), (select v from ids where k = 'k2')), 'PT422', 'VALIDATION', 'INN-02: every task needs a response');
select throws_ok(format($$select public.submit_revision(%L, %L, 'Added pilot data', pg_temp.answers('addressed','not_addressed','addressed', ''), 'sample-2026-11-v1')$$,
  (select v from ids where k = 'c2'), (select v from ids where k = 'k2')), 'PT422', 'VALIDATION', 'INN-02: every response needs an explanation');
select throws_ok(format($$select public.submit_revision(%L, %L, 'Added pilot data', '[{"task_id":"00000000-0000-0000-0000-000000000000","status":"addressed","explanation":"x"}]', 'sample-2026-11-v1')$$,
  (select v from ids where k = 'c2'), (select v from ids where k = 'k2')), 'PT422', 'VALIDATION', 'a response to an unknown task is refused');
select throws_ok(format($$select public.submit_revision(%L, %L, 'Added pilot data', pg_temp.answers('addressed','addressed','addressed'), 'old')$$,
  (select v from ids where k = 'c2'), (select v from ids where k = 'k2')), 'PT422', 'VALIDATION', 'the current declaration is required');
reset role;
select is((select status || '/' || (select count(*) from public.proposal_versions v where v.proposal_id = p.id)::text
           from public.proposals p where p.id = (select v::uuid from ids where k = 'c2')), 'action_required/1',
  'refusals left the case waiting with one version');

-- ============================================================ V2 submitted (APP-04, D-10, B9)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a4","role":"authenticated"}', true);
insert into ids select 'rcpt', public.submit_revision((select v::uuid from ids where k = 'c2'), (select v::uuid from ids where k = 'k2'),
  'Added pilot yield data and an updated budget.', pg_temp.answers('addressed', 'not_addressed', 'addressed'),
  'sample-2026-11-v1')::text;
select is((select (v::jsonb ->> 'version_no')::int from ids where k = 'rcpt'), 2, 'APP-04: Version 2 is created');
select is((select v::jsonb ->> 'reference' from ids where k = 'rcpt'), 'CEDA-2026-0002', 'the reference stays the same');
select is((select jsonb_array_length(v::jsonb -> 'files') from ids where k = 'rcpt'), 1, 'V2 lists the new file');
select is((public.submit_revision((select v::uuid from ids where k = 'c2'), (select v::uuid from ids where k = 'k2'),
  'retry', '[]', 'sample-2026-11-v1') ->> 'replayed')::boolean, true, 'B9: a retry with the same key returns the V2 receipt');
select throws_ok(format($$select public.submit_revision(%L, %L, 'x', '[]', 'sample-2026-11-v1')$$,
  (select id from public.proposals where reference = 'CEDA-2026-0005'), (select v from ids where k = 'k2')),
  'PT409', 'REQUEST_CONFLICT', 'B9: the same key on another case is a conflict');
select is((public.get_submission_receipt(null, (select v::uuid from ids where k = 'k2')) ->> 'version_no')::int, 2,
  'the V2 receipt can be found by its request key');
select is((select count(*)::int from public.proposal_versions where proposal_id = (select v::uuid from ids where k = 'c2')), 2,
  'V1 is still readable next to V2');
select throws_ok(format($$select public.save_draft('{"title":"late edit"}'::jsonb, %L)$$, (select v from ids where k = 'c2')),
  'PT409', 'INVALID_STATE', 'the form closes again once V2 is submitted');
reset role;

select is((select status from public.proposals where id = (select v::uuid from ids where k = 'c2')), 'in_evaluation',
  'D-10: the case returns to evaluation');
select is((select count(*)::int from public.feedback_tasks t where t.feedback_request_id = (select v::uuid from ids where k = 'req')
           and t.addressed_in_version_id = (select current_version_id from public.proposals where id = (select v::uuid from ids where k = 'c2'))
           and t.applicant_explanation is not null), 3, 'INN-02: every task carries the applicant''s status and explanation on V2');
select is((select status from public.feedback_requests where id = (select v::uuid from ids where k = 'req')), 'answered',
  'the revision request is answered');
select is((select count(*)::int from public.scorecards where version_id = (select v::uuid from ids where k = 'v1') and status = 'submitted'), 1,
  'APP-04: Reviewer 1''s V1 scorecard is kept');
select throws_ok(
  format($$update public.feedback_tasks set applicant_status = 'addressed' where feedback_request_id = %L$$, (select v from ids where k = 'req')),
  'PT409', 'IMMUTABLE', 'the applicant''s task answers are locked with the version');

-- ============================================================ verification (INN-02)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select is((select my_status from public.my_review_queue() where proposal_id = (select v::uuid from ids where k = 'c2')), 'not_started',
  'D-10: V2 needs a new scorecard from Reviewer 1');
insert into ids select 't' || position, id::text from public.feedback_tasks where feedback_request_id = (select v::uuid from ids where k = 'req');
select throws_ok(format($$select public.verify_feedback_task(%L, %L, 'not_verified', '')$$, (select v from ids where k = 't2'), (select v from ids where k = 'ra1')),
  'PT422', 'VALIDATION', '"Not verified" needs a note');
select throws_ok(format($$select public.submit_scorecard(%L, pg_temp.sheet(4))$$, (select v from ids where k = 'ra1')),
  'PT422', 'VALIDATION', 'INN-02: the V2 scorecard needs every task verified first');
select is(public.verify_feedback_task((select v::uuid from ids where k = 't1'), (select v::uuid from ids where k = 'ra1'), 'verified') ->> 'result',
  'verified', 'Reviewer 1 verifies task 1');
select lives_ok(format($$select public.verify_feedback_task(%L, %L, 'not_verified', 'The maintenance plan is still missing.')$$,
  (select v from ids where k = 't2'), (select v from ids where k = 'ra1')), 'Reviewer 1 marks task 2 not verified, with a note');
select lives_ok(format($$select public.verify_feedback_task(%L, %L, 'verified')$$, (select v from ids where k = 't3'), (select v from ids where k = 'ra1')),
  'Reviewer 1 verifies task 3');
select is(public.submit_scorecard((select v::uuid from ids where k = 'ra1'), pg_temp.sheet(4)) ->> 'status', 'submitted',
  'Reviewer 1 submits the V2 scorecard');
select throws_ok(format($$select public.verify_feedback_task(%L, %L, 'not_verified', 'Changed my mind')$$, (select v from ids where k = 't1'), (select v from ids where k = 'ra1')),
  'PT409', 'INVALID_STATE', 'verifications lock with the submitted scorecard');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}', true);
select throws_ok(format($$select public.verify_feedback_task(%L, %L, 'verified')$$, (select v from ids where k = 't1'), (select v from ids where k = 'ra1')),
  'PT403', 'FORBIDDEN', 'N3: an unassigned reviewer cannot verify');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a4","role":"authenticated"}', true);
select throws_ok(format($$select public.verify_feedback_task(%L, %L, 'verified')$$, (select v from ids where k = 't1'), (select v from ids where k = 'ra1')),
  'PT403', 'FORBIDDEN', 'the applicant cannot verify their own tasks');
select is((select count(*)::int from public.task_verifications), 0, 'B6: the applicant cannot see verifications before a published decision');
select is((select (t ->> 'verifications') from jsonb_array_elements(public.get_roadmap((select v::uuid from ids where k = 'c2'))) r,
           jsonb_array_elements(r -> 'tasks') t where (t ->> 'position')::int = 1 and r ->> 'kind' = 'revision'), null,
  'B6: the applicant''s roadmap view omits verifications');
reset role;
select throws_ok(
  format($$update public.task_verifications set result = 'not_verified' where assignment_id = %L$$, (select v from ids where k = 'ra1')),
  'PT409', 'IMMUTABLE', 'locked verifications cannot be edited directly');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}', true);
select lives_ok(format($$select public.verify_feedback_task(t.id, %L, 'verified') from public.feedback_tasks t where t.feedback_request_id = %L$$,
  (select v from ids where k = 'ra2'), (select v from ids where k = 'req')), 'Reviewer 2 verifies all three tasks');
select is((public.submit_scorecard((select v::uuid from ids where k = 'ra2'), pg_temp.sheet(5)) ->> 'quorum_reached')::boolean, true,
  'D-10/D-11: two V2 scorecards move the case to adjudication');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
insert into ids select 'rm', public.get_roadmap((select v::uuid from ids where k = 'c2'))::text;
select is((select (r -> 'summary' ->> 'verified')::int from ids, jsonb_array_elements(v::jsonb) r where k = 'rm' and r ->> 'kind' = 'revision'), 5,
  'roadmap summary for the adjudicator: 5 of 6 verifications are "verified"');
select is((select (r -> 'summary' ->> 'not_verified')::int from ids, jsonb_array_elements(v::jsonb) r where k = 'rm' and r ->> 'kind' = 'revision'), 1,
  'and 1 is "not verified"');
select is((select (r -> 'summary' ->> 'addressed')::int from ids, jsonb_array_elements(v::jsonb) r where k = 'rm' and r ->> 'kind' = 'revision'), 2,
  'and the applicant marked 2 of 3 tasks addressed');
select is(((public.get_score_panel((select v::uuid from ids where k = 'c2'))) ->> 'version_no')::int, 2,
  'the panel shows the V2 scorecards');
reset role;

-- ============================================================ email outbox (NTF-02, B4)
select is((select count(*)::int from public.email_outbox where user_id = '00000000-0000-4000-8000-0000000000a4'), 2,
  'opted-in applicant: request and V2 receipt emails are queued in the same transactions');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a4","role":"authenticated"}', true);
select throws_ok($$select * from public.claim_outbox_batch(5)$$, '42501', null, 'browsers cannot claim outbox rows');
select throws_ok($$select count(*) from public.email_outbox$$, '42501', null, 'browsers cannot read the outbox');
reset role;

set local role service_role;
insert into ids select 'o' || row_number() over (), id::text from public.claim_outbox_batch(10);
select is((select count(*)::int from ids where k like 'o%' and k <> 'obj'), 2, 'the relay claims both due rows');
select is((select count(*)::int from public.claim_outbox_batch(10)), 0, 'claimed rows are leased and not handed out twice');
select is(public.record_outbox_result((select v::uuid from ids where k = 'o1'), 'accepted', 'msg-1') ->> 'status', 'accepted',
  'an accepted email is recorded as accepted by the provider');
select is(public.record_outbox_result((select v::uuid from ids where k = 'o1'), 'retryable') ->> 'changed', 'false',
  'an accepted row never moves backwards');
reset role;
update public.email_outbox set attempts = 5 where id = (select v::uuid from ids where k = 'o2');
set local role service_role;
select is(public.record_outbox_result((select v::uuid from ids where k = 'o2'), 'unknown_outcome', null, 'timeout') ->> 'status', 'rejected',
  'after the maximum attempts the relay gives up and says so');
reset role;

select * from finish();
rollback;
