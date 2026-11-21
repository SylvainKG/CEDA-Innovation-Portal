-- Slice 6b: admin settings. HLP-01 content, CHT-02 hours/override, ARC-01 new role and
-- new criterion without code changes, REV-02 rubric publishing, ADM-01/02 challenges and forms.
begin;
create extension if not exists pgtap with schema extensions;
select plan(52);

create temp table ids (k text primary key, v text);
grant all on ids to authenticated, anon;

create function pg_temp.form(with_title boolean default true) returns jsonb language sql as $$
  select jsonb_build_object('sections', jsonb_build_array(jsonb_build_object('key', 'main', 'title', 'Your idea', 'fields',
    case when with_title then
      '[{"key":"title","label":"Idea title","type":"text","required":true,"max_length":120},
        {"key":"summary","label":"Summary","type":"textarea","required":true,"max_length":1000},
        {"key":"channel","label":"Channel","type":"select","required":true,"options":["Web","USSD"]}]'::jsonb
    else '[{"key":"summary","label":"Summary","type":"textarea","required":true}]'::jsonb end))) $$;
grant execute on function pg_temp.form(boolean) to authenticated;

set local role authenticated;

-- ============================================================ access
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select throws_ok($$select public.save_content_page('faq-x', 'faq', 'Q', 'A')$$, 'PT403', 'FORBIDDEN', 'a screening officer cannot edit content');
select throws_ok($$select public.create_role('observer', 'Observer', array['report.read'])$$, 'PT403', 'FORBIDDEN',
  'a screening officer cannot create roles');
select throws_ok($$select public.set_chat_override('open')$$, 'PT403', 'FORBIDDEN', 'a screening officer cannot change chat hours');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);

-- ============================================================ HLP-01 content pages
select is(public.save_content_page('faq-deadline', 'faq', 'When does the challenge close?', 'Sample answer.') ->> 'status', 'draft',
  'the admin drafts an FAQ');
set local role anon;
select set_config('request.jwt.claims', '', true);
select is((select count(*)::int from public.content_pages where slug = 'faq-deadline'), 0, 'a draft FAQ is not public');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select lives_ok($$select public.save_content_page('faq-deadline', 'faq', 'When does the challenge close?', 'Sample answer: 31 Dec.', 'published', 6)$$,
  'the admin publishes it');
set local role anon;
select set_config('request.jwt.claims', '', true);
select is((select count(*)::int from public.content_pages where slug = 'faq-deadline'), 1, 'HLP-01: the published FAQ is public');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select throws_ok($$select public.save_content_page('faq-deadline', 'contact', 'x', 'y')$$, 'PT422', 'VALIDATION', 'a page cannot change type');
select throws_ok($$select public.save_content_page('Bad Slug', 'faq', 'x', 'y')$$, 'PT422', 'VALIDATION', 'page addresses are validated');
select throws_ok($$select public.save_content_page('applicant-declaration', 'declaration', 'Declaration', 'New wording', 'published', 0, true, 'sample-2026-11-v1')$$,
  'PT422', 'VALIDATION', 'D-22: changed declaration wording needs a new version');
select lives_ok($$select public.save_content_page('applicant-declaration', 'declaration', 'Declaration', 'New wording', 'published', 0, true, 'sample-2026-11-v2')$$,
  'new wording with a new version is accepted');
reset role;
select is(private.current_notice_version('declaration'), 'sample-2026-11-v2', 'submissions now require the new declaration version');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);

