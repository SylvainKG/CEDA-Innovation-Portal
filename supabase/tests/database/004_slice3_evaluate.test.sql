-- Slice 3: declare_assignment, save/submit_scorecard, quorum (D-11), panel (REV-03),
-- reviewer queue, notifications (NTF-01), rubric locks (REV-02). Negatives N10, N11.
-- Case 0008 (Applicant A's earlier idea): Reviewers 1 and 2 assigned, not yet declared.
begin;
create extension if not exists pgtap with schema extensions;
select plan(61);

create temp table ids (k text primary key, v text);
grant all on ids to authenticated;
insert into ids select 'c8', id::text from public.proposals where reference = 'CEDA-2026-0008';
insert into ids select 'c1', id::text from public.proposals where reference = 'CEDA-2026-0001';
insert into ids select 'a1', a.id::text from public.assignments a join public.proposals p on p.id = a.proposal_id
  where p.reference = 'CEDA-2026-0008' and a.reviewer_id = '00000000-0000-4000-8000-0000000000c1';
insert into ids select 'a2', a.id::text from public.assignments a join public.proposals p on p.id = a.proposal_id
  where p.reference = 'CEDA-2026-0008' and a.reviewer_id = '00000000-0000-4000-8000-0000000000c2';

-- Score sheets for rubric v1 (Innovation 30, Market 25, Feasibility 25, Impact 20).
create function pg_temp.sheet(s1 int, s2 int, s3 int, s4 int, reason text default 'Clear evidence in the proposal (test).')
returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('criterion_id', '12000000-0000-4000-8000-000000000001', 'score', s1, 'reason', reason),
    jsonb_build_object('criterion_id', '12000000-0000-4000-8000-000000000002', 'score', s2, 'reason', reason),
    jsonb_build_object('criterion_id', '12000000-0000-4000-8000-000000000003', 'score', s3, 'reason', reason),
    jsonb_build_object('criterion_id', '12000000-0000-4000-8000-000000000004', 'score', s4, 'reason', reason)) $$;
grant execute on function pg_temp.sheet(int, int, int, int, text) to authenticated;

set local role authenticated;

-- ============================================================ declaration gate (D-19, N10)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select is((select count(*)::int from public.proposals where id = (select v::uuid from ids where k = 'c8')), 0,
  'N10: before declaring, the reviewer cannot read the case');
select throws_ok(format($$select public.declare_assignment(%L, false, false)$$, (select v from ids where k = 'a1')),
  'PT422', 'VALIDATION', 'a no-conflict declaration needs the confidentiality agreement');
select throws_ok(format($$select public.declare_assignment(%L, null, true)$$, (select v from ids where k = 'a1')),
  'PT422', 'VALIDATION', 'the conflict question must be answered');
select throws_ok(format($$select public.save_scorecard(%L, pg_temp.sheet(3,3,3,3))$$, (select v from ids where k = 'a1')),
  'PT403', 'FORBIDDEN', 'N10: scoring is refused before the declaration');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}', true);
select throws_ok(format($$select public.declare_assignment(%L, false, true)$$, (select v from ids where k = 'a1')),
  'PT403', 'FORBIDDEN', 'a reviewer cannot declare on someone else''s assignment');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select is((public.declare_assignment((select v::uuid from ids where k = 'a1'), false, true) ->> 'has_conflict')::boolean, false,
  'Reviewer 1 declares no conflict');
select is((select count(*)::int from public.proposals where id = (select v::uuid from ids where k = 'c8')), 1,
  'after declaring, the case opens');
select is((public.declare_assignment((select v::uuid from ids where k = 'a1'), false, true) ->> 'replayed')::boolean, true,
  'repeating the same declaration is safe');
select throws_ok(format($$select public.declare_assignment(%L, true)$$, (select v from ids where k = 'a1')),
  'PT409', 'INVALID_STATE', 'a recorded declaration cannot be changed');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}', true);
