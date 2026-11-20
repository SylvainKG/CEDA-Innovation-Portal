-- =============================================================================
-- Demo seed — FICTIONAL DATA ONLY (blueprint §3.1, BCR-001 B10, D-17)
--
-- * No passwords here. Accounts are created with an unusable password; run
--   scripts/set-demo-passwords.mjs, which reads DEMO_PASSWORD from the
--   environment and sets it through the Auth admin API.
-- * 8 seeded cases (CEDA-2026-0001 … 0008): Applicant A's earlier idea plus 7
--   background cases, so the demo submission becomes CEDA-2026-0009.
-- * Every person, organisation, contact and pathway below is invented and
--   labelled DEMO / Sample.
-- Runs on `supabase db reset` (local, CI). Never run against a database with
-- real users.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Content (privacy notice and declaration first: sign-up consent checks them)
-- -----------------------------------------------------------------------------

insert into public.content_pages (slug, kind, title, body_md, version, position, is_sample, status) values
  ('privacy-notice', 'privacy', 'Privacy notice',
   E'**Sample — awaiting CEDA confirmation.**\n\nThis demonstration portal stores the details you enter so that CEDA staff can assess your idea. It is designed with reference to the Data Protection Act, 2024. All data in this demo is fictional and is deleted after judging.',
   'sample-2026-11-v1', 0, true, 'published'),
  ('applicant-declaration', 'declaration', 'Confidentiality and IP declaration',
   E'**Sample wording — CEDA will supply the final terms (D-22).**\n\nI confirm the information is accurate, that I have the right to submit this idea, and I understand it will be shared only with CEDA staff assigned to assess it.',
   'sample-2026-11-v1', 0, true, 'published'),
  ('faq-who-can-apply', 'faq', 'Who can apply?', 'Sample answer: registered citizens and businesses with an idea that fits an open challenge.', null, 1, true, 'published'),
  ('faq-how-long', 'faq', 'How long does a review take?', 'Sample answer: screening within 5 working days, evaluation within 15 working days.', null, 2, true, 'published'),
  ('faq-confidential', 'faq', 'Who can see my idea?', 'Sample answer: only you and the CEDA staff assigned to your case.', null, 3, true, 'published'),
  ('faq-revise', 'faq', 'Can I change my idea after submitting?', 'Sample answer: only if CEDA asks for a revision. Each revision is saved as a new version.', null, 4, true, 'published'),
  ('faq-files', 'faq', 'What files can I attach?', 'Sample answer: PDF, DOCX, XLSX, PNG or JPG, up to 10 MB each.', null, 5, true, 'published'),
  ('contact-companies', 'contact', 'Company registration (sample)', 'Sample — awaiting CEDA confirmation. Fictional registry desk, demo@example.test', null, 1, true, 'published'),
  ('contact-licensing', 'contact', 'Trade licensing (sample)', 'Sample — awaiting CEDA confirmation. Fictional licensing office, demo@example.test', null, 2, true, 'published'),
  ('contact-standards', 'contact', 'Product standards (sample)', 'Sample — awaiting CEDA confirmation. Fictional standards office, demo@example.test', null, 3, true, 'published'),
  ('contact-ip', 'contact', 'Intellectual property (sample)', 'Sample — awaiting CEDA confirmation. Fictional IP office, demo@example.test', null, 4, true, 'published'),
  ('referral-ceda', 'referral', 'CEDA financing (sample referral information)', 'Listed for information; not an endorsement.', null, 1, true, 'published'),
  ('referral-bif', 'referral', 'Innovation fund (sample referral information)', 'Listed for information; not an endorsement.', null, 2, true, 'published'),
  ('referral-lea', 'referral', 'Enterprise mentoring (sample referral information)', 'Listed for information; not an endorsement.', null, 3, true, 'published'),
  ('referral-bdih', 'referral', 'Digital innovation hub (sample referral information)', 'Listed for information; not an endorsement.', null, 4, true, 'published'),
  ('fault-support', 'support', 'Report a problem', 'Sample support page: severity levels, response times and the contact route. Hours 09:00–16:00 CAT, working days.', null, 0, true, 'published');