-- ============================================================ CHT-02 hours and override
select throws_ok($$select public.set_service_hours(6, true, '16:00', '09:00')$$, 'PT422', 'VALIDATION', 'opening must be before closing');
select lives_ok($$select public.set_service_hours(6, true, '09:00', '12:00')$$, 'the admin opens chat on Saturday mornings');
reset role;
select ok(private.chat_is_open_at('2026-11-21T10:00:00+02:00'), 'Saturday 10:00 CAT is now open');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select lives_ok($$select public.set_service_closure('2026-11-25', 'Staff training (sample)')$$, 'the admin adds a closure day');
reset role;
select ok(not private.chat_is_open_at('2026-11-25T10:00:00+02:00'), 'the closure day is closed');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select lives_ok($$select public.set_service_closure('2026-11-25')$$, 'and removes it again');
reset role;
select ok(private.chat_is_open_at('2026-11-25T10:00:00+02:00'), 'the day is open again');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select is((public.set_chat_override('closed') ->> 'open')::boolean, false, 'the demo override forces chat closed');
select throws_ok($$select public.set_chat_override('maybe')$$, 'PT422', 'VALIDATION', 'unknown override modes are refused');
select is((public.set_chat_override(null) ->> 'mode'), null, 'the override can be removed');

-- ============================================================ ARC-01: a new role without code changes
select throws_ok($$select public.create_role('Bad Key', 'Observer', array['report.read'])$$, 'PT422', 'VALIDATION', 'role keys are validated');
select throws_ok($$select public.create_role('observer', 'Observer', array['report.fly'])$$, 'PT422', 'VALIDATION', 'unknown permissions are refused');
select is(public.create_role('programme_observer', 'Programme observer', array['report.read'], false) ->> 'key', 'programme_observer',
  'ARC-01: the admin creates a new role with a permission');
select throws_ok($$select public.create_role('programme_observer', 'Again', array['report.read'])$$, 'PT422', 'VALIDATION',
  'role keys are unique');
select lives_ok($$select public.grant_role('00000000-0000-4000-8000-0000000000a2', 'programme_observer', 'Pilot (test)')$$,
  'and grants it to a user');
select throws_ok($$select public.set_role_permissions('reviewer', array['report.read'])$$, 'PT409', 'INVALID_STATE',
  'built-in roles keep their permissions');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
select is((public.get_programme_report() -> 'participation' ->> 'submitted')::int, 8, 'ARC-01: the new role works at once');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select lives_ok($$select public.set_role_permissions('programme_observer', array[]::text[])$$, 'the admin removes its permission');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
select throws_ok($$select public.get_programme_report()$$, 'PT403', 'FORBIDDEN', 'and the access is gone');

-- ============================================================ ARC-01 / REV-02: a new criterion in rubric v2
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
insert into ids select 'rv2', public.create_rubric_draft('10000000-0000-4000-8000-000000000001') ->> 'rubric_version_id';
select is((select count(*)::int from public.rubric_criteria where rubric_version_id = (select v::uuid from ids where k = 'rv2')), 4,
  'a new draft starts from the published criteria');
select is((public.create_rubric_draft('10000000-0000-4000-8000-000000000001') ->> 'existing')::boolean, true,
  'asking again returns the open draft');
select throws_ok(format($$select public.save_rubric_criterion(%L, 'sustainability', 'Sustainability', 10, '{"1":"Not shown"}')$$,
  (select v from ids where k = 'rv2')), 'PT422', 'VALIDATION', 'D-20: anchors for 1, 3 and 5 are required');
select is((public.save_rubric_criterion((select v::uuid from ids where k = 'rv2'), 'sustainability', 'Sustainability', 10,
  '{"1":"Not demonstrated","3":"Partly demonstrated","5":"Fully demonstrated with evidence"}', 'Water and soil over time.', 5)
  ->> 'weights_total')::numeric, 110::numeric, 'ARC-01: a new criterion is added (weights now total 110)');
select throws_ok(format($$select public.publish_rubric_version(%L)$$, (select v from ids where k = 'rv2')), 'PT422', 'VALIDATION',
  'a rubric whose weights are not 100 cannot be published');
select lives_ok(format($$select public.save_rubric_criterion(%L, 'innovation', 'Innovation', 20, '{"1":"Not demonstrated","3":"Partly demonstrated","5":"Fully demonstrated with evidence"}')$$,
  (select v from ids where k = 'rv2')), 'the admin rebalances the weights');
