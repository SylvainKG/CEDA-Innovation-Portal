-- Slice 5: record_decision, publish_decision, record_award, close_case.
-- DEC-01, DEC-02, D-05; negatives N4, N5, N6.
-- Case 0004 (Applicant C, in adjudication, two V1 scorecards): main path.
begin;
create extension if not exists pgtap with schema extensions;
select plan(45);

create temp table ids (k text primary key, v text);
grant all on ids to authenticated;
insert into ids select 'c4', id::text from public.proposals where reference = 'CEDA-2026-0004';
insert into ids select 'c1', id::text from public.proposals where reference = 'CEDA-2026-0001';
insert into ids select 'c2', id::text from public.proposals where reference = 'CEDA-2026-0002';
insert into ids select 'c3', id::text from public.proposals where reference = 'CEDA-2026-0003';
insert into ids select 'c5', id::text from public.proposals where reference = 'CEDA-2026-0005';
insert into ids select 'c6', id::text from public.proposals where reference = 'CEDA-2026-0006';

set local role authenticated;

-- ============================================================ record_decision (DEC-01)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select throws_ok(format($$select public.record_decision(%L, 'approved', 'Strong case')$$, (select v from ids where k = 'c4')),
  'PT403', 'FORBIDDEN', 'a reviewer cannot record a decision');
-- Migration 017 gave the admin decision.record / decision.publish (absorbed the adjudicator); a screening
-- officer is now the staff role that still cannot decide. The admin's decision path is covered below.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select throws_ok(format($$select public.record_decision(%L, 'approved', 'Strong case')$$, (select v from ids where k = 'c4')),
  'PT403', 'FORBIDDEN', 'a screening officer cannot record a decision');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
select throws_ok(format($$select public.record_decision(%L, 'maybe', 'Strong case')$$, (select v from ids where k = 'c4')),
  'PT422', 'VALIDATION', 'an unknown outcome is refused');
select throws_ok(format($$select public.record_decision(%L, 'approved', '')$$, (select v from ids where k = 'c4')),
  'PT422', 'VALIDATION', 'a decision needs a reason');
select throws_ok(format($$select public.record_decision(%L, 'approved', 'Too early')$$, (select v from ids where k = 'c2')),
  'PT409', 'INVALID_STATE', 'a case still in evaluation cannot be decided');

insert into ids select 'd1', public.record_decision((select v::uuid from ids where k = 'c4'), 'approved', 'Strong pilot evidence (test).') ->> 'decision_id';
select is((select status from public.proposals where id = (select v::uuid from ids where k = 'c4')), 'in_adjudication',
  'DEC-01: recording a decision does not change the case status');

-- N4: the applicant sees nothing yet
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from public.decisions where proposal_id = (select v::uuid from ids where k = 'c4')), 0,
  'N4: the applicant cannot read an unpublished decision');
select is((select count(*)::int from public.notifications where proposal_id = (select v::uuid from ids where k = 'c4')
           and type like 'decision.%'), 0, 'N4: and gets no hint through notifications');

-- re-recording before publication supersedes and keeps history
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
select is(public.record_decision((select v::uuid from ids where k = 'c4'), 'not_approved', 'Reconsidered (test).') ->> 'supersedes',
  (select v from ids where k = 'd1'), 'a second recording supersedes the first');
insert into ids select 'd3', public.record_decision((select v::uuid from ids where k = 'c4'), 'approved', 'Final: strong pilot evidence (test).') ->> 'decision_id';
reset role;
select is((select count(*)::int from public.decisions where proposal_id = (select v::uuid from ids where k = 'c4')), 3,
  'every recorded draft is kept');
select is((select count(*)::int from public.decisions where proposal_id = (select v::uuid from ids where k = 'c4') and superseded_at is null), 1,
  'exactly one active decision');

-- ============================================================ N5 before approval
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select throws_ok(format($$select public.record_award(%L, 1000000, 'Seed grant')$$, (select v from ids where k = 'c4')),
  'PT409', 'CASE_NOT_APPROVED', 'N5: no award while the decision is unpublished');
select throws_ok(format($$select public.record_award(%L, 1000000, 'Seed grant')$$, (select v from ids where k = 'c5')),
  'PT409', 'CASE_NOT_APPROVED', 'N5: no award on a not-approved case');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select throws_ok(format($$select public.publish_decision(%L)$$, (select v from ids where k = 'd3')),
  'PT403', 'FORBIDDEN', 'a screening officer cannot publish a decision');

-- ============================================================ publish_decision
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
select throws_ok(format($$select public.publish_decision(%L)$$, (select v from ids where k = 'd1')),
  'PT409', 'INVALID_STATE', 'a superseded draft cannot be published');
select is(public.publish_decision((select v::uuid from ids where k = 'd3')) ->> 'case_status', 'approved',
  'DEC-01: publishing moves the case to Approved');
select throws_ok(format($$select public.publish_decision(%L)$$, (select v from ids where k = 'd3')),
  'PT409', 'INVALID_STATE', 'a decision is published once');
select throws_ok(format($$select public.record_decision(%L, 'not_approved', 'Too late')$$, (select v from ids where k = 'c4')),
  'PT409', 'INVALID_STATE', 'a published decision cannot be replaced');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
select is((select outcome from public.decisions where proposal_id = (select v::uuid from ids where k = 'c4')), 'approved',
  'the applicant now reads the published decision (only that one)');
select is((select count(*)::int from public.notifications where proposal_id = (select v::uuid from ids where k = 'c4')
           and type = 'decision.published'), 1, 'the applicant is notified of the decision');