insert into public.service_calendar (weekday, is_working, opens_at, closes_at) values
  (1, true, '09:00', '16:00'), (2, true, '09:00', '16:00'), (3, true, '09:00', '16:00'),
  (4, true, '09:00', '16:00'), (5, true, '09:00', '16:00'),
  (6, false, '09:00', '16:00'), (7, false, '09:00', '16:00');

insert into public.service_closures (day, reason) values
  ('2026-12-25', 'Public holiday (sample)'),
  ('2026-12-26', 'Public holiday (sample)');

-- -----------------------------------------------------------------------------
-- Rubrics (D-20: 1–5 with anchors) and challenges (ARC-01: different form + rubric)
-- -----------------------------------------------------------------------------

insert into public.rubrics (id, key, title) values
  ('10000000-0000-4000-8000-000000000001', 'water-smart-2026', 'Water-Smart Agriculture rubric'),
  ('10000000-0000-4000-8000-000000000002', 'youth-digital-2026', 'Youth Digital Services rubric');

-- Created as drafts, filled, then published (published rubrics are locked; weights must total 100).
insert into public.rubric_versions (id, rubric_id, version_no) values
  ('11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 1),
  ('11000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 1);

insert into public.rubric_criteria (id, rubric_version_id, key, label, weight, anchors, guidance, position) values
  ('12000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'innovation', 'Innovation', 30,
   '{"1":"Not demonstrated","3":"Partly demonstrated","5":"Fully demonstrated with evidence"}', 'How new is the idea for Botswana agriculture?', 1),
  ('12000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000001', 'market_potential', 'Market potential', 25,
   '{"1":"Not demonstrated","3":"Partly demonstrated","5":"Fully demonstrated with evidence"}', 'Is there a clear customer and demand?', 2),
  ('12000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000001', 'feasibility', 'Feasibility', 25,
   '{"1":"Not demonstrated","3":"Partly demonstrated","5":"Fully demonstrated with evidence"}', 'Can the team deliver it with the resources described?', 3),
  ('12000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-000000000001', 'economic_impact', 'Economic impact', 20,
   '{"1":"Not demonstrated","3":"Partly demonstrated","5":"Fully demonstrated with evidence"}', 'Jobs, income and water savings.', 4),
  ('12000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000002', 'digital_innovation', 'Digital innovation', 40,
   '{"1":"Not demonstrated","3":"Partly demonstrated","5":"Fully demonstrated with evidence"}', 'Use of technology to solve the problem.', 1),
  ('12000000-0000-4000-8000-000000000012', '11000000-0000-4000-8000-000000000002', 'user_reach', 'User reach', 30,
   '{"1":"Not demonstrated","3":"Partly demonstrated","5":"Fully demonstrated with evidence"}', 'How many young people will use it?', 2),
  ('12000000-0000-4000-8000-000000000013', '11000000-0000-4000-8000-000000000002', 'team_capability', 'Team capability', 30,
   '{"1":"Not demonstrated","3":"Partly demonstrated","5":"Fully demonstrated with evidence"}', 'Skills and track record of the team.', 3);

update public.rubric_versions set published_at = '2026-09-20T08:00:00Z' where id = '11000000-0000-4000-8000-000000000001';
update public.rubric_versions set published_at = '2026-05-20T08:00:00Z' where id = '11000000-0000-4000-8000-000000000002';

insert into public.challenges (id, slug, title, summary, status, opens_at, closes_at, audience) values
  ('20000000-0000-4000-8000-000000000001', 'water-smart-agriculture-2026', 'Water-Smart Agriculture Challenge 2026',
   'Fictional demo challenge: ideas that help farmers grow more with less water.', 'published',
   '2026-10-01T00:00:00+02:00', '2026-12-31T16:00:00+02:00', 'Citizen-owned businesses and individuals (DEMO)'),
  ('20000000-0000-4000-8000-000000000002', 'youth-digital-services-2026', 'Youth Digital Services Challenge 2026',
   'Fictional demo challenge (closed): digital services built by young entrepreneurs.', 'closed',
   '2026-06-01T00:00:00+02:00', '2026-09-30T16:00:00+02:00', 'Entrepreneurs aged 18–35 (DEMO)');

insert into public.challenge_versions (id, challenge_id, version_no, brief_md, form_schema, required_docs, template_files, rubric_version_id, published_at) values
  ('21000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 1,
   E'**Fictional demo challenge.** Propose a product or service that reduces water use on Botswana farms.',
   '{"sections":[
      {"key":"about_you","title":"About you","fields":[
        {"key":"applicant_name","label":"Your full name","type":"text","required":true,"max_length":120},
        {"key":"organisation","label":"Business or organisation","type":"text","required":false,"max_length":160},
        {"key":"contact_email","label":"Contact email","type":"email","required":true,"max_length":200}]},
      {"key":"overview","title":"Idea overview","fields":[
        {"key":"title","label":"Idea title","type":"text","required":true,"max_length":120},
        {"key":"summary","label":"Summary","type":"textarea","required":true,"max_length":1000,"help":"Two or three sentences a non-expert understands."},
        {"key":"sector","label":"Farming sector","type":"select","required":true,"options":["Crops","Livestock","Horticulture","Mixed"]}]},
      {"key":"innovation","title":"Innovation & feasibility","fields":[
        {"key":"problem","label":"Problem you solve","type":"textarea","required":true,"max_length":2000},
        {"key":"solution","label":"Your solution","type":"textarea","required":true,"max_length":2000},
        {"key":"feasibility","label":"How you will deliver it","type":"textarea","required":false,"max_length":2000}]},
      {"key":"impact","title":"Impact","fields":[
        {"key":"impact","label":"Expected impact","type":"textarea","required":true,"max_length":2000},
        {"key":"pilot_site","label":"Pilot site","type":"text","required":false,"max_length":200}]}
    ]}',
   '[{"key":"business_plan","label":"Business plan (PDF)","required":true},{"key":"budget","label":"Budget (XLSX)","required":false}]',
   '[{"name":"Proposal template (sample).docx","path":"water-smart-agriculture-2026/proposal-template.docx"}]',
   '11000000-0000-4000-8000-000000000001', '2026-09-25T08:00:00Z'),
  ('21000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 1,
   E'**Fictional demo challenge (closed).** Digital services that young people can use on a phone.',
   '{"sections":[
      {"key":"team","title":"Your team","fields":[
        {"key":"team_lead","label":"Team lead","type":"text","required":true,"max_length":120},
        {"key":"team_size","label":"Team size","type":"select","required":true,"options":["1","2–3","4–6","7+"]}]},
      {"key":"service","title":"Your service","fields":[
        {"key":"title","label":"Service name","type":"text","required":true,"max_length":120},
        {"key":"users","label":"Who will use it","type":"textarea","required":true,"max_length":1500},
        {"key":"channel","label":"Main channel","type":"select","required":true,"options":["Mobile app","USSD","Web","WhatsApp"]}]}
    ]}',
   '[{"key":"pitch_deck","label":"Pitch deck (PDF)","required":true}]',
   '[]',
   '11000000-0000-4000-8000-000000000002', '2026-05-25T08:00:00Z');

