-- =============================================================================
-- Migration 001 — core schema, default-deny access, immutability, permissions
-- Blueprint v0.3 §4 (data model, state machine), §1.3 D-02, D-07, D-12.
-- BCR-001 recommendations applied: B2 (REQUEST_CONFLICT), B4 (outbox outcome
-- vocabulary), B9 (client_request_id on proposal_versions), B10 (seed count).
--
-- Rules enforced here:
--   * RLS is enabled on every table; with no policy, a table returns zero rows.
--   * anon/authenticated get SELECT only, and only where a policy allows it.
--     Every state change goes through a SECURITY DEFINER RPC (D-02).
--   * audit_events, case_events, proposal_versions, awards are append-only for
--     every role, including the table owner (triggers, not just grants).
--   * Confidential tables use soft delete (deleted_at): Realtime delete events
--     bypass RLS.
-- Demonstration prototype with fictional data. Not a compliance claim (D-18).
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- New objects in public must not inherit Supabase's default broad grants.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public;

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------

-- Raise a stable, coded error. PostgREST returns message = code, hint = human
-- text, details = JSON (field errors). SQLSTATE PTxxx sets the HTTP status.
create or replace function private.raise_error(p_code text, p_hint text default null, p_detail jsonb default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_state text := case p_code
    when 'UNAUTHENTICATED'   then 'PT401'
    when 'FORBIDDEN'         then 'PT403'
    when 'NOT_FOUND'         then 'PT404'
    when 'INVALID_STATE'     then 'PT409'
    when 'REQUEST_CONFLICT'  then 'PT409'
    when 'CASE_NOT_APPROVED' then 'PT409'
    when 'CHALLENGE_CLOSED'  then 'PT409'
    when 'VALIDATION'        then 'PT422'
    else 'PT400' end;
begin
  raise exception using
    errcode = v_state,
    message = p_code,
    hint    = coalesce(p_hint, ''),
    detail  = coalesce(p_detail::text, '');
end;
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Append-only guard: refuses UPDATE, DELETE and TRUNCATE for every role.
create or replace function private.forbid_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'PT409', message = 'IMMUTABLE',
    hint = format('%s.%s is append-only', tg_table_schema, tg_table_name);
end;
$$;

-- -----------------------------------------------------------------------------
-- Identity, roles and permissions
-- -----------------------------------------------------------------------------

create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text not null default '' check (char_length(full_name) <= 200),
  email            text check (char_length(email) <= 320),
  organisation     text check (char_length(organisation) <= 200),
  phone            text check (char_length(phone) <= 40),
  is_demo          boolean not null default false,
  consent_version  text,
  consent_at       timestamptz,
  alerts_opt_in    boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((consent_version is null) = (consent_at is null))
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

create table public.roles (
  key           text primary key check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  label         text not null check (char_length(label) between 1 and 80),
  is_system     boolean not null default false,
  -- D-07: roles whose permissions need an aal2 (MFA) session.
  requires_mfa  boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.permissions (
  key          text primary key check (key ~ '^[a-z][a-z_]*\.[a-z_]+$'),
  description  text not null
);

create table public.role_permissions (
  role_key    text not null references public.roles (key) on delete cascade,
  permission  text not null references public.permissions (key) on delete cascade,
  primary key (role_key, permission)
);

create table public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role_key    text not null references public.roles (key),
  granted_by  uuid references public.profiles (id),
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  revoked_by  uuid references public.profiles (id),
  -- IAM-01 / N8: nobody grants a role to themself. NULL = system grant (sign-up, seed).
  constraint user_roles_no_self_grant check (granted_by is distinct from user_id)
);
create unique index user_roles_one_active on public.user_roles (user_id, role_key) where revoked_at is null;

create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Content, calendar
-- -----------------------------------------------------------------------------

create table public.content_pages (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,80}$'),
  kind        text not null check (kind in ('faq','contact','referral','support','privacy','declaration','page')),
  title       text not null check (char_length(title) between 1 and 200),
  body_md     text not null default '' check (char_length(body_md) <= 20000),
  version     text,                       -- privacy / declaration wording version
  position    integer not null default 0,
  is_sample   boolean not null default true,
  status      text not null default 'draft' check (status in ('draft','published')),
  updated_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (kind not in ('privacy','declaration') or version is not null)
);
create trigger content_pages_updated_at before update on public.content_pages
  for each row execute function private.set_updated_at();

-- CHT-02: working hours in Africa/Gaborone. weekday: 1 = Monday … 7 = Sunday (ISO).
create table public.service_calendar (
  weekday     smallint primary key check (weekday between 1 and 7),
  is_working  boolean not null,
  opens_at    time not null default '09:00',
  closes_at   time not null default '16:00',
  check (opens_at < closes_at)
);

create table public.service_closures (
  day     date primary key,
  reason  text not null check (char_length(reason) between 1 and 200)
);

-- -----------------------------------------------------------------------------
-- Rubrics and challenges
-- -----------------------------------------------------------------------------

create table public.rubrics (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z0-9][a-z0-9-]{1,80}$'),
  title       text not null,
  created_at  timestamptz not null default now()
);

