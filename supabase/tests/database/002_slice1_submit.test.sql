-- Slice 1: save_draft, attachments, submit_proposal, receipt.
-- APP-01/02/03, IAM-02, SEC-01; negatives N1, N2, N3, N6, N7, N9 at the database layer.
-- Every refusal is checked to leave state unchanged.
begin;
create extension if not exists pgtap with schema extensions;
select plan(59);

create temp table ids (k text primary key, v text);
grant all on ids to authenticated, anon;

-- Fixed identities (seed): A = applicant.a, B = applicant.b
-- a1 A · a2 B · b1 screening · c3 reviewer 3 · f1 consultant

-- ============================================================ drafts (APP-01)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

insert into ids select 'p1', public.save_draft('{"title":"Drip sensor hub"}'::jsonb, null,
  '20000000-0000-4000-8000-000000000001') ->> 'proposal_id';
select is((select status from public.proposals where id = (select v::uuid from ids where k = 'p1')), 'draft',
  'save_draft creates a draft case');
select is((select reference from public.proposals where id = (select v::uuid from ids where k = 'p1')), null,
  'a draft has no reference');
select is((select data ->> 'title' from public.proposal_drafts where proposal_id = (select v::uuid from ids where k = 'p1')),
  'Drip sensor hub', 'draft data is stored');

select public.save_draft('{"title":"Drip sensor hub v2","not_a_field":"x"}'::jsonb, (select v::uuid from ids where k = 'p1'));
select is((select data ? 'not_a_field' from public.proposal_drafts where proposal_id = (select v::uuid from ids where k = 'p1')),
  false, 'fields not in the form schema are dropped');
select throws_ok(
  format($$select public.save_draft('{"title":42}'::jsonb, %L)$$, (select v from ids where k = 'p1')),
  'PT422', 'VALIDATION', 'non-text values are refused');
select throws_ok(
  $$select public.save_draft('{"title":"x"}'::jsonb, null, '20000000-0000-4000-8000-000000000002')$$,
  'PT409', 'CHALLENGE_CLOSED', 'N9: no new draft on a closed challenge');

-- ============================================================ isolation of drafts (N1)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
select is((select count(*)::int from public.proposals where id = (select v::uuid from ids where k = 'p1')), 0,
  'N1: Applicant B cannot read A''s draft case');
select is((select count(*)::int from public.proposal_drafts), 0, 'N1: Applicant B reads no drafts');
select throws_ok(
  format($$select public.save_draft('{"title":"hijack"}'::jsonb, %L)$$, (select v from ids where k = 'p1')),
  'PT403', 'FORBIDDEN', 'N1: Applicant B cannot edit A''s draft');
select throws_ok(
  format($$select public.submit_proposal(%L, gen_random_uuid(), 'sample-2026-11-v1')$$, (select v from ids where k = 'p1')),
  'PT403', 'FORBIDDEN', 'N1: Applicant B cannot submit A''s draft');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select is((select count(*)::int from public.proposals where status = 'draft'), 0, 'staff never see drafts');

-- ============================================================ refused submissions keep the draft
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
insert into ids values ('key1', gen_random_uuid()::text);

select throws_ok(
  format($$select public.submit_proposal(%L, %L, 'sample-2026-11-v1')$$,
         (select v from ids where k = 'p1'), (select v from ids where k = 'key1')),
  'PT422', 'VALIDATION', 'missing required fields are refused');
select is((select status from public.proposals where id = (select v::uuid from ids where k = 'p1')), 'draft',
  'after a refusal the case is still a draft');
select is((select data ->> 'title' from public.proposal_drafts where proposal_id = (select v::uuid from ids where k = 'p1')),
  'Drip sensor hub v2', 'after a refusal the draft content is preserved');
select throws_ok(
  format($$select public.submit_proposal(%L, %L, 'old-wording')$$,
         (select v from ids where k = 'p1'), (select v from ids where k = 'key1')),
  'PT422', 'VALIDATION', 'an out-of-date declaration version is refused');