select throws_ok(format($$select public.save_scorecard(%L, pg_temp.sheet(3,3,3,3))$$, (select v from ids where k = 'a1')),
  'PT403', 'FORBIDDEN', 'N3: Reviewer 3 cannot score someone else''s assignment');

-- ============================================================ draft and validation (D-20)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select is(public.save_scorecard((select v::uuid from ids where k = 'a1'),
  '[{"criterion_id":"12000000-0000-4000-8000-000000000001","score":4,"reason":""}]'::jsonb) ->> 'status', 'draft',
  'a partial scorecard saves as a draft');
select is(public.save_scorecard((select v::uuid from ids where k = 'a1')) ->> 'weighted_score', null,
  'an incomplete draft has no weighted score');
select throws_ok(format($$select public.save_scorecard(%L, pg_temp.sheet(6,3,3,3))$$, (select v from ids where k = 'a1')),
  'PT422', 'VALIDATION', 'a score above 5 is refused');
select throws_ok(format($$select public.save_scorecard(%L, '[{"criterion_id":"12000000-0000-4000-8000-000000000001","score":3.5}]')$$,
  (select v from ids where k = 'a1')), 'PT422', 'VALIDATION', 'half points are refused');
select throws_ok(format($$select public.save_scorecard(%L, '[{"criterion_id":"12000000-0000-4000-8000-000000000011","score":3}]')$$,
  (select v from ids where k = 'a1')), 'PT422', 'VALIDATION', 'a criterion from another rubric is refused');
select throws_ok(format($$select public.save_scorecard(%L, '[{"criterion_id":"12000000-0000-4000-8000-000000000001","score":3},{"criterion_id":"12000000-0000-4000-8000-000000000001","score":4}]')$$,
  (select v from ids where k = 'a1')), 'PT422', 'VALIDATION', 'the same criterion twice is refused');
select throws_ok(format($$select public.submit_scorecard(%L)$$, (select v from ids where k = 'a1')),
  'PT422', 'VALIDATION', 'an incomplete scorecard cannot be submitted');
select throws_ok(format($$select public.submit_scorecard(%L, pg_temp.sheet(4,3,4,3,'Too short'))$$, (select v from ids where k = 'a1')),
  'PT422', 'VALIDATION', 'each reason needs at least 20 characters');
select is((select status from public.scorecards where assignment_id = (select v::uuid from ids where k = 'a1')), 'draft',
  'refused submissions leave the scorecard as a draft');

-- ============================================================ submit (REV-03)
insert into ids select 'r1', public.submit_scorecard((select v::uuid from ids where k = 'a1'), pg_temp.sheet(4,3,4,3))::text;
select is((select v::jsonb ->> 'status' from ids where k = 'r1'), 'submitted', 'Reviewer 1 submits');
select is((select (v::jsonb ->> 'weighted_score')::numeric from ids where k = 'r1'), 3.55, 'weighted score: 4·30% + 3·25% + 4·25% + 3·20% = 3.55');
select is((select (v::jsonb ->> 'quorum_reached')::boolean from ids where k = 'r1'), false, 'one of two scorecards: no quorum yet');
select is((public.submit_scorecard((select v::uuid from ids where k = 'a1'), pg_temp.sheet(1,1,1,1)) ->> 'replayed')::boolean, true,
  'a retry returns the recorded result');
select is((select count(*)::int from public.scorecard_items i join public.scorecards s on s.id = i.scorecard_id
           where s.assignment_id = (select v::uuid from ids where k = 'a1') and i.score = 1), 0,
  'the retry did not change the submitted scores');
select throws_ok(format($$select public.save_scorecard(%L, pg_temp.sheet(5,5,5,5))$$, (select v from ids where k = 'a1')),
  'PT409', 'INVALID_STATE', 'a submitted scorecard cannot be edited');
select is(((public.get_score_panel((select v::uuid from ids where k = 'c8'))) ->> 'submitted_count')::int, 1,
  'after submitting, Reviewer 1 can open the panel');

-- ============================================================ peer isolation
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}', true);
select is((public.declare_assignment((select v::uuid from ids where k = 'a2'), false, true) ->> 'has_conflict')::boolean, false,
  'Reviewer 2 declares no conflict');