create table public.rubric_versions (
  id            uuid primary key default gen_random_uuid(),
  rubric_id     uuid not null references public.rubrics (id),
  version_no    integer not null check (version_no > 0),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (rubric_id, version_no)
);

create table public.rubric_criteria (
  id                 uuid primary key default gen_random_uuid(),
  rubric_version_id  uuid not null references public.rubric_versions (id),
  key                text not null check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  label              text not null check (char_length(label) between 1 and 120),
  weight             numeric(5,2) not null check (weight > 0 and weight <= 100),
  min_score          smallint not null default 1,
  max_score          smallint not null default 5,
  anchors            jsonb not null default '{}'::jsonb check (jsonb_typeof(anchors) = 'object'),
  guidance           text not null default '',
  position           integer not null default 0,
  unique (rubric_version_id, key),
  check (min_score = 1 and max_score = 5)   -- D-20: 1–5, no N/A
);

create table public.challenges (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,80}$'),
  title       text not null check (char_length(title) between 1 and 200),
  summary     text not null default '' check (char_length(summary) <= 1000),
  status      text not null default 'draft' check (status in ('draft','published','unpublished','closed')),
  opens_at    timestamptz not null,
  closes_at   timestamptz not null,
  audience    text not null default '' check (char_length(audience) <= 300),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (opens_at < closes_at)
);
create trigger challenges_updated_at before update on public.challenges
  for each row execute function private.set_updated_at();

-- form_schema: {"sections":[{"key","title","fields":[{"key","label","type","required","max_length","help","options"}]}]}
-- required_docs: [{"key","label","required"}]
create table public.challenge_versions (
  id                 uuid primary key default gen_random_uuid(),
  challenge_id       uuid not null references public.challenges (id),
  version_no         integer not null check (version_no > 0),
  brief_md           text not null default '',
  form_schema        jsonb not null check (jsonb_typeof(form_schema -> 'sections') = 'array'),
  required_docs      jsonb not null default '[]'::jsonb check (jsonb_typeof(required_docs) = 'array'),
  template_files     jsonb not null default '[]'::jsonb check (jsonb_typeof(template_files) = 'array'),
  rubric_version_id  uuid not null references public.rubric_versions (id),
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  unique (challenge_id, version_no)
);

-- -----------------------------------------------------------------------------
-- Cases (proposals) and versions
-- -----------------------------------------------------------------------------

create sequence private.proposal_reference_seq as integer minvalue 1 maxvalue 9999 no cycle;

create table public.proposals (
  id                     uuid primary key default gen_random_uuid(),
  reference              text unique check (reference ~ '^CEDA-[0-9]{4}-[0-9]{4}$'),
  applicant_id           uuid not null references public.profiles (id),
  challenge_version_id   uuid not null references public.challenge_versions (id),
  title                  text not null default '' check (char_length(title) <= 200),
  status                 text not null default 'draft' check (status in
                           ('draft','submitted','in_evaluation','action_required','in_adjudication',
                            'approved','not_approved','awarded','closed')),
  return_stage           text check (return_stage in ('submitted','in_evaluation','in_adjudication')),
  current_version_id     uuid,
  submitted_at           timestamptz,
  client_request_id      uuid unique,
  closed_reason          text check (char_length(closed_reason) <= 500),
  readiness_stage        text check (readiness_stage in ('concept','prototype','validated','pilot')),
  readiness_confirmed_by uuid references public.profiles (id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz,
  check ((status = 'draft') = (reference is null)),
  check ((status = 'action_required') = (return_stage is not null)),
  check (status <> 'closed' or closed_reason is not null)
);
create index proposals_applicant_idx on public.proposals (applicant_id);
create index proposals_status_idx on public.proposals (status);
create trigger proposals_updated_at before update on public.proposals
  for each row execute function private.set_updated_at();

-- Working copy of the applicant's form. Kept apart from `proposals` so staff who
-- can read a case never see unsubmitted edits (e.g. a V2 in progress).
create table public.proposal_drafts (
  proposal_id  uuid primary key references public.proposals (id) on delete cascade,
  data         jsonb not null default '{}'::jsonb
                 check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 262144),
  updated_at   timestamptz not null default now()
);

create table public.proposal_versions (
  id                       uuid primary key default gen_random_uuid(),
  proposal_id              uuid not null references public.proposals (id),
  version_no               integer not null check (version_no > 0),
  data                     jsonb not null check (jsonb_typeof(data) = 'object'),
  submitted_at             timestamptz not null default now(),
  submitted_by             uuid not null references public.profiles (id),
  responds_to_feedback_id  uuid,
  change_note              text check (char_length(change_note) <= 2000),
  declaration_version      text not null,
  declaration_accepted_at  timestamptz not null,
  client_request_id        uuid unique,                               -- BCR-001 B9
  unique (proposal_id, version_no),
  check (version_no = 1 or char_length(btrim(coalesce(change_note, ''))) > 0)
);
create trigger proposal_versions_append_only before update or delete on public.proposal_versions
  for each row execute function private.forbid_change();
create trigger proposal_versions_no_truncate before truncate on public.proposal_versions
  for each statement execute function private.forbid_change();

alter table public.proposals
  add constraint proposals_current_version_fk foreign key (current_version_id) references public.proposal_versions (id);