reset role;
select throws_ok(
  format($$update public.decisions set reason = 'edited' where id = %L$$, (select v from ids where k = 'd3')),
  'PT409', 'IMMUTABLE', 'N6: a published decision cannot be edited');

-- ============================================================ record_award (DEC-02, D-05)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
select throws_ok(format($$select public.record_award(%L, 1000000, 'Seed grant')$$, (select v from ids where k = 'c4')),
  'PT403', 'FORBIDDEN', 'D-05: the adjudicator cannot record the award');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select throws_ok(format($$select public.record_award(%L, 0, 'Seed grant')$$, (select v from ids where k = 'c4')),
  'PT422', 'VALIDATION', 'the amount must be positive');
select throws_ok(format($$select public.record_award(%L, 1000000, '  ')$$, (select v from ids where k = 'c4')),
  'PT422', 'VALIDATION', 'the award needs a description');
select is(public.record_award((select v::uuid from ids where k = 'c4'), 15000000, 'Seed grant of BWP 150,000 (test).') ->> 'case_status',
  'awarded', 'DEC-02: the administrator records the award');
select is((public.record_award((select v::uuid from ids where k = 'c4'), 15000000, 'Seed grant of BWP 150,000 (test).') ->> 'replayed')::boolean,
  true, 'a retry returns the same award');
select throws_ok(format($$select public.record_award(%L, 99, 'Different')$$, (select v from ids where k = 'c4')),
  'PT409', 'INVALID_STATE', 'a second, different award is refused');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
select is((select amount_minor || ' ' || currency from public.awards where proposal_id = (select v::uuid from ids where k = 'c4')),
  '15000000 BWP', 'the applicant sees the award in minor units with currency');
select is((select string_agg(public_stage, ',' order by id) from public.case_events
           where proposal_id = (select v::uuid from ids where k = 'c4') and public_stage in ('approval', 'award')),
  'approval,award', 'the timeline shows Approval and Award as two stages');
reset role;
select throws_ok(
  format($$update public.awards set amount_minor = 1 where proposal_id = %L$$, (select v from ids where k = 'c4')),
  'PT409', 'IMMUTABLE', 'N6: an award cannot be edited');
select is((select count(*)::int from public.audit_events where proposal_id = (select v::uuid from ids where k = 'c4')
           and action in ('decision.recorded', 'decision.published', 'award.recorded')), 5,
  'SEC-01: three recordings, one publication and one award are audited');

-- ============================================================ stale decision after a new version
update public.proposals set status = 'in_adjudication' where id = (select v::uuid from ids where k = 'c2');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
insert into ids select 'd_old', public.record_decision((select v::uuid from ids where k = 'c2'), 'approved', 'On version 1 (test).') ->> 'decision_id';
reset role;
do $$
declare v uuid := gen_random_uuid();
begin
  insert into public.proposal_versions (id, proposal_id, version_no, data, submitted_by, change_note, declaration_version, declaration_accepted_at)
  select v, p.id, 2, '{"title":"v2"}', p.applicant_id, 'test v2', 'sample-2026-11-v1', now()
  from public.proposals p where p.reference = 'CEDA-2026-0002';
  update public.proposals set current_version_id = v where reference = 'CEDA-2026-0002';
end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
select throws_ok(format($$select public.publish_decision(%L)$$, (select v from ids where k = 'd_old')),
  'PT409', 'INVALID_STATE', 'a decision recorded on an earlier version cannot be published');

-- ============================================================ close_case
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select throws_ok(format($$select public.close_case(%L, 'Withdrawn')$$, (select v from ids where k = 'c1')),
  'PT403', 'FORBIDDEN', 'a reviewer cannot close a case');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select throws_ok(format($$select public.close_case(%L, '')$$, (select v from ids where k = 'c1')),
  'PT422', 'VALIDATION', 'closing needs a reason');
select is(public.close_case((select v::uuid from ids where k = 'c1'), 'Withdrawn by the applicant (test)') ->> 'case_status', 'closed',
  'the screening officer closes a submitted case');
select throws_ok(format($$select public.close_case(%L, 'again')$$, (select v from ids where k = 'c1')),
  'PT409', 'INVALID_STATE', 'a closed case cannot be closed again');
select throws_ok(format($$select public.close_case(%L, 'Not allowed')$$, (select v from ids where k = 'c6')),
  'PT409', 'INVALID_STATE', 'an awarded case cannot be closed');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
select is((public.close_case((select v::uuid from ids where k = 'c3'), 'No reply by the deadline (test)') ->> 'expired_requests')::int, 1,
  'closing a case waiting on the applicant expires the open request');
select is(public.close_case((select v::uuid from ids where k = 'c5'), 'Programme cycle ended (test)') ->> 'case_status', 'closed',
  'a not-approved case can be closed');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
select is((select closed_reason from public.proposals where id = (select v::uuid from ids where k = 'c1')),
  'Withdrawn by the applicant (test)', 'the applicant reads why their case was closed');
select is((select count(*)::int from public.notifications where proposal_id = (select v::uuid from ids where k = 'c1')
           and type = 'case.closed'), 1, 'and is notified');
reset role;
select is((select status from public.feedback_requests where proposal_id = (select v::uuid from ids where k = 'c3')), 'expired',
  'the expired request is recorded');
select is((select count(*)::int from public.audit_events where action = 'case.closed'), 3, 'each closure is audited');

-- ============================================================ N6 across the board
select throws_ok($$delete from public.case_events$$, 'PT409', 'IMMUTABLE', 'N6: case history cannot be deleted');
select throws_ok($$delete from public.awards$$, 'PT409', 'IMMUTABLE', 'N6: awards cannot be deleted');

select * from finish();
rollback;