select is((public.publish_rubric_version((select v::uuid from ids where k = 'rv2')) ->> 'published')::boolean, true, 'rubric v2 is published');
select throws_ok(format($$select public.remove_rubric_criterion(%L, 'sustainability')$$, (select v from ids where k = 'rv2')),
  'PT409', 'INVALID_STATE', 'a published rubric version is locked');

-- ============================================================ ADM-01 / ADM-02 challenges and forms
select throws_ok($$select public.create_challenge('youth-agri', 'Youth Agri 2027', 'Sample', '2027-02-01', '2027-01-01')$$,
  'PT422', 'VALIDATION', 'closing must be after opening');
insert into ids select 'ch', public.create_challenge('youth-agri-2027', 'Youth Agri Challenge 2027 (DEMO)', 'Fictional demo challenge.',
  now() - interval '1 day', now() + interval '60 days', 'Entrepreneurs aged 18–35 (DEMO)') ->> 'challenge_id';
select throws_ok(format($$select public.save_challenge_version(%L, 'Brief', pg_temp.form(false), '[]', %L)$$,
  (select v from ids where k = 'ch'), (select v from ids where k = 'rv2')), 'PT422', 'VALIDATION', 'a form must include a required title field');
select is((public.save_challenge_version((select v::uuid from ids where k = 'ch'), 'Fictional brief.', pg_temp.form(),
  '[{"key":"pitch","label":"Pitch deck","required":true}]', (select v::uuid from ids where k = 'rv2')) ->> 'version_no')::int, 1,
  'ADM-01: the admin saves form version 1 with rubric v2');
select is(public.publish_challenge((select v::uuid from ids where k = 'ch')) ->> 'status', 'published', 'ADM-01: and publishes the challenge');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
insert into ids select 'p', public.save_draft('{"title":"Mobile irrigation advice"}'::jsonb, null, (select v::uuid from ids where k = 'ch')) ->> 'proposal_id';
select ok((select p.challenge_version_id = cv.id from public.proposals p join public.challenge_versions cv on cv.version_no = 1
           and cv.challenge_id = (select v::uuid from ids where k = 'ch') where p.id = (select v::uuid from ids where k = 'p')),
  'an applicant starts an idea on form version 1');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select is((public.save_challenge_version((select v::uuid from ids where k = 'ch'), 'Updated brief.', pg_temp.form(), '[]',
  (select v::uuid from ids where k = 'rv2')) ->> 'version_no')::int, 2, 'ADM-02: editing a published form creates version 2');
select lives_ok(format($$select public.publish_challenge(%L)$$, (select v from ids where k = 'ch')), 'version 2 is published');
reset role;
select ok((select cv.version_no = 1 from public.proposals p join public.challenge_versions cv on cv.id = p.challenge_version_id
           where p.id = (select v::uuid from ids where k = 'p')), 'ADM-02: the existing idea keeps form version 1');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);

select lives_ok(format($$select public.set_challenge_status(%L, 'unpublished')$$, (select v from ids where k = 'ch')), 'the admin unpublishes it');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
select throws_ok(format($$select public.save_draft('{"title":"x"}'::jsonb, null, %L)$$, (select v from ids where k = 'ch')),
  'PT409', 'CHALLENGE_CLOSED', 'an unpublished challenge takes no new ideas');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select throws_ok(format($$select public.delete_challenge(%L)$$, (select v from ids where k = 'ch')), 'PT409', 'INVALID_STATE',
  'ADM-02: a challenge that was used cannot be deleted');
insert into ids select 'ch2', public.create_challenge('unused-draft', 'Unused draft (test)', '', now(), now() + interval '10 days') ->> 'challenge_id';
select is((public.delete_challenge((select v::uuid from ids where k = 'ch2')) ->> 'deleted')::boolean, true, 'ADM-02: an unused draft can be deleted');
reset role;

select is((select count(*)::int from public.audit_events where action in ('content.saved', 'role.created', 'rubric.published',
  'challenge.published', 'settings.hours_changed', 'challenge.deleted')), 9,
  'every settings change is audited (3 content saves, 1 role, 1 rubric, 2 publications, 1 hours change, 1 deletion)');

select * from finish();
rollback;