create table public.attachments (
  id            uuid primary key default gen_random_uuid(),
  proposal_id   uuid not null references public.proposals (id),
  version_id    uuid references public.proposal_versions (id),      -- null while draft
  doc_key       text check (doc_key ~ '^[a-z][a-z0-9_]{1,40}$'),
  storage_path  text not null check (char_length(storage_path) <= 300),
  filename      text not null check (char_length(filename) between 1 and 200),
  mime          text not null check (mime in (
                  'application/pdf',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  'image/png','image/jpeg')),
  size_bytes    bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256        text check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by   uuid not null references public.profiles (id),
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index attachments_proposal_idx on public.attachments (proposal_id);
create index attachments_version_idx on public.attachments (version_id);

-- A file bound to a submitted version is part of that version: frozen.
create or replace function private.attachments_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.version_id is not null then perform private.forbid_change(); end if;
    return old;
  end if;
  if old.version_id is not null then
    raise exception using errcode = 'PT409', message = 'IMMUTABLE', hint = 'Submitted attachments cannot change';
  end if;
  if new.proposal_id <> old.proposal_id or new.storage_path <> old.storage_path then
    raise exception using errcode = 'PT409', message = 'IMMUTABLE', hint = 'Attachment identity cannot change';
  end if;
  return new;
end;
$$;
create trigger attachments_guard before update or delete on public.attachments
  for each row execute function private.attachments_guard();

-- -----------------------------------------------------------------------------
-- Evaluation
-- -----------------------------------------------------------------------------

create table public.assignments (
  id                           uuid primary key default gen_random_uuid(),
  proposal_id                  uuid not null references public.proposals (id),
  reviewer_id                  uuid not null references public.profiles (id),
  assigned_by                  uuid not null references public.profiles (id),
  assigned_at                  timestamptz not null default now(),
  due_at                       timestamptz,
  declared_at                  timestamptz,
  has_conflict                 boolean,
  confidentiality_accepted_at  timestamptz,
  revoked_at                   timestamptz,
  revoke_reason                text check (char_length(revoke_reason) <= 500),
  check ((declared_at is null) = (has_conflict is null)),
  check (revoked_at is null or revoke_reason is not null)
);
create unique index assignments_one_active on public.assignments (proposal_id, reviewer_id) where revoked_at is null;
create index assignments_reviewer_idx on public.assignments (reviewer_id);

create table public.scorecards (
  id                 uuid primary key default gen_random_uuid(),
  assignment_id      uuid not null references public.assignments (id),
  version_id         uuid not null references public.proposal_versions (id),
  rubric_version_id  uuid not null references public.rubric_versions (id),
  status             text not null default 'draft' check (status in ('draft','submitted')),
  overall_comment    text not null default '' check (char_length(overall_comment) <= 4000),
  submitted_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (assignment_id, version_id),
  check ((status = 'submitted') = (submitted_at is not null))
);
create trigger scorecards_updated_at before update on public.scorecards
  for each row execute function private.set_updated_at();

create table public.scorecard_items (
  id            uuid primary key default gen_random_uuid(),
  scorecard_id  uuid not null references public.scorecards (id),
  criterion_id  uuid not null references public.rubric_criteria (id),
  score         smallint not null check (score between 1 and 5),
  reason        text not null check (char_length(btrim(reason)) between 1 and 4000),
  unique (scorecard_id, criterion_id)
);

-- Submitted scorecards and their items are locked (REV-03).
create or replace function private.scorecards_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'submitted' then
    raise exception using errcode = 'PT409', message = 'IMMUTABLE', hint = 'Submitted scorecards are locked';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger scorecards_guard before update or delete on public.scorecards
  for each row execute function private.scorecards_guard();

create or replace function private.scorecard_items_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_card uuid := case when tg_op = 'DELETE' then old.scorecard_id else new.scorecard_id end;
begin
  if exists (select 1 from public.scorecards s where s.id = v_card and s.status = 'submitted') then
    raise exception using errcode = 'PT409', message = 'IMMUTABLE', hint = 'Submitted scorecards are locked';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger scorecard_items_guard before insert or update or delete on public.scorecard_items
  for each row execute function private.scorecard_items_guard();

-- -----------------------------------------------------------------------------
-- Feedback (REV-04, INN-02)
-- -----------------------------------------------------------------------------

create table public.feedback_requests (
  id                   uuid primary key default gen_random_uuid(),
  proposal_id          uuid not null references public.proposals (id),
  version_id           uuid not null references public.proposal_versions (id),
  requested_by         uuid not null references public.profiles (id),
  from_stage           text not null check (from_stage in ('submitted','in_evaluation','in_adjudication')),
  kind                 text not null check (kind in ('clarification','revision')),
  message              text not null check (char_length(btrim(message)) between 1 and 4000),
  due_at               timestamptz not null,
  status               text not null default 'open' check (status in ('open','answered','expired')),
  response_text        text check (char_length(response_text) <= 1000),
  responded_at         timestamptz,
  responded_by         uuid references public.profiles (id),
  answered_version_id  uuid references public.proposal_versions (id),
  created_at           timestamptz not null default now(),
  check (kind = 'clarification' or response_text is null),
  check (kind = 'revision' or answered_version_id is null)
);
create index feedback_requests_proposal_idx on public.feedback_requests (proposal_id);

alter table public.proposal_versions
  add constraint proposal_versions_feedback_fk foreign key (responds_to_feedback_id) references public.feedback_requests (id);

create table public.feedback_tasks (
  id                       uuid primary key default gen_random_uuid(),
  feedback_request_id      uuid not null references public.feedback_requests (id),
  position                 smallint not null check (position between 1 and 20),
  text                     text not null check (char_length(btrim(text)) between 1 and 1000),
  criterion_id             uuid references public.rubric_criteria (id),
  applicant_status         text check (applicant_status in ('addressed','not_addressed')),
  applicant_explanation    text check (char_length(applicant_explanation) <= 500),
  addressed_in_version_id  uuid references public.proposal_versions (id),
  unique (feedback_request_id, position),
  check ((applicant_status is null) = (applicant_explanation is null)),
  check ((applicant_status is null) = (addressed_in_version_id is null))
);

-- Task wording is immutable; the applicant's response is written once.
create or replace function private.feedback_tasks_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
     or new.feedback_request_id <> old.feedback_request_id
     or new.position <> old.position
     or new.text <> old.text
     or new.criterion_id is distinct from old.criterion_id
     or old.applicant_status is not null then
    raise exception using errcode = 'PT409', message = 'IMMUTABLE', hint = 'Feedback tasks are locked';
  end if;
  return new;
end;
$$;
create trigger feedback_tasks_guard before update or delete on public.feedback_tasks
  for each row execute function private.feedback_tasks_guard();

create table public.task_verifications (
  id                uuid primary key default gen_random_uuid(),
  feedback_task_id  uuid not null references public.feedback_tasks (id),
  assignment_id     uuid not null references public.assignments (id),
  version_id        uuid not null references public.proposal_versions (id),
  result            text not null check (result in ('verified','not_verified')),
  note              text not null default '' check (char_length(note) <= 1000),
  verified_at       timestamptz not null default now(),
  unique (feedback_task_id, assignment_id)
);

create table public.internal_notes (
  id           uuid primary key default gen_random_uuid(),
  proposal_id  uuid not null references public.proposals (id),
  author_id    uuid not null references public.profiles (id),
  body         text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index internal_notes_proposal_idx on public.internal_notes (proposal_id);

-- -----------------------------------------------------------------------------
-- Decision and award (DEC-01, DEC-02)
-- -----------------------------------------------------------------------------

create table public.decisions (
  id             uuid primary key default gen_random_uuid(),
  proposal_id    uuid not null references public.proposals (id),
  version_id     uuid not null references public.proposal_versions (id),
  outcome        text not null check (outcome in ('approved','not_approved')),
  reason         text not null check (char_length(btrim(reason)) between 1 and 4000),
  recorded_by    uuid not null references public.profiles (id),
  recorded_at    timestamptz not null default now(),
  published_at   timestamptz,
  published_by   uuid references public.profiles (id),
  superseded_at  timestamptz,
  check ((published_at is null) = (published_by is null)),
  check (published_at is null or superseded_at is null)
);
create unique index decisions_one_active on public.decisions (proposal_id) where superseded_at is null;

create or replace function private.decisions_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.published_at is not null then
    raise exception using errcode = 'PT409', message = 'IMMUTABLE', hint = 'Published decisions are locked';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger decisions_guard before update or delete on public.decisions
  for each row execute function private.decisions_guard();

create table public.awards (
  id            uuid primary key default gen_random_uuid(),
  proposal_id   uuid not null unique references public.proposals (id),
  decision_id   uuid not null references public.decisions (id),
  amount_minor  bigint not null check (amount_minor > 0),
  currency      text not null default 'BWP' check (currency = 'BWP'),
  description   text not null check (char_length(btrim(description)) between 1 and 1000),
  recorded_by   uuid not null references public.profiles (id),
  recorded_at   timestamptz not null default now()
);
create trigger awards_append_only before update or delete on public.awards
  for each row execute function private.forbid_change();

-- DEC-02 at the data layer: an award needs an approved, published decision.
create or replace function private.awards_require_approval()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.decisions d
    where d.id = new.decision_id and d.proposal_id = new.proposal_id
      and d.outcome = 'approved' and d.published_at is not null and d.superseded_at is null
  ) then
    raise exception using errcode = 'PT409', message = 'CASE_NOT_APPROVED',
      hint = 'An award needs an approved, published decision';
  end if;
  return new;
end;
$$;
create trigger awards_require_approval before insert on public.awards
  for each row execute function private.awards_require_approval();

-- -----------------------------------------------------------------------------
-- History, notifications, outbox, audit
-- -----------------------------------------------------------------------------

create table public.case_events (
  id            bigint generated always as identity primary key,
  proposal_id   uuid not null references public.proposals (id),
  from_status   text,
  to_status     text not null,
  public_stage  text check (public_stage in ('submission','review','feedback','approval','award')),
  actor_id      uuid references public.profiles (id),
  reason        text check (char_length(reason) <= 1000),
  at            timestamptz not null default now()
);
create index case_events_proposal_at_idx on public.case_events (proposal_id, at);
create trigger case_events_append_only before update or delete on public.case_events
  for each row execute function private.forbid_change();
create trigger case_events_no_truncate before truncate on public.case_events
  for each statement execute function private.forbid_change();

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id),
  proposal_id  uuid references public.proposals (id),
  type         text not null check (type ~ '^[a-z_.]{2,60}$'),
  title        text not null check (char_length(title) between 1 and 200),
  body         text not null default '' check (char_length(body) <= 1000),   -- never proposal content
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Transactional outbox (NTF-02). Status words per BCR-001 B4: the relay records
-- what it observed ("accepted by provider"), never "sent".
create table public.email_outbox (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id),
  template             text not null check (template ~ '^[a-z_]{2,60}$'),
  payload              jsonb not null default '{}'::jsonb,
  status               text not null default 'pending'
                         check (status in ('pending','accepted','rejected','retryable','unknown_outcome')),
  attempts             integer not null default 0 check (attempts >= 0),
  last_attempt_at      timestamptz,
  next_attempt_at      timestamptz not null default now(),
  last_error           text check (char_length(last_error) <= 1000),
  provider_message_id  text,
  created_at           timestamptz not null default now()
);
create index email_outbox_due_idx on public.email_outbox (next_attempt_at) where status in ('pending','retryable');

