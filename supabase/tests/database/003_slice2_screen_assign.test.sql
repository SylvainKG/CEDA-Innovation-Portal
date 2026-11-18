-- Slice 2: record_screening, assign_reviewers, revoke_assignment, grant/revoke_role,
-- internal notes, committee status (D-08). Negatives N3, N7, N8.
begin;
create extension if not exists pgtap with schema extensions;
select plan(56);

create temp table ids (k text primary key, v text);
grant all on ids to authenticated;
insert into ids select 'c1', id::text from public.proposals where reference = 'CEDA-2026-0001';

-- A second submitted case (owner: Applicant D) for the ineligible path.
do $$
declare v_p uuid := gen_random_uuid(); v_v uuid := gen_random_uuid();
begin
  insert into public.proposals (id, applicant_id, challenge_version_id, title)
  values (v_p, '00000000-0000-4000-8000-0000000000a4', '21000000-0000-4000-8000-000000000001', 'Test case for screening');
  insert into public.proposal_versions (id, proposal_id, version_no, data, submitted_by, declaration_version, declaration_accepted_at)
  values (v_v, v_p, 1, '{"title":"Test case for screening"}', '00000000-0000-4000-8000-0000000000a4', 'sample-2026-11-v1', now());
  update public.proposals set status = 'submitted', reference = 'CEDA-2026-0901', current_version_id = v_v, submitted_at = now()
  where id = v_p;
  insert into ids values ('c2', v_p::text);
end $$;

set local role authenticated;

-- ============================================================ record_screening (REV-01)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select throws_ok(format($$select public.record_screening(%L, 'eligible', 'ok')$$, (select v from ids where k = 'c1')),
  'PT403', 'FORBIDDEN', 'a reviewer cannot record screening');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}', true);
select throws_ok(format($$select public.record_screening(%L, 'eligible', 'ok')$$, (select v from ids where k = 'c1')),
  'PT403', 'FORBIDDEN', 'N7: the support consultant cannot record screening');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select throws_ok(format($$select public.record_screening(%L, 'maybe', 'ok')$$, (select v from ids where k = 'c1')),
  'PT422', 'VALIDATION', 'an unknown screening result is refused');
select throws_ok(format($$select public.record_screening(%L, 'eligible', '   ')$$, (select v from ids where k = 'c1')),
  'PT422', 'VALIDATION', 'a screening result needs a reason');
select is((select status from public.proposals where id = (select v::uuid from ids where k = 'c1')), 'submitted',
  'refusals leave the case unchanged');

select is(public.record_screening((select v::uuid from ids where k = 'c1'), 'eligible', 'Meets all criteria (test)') ->> 'status',
  'in_evaluation', 'Eligible moves the case to evaluation');
select throws_ok(format($$select public.record_screening(%L, 'eligible', 'again')$$, (select v from ids where k = 'c1')),
  'PT409', 'INVALID_STATE', 'a case cannot be screened twice');
select is((select count(*)::int from public.case_events
           where proposal_id = (select v::uuid from ids where k = 'c1') and from_status = 'submitted'
             and to_status = 'in_evaluation' and reason = 'Meets all criteria (test)'), 1,
  'the screening is recorded in the case history with its reason');

select is(public.record_screening((select v::uuid from ids where k = 'c2'), 'ineligible', 'Outside the challenge scope') ->> 'status',
  'closed', 'Ineligible closes the case');
select throws_ok(
  $$select public.record_screening('00000000-0000-0000-0000-000000000000', 'eligible', 'x')$$,
  'PT403', 'FORBIDDEN', 'an unknown case gives FORBIDDEN, not "not found"');

-- the applicant sees the outcome of their own case
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a4","role":"authenticated"}', true);
select is((select closed_reason from public.proposals where id = (select v::uuid from ids where k = 'c2')),
  'Ineligible: Outside the challenge scope', 'the applicant can read why their case was closed');
select is((select count(*)::int from public.notifications where proposal_id = (select v::uuid from ids where k = 'c2')
           and type = 'case.closed'), 1, 'the applicant was notified of the closure');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from public.notifications where proposal_id = (select v::uuid from ids where k = 'c1')
           and type = 'case.under_review'), 1, 'the applicant was notified that review started');