-- -----------------------------------------------------------------------------
-- Demo accounts (blueprint §3.1). Password set later by scripts/set-demo-passwords.mjs.
-- -----------------------------------------------------------------------------

-- Helper functions live in a scratch schema that is dropped at the end of the seed.
-- (Temporary-schema functions are not supported by the Supabase CLI's seeding.)
drop schema if exists seed_helpers cascade;
create schema seed_helpers;

create function seed_helpers.demo_user(p_id uuid, p_email text, p_name text, p_org text, p_roles text[])
returns void
language plpgsql
as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email, '',
          '2026-10-01T08:00:00Z',
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', p_name, 'organisation', p_org, 'consent_version', 'sample-2026-11-v1'),
          '2026-10-01T08:00:00Z', '2026-10-01T08:00:00Z', '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text, 'email',
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
          null, '2026-10-01T08:00:00Z', '2026-10-01T08:00:00Z');

  -- The sign-up trigger made a profile and an applicant role; adjust for demo staff.
  update public.profiles set is_demo = true where id = p_id;
  if not ('applicant' = any (p_roles)) then
    delete from public.user_roles where user_id = p_id and role_key = 'applicant';
  end if;
  insert into public.user_roles (user_id, role_key, granted_by)
  select p_id, r, null from unnest(p_roles) r where r <> 'applicant';