-- ============================================================ attachments (APP-02)
-- Simulates the browser upload: storage RLS decides who may write where.
insert into ids values ('obj1', (select v from ids where k = 'p1') || '/30000000-0000-4000-8000-000000000001.pdf');
select lives_ok(
  format($$insert into storage.objects (bucket_id, name, owner_id, metadata)
           values ('proposal-files', %L, '00000000-0000-4000-8000-0000000000a1', '{"size":2048,"mimetype":"application/pdf"}')$$,
         (select v from ids where k = 'obj1')),
  'the applicant can upload into their own draft folder');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
select throws_ok(
  format($$insert into storage.objects (bucket_id, name, owner_id, metadata)
           values ('proposal-files', %L, '00000000-0000-4000-8000-0000000000a2', '{"size":10,"mimetype":"application/pdf"}')$$,
         (select v from ids where k = 'p1') || '/30000000-0000-4000-8000-000000000002.pdf'),
  '42501', null, 'N2: Applicant B cannot upload into A''s case folder');
select throws_ok(
  format($$select public.register_attachment(%L, %L, 'x.pdf')$$, (select v from ids where k = 'p1'), (select v from ids where k = 'obj1')),
  'PT403', 'FORBIDDEN', 'Applicant B cannot register a file on A''s case');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select throws_ok(
  format($$select public.register_attachment(%L, '00000000-0000-4000-8000-000000000000/30000000-0000-4000-8000-000000000001.pdf', 'x.pdf')$$,
         (select v from ids where k = 'p1')),
  'PT422', 'VALIDATION', 'a path outside the case folder is refused');

insert into ids select 'att1', public.register_attachment((select v::uuid from ids where k = 'p1'),
  (select v from ids where k = 'obj1'), E'C:\\fakepath\\business-plan.pdf', 'business_plan') ->> 'id';
select is((select filename from public.attachments where id = (select v::uuid from ids where k = 'att1')), 'business-plan.pdf',
  'the display file name has its path stripped');
select is((select size_bytes from public.attachments where id = (select v::uuid from ids where k = 'att1')), 2048::bigint,
  'size comes from Storage metadata, not the client');
select is(public.register_attachment((select v::uuid from ids where k = 'p1'), (select v from ids where k = 'obj1'), 'again.pdf') ->> 'id',
  (select v from ids where k = 'att1'), 'registering the same object twice is idempotent');

-- ============================================================ successful submit (APP-03)
select public.save_draft(jsonb_build_object(
  'title', 'Drip sensor hub', 'applicant_name', 'Demo Applicant A', 'contact_email', 'applicant.a@demo.ceda-portal.test',
  'summary', 'Fictional summary.', 'sector', 'Crops', 'problem', 'Fictional problem.', 'solution', 'Fictional solution.',
  'impact', 'Fictional impact.'), (select v::uuid from ids where k = 'p1'));

insert into ids select 'r1', public.submit_proposal((select v::uuid from ids where k = 'p1'),
  (select v::uuid from ids where k = 'key1'), 'sample-2026-11-v1')::text;

select matches((select v::jsonb ->> 'reference' from ids where k = 'r1'), '^CEDA-[0-9]{4}-0009$',
  'the first demo submission gets reference …-0009');
select is((select (v::jsonb ->> 'version_no')::int from ids where k = 'r1'), 1, 'receipt shows version 1');
select is((select (v::jsonb ->> 'replayed')::boolean from ids where k = 'r1'), false, 'first call is not a replay');
select is((select (v::jsonb ->> 'form_version')::int from ids where k = 'r1'), 1, 'receipt shows the form version');
select ok((select v::jsonb ->> 'submitted_at_display' from ids where k = 'r1') like '% CAT', 'receipt shows server time in CAT');
select is((select jsonb_array_length(v::jsonb -> 'files') from ids where k = 'r1'), 1, 'receipt lists the attached file');
select is((select status from public.proposals where id = (select v::uuid from ids where k = 'p1')), 'submitted',
  'the case is now submitted');

