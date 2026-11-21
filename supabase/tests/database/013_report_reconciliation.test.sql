-- Report reconciliation (test plan S6, Slice 6 owner Sylvain): the figures on the Reports page and the rows in its
-- CSV export agree with each other and with the cases actually in the database, on the fictional seed.
-- Read-only: every check runs inside this transaction and rolls back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Direct counts from the tables, worked out before signing in (the test owner bypasses RLS).
create temporary table expected on commit drop as
select
  (select count(*)::int from public.proposals where status <> 'draft' and deleted_at is null) as submitted,
  (select count(distinct applicant_id)::int from public.proposals where status <> 'draft' and deleted_at is null) as applicants,
  (select count(*)::int from public.proposals where deleted_at is null) as started,
  (select count(*)::int from public.proposals where status in ('approved', 'awarded') and deleted_at is null) as approved,
  (select coalesce(sum(amount_minor), 0)::bigint from public.awards) as award_total;
grant select on expected to authenticated;

-- The seed itself, so a changed seed is noticed (judge guide: eight earlier cases, CEDA-2026-0001 to 0008).
select is((select submitted from expected), 8, 'the seed holds eight submitted cases');
select is((select award_total from expected), 25000000::bigint, 'the seed holds one award of BWP 250,000.00');

-- Signed in as the demo administrator, who reads reports.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
create temporary table r on commit drop as select public.get_programme_report() as j;
create temporary table csv on commit drop as select * from public.report_case_rows();

select is((select (j #>> '{participation,submitted}')::int from r), (select submitted from expected),
  'Submitted on the Reports page equals the submitted cases in the database');
select is((select (j #>> '{participation,distinct_applicants}')::int from r), (select applicants from expected),
  'Applicants equals the distinct owners of submitted cases');
select is((select (j #>> '{participation,drafts_started}')::int from r), (select started from expected),
  'Drafts started counts every idea started, submitted or not, as the page defines it');
select is((select sum((x ->> 'submitted')::int)::int from r, jsonb_array_elements(j #> '{participation,by_challenge}') x),
  (select submitted from expected), 'the per-challenge figures add up to the total');
select is((select sum(v::int)::int from r, jsonb_each_text(j #> '{outcomes,by_current_stage}') e(k, v)),
  (select submitted from expected), 'the cases by current stage add up to the total');
select is((select (x ->> 'reached')::int from r, jsonb_array_elements(j -> 'funnel') x where x ->> 'stage' = 'submission'),
  (select submitted from expected), 'the funnel starts with every submitted case');
select is((select (j #>> '{outcomes,approved}')::int from r), (select approved from expected),
  'Approved equals the approved and awarded cases');
select is((select (j #>> '{outcomes,award_total_minor}')::bigint from r), (select award_total from expected),
  'the award total equals the awards recorded');
select is(public.case_stage_counts(), (select j #> '{outcomes,by_current_stage}' from r),
  'the stage counts on staff home and the committee view match the Reports page');

-- The CSV export: one row per submitted case, with the same totals as the screen.
select is((select count(*)::int from csv), (select submitted from expected), 'the CSV has one row per submitted case');
select is((select count(distinct reference)::int from csv), (select count(*)::int from csv), 'each case appears once in the CSV');
select is((select coalesce(sum(award_minor), 0)::bigint from csv), (select (j #>> '{outcomes,award_total_minor}')::bigint from r),
  'the CSV award amounts add up to the award total on the screen');
reset role;

select * from finish();
rollback;