end;
$$;

-- Called inside a DO block: the CLI prepares top-level statements before running any of them,
-- so a top-level call could not see a function created earlier in this file.
do $$
begin
  perform seed_helpers.demo_user('00000000-0000-4000-8000-0000000000a1', 'applicant.a@demo.ceda-portal.test', 'Demo Applicant A', 'Lesedi Agro Demo', array['applicant']);
  perform seed_helpers.demo_user('00000000-0000-4000-8000-0000000000a2', 'applicant.b@demo.ceda-portal.test', 'Demo Applicant B', 'Demo Business B', array['applicant']);
  perform seed_helpers.demo_user('00000000-0000-4000-8000-0000000000b1', 'screening@demo.ceda-portal.test', 'Demo Screening Officer', 'CEDA (DEMO)', array['screening_officer']);
  perform seed_helpers.demo_user('00000000-0000-4000-8000-0000000000c1', 'reviewer.1@demo.ceda-portal.test', 'Demo Reviewer 1', 'CEDA (DEMO)', array['reviewer']);
  perform seed_helpers.demo_user('00000000-0000-4000-8000-0000000000c2', 'reviewer.2@demo.ceda-portal.test', 'Demo Reviewer 2', 'CEDA (DEMO)', array['reviewer']);
  perform seed_helpers.demo_user('00000000-0000-4000-8000-0000000000c3', 'reviewer.3@demo.ceda-portal.test', 'Demo Reviewer 3', 'CEDA (DEMO)', array['reviewer']);
  perform seed_helpers.demo_user('00000000-0000-4000-8000-0000000000d1', 'adjudicator@demo.ceda-portal.test', 'Demo Adjudicator', 'CEDA (DEMO)', array['adjudicator']);
  perform seed_helpers.demo_user('00000000-0000-4000-8000-0000000000e1', 'admin@demo.ceda-portal.test', 'Demo Administrator', 'CEDA (DEMO)', array['admin','auditor']);
  perform seed_helpers.demo_user('00000000-0000-4000-8000-0000000000f1', 'consultant@demo.ceda-portal.test', 'Demo Support Consultant', 'CEDA (DEMO)', array['support_consultant','support_lead']);
  perform seed_helpers.demo_user('00000000-0000-4000-8000-0000000000f2', 'committee.ext@demo.ceda-portal.test', 'Demo Committee Member', 'External committee (DEMO)', array['committee_member']);
  -- Background applicants (own the background cases; cannot sign in until a password is set).
  perform seed_helpers.demo_user('00000000-0000-4000-8000-0000000000a3', 'applicant.c@demo.ceda-portal.test', 'Demo Applicant C', 'Kalahari Drip Demo', array['applicant']);
  perform seed_helpers.demo_user('00000000-0000-4000-8000-0000000000a4', 'applicant.d@demo.ceda-portal.test', 'Demo Applicant D', 'Okavango Greens Demo', array['applicant']);
  perform seed_helpers.demo_user('00000000-0000-4000-8000-0000000000a5', 'applicant.e@demo.ceda-portal.test', 'Demo Applicant E', 'Tswana Herd Tech Demo', array['applicant']);
end $$;

-- -----------------------------------------------------------------------------
-- Cases: CEDA-2026-0001 … 0008 (BCR-001 B10). Status paths follow §4.3.
-- -----------------------------------------------------------------------------

create function seed_helpers.demo_case(p_owner uuid, p_title text, p_status text, p_submitted timestamptz,
                                  p_return_stage text default null, p_closed_reason text default null)