create table public.audit_events (
  id           bigint generated always as identity primary key,
  actor_id     uuid,
  actor_role   text,
  action       text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  target_type  text not null,
  target_id    text,
  proposal_id  uuid,
  metadata     jsonb not null default '{}'::jsonb,   -- no passwords, no proposal text
  at           timestamptz not null default now()
);
create index audit_events_proposal_at_idx on public.audit_events (proposal_id, at);
create index audit_events_actor_at_idx on public.audit_events (actor_id, at);
create trigger audit_events_append_only before update or delete on public.audit_events
  for each row execute function private.forbid_change();
create trigger audit_events_no_truncate before truncate on public.audit_events
  for each statement execute function private.forbid_change();

-- -----------------------------------------------------------------------------
-- Chat (CHT-01..03) — tables now, workflow in Slice 6
-- -----------------------------------------------------------------------------

create table public.chat_sessions (
  id             uuid primary key default gen_random_uuid(),
  applicant_id   uuid not null references public.profiles (id),
  consultant_id  uuid references public.profiles (id),
  status         text not null default 'queued' check (status in ('queued','active','closed','missed')),
  queued_at      timestamptz not null default now(),
  accepted_at    timestamptz,
  closed_at      timestamptz,
  check (status = 'queued' or status = 'missed' or consultant_id is not null)
);
create index chat_sessions_applicant_idx on public.chat_sessions (applicant_id);
create index chat_sessions_consultant_idx on public.chat_sessions (consultant_id);