-- APP-03 idempotency: a retry with the same key returns the same receipt.
select is(
  public.submit_proposal((select v::uuid from ids where k = 'p1'), (select v::uuid from ids where k = 'key1'), 'sample-2026-11-v1') ->> 'reference',
  (select v::jsonb ->> 'reference' from ids where k = 'r1'), 'retry with the same key returns the same reference');
select is((select count(*)::int from public.proposal_versions where proposal_id = (select v::uuid from ids where k = 'p1')), 1,
  'retry created no second version');
select is((select count(*)::int from public.case_events where proposal_id = (select v::uuid from ids where k = 'p1')), 1,
  'one case event: draft -> submitted');
select is((select count(*)::int from public.notifications where proposal_id = (select v::uuid from ids where k = 'p1')), 1,
  'the applicant got one notification');
select isnt((select version_id from public.attachments where id = (select v::uuid from ids where k = 'att1')), null,
  'the attachment is bound to V1');
select is((select count(*)::int from public.proposal_drafts where proposal_id = (select v::uuid from ids where k = 'p1')), 0,
  'the working draft is cleared after submit');

-- BCR-001 B2: same key on a different case -> REQUEST_CONFLICT; nothing changes.
insert into ids select 'p2', public.save_draft('{"title":"Second idea"}'::jsonb, null, '20000000-0000-4000-8000-000000000001') ->> 'proposal_id';
select throws_ok(
  format($$select public.submit_proposal(%L, %L, 'sample-2026-11-v1')$$, (select v from ids where k = 'p2'), (select v from ids where k = 'key1')),
  'PT409', 'REQUEST_CONFLICT', 'reusing a request key for another case is a conflict');
select throws_ok(
  format($$select public.submit_proposal(%L, gen_random_uuid(), 'sample-2026-11-v1')$$, (select v from ids where k = 'p1')),
  'PT409', 'INVALID_STATE', 'a submitted case cannot be submitted again with a new key');
select is(public.get_submission_receipt(null, (select v::uuid from ids where k = 'key1')) ->> 'reference',
  (select v::jsonb ->> 'reference' from ids where k = 'r1'), 'the receipt can be looked up by request key (unknown outcome)');

-- ============================================================ access after submit (N1, N2, N3, N7)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
select is((public.get_submission_receipt(null, (select v::uuid from ids where k = 'key1')) ->> 'found')::boolean, false,
  'Applicant B cannot look up A''s receipt');
select is(
  (select count(*)::int from public.proposals where id = (select v::uuid from ids where k = 'p1'))
  + (select count(*)::int from public.proposal_versions where proposal_id = (select v::uuid from ids where k = 'p1'))
  + (select count(*)::int from public.attachments where proposal_id = (select v::uuid from ids where k = 'p1')), 0,
  'N1: Applicant B reads zero rows of A''s case, versions and files');
select throws_ok(format($$select public.authorize_attachment_download(%L)$$, (select v from ids where k = 'att1')),
  'PT403', 'FORBIDDEN', 'N2: Applicant B cannot get a download link for A''s file');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}', true);
select throws_ok(format($$select public.authorize_attachment_download(%L)$$, (select v from ids where k = 'att1')),
  'PT403', 'FORBIDDEN', 'N3: an unassigned reviewer gets no file link');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}', true);
select throws_ok(format($$select public.authorize_attachment_download(%L)$$, (select v from ids where k = 'att1')),
  'PT403', 'FORBIDDEN', 'N7: the support consultant gets no file link');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select is((select count(*)::int from public.proposals where id = (select v::uuid from ids where k = 'p1')), 1,
  'the screening officer reads the submitted case');
select is((public.authorize_attachment_download((select v::uuid from ids where k = 'att1')) ->> 'expires_in')::int, 60,
  'the screening officer is authorised for a 60-second link');
reset role;