returns uuid
language plpgsql
as $$
declare
  v_pid  uuid := gen_random_uuid();
  v_vid  uuid := gen_random_uuid();
  v_ref  text := 'CEDA-2026-' || lpad(nextval('private.proposal_reference_seq')::text, 4, '0');
  v_path text[];
  v_at   timestamptz := p_submitted;
  i      integer;
begin
  v_path := case p_status
    when 'submitted'       then array['submitted']
    when 'in_evaluation'   then array['submitted','in_evaluation']
    when 'action_required' then array['submitted','action_required']
    when 'in_adjudication' then array['submitted','in_evaluation','in_adjudication']
    when 'not_approved'    then array['submitted','in_evaluation','in_adjudication','not_approved']
    when 'awarded'         then array['submitted','in_evaluation','in_adjudication','approved','awarded']
    when 'closed'          then array['submitted','closed']
  end;

  -- proposals.current_version_id references the version; insert the case as a
  -- draft first, then the version, then move it to its final state.
  insert into public.proposals (id, applicant_id, challenge_version_id, title, status, created_at)
  values (v_pid, p_owner, '21000000-0000-4000-8000-000000000001', p_title, 'draft', p_submitted - interval '3 days');

  insert into public.proposal_versions (id, proposal_id, version_no, data, submitted_at, submitted_by,
                                        declaration_version, declaration_accepted_at)
  values (v_vid, v_pid, 1,
          jsonb_build_object('title', p_title, 'applicant_name', 'Fictional applicant (DEMO)',
                             'contact_email', 'demo@example.test',
                             'summary', 'Fictional demo summary for ' || p_title || '.',
                             'sector', 'Crops', 'problem', 'Fictional problem statement (DEMO).',
                             'solution', 'Fictional solution description (DEMO).',
                             'impact', 'Fictional impact statement (DEMO).'),
          p_submitted, p_owner, 'sample-2026-11-v1', p_submitted);

  update public.proposals
  set status = p_status, reference = v_ref, current_version_id = v_vid, submitted_at = p_submitted,
      return_stage = p_return_stage, closed_reason = p_closed_reason
  where id = v_pid;

  insert into public.case_events (proposal_id, from_status, to_status, public_stage, actor_id, at)
  values (v_pid, 'draft', 'submitted', 'submission', p_owner, p_submitted);
  for i in 2 .. coalesce(array_length(v_path, 1), 1) loop
    v_at := v_at + interval '2 days';
    insert into public.case_events (proposal_id, from_status, to_status, public_stage, actor_id, at)
    values (v_pid, v_path[i - 1], v_path[i], private.public_stage(v_path[i]), null, v_at);
  end loop;

  insert into public.audit_events (actor_id, actor_role, action, target_type, target_id, proposal_id, metadata, at)
  values (p_owner, 'applicant', 'proposal.submitted', 'proposal', v_pid::text, v_pid,
          jsonb_build_object('reference', v_ref, 'version_no', 1, 'seeded', true), p_submitted);
  return v_pid;
end;
$$;

create function seed_helpers.demo_assign(p_pid uuid, p_reviewer uuid, p_declared boolean)
returns uuid
language sql
as $$
  insert into public.assignments (proposal_id, reviewer_id, assigned_by, assigned_at, due_at, declared_at, has_conflict,
                                  confidentiality_accepted_at)
  select p_pid, p_reviewer, '00000000-0000-4000-8000-0000000000e1', p.submitted_at + interval '2 days',
         p.submitted_at + interval '16 days',
         case when p_declared then p.submitted_at + interval '3 days' end,
         case when p_declared then false end,
         case when p_declared then p.submitted_at + interval '3 days' end
  from public.proposals p where p.id = p_pid
  returning id;
$$;

-- Submitted scorecard on the case's current version; scores in criterion order.
create function seed_helpers.demo_score(p_assignment uuid, p_scores int[])
returns void
language plpgsql
as $$
declare
  v_sc  uuid := gen_random_uuid();
  v_ver uuid;
  v_at  timestamptz;