select is((select count(*)::int from public.scorecards s join public.assignments a on a.id = s.assignment_id
           where a.proposal_id = (select v::uuid from ids where k = 'c8')), 0,
  'REV-03: Reviewer 2 cannot see Reviewer 1''s scores before submitting');
select throws_ok(format($$select public.get_score_panel(%L)$$, (select v from ids where k = 'c8')),
  'PT403', 'FORBIDDEN', 'REV-03: nor open the panel');

-- ============================================================ quorum -> adjudication (D-11)
select is((public.submit_scorecard((select v::uuid from ids where k = 'a2'), pg_temp.sheet(5,5,4,4)) ->> 'quorum_reached')::boolean, true,
  'the second scorecard reaches the quorum');
select is((select count(*)::int from public.scorecards s join public.assignments a on a.id = s.assignment_id
           where a.proposal_id = (select v::uuid from ids where k = 'c8')), 2,
  'after submitting, Reviewer 2 sees both scorecards');
select throws_ok(format($$select public.save_scorecard(%L, pg_temp.sheet(5,5,5,5))$$, (select v from ids where k = 'a2')),
  'PT409', 'INVALID_STATE', 'scoring closes once the case moves to adjudication');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
insert into ids select 'panel', public.get_score_panel((select v::uuid from ids where k = 'c8'))::text;
select is((select (v::jsonb -> 'aggregate' ->> 'mean_weighted')::numeric from ids where k = 'panel'), 4.05,
  'panel: mean weighted score (3.55 and 4.55) is 4.05');
select is((select (v::jsonb -> 'aggregate' ->> 'spread')::numeric from ids where k = 'panel'), 1.00, 'panel: weighted spread is 1.00');
select is((select (e ->> 'spread')::int from ids, jsonb_array_elements(v::jsonb -> 'criteria_summary') e
           where k = 'panel' and e ->> 'key' = 'market_potential'), 2, 'panel: Market potential scores differ by 2');
select is((select (v::jsonb -> 'aggregate' ->> 'flagged')::boolean from ids where k = 'panel'), true,
  'B7: a 2-point disagreement is flagged for the adjudicator');
select is((select count(*)::int from public.notifications where proposal_id = (select v::uuid from ids where k = 'c8')
           and type = 'case.ready_for_decision'), 1, 'the adjudicator was notified');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select is((select count(*)::int from public.scorecards), 0, 'the applicant never sees scorecards');
select throws_ok(format($$select public.get_score_panel(%L)$$, (select v from ids where k = 'c8')),
  'PT403', 'FORBIDDEN', 'nor the panel');
reset role;

select is((select status from public.proposals where id = (select v::uuid from ids where k = 'c8')), 'in_adjudication',
  'D-11: the case moved to adjudication');
select is((select count(*)::int from public.case_events where proposal_id = (select v::uuid from ids where k = 'c8')
           and to_status = 'in_adjudication' and reason like 'Review quorum reached%'), 1, 'the move is in the case history');
select is((select count(*)::int from public.audit_events where proposal_id = (select v::uuid from ids where k = 'c8')
           and action in ('scorecard.submitted', 'case.quorum_reached')), 3, 'two submissions and the quorum are audited');

-- ============================================================ conflict (N11) on case 0001
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select public.record_screening((select v::uuid from ids where k = 'c1'), 'eligible', 'Meets the criteria (test)');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select public.assign_reviewers((select v::uuid from ids where k = 'c1'),
  array['00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c2']::uuid[]);
reset role;
insert into ids select 'x2', id::text from public.assignments
  where proposal_id = (select v::uuid from ids where k = 'c1') and reviewer_id = '00000000-0000-4000-8000-0000000000c2';
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}', true);
select is((public.declare_assignment((select v::uuid from ids where k = 'x2'), true) ->> 'revoked')::boolean, true,
  'N11: declaring a conflict removes the assignment');