create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.chat_sessions (id),
  sender_id   uuid not null references public.profiles (id),
  body        text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index chat_messages_session_idx on public.chat_messages (session_id, created_at);

-- -----------------------------------------------------------------------------
-- System data: roles and permissions (ARC-01: more can be added as data)
-- -----------------------------------------------------------------------------

insert into public.roles (key, label, is_system, requires_mfa) values
  ('applicant',          'Applicant',                 true, false),
  ('screening_officer',  'Screening officer',         true, true),
  ('reviewer',           'Reviewer',                  true, true),
  ('adjudicator',        'Adjudicator',               true, true),
  ('admin',              'Administrator',             true, true),
  ('support_consultant', 'Support consultant',        true, true),
  ('support_lead',       'Support lead',              true, true),
  ('committee_member',   'External committee member', true, false),
  ('auditor',            'Auditor',                   true, true);

insert into public.permissions (key, description) values
  ('proposal.submit',         'Create drafts and submit own proposals'),
  ('case.read_all',           'Read every submitted case (not drafts)'),
  ('case.read_status',        'Read case reference, stage and counts only (D-08)'),
  ('case.screen',             'Record a screening result'),
  ('case.assign',             'Assign and revoke reviewers'),
  ('case.request_feedback',   'Request a clarification or revision'),
  ('case.close',              'Close a case with a reason'),
  ('case.note',               'Write and read internal notes'),
  ('scorecard.submit',        'Score assigned cases'),
  ('scorecard.read_panel',    'Read every scorecard on a case (panel view)'),
  ('decision.record',         'Record a decision'),
  ('decision.publish',        'Publish a recorded decision'),
  ('award.record',            'Record an award (D-05)'),
  ('role.manage',             'Grant and revoke roles'),
  ('config.manage',           'Manage challenges, forms, rubrics and content'),
  ('audit.read',              'Read the audit trail'),
  ('report.read',             'Read programme reports'),
  ('chat.start',              'Start a support chat'),
  ('chat.handle',             'Handle support chat sessions'),
  ('chat.stats',              'Read chat statistics');