begin
  select p.current_version_id, p.submitted_at + interval '4 days' into v_ver, v_at
  from public.assignments a join public.proposals p on p.id = a.proposal_id where a.id = p_assignment;
  insert into public.scorecards (id, assignment_id, version_id, rubric_version_id, status, overall_comment)
  values (v_sc, p_assignment, v_ver, '11000000-0000-4000-8000-000000000001', 'draft', 'Fictional reviewer comment (DEMO).');
  insert into public.scorecard_items (scorecard_id, criterion_id, score, reason)
  select v_sc, c.id, p_scores[c.position], 'Fictional reason (DEMO).'
  from public.rubric_criteria c where c.rubric_version_id = '11000000-0000-4000-8000-000000000001';
  update public.scorecards set status = 'submitted', submitted_at = v_at where id = v_sc;
end;
$$;

create function seed_helpers.demo_decide(p_pid uuid, p_outcome text)
returns uuid
language sql
as $$
  insert into public.decisions (proposal_id, version_id, outcome, reason, recorded_by, recorded_at, published_at, published_by)
  select p.id, p.current_version_id, p_outcome, 'Fictional decision reason (DEMO).', '00000000-0000-4000-8000-0000000000d1',
         p.submitted_at + interval '6 days', p.submitted_at + interval '6 days', '00000000-0000-4000-8000-0000000000d1'
  from public.proposals p where p.id = p_pid
  returning id;
$$;

do $$
declare
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid; c6 uuid; c7 uuid; c8 uuid; a uuid; b uuid; d uuid; v uuid;
  r1 constant uuid := '00000000-0000-4000-8000-0000000000c1';
  r2 constant uuid := '00000000-0000-4000-8000-0000000000c2';
begin
  -- 0001 Submitted, awaiting screening
  c1 := seed_helpers.demo_case('00000000-0000-4000-8000-0000000000a3', 'Solar-powered drip kits for smallholders', 'submitted', '2026-11-10T09:15:00+02:00');

  -- 0002 In evaluation, one of two scorecards in
  c2 := seed_helpers.demo_case('00000000-0000-4000-8000-0000000000a4', 'Greywater reuse for market gardens', 'in_evaluation', '2026-11-02T10:30:00+02:00');
  a := seed_helpers.demo_assign(c2, r1, true);  perform seed_helpers.demo_score(a, array[4,3,4,3]);
  b := seed_helpers.demo_assign(c2, r2, true);

  -- 0003 Action required: clarification from screening
  -- Due after results day (3 Dec 2026), so the open question survives judging; the scheduled
  -- maintenance job expires overdue requests (migration 009).
  c3 := seed_helpers.demo_case('00000000-0000-4000-8000-0000000000a5', 'Soil-moisture SMS alerts', 'action_required', '2026-11-05T14:00:00+02:00', 'submitted');
  select current_version_id into v from public.proposals where id = c3;
  insert into public.feedback_requests (proposal_id, version_id, requested_by, from_stage, kind, message, due_at, created_at)
  values (c3, v, '00000000-0000-4000-8000-0000000000b1', 'submitted', 'clarification',
          'Please confirm the district of your pilot farms (DEMO).', '2026-12-04T16:00:00+02:00', '2026-11-07T14:00:00+02:00');

  -- 0004 In adjudication, both scorecards in
  c4 := seed_helpers.demo_case('00000000-0000-4000-8000-0000000000a3', 'Fog-net water harvesting', 'in_adjudication', '2026-10-20T09:00:00+02:00');
  a := seed_helpers.demo_assign(c4, r1, true);  perform seed_helpers.demo_score(a, array[5,4,4,4]);
  b := seed_helpers.demo_assign(c4, r2, true);  perform seed_helpers.demo_score(b, array[4,4,3,4]);

  -- 0005 Not approved (published)
  c5 := seed_helpers.demo_case('00000000-0000-4000-8000-0000000000a4', 'Cattle trough float valves', 'not_approved', '2026-10-12T11:00:00+02:00');
  a := seed_helpers.demo_assign(c5, r1, true);  perform seed_helpers.demo_score(a, array[2,3,3,2]);
  b := seed_helpers.demo_assign(c5, r2, true);  perform seed_helpers.demo_score(b, array[2,2,3,2]);
  perform seed_helpers.demo_decide(c5, 'not_approved');

  -- 0006 Approved, then awarded
  c6 := seed_helpers.demo_case('00000000-0000-4000-8000-0000000000a5', 'Hydroponic fodder units', 'awarded', '2026-10-05T08:45:00+02:00');
  a := seed_helpers.demo_assign(c6, r1, true);  perform seed_helpers.demo_score(a, array[5,5,4,4]);
  b := seed_helpers.demo_assign(c6, r2, true);  perform seed_helpers.demo_score(b, array[4,5,4,5]);
  d := seed_helpers.demo_decide(c6, 'approved');
  insert into public.awards (proposal_id, decision_id, amount_minor, currency, description, recorded_by, recorded_at)
  values (c6, d, 25000000, 'BWP', 'Fictional seed grant (DEMO).', '00000000-0000-4000-8000-0000000000e1', '2026-10-15T10:00:00+02:00');

  -- 0007 Closed at screening (ineligible)
  c7 := seed_helpers.demo_case('00000000-0000-4000-8000-0000000000a3', 'Imported irrigation resale', 'closed', '2026-10-25T13:20:00+02:00',
                          null, 'Ineligible: outside the challenge scope (DEMO)');

  -- 0008 Applicant A's earlier idea: under review, reviewers not yet declared
  c8 := seed_helpers.demo_case('00000000-0000-4000-8000-0000000000a1', 'Rainwater tanks for poultry farms', 'in_evaluation', '2026-11-08T09:40:00+02:00');
  a := seed_helpers.demo_assign(c8, r1, false);
  b := seed_helpers.demo_assign(c8, r2, false);