select is((select count(*)::int from public.proposals where id = (select v::uuid from ids where k = 'c1')), 0,
  'N11: the reviewer cannot read the case afterwards');
select is((select count(*)::int from public.my_review_queue() where proposal_id = (select v::uuid from ids where k = 'c1')), 0,
  'N11: the case leaves the reviewer''s queue');
select throws_ok(format($$select public.save_scorecard(%L, pg_temp.sheet(3,3,3,3))$$, (select v from ids where k = 'x2')),
  'PT403', 'FORBIDDEN', 'N11: the reviewer cannot score it');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select is((select count(*)::int from public.notifications where proposal_id = (select v::uuid from ids where k = 'c1')
           and type = 'assignment.conflict'), 1, 'N11: the admin is told to reassign');
select throws_ok(format($$select public.assign_reviewers(%L, array['00000000-0000-4000-8000-0000000000c2']::uuid[])$$,
  (select v from ids where k = 'c1')), 'PT422', 'VALIDATION', 'N11: a conflicted reviewer cannot be reassigned to the case');
reset role;
select is((select count(*)::int from public.audit_events where action = 'assignment.conflict_declared'
           and target_id = (select v from ids where k = 'x2')), 1, 'N11: the conflict is audited');

-- ============================================================ reviewer queue (T07)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select is((select my_status from public.my_review_queue() where proposal_id = (select v::uuid from ids where k = 'c1')),
  'declaration_needed', 'queue: a new case needs a declaration');
select is((select my_status from public.my_review_queue() where proposal_id = (select v::uuid from ids where k = 'c8')),
  'submitted', 'queue: a scored case shows as submitted');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}', true);
select is((select count(*)::int from public.my_review_queue()), 0, 'N3: Reviewer 3''s queue is empty');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}', true);
select throws_ok($$select * from public.my_review_queue()$$, 'PT403', 'FORBIDDEN', 'N7: the consultant has no review queue');

-- ============================================================ notifications (NTF-01)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
insert into ids select 'n_admin', id::text from public.notifications where read_at is null limit 1;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select is((public.mark_notifications_read(array[(select v::uuid from ids where k = 'n_admin')]) ->> 'updated')::int, 0,
  'a user cannot mark someone else''s notification as read');
select ok((public.mark_notifications_read() ->> 'updated')::int > 0, 'a user marks their own notifications as read');
select is((select count(*)::int from public.notifications where read_at is null), 0, 'no unread notifications remain');
reset role;

-- ============================================================ rubric locks (REV-02)
select throws_ok($$update public.rubric_criteria set weight = 40 where id = '12000000-0000-4000-8000-000000000001'$$,
  'PT409', 'IMMUTABLE', 'REV-02: a published rubric''s criteria cannot change');
select throws_ok(
  $$insert into public.rubric_versions (rubric_id, version_no, published_at)
    values ('10000000-0000-4000-8000-000000000001', 2, now())$$,
  'PT422', 'VALIDATION', 'a rubric version cannot be created already published');
insert into public.rubric_versions (id, rubric_id, version_no)
values ('11000000-0000-4000-8000-0000000000f2', '10000000-0000-4000-8000-000000000001', 2);
insert into public.rubric_criteria (rubric_version_id, key, label, weight) values
  ('11000000-0000-4000-8000-0000000000f2', 'innovation', 'Innovation', 90);
select throws_ok($$update public.rubric_versions set published_at = now() where id = '11000000-0000-4000-8000-0000000000f2'$$,
  'PT422', 'VALIDATION', 'a rubric whose weights do not total 100 cannot be published');
select throws_ok(
  $$update public.challenge_versions set brief_md = 'changed' where id = '21000000-0000-4000-8000-000000000001'$$,
  'PT409', 'IMMUTABLE', 'ADM-02: a published challenge version cannot change');

-- ============================================================ Realtime (NTF-01)
select is((select count(*)::int from pg_publication_tables where pubname = 'supabase_realtime'
           and schemaname = 'public' and tablename in ('notifications', 'case_events')), 2,
  'notifications and case history are published for live updates');

select * from finish();
rollback;
