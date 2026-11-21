-- Phase 0 foundation: default-deny access, append-only history, permissions,
-- MFA rule (D-07), seed shape (BCR-001 B10), and data-layer negatives
-- N3, N4, N5, N6, N7, N10 on seeded cases.
-- Identities are simulated with request.jwt.claims + SET ROLE authenticated.
begin;
create extension if not exists pgtap with schema extensions;
select plan(39);

-- ---------------------------------------------------------------- structure
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity), 0,
  'RLS is enabled on every public table');

select is(
  (select count(*)::int from information_schema.role_table_grants
   where table_schema = 'public' and grantee in ('anon','authenticated')
     and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')), 0,
  'anon/authenticated have no direct write privilege on any public table (D-02)');

select ok(not has_function_privilege('anon', 'public.submit_proposal(uuid,uuid,text)', 'execute'),
  'anon cannot execute submit_proposal');
select ok(has_function_privilege('anon', 'public.health()', 'execute'), 'anon can call health()');
select is((public.health() ->> 'ok')::boolean, true, 'health() reports ok');

-- ---------------------------------------------------------------- seed shape
select is((select count(*)::int from public.proposals where reference is not null), 8,
  'seed has 8 submitted cases (BCR-001 B10)');
select is((select last_value::int from private.proposal_reference_seq), 8,
  'reference sequence is at 8, so the demo case becomes CEDA-2026-0009');
select is((select count(*)::int from public.assignments where reviewer_id = '00000000-0000-4000-8000-0000000000c3'), 0,
  'Reviewer 3 has no assignments');
select is((select count(*)::int from public.profiles where not is_demo), 0, 'every seeded profile is flagged DEMO');
select is(
  (select sum(weight)::int from public.rubric_criteria where rubric_version_id = '11000000-0000-4000-8000-000000000001'), 100,
  'rubric v1 weights sum to 100');

-- ---------------------------------------------------------------- append-only (N6)
select throws_ok(
  $$update public.proposal_versions set data = '{}'::jsonb$$, 'PT409', 'IMMUTABLE',
  'N6: a submitted version cannot be updated, even by the table owner');
select throws_ok($$delete from public.proposal_versions$$, 'PT409', 'IMMUTABLE', 'N6: versions cannot be deleted');
select throws_ok($$delete from public.audit_events$$, 'PT409', 'IMMUTABLE', 'N6: audit rows cannot be deleted');
select throws_ok($$update public.audit_events set action = 'x.y'$$, 'PT409', 'IMMUTABLE', 'N6: audit rows cannot be updated');
select throws_ok($$truncate public.audit_events$$, 'PT409', 'IMMUTABLE', 'N6: audit table cannot be truncated');
select throws_ok($$update public.case_events set reason = 'x'$$, 'PT409', 'IMMUTABLE', 'case history cannot be updated');
select throws_ok(
  $$update public.scorecards set overall_comment = 'changed' where status = 'submitted'$$, 'PT409', 'IMMUTABLE',
  'submitted scorecards are locked');

-- ---------------------------------------------------------------- data-layer rules
select throws_ok(
  $$insert into public.user_roles (user_id, role_key, granted_by)
    values ('00000000-0000-4000-8000-0000000000e1', 'reviewer', '00000000-0000-4000-8000-0000000000e1')$$,
  '23514', null, 'N8 (data layer): a role cannot be granted by its own holder');

-- N5 at the data layer: case 0004 (in adjudication) has no approved decision.
select throws_ok(
  $$insert into public.awards (proposal_id, decision_id, amount_minor, description, recorded_by)
    select p.id, gen_random_uuid(), 100, 'x', '00000000-0000-4000-8000-0000000000e1'
    from public.proposals p where p.reference = 'CEDA-2026-0004'$$,
  'PT409', 'CASE_NOT_APPROVED', 'N5 (data layer): no award without an approved, published decision');

-- Unpublished decision on case 0004 for the N4 check below.
insert into public.decisions (proposal_id, version_id, outcome, reason, recorded_by)
select p.id, p.current_version_id, 'approved', 'Draft decision (test)', '00000000-0000-4000-8000-0000000000d1'
from public.proposals p where p.reference = 'CEDA-2026-0004';

-- ---------------------------------------------------------------- permissions + MFA (D-07)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated","aal":"aal1"}', true);
select ok(private.has_permission('case.screen'), 'screening officer (demo, MFA-exempt) has case.screen');
select ok(not private.has_permission('award.record'), 'screening officer does not have award.record');
reset role;

update public.app_settings set value = 'false'::jsonb where key = 'demo_mfa_exempt';
set local role authenticated;
select ok(not private.has_permission('case.screen'), 'D-07: with the exemption off, staff permissions need MFA (aal1 refused)');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
select ok(private.has_permission('case.screen'), 'D-07: an aal2 session restores staff permissions');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal1"}', true);
select ok(private.has_permission('proposal.submit'), 'applicants never need MFA');
reset role;
update public.app_settings set value = 'true'::jsonb where key = 'demo_mfa_exempt';

-- ---------------------------------------------------------------- read isolation on seeded cases
set local role authenticated;

-- N4: Case 0004's applicant sees no unpublished decision.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from public.decisions d join public.proposals p on p.id = d.proposal_id
           where p.reference = 'CEDA-2026-0004'), 0, 'N4: applicant cannot read an unpublished decision');