insert into public.role_permissions (role_key, permission) values
  ('applicant',          'proposal.submit'),
  ('applicant',          'chat.start'),
  ('screening_officer',  'case.read_all'),
  ('screening_officer',  'case.screen'),
  ('screening_officer',  'case.request_feedback'),
  ('screening_officer',  'case.close'),
  ('screening_officer',  'case.note'),
  ('reviewer',           'scorecard.submit'),
  ('reviewer',           'case.request_feedback'),
  ('reviewer',           'case.note'),
  ('adjudicator',        'case.read_all'),
  ('adjudicator',        'case.request_feedback'),
  ('adjudicator',        'case.close'),
  ('adjudicator',        'case.note'),
  ('adjudicator',        'scorecard.read_panel'),
  ('adjudicator',        'decision.record'),
  ('adjudicator',        'decision.publish'),
  ('adjudicator',        'report.read'),
  ('admin',              'case.read_all'),
  ('admin',              'case.assign'),
  ('admin',              'case.note'),
  ('admin',              'scorecard.read_panel'),
  ('admin',              'award.record'),
  ('admin',              'role.manage'),
  ('admin',              'config.manage'),
  ('admin',              'report.read'),
  ('admin',              'audit.read'),
  ('support_consultant', 'chat.handle'),
  ('support_lead',       'chat.handle'),
  ('support_lead',       'chat.stats'),
  ('committee_member',   'case.read_status'),
  ('auditor',            'audit.read');

insert into public.app_settings (key, value) values
  -- D-07: demo staff accounts (profiles.is_demo) may act without an aal2 session.
  ('demo_mfa_exempt', 'true'::jsonb),
  -- CHT-02 demo override: null = use the calendar; "open" / "closed" forces a state.
  ('chat_demo_override', 'null'::jsonb),
  -- D-06: submitted scorecards on the current version before adjudication.
  ('review_quorum', '2'::jsonb);

-- -----------------------------------------------------------------------------
-- Authorisation helpers (SECURITY DEFINER: they read role tables the caller
-- cannot read directly; they only ever answer about the current user).
-- -----------------------------------------------------------------------------

create or replace function private.setting(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select s.value from public.app_settings s where s.key = p_key;
$$;

-- D-07: staff permissions need an aal2 session unless the account is a seeded
-- demo account and the demo exemption is switched on.
create or replace function private.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or (
        coalesce((select p.is_demo from public.profiles p where p.id = auth.uid()), false)
        and coalesce((private.setting('demo_mfa_exempt'))::text = 'true', false)
      );
$$;

create or replace function private.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.key = ur.role_key
    join public.role_permissions rp on rp.role_key = ur.role_key
    where ur.user_id = auth.uid()
      and ur.revoked_at is null
      and rp.permission = p_permission
      and (not r.requires_mfa or private.mfa_satisfied())
  );
$$;