select is((select count(*)::int from public.audit_events
           where action = 'proposal.submitted' and proposal_id = (select v::uuid from ids where k = 'p1')), 1,
  'SEC-01: exactly one submit audit row (the retry wrote none)');
select is((select count(*)::int from public.audit_events
           where action = 'attachment.download_authorised' and proposal_id = (select v::uuid from ids where k = 'p1')), 1,
  'SEC-01: an authorised download is audited (refusals write nothing)');

-- ============================================================ immutability (N6)
select throws_ok(
  format($$update public.proposal_versions set data = '{}'::jsonb where proposal_id = %L$$, (select v from ids where k = 'p1')),
  'PT409', 'IMMUTABLE', 'N6: V1 cannot be changed after submit');
select throws_ok(
  format($$update public.attachments set filename = 'x.pdf' where id = %L$$, (select v from ids where k = 'att1')),
  'PT409', 'IMMUTABLE', 'a submitted attachment cannot be changed');

-- ============================================================ N9: challenge closes while drafting
update public.challenges set status = 'closed' where id = '20000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select throws_ok(
  format($$select public.submit_proposal(%L, gen_random_uuid(), 'sample-2026-11-v1')$$, (select v from ids where k = 'p2')),
  'PT409', 'CHALLENGE_CLOSED', 'N9: submitting to a closed challenge is refused');
select is((select data ->> 'title' from public.proposal_drafts where proposal_id = (select v::uuid from ids where k = 'p2')),
  'Second idea', 'N9: the draft is preserved');
reset role;

-- ADM-02: an unpublished challenge stays readable to the applicant with a case in it, not to the public.
update public.challenges set status = 'unpublished' where id = '20000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select is((select count(*)::int from public.challenges where id = '20000000-0000-4000-8000-000000000001'), 1,
  'the applicant still reads the unpublished challenge their draft belongs to');
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*)::int from public.challenges where id = '20000000-0000-4000-8000-000000000001'), 0,
  'the public cannot read an unpublished challenge');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
reset role;
update public.challenges set status = 'published' where id = '20000000-0000-4000-8000-000000000001';

-- ============================================================ IAM-02: verification and consent
update auth.users set email_confirmed_at = null where id = '00000000-0000-4000-8000-0000000000a1';
set local role authenticated;
select throws_ok(
  format($$select public.submit_proposal(%L, gen_random_uuid(), 'sample-2026-11-v1')$$, (select v from ids where k = 'p2')),
  'PT422', 'VALIDATION', 'an unverified account cannot submit (VALIDATION, so the UI can say why)');
do $$
declare v_detail text;
begin
  perform public.submit_proposal((select v::uuid from ids where k = 'p2'), gen_random_uuid(), 'sample-2026-11-v1');
exception when others then
  get stacked diagnostics v_detail = pg_exception_detail;
  insert into ids values ('unverified_detail', v_detail);
end $$;
select is((select v::jsonb from ids where k = 'unverified_detail'),
  '{"fields": {"email": "Verify your email address"}}'::jsonb, 'the refusal names the email field');
select throws_ok($$select public.record_consent('old-version')$$, 'PT422', 'VALIDATION',
  'consent to an out-of-date notice is refused');
reset role;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000ff', 'authenticated', 'authenticated',
        'new.person@demo.ceda-portal.test', '', '{"full_name":"New Person","consent_version":"sample-2026-11-v1"}', now(), now());
select is((select consent_version from public.profiles where id = '00000000-0000-4000-8000-0000000000ff'), 'sample-2026-11-v1',
  'IAM-02: sign-up creates a profile with the consent version');
select is((select array_agg(role_key) from public.user_roles where user_id = '00000000-0000-4000-8000-0000000000ff'),
  array['applicant'], 'sign-up grants the applicant role only');

set local role anon;
select set_config('request.jwt.claims', '', true);
select throws_ok($$select count(*) from public.proposals$$, '42501', null, 'anon has no access to cases at all');
reset role;

select * from finish();
rollback;