end $$;

-- -----------------------------------------------------------------------------
-- Chat statistics (CHT-03): 6 past sessions
-- -----------------------------------------------------------------------------

insert into public.chat_sessions (applicant_id, consultant_id, status, queued_at, accepted_at, closed_at) values
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000f1', 'closed', '2026-11-02T09:30:00+02:00', '2026-11-02T09:32:00+02:00', '2026-11-02T09:45:00+02:00'),
  ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-0000000000f1', 'closed', '2026-11-03T11:00:00+02:00', '2026-11-03T11:05:00+02:00', '2026-11-03T11:20:00+02:00'),
  ('00000000-0000-4000-8000-0000000000a5', '00000000-0000-4000-8000-0000000000f1', 'closed', '2026-11-05T14:10:00+02:00', '2026-11-05T14:11:00+02:00', '2026-11-05T14:30:00+02:00'),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000f1', 'closed', '2026-11-09T10:00:00+02:00', '2026-11-09T10:08:00+02:00', '2026-11-09T10:25:00+02:00'),
  ('00000000-0000-4000-8000-0000000000a4', null, 'missed', '2026-11-10T15:50:00+02:00', null, '2026-11-10T16:00:00+02:00'),
  ('00000000-0000-4000-8000-0000000000a5', null, 'missed', '2026-11-12T15:40:00+02:00', null, '2026-11-12T16:00:00+02:00');

insert into public.chat_messages (session_id, sender_id, body, created_at)
select s.id, s.applicant_id, 'Hello, how do I attach my business plan? (DEMO)', s.queued_at
from public.chat_sessions s where s.status = 'closed';
insert into public.chat_messages (session_id, sender_id, body, created_at)
select s.id, s.consultant_id, 'Use the Attachments step of the form. (DEMO)', s.accepted_at + interval '1 minute'
from public.chat_sessions s where s.status = 'closed';

insert into public.audit_events (action, target_type, metadata)
values ('seed.loaded', 'database', jsonb_build_object('note', 'Fictional demo seed', 'cases', 8));

drop schema seed_helpers cascade;