-- Role recorded on audit rows: the first active role that grants the permission.
create or replace function private.acting_role(p_permission text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select ur.role_key
  from public.user_roles ur
  join public.role_permissions rp on rp.role_key = ur.role_key
  where ur.user_id = auth.uid() and ur.revoked_at is null and rp.permission = p_permission
  order by ur.role_key
  limit 1;
$$;

-- An active, declared, conflict-free assignment for the current user (D-19, N10, N11).
create or replace function private.is_cleared_reviewer(p_proposal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission('scorecard.submit') and exists (
    select 1 from public.assignments a
    where a.proposal_id = p_proposal_id
      and a.reviewer_id = auth.uid()
      and a.revoked_at is null
      and a.declared_at is not null
      and a.has_conflict = false
  );
$$;

-- Who may read a case's confidential content: its applicant, staff with
-- case.read_all once it is submitted, or a cleared assigned reviewer.
create or replace function private.can_read_case(p_proposal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.proposals p
    where p.id = p_proposal_id
      and p.deleted_at is null
      and (
        p.applicant_id = auth.uid()
        or (p.status <> 'draft' and private.has_permission('case.read_all'))
        or (p.status <> 'draft' and private.is_cleared_reviewer(p.id))
      )
  );
$$;

-- REV-03 helpers (SECURITY DEFINER so the scorecards policy never queries itself).
create or replace function private.owns_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.assignments a where a.id = p_assignment_id and a.reviewer_id = auth.uid());
$$;

-- True when the current user, an active reviewer on the same case, has
-- submitted their own scorecard for the same version.
create or replace function private.has_submitted_peer_view(p_assignment_id uuid, p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignments theirs
    join public.assignments mine on mine.proposal_id = theirs.proposal_id
    join public.scorecards s on s.assignment_id = mine.id
    where theirs.id = p_assignment_id
      and mine.reviewer_id = auth.uid()
      and mine.revoked_at is null
      and s.version_id = p_version_id
      and s.status = 'submitted'
  );
$$;

create or replace function private.is_case_owner(p_proposal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.proposals p
    where p.id = p_proposal_id and p.applicant_id = auth.uid() and p.deleted_at is null
  );
$$;

-- -----------------------------------------------------------------------------
-- Write helpers used inside workflow RPCs (one transaction per state change)
-- -----------------------------------------------------------------------------

create or replace function private.write_audit(
  p_action text, p_target_type text, p_target_id text,
  p_proposal_id uuid default null, p_metadata jsonb default '{}'::jsonb, p_actor_role text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_events (actor_id, actor_role, action, target_type, target_id, proposal_id, metadata)
  values (auth.uid(), p_actor_role, p_action, p_target_type, p_target_id, p_proposal_id, coalesce(p_metadata, '{}'::jsonb));
$$;

create or replace function private.public_stage(p_status text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'submitted'       then 'submission'
    when 'in_evaluation'   then 'review'
    when 'in_adjudication' then 'review'
    when 'action_required' then 'feedback'
    when 'approved'        then 'approval'
    when 'not_approved'    then 'approval'
    when 'awarded'         then 'award'
    else null end;
$$;

-- Conditional transition (design record §1): zero rows -> INVALID_STATE.
create or replace function private.transition_case(
  p_proposal_id uuid, p_expected text[], p_to text, p_reason text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from text;
begin
  select p.status into v_from from public.proposals p
  where p.id = p_proposal_id and p.deleted_at is null
  for update;

  if v_from is null or not (v_from = any (p_expected)) then
    perform private.raise_error('INVALID_STATE', 'This case has moved on. Refresh to see the latest status.',
      jsonb_build_object('expected', p_expected, 'actual', v_from));
  end if;

  update public.proposals set status = p_to where id = p_proposal_id;

  insert into public.case_events (proposal_id, from_status, to_status, public_stage, actor_id, reason)
  values (p_proposal_id, v_from, p_to, private.public_stage(p_to), auth.uid(), p_reason);

  return v_from;
end;
$$;

-- In-app notification, plus an outbox row when the user opted in to email (NTF-02).
create or replace function private.notify(
  p_user_id uuid, p_proposal_id uuid, p_type text, p_title text, p_body text default '',
  p_email_template text default null, p_email_payload jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, proposal_id, type, title, body)
  values (p_user_id, p_proposal_id, p_type, p_title, coalesce(p_body, ''));

  if p_email_template is not null
     and exists (select 1 from public.profiles pr where pr.id = p_user_id and pr.alerts_opt_in) then
    insert into public.email_outbox (user_id, template, payload)
    values (p_user_id, p_email_template, coalesce(p_email_payload, '{}'::jsonb));
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Row-level security: enable everywhere, then grant SELECT only where a policy
-- exists. No INSERT/UPDATE/DELETE for anon or authenticated on any table.
-- -----------------------------------------------------------------------------

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on public.%I from anon, authenticated', t.tablename);
  end loop;
end $$;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema private from public;

-- Helpers referenced by policies run as the caller.
grant execute on function
  private.has_permission(text), private.mfa_satisfied(), private.setting(text),
  private.is_cleared_reviewer(uuid), private.can_read_case(uuid), private.is_case_owner(uuid),
  private.owns_assignment(uuid), private.has_submitted_peer_view(uuid, uuid)
to anon, authenticated;

-- Public catalogue (anon + authenticated)
grant select on public.challenges, public.challenge_versions, public.rubrics, public.rubric_versions,
  public.rubric_criteria, public.content_pages, public.service_calendar, public.service_closures
to anon, authenticated;

create policy challenges_read on public.challenges for select to anon, authenticated
  using (status in ('published','closed') or (select private.has_permission('config.manage')));

create policy challenge_versions_read on public.challenge_versions for select to anon, authenticated
  using (
    (published_at is not null and exists (
      select 1 from public.challenges c where c.id = challenge_id and c.status in ('published','closed')))
    or (select private.has_permission('config.manage'))
    -- an applicant keeps seeing the version their own case was submitted against (ADM-02)
    or exists (select 1 from public.proposals p
               where p.challenge_version_id = challenge_versions.id and p.applicant_id = (select auth.uid()))
  );

create policy rubrics_read on public.rubrics for select to anon, authenticated using (true);

create policy rubric_versions_read on public.rubric_versions for select to anon, authenticated
  using (published_at is not null or (select private.has_permission('config.manage')));

create policy rubric_criteria_read on public.rubric_criteria for select to anon, authenticated
  using (exists (select 1 from public.rubric_versions v
                 where v.id = rubric_version_id
                   and (v.published_at is not null or (select private.has_permission('config.manage')))));

create policy content_pages_read on public.content_pages for select to anon, authenticated
  using (status = 'published' or (select private.has_permission('config.manage')));

create policy service_calendar_read on public.service_calendar for select to anon, authenticated using (true);
create policy service_closures_read on public.service_closures for select to anon, authenticated using (true);

-- Identity
grant select on public.profiles, public.roles, public.permissions, public.role_permissions, public.user_roles
to authenticated;

create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.has_permission('role.manage')));
create policy roles_read on public.roles for select to authenticated using (true);
create policy permissions_read on public.permissions for select to authenticated using (true);
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);
create policy user_roles_read on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('role.manage')));

-- Cases (confidential)
grant select on public.proposals, public.proposal_drafts, public.proposal_versions, public.attachments,
  public.assignments, public.scorecards, public.scorecard_items, public.feedback_requests,
  public.feedback_tasks, public.task_verifications, public.internal_notes, public.decisions,
  public.awards, public.case_events, public.notifications, public.audit_events,
  public.chat_sessions, public.chat_messages
to authenticated;

create policy proposals_read on public.proposals for select to authenticated
  using ((select private.can_read_case(id)));

create policy proposal_drafts_read on public.proposal_drafts for select to authenticated
  using ((select private.is_case_owner(proposal_id)));

create policy proposal_versions_read on public.proposal_versions for select to authenticated
  using ((select private.can_read_case(proposal_id)));