-- ============================================================ assign_reviewers (REV-01)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select throws_ok(
  format($$select public.assign_reviewers(%L, array['00000000-0000-4000-8000-0000000000c1']::uuid[])$$, (select v from ids where k = 'c1')),
  'PT403', 'FORBIDDEN', 'the screening officer cannot assign reviewers');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select throws_ok(
  format($$select public.assign_reviewers(%L, array['00000000-0000-4000-8000-0000000000f1']::uuid[])$$, (select v from ids where k = 'c1')),
  'PT422', 'VALIDATION', 'only people with the reviewer role can be assigned');
select throws_ok(
  format($$select public.assign_reviewers(%L, array['00000000-0000-4000-8000-0000000000c1']::uuid[], now() - interval '1 day')$$,
         (select v from ids where k = 'c1')),
  'PT422', 'VALIDATION', 'a due date in the past is refused');
select throws_ok(
  format($$select public.assign_reviewers(%L, array[]::uuid[])$$, (select v from ids where k = 'c1')),
  'PT422', 'VALIDATION', 'at least one reviewer is needed');
select throws_ok(
  format($$select public.assign_reviewers(%L, array['00000000-0000-4000-8000-0000000000c1']::uuid[])$$, (select v from ids where k = 'c2')),
  'PT409', 'INVALID_STATE', 'a closed case cannot get reviewers');
select is((select count(*)::int from public.assignments where proposal_id = (select v::uuid from ids where k = 'c1')), 0,
  'refused assignments wrote nothing');

insert into ids select 'asg', public.assign_reviewers((select v::uuid from ids where k = 'c1'),
  array['00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c2']::uuid[])::text;
select is((select jsonb_array_length(v::jsonb -> 'assigned') from ids where k = 'asg'), 2, 'two reviewers assigned');
select is(jsonb_array_length(public.assign_reviewers((select v::uuid from ids where k = 'c1'),
  array['00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c2']::uuid[]) -> 'already_assigned'), 2,
  'assigning the same reviewers again changes nothing');
select is((select count(*)::int from public.assignments where proposal_id = (select v::uuid from ids where k = 'c1')
           and revoked_at is null), 2, 'still exactly two active assignments');
select is((select count(*)::int from public.audit_events where action = 'assignment.created'
           and proposal_id = (select v::uuid from ids where k = 'c1')), 2, 'each assignment is audited once');

-- reviewers: notified, see the assignment, but not the case until they declare (N10)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select is((select count(*)::int from public.notifications where proposal_id = (select v::uuid from ids where k = 'c1')
           and type = 'assignment.created'), 1, 'Reviewer 1 was notified');
select is((select count(*)::int from public.assignments where proposal_id = (select v::uuid from ids where k = 'c1')), 1,
  'Reviewer 1 sees their new assignment');
select is((select count(*)::int from public.proposals where id = (select v::uuid from ids where k = 'c1')), 0,
  'N10: Reviewer 1 cannot read the case before declaring');

-- N3: Reviewer 3 is never assigned
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}', true);
select is((select count(*)::int from public.assignments) + (select count(*)::int from public.proposals), 0,
  'N3: Reviewer 3 still sees no assignments and no cases');

-- ============================================================ revoke_assignment
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
insert into ids select 'a2', id::text from public.assignments
  where proposal_id = (select v::uuid from ids where k = 'c1') and reviewer_id = '00000000-0000-4000-8000-0000000000c2';
select throws_ok(format($$select public.revoke_assignment(%L, '')$$, (select v from ids where k = 'a2')),
  'PT422', 'VALIDATION', 'removing a reviewer needs a reason');
select is((public.revoke_assignment((select v::uuid from ids where k = 'a2'), 'Workload (test)') ->> 'revoked')::boolean, true,
  'the admin removes a reviewer');
select throws_ok(format($$select public.revoke_assignment(%L, 'again')$$, (select v from ids where k = 'a2')),
  'PT409', 'INVALID_STATE', 'an assignment cannot be removed twice');
select is(jsonb_array_length(public.assign_reviewers((select v::uuid from ids where k = 'c1'),
  array['00000000-0000-4000-8000-0000000000c2']::uuid[]) -> 'assigned'), 1,
  'a removed reviewer (no conflict) can be assigned again');
reset role;
select throws_ok(
  format($$update public.assignments set reviewer_id = '00000000-0000-4000-8000-0000000000c3' where id = %L$$, (select v from ids where k = 'a2')),
  'PT409', 'IMMUTABLE', 'a revoked assignment can never change');
