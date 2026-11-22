-- The public catalogue, signed out (migration 016). The challenge brief page reads
-- challenge_versions; while its read policy queried proposals directly, every read by
-- a signed-out visitor failed with 42501 ("permission denied for table proposals").
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

set local role anon;
select lives_ok($$select count(*) from public.challenge_versions$$,
  'signed out, reading challenge versions raises no permission error');
select is((select count(*)::int from public.challenge_versions where id = '21000000-0000-4000-8000-000000000001'), 1,
  'signed out, the published version of an open challenge is readable (the challenge brief page)');
select is((select count(*)::int from public.challenge_versions where published_at is null), 0,
  'signed out, unpublished versions stay hidden');
select is((select count(*)::int from public.challenges where slug = 'water-smart-agriculture-2026'), 1,
  'signed out, the challenge itself is still readable');
select is(private.owns_case_on_version('21000000-0000-4000-8000-000000000001'), false,
  'signed out, the owner helper answers false (no user)');
reset role;

-- An applicant keeps seeing the version their own case was submitted against (ADM-02).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select ok((select count(*) from public.challenge_versions cv
           where exists (select 1 from public.proposals p where p.challenge_version_id = cv.id and p.applicant_id = auth.uid())) >= 1,
  'signed in, Applicant A still reads the version of their own case');
reset role;

select * from finish();
rollback;