-- Draft (unbound) files are visible to the applicant only.
create policy attachments_read on public.attachments for select to authenticated
  using (
    deleted_at is null and (
      (select private.is_case_owner(proposal_id))
      or (version_id is not null and (select private.can_read_case(proposal_id)))
    )
  );

-- A reviewer sees their own assignment before declaring (to reach the gate);
-- cleared co-reviewers and staff see the case's assignments. Never the applicant.
create policy assignments_read on public.assignments for select to authenticated
  using (
    reviewer_id = (select auth.uid())
    or (((select private.has_permission('case.read_all')) or (select private.is_cleared_reviewer(proposal_id)))
        and (select private.can_read_case(proposal_id)))
  );

-- Own scorecard; panel roles; peers only after submitting their own on the same version (REV-03).
create policy scorecards_read on public.scorecards for select to authenticated
  using (
    (select private.owns_assignment(scorecards.assignment_id))
    or (select private.has_permission('scorecard.read_panel'))
    or (scorecards.status = 'submitted'
        and private.has_submitted_peer_view(scorecards.assignment_id, scorecards.version_id))
  );

create policy scorecard_items_read on public.scorecard_items for select to authenticated
  using (exists (select 1 from public.scorecards s where s.id = scorecard_id));

create policy feedback_requests_read on public.feedback_requests for select to authenticated
  using ((select private.can_read_case(proposal_id)));

create policy feedback_tasks_read on public.feedback_tasks for select to authenticated
  using (exists (select 1 from public.feedback_requests r where r.id = feedback_request_id));

-- BCR-001 B6: hidden from the applicant (Slice 4 adds the post-publication rule).
create policy task_verifications_read on public.task_verifications for select to authenticated
  using (
    exists (select 1 from public.assignments a where a.id = assignment_id and a.reviewer_id = (select auth.uid()))
    or exists (select 1 from public.feedback_tasks t
               join public.feedback_requests r on r.id = t.feedback_request_id
               where t.id = feedback_task_id
                 and (select private.has_permission('case.read_all'))
                 and (select private.can_read_case(r.proposal_id)))
  );

-- Never readable by the applicant.
create policy internal_notes_read on public.internal_notes for select to authenticated
  using (
    deleted_at is null
    and (select private.has_permission('case.note'))
    and not (select private.is_case_owner(proposal_id))
    and (select private.can_read_case(proposal_id))
  );

-- N4: the applicant reads a decision only once it is published.
create policy decisions_read on public.decisions for select to authenticated
  using (
    ((select private.is_case_owner(proposal_id)) and published_at is not null and superseded_at is null)
    or ((select private.has_permission('case.read_all')) and (select private.can_read_case(proposal_id)))
  );

create policy awards_read on public.awards for select to authenticated
  using ((select private.can_read_case(proposal_id)));

create policy case_events_read on public.case_events for select to authenticated
  using ((select private.can_read_case(proposal_id)));

create policy notifications_read on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy audit_events_read on public.audit_events for select to authenticated
  using ((select private.has_permission('audit.read')));

create policy chat_sessions_read on public.chat_sessions for select to authenticated
  using (
    applicant_id = (select auth.uid())
    or ((select private.has_permission('chat.handle')) and (consultant_id = (select auth.uid()) or status = 'queued'))
    or (select private.has_permission('chat.stats'))
  );

create policy chat_messages_read on public.chat_messages for select to authenticated
  using (
    deleted_at is null and exists (
      select 1 from public.chat_sessions s
      where s.id = session_id
        and (s.applicant_id = (select auth.uid())
             or ((select private.has_permission('chat.handle')) and s.consultant_id = (select auth.uid())))
    )
  );

-- app_settings, email_outbox: no grants, no policies -> no client access.

-- -----------------------------------------------------------------------------
-- RPCs available from Phase 0
-- -----------------------------------------------------------------------------

-- Health check (ci-and-environments §4): no confidential data.
create or replace function public.health()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_version text;
begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    execute 'select max(version) from supabase_migrations.schema_migrations' into v_version;
  end if;
  return jsonb_build_object('ok', true, 'migration_version', v_version, 'server_time', now());
end;
$$;
grant execute on function public.health() to anon, authenticated;

-- What the signed-in user may do; the frontend uses this for navigation only.
-- The server re-checks every permission on every call.
create or replace function public.my_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(),
    'is_demo', coalesce((select p.is_demo from public.profiles p where p.id = auth.uid()), false),
    'roles', coalesce((select jsonb_agg(ur.role_key order by ur.role_key) from public.user_roles ur
                       where ur.user_id = auth.uid() and ur.revoked_at is null), '[]'::jsonb),
    'permissions', coalesce((select jsonb_agg(distinct rp.permission) from public.user_roles ur
                             join public.role_permissions rp on rp.role_key = ur.role_key
                             where ur.user_id = auth.uid() and ur.revoked_at is null
                               and private.has_permission(rp.permission)), '[]'::jsonb),
    -- true when a staff role is held but its permissions are withheld until MFA (D-07)
    'mfa_required', exists (select 1 from public.user_roles ur join public.roles r on r.key = ur.role_key
                            where ur.user_id = auth.uid() and ur.revoked_at is null and r.requires_mfa)
                    and not private.mfa_satisfied()
  ) end;
$$;
grant execute on function public.my_access() to authenticated;