select is((select count(*)::int from public.internal_notes), 0, 'applicant reads no internal notes');

-- N3: unassigned Reviewer 3
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}', true);
select is((select count(*)::int from public.proposals), 0, 'N3: unassigned reviewer reads zero cases');
select is((select count(*)::int from public.proposal_versions), 0, 'N3: unassigned reviewer reads zero versions');

-- N10: Reviewer 1 is assigned to 0008 but has not declared.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select is((select count(*)::int from public.proposals where reference = 'CEDA-2026-0008'), 0,
  'N10: assigned reviewer cannot read the case before declaring');
select is((select count(*)::int from public.assignments where reviewer_id = '00000000-0000-4000-8000-0000000000c1'), 5,
  'reviewer still sees their own assignments (to reach the declaration gate)');
select is((select count(*)::int from public.proposals where reference = 'CEDA-2026-0002'), 1,
  'a declared, conflict-free reviewer reads the assigned case');

-- REV-03 peer isolation: on 0002 Reviewer 2 has not scored, Reviewer 1 has.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}', true);
select is((select count(*)::int from public.scorecards s join public.assignments a on a.id = s.assignment_id
           join public.proposals p on p.id = a.proposal_id where p.reference = 'CEDA-2026-0002'), 0,
  'REV-03: a reviewer cannot see a peer''s scorecard before submitting their own');
select is((select count(*)::int from public.scorecards s join public.assignments a on a.id = s.assignment_id
           join public.proposals p on p.id = a.proposal_id where p.reference = 'CEDA-2026-0004'), 2,
  'REV-03: after submitting, the reviewer sees the peer scorecard');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a5","role":"authenticated"}', true);
select is((select count(*)::int from public.assignments), 0, 'an applicant never sees reviewer assignments on their case');

-- N7: support consultant
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}', true);
select is((select count(*)::int from public.proposals), 0, 'N7: support consultant reads zero cases');
select is((select count(*)::int from public.scorecards), 0, 'N7: support consultant reads zero scorecards');

-- D-08: external committee has no access to case tables.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f2","role":"authenticated"}', true);
select is((select count(*)::int from public.proposals), 0, 'committee member reads no proposal rows');

-- Audit trail is admin/auditor only.
select is((select count(*)::int from public.audit_events), 0, 'non-auditor reads no audit rows');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select ok((select count(*)::int from public.audit_events) > 0, 'admin/auditor reads the audit trail');
reset role;

select * from finish();
rollback;