select throws_ok($$delete from public.assignments$$, 'PT409', 'IMMUTABLE', 'assignments are never deleted');

-- ============================================================ grant_role / revoke_role (IAM-01, N8)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select is(public.grant_role('00000000-0000-4000-8000-0000000000e1', 'reviewer') ->> 'code', 'FORBIDDEN',
  'N8: an admin cannot grant a role to themself');
select is((select count(*)::int from public.audit_events where action = 'role.grant_refused'
           and target_id = '00000000-0000-4000-8000-0000000000e1'), 1, 'N8: the refused self-grant is audited');
select is((select count(*)::int from public.user_roles where user_id = '00000000-0000-4000-8000-0000000000e1'
           and role_key = 'reviewer'), 0, 'N8: no role was added');
select is(public.revoke_role('00000000-0000-4000-8000-0000000000e1', 'admin', 'test') ->> 'code', 'FORBIDDEN',
  'an admin cannot change their own roles');

select throws_ok($$select public.grant_role('00000000-0000-4000-8000-0000000000a2', 'wizard')$$,
  'PT422', 'VALIDATION', 'an unknown role is refused');
select is((public.grant_role('00000000-0000-4000-8000-0000000000a2', 'reviewer', 'Pilot (test)') ->> 'ok')::boolean, true,
  'the admin grants the reviewer role');
select is((public.grant_role('00000000-0000-4000-8000-0000000000a2', 'reviewer') ->> 'already')::boolean, true,
  'granting an active role again is a no-op');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
select ok(private.has_permission('scorecard.submit'), 'the new role takes effect immediately');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select throws_ok($$select public.grant_role('00000000-0000-4000-8000-0000000000a2', 'admin')$$,
  'PT403', 'FORBIDDEN', 'a non-admin cannot grant roles');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select throws_ok($$select public.revoke_role('00000000-0000-4000-8000-0000000000a2', 'reviewer', '')$$,
  'PT422', 'VALIDATION', 'revoking needs a reason');
select is((public.revoke_role('00000000-0000-4000-8000-0000000000a2', 'reviewer', 'Pilot ended (test)') ->> 'ok')::boolean, true,
  'the admin revokes the role');
select throws_ok($$select public.revoke_role('00000000-0000-4000-8000-0000000000a2', 'reviewer', 'again')$$,
  'PT409', 'INVALID_STATE', 'a role cannot be revoked twice');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
select ok(not private.has_permission('scorecard.submit'), 'the revoked role stops working immediately');
reset role;
select throws_ok(
  $$update public.user_roles set revoked_at = null, revoked_by = null
    where user_id = '00000000-0000-4000-8000-0000000000a2' and role_key = 'reviewer'$$,
  'PT409', 'IMMUTABLE', 'a revoked role cannot be silently re-activated');

-- ============================================================ internal notes
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select isnt(public.add_internal_note((select v::uuid from ids where k = 'c1'), 'Check the pilot site (test note)') ->> 'id', null,
  'the screening officer adds an internal note');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from public.internal_notes), 0, 'the applicant never sees internal notes');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}', true);
select throws_ok(format($$select public.add_internal_note(%L, 'x')$$, (select v from ids where k = 'c1')),
  'PT403', 'FORBIDDEN', 'N3: an unassigned reviewer cannot add notes');
reset role;
select is((select metadata from public.audit_events where action = 'note.added' order by at desc limit 1), '{}'::jsonb,
  'the audit row does not contain the note text');

-- ============================================================ committee view (D-08)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f2","role":"authenticated"}', true);
select is((select count(*)::int from public.list_case_status()), 9, 'the committee sees every submitted case (8 seeded + 1 test)');
select is((select count(*)::int from public.list_case_status() where public_stage = 'review'), 4,
  'stages are applicant-facing: in_evaluation and in_adjudication both show as review (0001, 0002, 0004, 0008)');
select is((public.case_stage_counts() ->> 'closed')::int, 2, 'stage counts include closed cases');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$select * from public.list_case_status()$$, 'PT403', 'FORBIDDEN', 'applicants cannot list all cases');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}', true);
select throws_ok($$select public.case_stage_counts()$$, 'PT403', 'FORBIDDEN', 'N7: the support consultant cannot see case counts');
reset role;

select * from finish();
rollback;
