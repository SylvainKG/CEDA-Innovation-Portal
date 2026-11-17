-- =============================================================================
-- Migration 002 — Slice 1: register, draft, attach, submit (blueprint §5 Slice 1)
-- IAM-02 (consent), APP-01 (draft), APP-02 (attachments), APP-03 (submit +
-- reference, idempotent), SEC-01 (audit inside every RPC).
-- Contract: docs/blueprint/03-api-contracts-and-permissions.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Storage (APP-02): private, case-scoped, type- and size-limited.
-- Clients may upload into their own draft case folder. Nobody can read or sign
-- objects directly: downloads go through the attachment-url Edge Function,
-- which checks access with authorize_attachment_download() and signs for 60 s.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('proposal-files', 'proposal-files', false, 10485760, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png', 'image/jpeg']),
  -- Challenge templates are public documents (no applicant data).
  ('challenge-files', 'challenge-files', true, 10485760, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

create or replace function private.uuid_or_null(p_text text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_text::uuid;
exception when others then
  return null;
end;
$$;

-- The applicant may add files while the case is a draft. (Slice 4 extends this
-- to an open revision request.)
create or replace function private.can_upload_to(p_proposal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_proposal_id is not null and private.has_permission('proposal.submit') and exists (
    select 1 from public.proposals p
    where p.id = p_proposal_id and p.applicant_id = auth.uid()
      and p.deleted_at is null and p.status = 'draft'
  );
$$;
revoke all on function private.uuid_or_null(text), private.can_upload_to(uuid) from public;
grant execute on function private.uuid_or_null(text), private.can_upload_to(uuid) to authenticated;

-- Object name: <proposal_id>/<uuid>.<ext>. The user's file name is kept in
-- public.attachments, never in the path.
create policy proposal_files_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'proposal-files'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|docx|xlsx|png|jpg|jpeg)$'
    and private.can_upload_to(private.uuid_or_null((storage.foldername(name))[1]))
  );

create policy challenge_files_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'challenge-files' and private.has_permission('config.manage'));

-- -----------------------------------------------------------------------------
-- Registration (IAM-02): profile + applicant role on sign-up; consent stored
-- with the privacy notice version.
-- -----------------------------------------------------------------------------

create or replace function private.current_notice_version(p_kind text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select c.version from public.content_pages c
  where c.kind = p_kind and c.status = 'published'
  order by c.updated_at desc
  limit 1;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_notice   text  := private.current_notice_version('privacy');
  v_consent  text  := v_meta ->> 'consent_version';
begin
  insert into public.profiles (id, full_name, email, organisation, consent_version, consent_at)
  values (
    new.id,
    left(coalesce(v_meta ->> 'full_name', ''), 200),
    new.email,
    left(v_meta ->> 'organisation', 200),
    case when v_consent is not null and v_consent = v_notice then v_consent end,
    case when v_consent is not null and v_consent = v_notice then now() end
  )
  on conflict (id) do nothing;

  -- Everyone who registers is an applicant; staff roles are granted by an admin (IAM-01).
  insert into public.user_roles (user_id, role_key, granted_by)
  values (new.id, 'applicant', null)
  on conflict do nothing;

  insert into public.audit_events (actor_id, action, target_type, target_id, metadata)
  values (new.id, 'account.registered', 'profile', new.id::text,
          jsonb_build_object('consent_version',
            case when v_consent is not null and v_consent = v_notice then v_consent end));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Record (or renew) consent to the current privacy notice.
create or replace function public.record_consent(p_version text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notice text := private.current_notice_version('privacy');
  v_at     timestamptz := now();
begin
  if auth.uid() is null then
    perform private.raise_error('FORBIDDEN', 'Sign in first.');
  end if;
  if v_notice is null or p_version is distinct from v_notice then
    perform private.raise_error('VALIDATION', 'Accept the current privacy notice.',
      jsonb_build_object('fields', jsonb_build_object('consent', 'Accept the current privacy notice')));
  end if;

  update public.profiles set consent_version = v_notice, consent_at = v_at where id = auth.uid();
  perform private.write_audit('account.consent_recorded', 'profile', auth.uid()::text, null,
    jsonb_build_object('consent_version', v_notice));
  return jsonb_build_object('consent_version', v_notice, 'consent_at', v_at);
end;
$$;

-- -----------------------------------------------------------------------------
-- Form helpers (ADM-01 form schema)
-- -----------------------------------------------------------------------------

create or replace function private.form_fields(p_schema jsonb)
returns setof jsonb
language sql
immutable
set search_path = ''
as $$
  select f
  from jsonb_array_elements(coalesce(p_schema -> 'sections', '[]'::jsonb)) s,
       jsonb_array_elements(coalesce(s -> 'fields', '[]'::jsonb)) f;
$$;

-- Keep only fields the schema defines; values must be strings (or null).
create or replace function private.clean_form_data(p_schema jsonb, p_data jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_out jsonb := '{}'::jsonb;
  v_field jsonb;
  v_key text;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    perform private.raise_error('VALIDATION', 'Form data must be an object.');
  end if;
  for v_field in select * from private.form_fields(p_schema) loop
    v_key := v_field ->> 'key';
    if p_data ? v_key and jsonb_typeof(p_data -> v_key) <> 'null' then
      if jsonb_typeof(p_data -> v_key) <> 'string' then
        perform private.raise_error('VALIDATION', 'Form values must be text.',
          jsonb_build_object('fields', jsonb_build_object(v_key, 'Must be text')));
      end if;
      v_out := v_out || jsonb_build_object(v_key, p_data -> v_key);
    end if;
  end loop;
  return v_out;
end;
$$;

-- Field errors for a submission: {"<field key>": "<message>", "doc:<key>": "..."}.
create or replace function private.validate_submission(p_schema jsonb, p_required_docs jsonb, p_data jsonb, p_proposal_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_errors jsonb := '{}'::jsonb;
  v_field  jsonb;
  v_doc    jsonb;
  v_key    text;
  v_val    text;
  v_max    integer;
begin
  for v_field in select * from private.form_fields(p_schema) loop
    v_key := v_field ->> 'key';
    v_val := btrim(coalesce(p_data ->> v_key, ''));
    v_max := (v_field ->> 'max_length')::integer;

    if coalesce((v_field ->> 'required')::boolean, false) and v_val = '' then
      v_errors := v_errors || jsonb_build_object(v_key, 'Required');
    elsif v_max is not null and char_length(v_val) > v_max then
      v_errors := v_errors || jsonb_build_object(v_key, format('Use %s characters or fewer', v_max));
    elsif v_val <> '' and v_field ->> 'type' = 'select'
          and not (coalesce(v_field -> 'options', '[]'::jsonb) ? v_val) then
      v_errors := v_errors || jsonb_build_object(v_key, 'Choose one of the listed options');
    elsif v_val <> '' and v_field ->> 'type' = 'email'
          and v_val !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      v_errors := v_errors || jsonb_build_object(v_key, 'Enter a valid email address');
    end if;
  end loop;

  for v_doc in select * from jsonb_array_elements(coalesce(p_required_docs, '[]'::jsonb)) loop
    if coalesce((v_doc ->> 'required')::boolean, false) and not exists (
      select 1 from public.attachments a
      where a.proposal_id = p_proposal_id and a.version_id is null and a.deleted_at is null
        and a.doc_key = v_doc ->> 'key'
    ) then
      v_errors := v_errors || jsonb_build_object('doc:' || (v_doc ->> 'key'), 'Attach this document');
    end if;
  end loop;

  return v_errors;
end;
$$;

create or replace function private.format_cat(p_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(p_at at time zone 'Africa/Gaborone', 'FMDD Mon YYYY, HH24:MI') || ' CAT';
$$;

-- Is the challenge behind this version accepting submissions right now?
create or replace function private.challenge_is_open(p_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.challenges c
    where c.id = p_challenge_id and c.status = 'published' and now() >= c.opens_at and now() < c.closes_at
  );
$$;

-- -----------------------------------------------------------------------------
-- APP-01: save_draft
-- -----------------------------------------------------------------------------

create or replace function public.save_draft(
  p_data jsonb,
  p_proposal_id uuid default null,
  p_challenge_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_p        public.proposals%rowtype;
  v_cv       public.challenge_versions%rowtype;
  v_clean    jsonb;
  v_title    text;
  v_saved_at timestamptz := now();
begin
  if v_uid is null or not private.has_permission('proposal.submit') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;

  if p_proposal_id is null then
    -- New idea: needs an open challenge; uses its latest published version.
    if p_challenge_id is null then
      perform private.raise_error('VALIDATION', 'Choose a challenge.',
        jsonb_build_object('fields', jsonb_build_object('challenge', 'Required')));
    end if;
    if not private.challenge_is_open(p_challenge_id) then
      perform private.raise_error('CHALLENGE_CLOSED', 'This challenge is not accepting submissions.');
    end if;
    select * into v_cv from public.challenge_versions cv
    where cv.challenge_id = p_challenge_id and cv.published_at is not null
    order by cv.version_no desc limit 1;
    if v_cv.id is null then
      perform private.raise_error('CHALLENGE_CLOSED', 'This challenge is not accepting submissions.');
    end if;

    v_clean := private.clean_form_data(v_cv.form_schema, p_data);
    v_title := left(btrim(coalesce(v_clean ->> 'title', '')), 200);

    insert into public.proposals (applicant_id, challenge_version_id, title)
    values (v_uid, v_cv.id, v_title)
    returning * into v_p;
    insert into public.proposal_drafts (proposal_id, data, updated_at) values (v_p.id, v_clean, v_saved_at);

    perform private.write_audit('proposal.draft_created', 'proposal', v_p.id::text, v_p.id,
      jsonb_build_object('challenge_version_id', v_cv.id), private.acting_role('proposal.submit'));
  else
    select * into v_p from public.proposals p where p.id = p_proposal_id and p.deleted_at is null for update;
    if v_p.id is null or v_p.applicant_id <> v_uid then
      perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
    end if;
    if v_p.status <> 'draft' then
      perform private.raise_error('INVALID_STATE', 'This idea has already been submitted.',
        jsonb_build_object('actual', v_p.status));
    end if;
    select * into v_cv from public.challenge_versions cv where cv.id = v_p.challenge_version_id;

    v_clean := private.clean_form_data(v_cv.form_schema, p_data);
    v_title := left(btrim(coalesce(v_clean ->> 'title', '')), 200);

    insert into public.proposal_drafts (proposal_id, data, updated_at) values (v_p.id, v_clean, v_saved_at)
    on conflict (proposal_id) do update set data = excluded.data, updated_at = excluded.updated_at;
    update public.proposals set title = v_title where id = v_p.id;
    -- Autosave runs every few seconds: only draft creation is audited.
  end if;

  return jsonb_build_object('proposal_id', v_p.id, 'saved_at', v_saved_at, 'title', v_title);
end;
$$;

-- -----------------------------------------------------------------------------
-- APP-03: submit_proposal + receipt
-- -----------------------------------------------------------------------------

create or replace function private.receipt(p_proposal_id uuid, p_version_no integer default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'proposal_id',            p.id,
    'reference',              p.reference,
    'status',                 p.status,
    'version_no',             v.version_no,
    'submitted_at',           v.submitted_at,
    'submitted_at_display',   private.format_cat(v.submitted_at),
    'timezone',               'Africa/Gaborone',
    'challenge',              jsonb_build_object('id', c.id, 'title', c.title),
    'form_version',           cv.version_no,
    'declaration_version',    v.declaration_version,
    'declaration_accepted_at', v.declaration_accepted_at,
    'files', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'filename', a.filename, 'size_bytes', a.size_bytes,
                                          'mime', a.mime, 'doc_key', a.doc_key) order by a.created_at)
      from public.attachments a where a.version_id = v.id and a.deleted_at is null), '[]'::jsonb)
  )
  from public.proposals p
  join public.proposal_versions v on v.proposal_id = p.id
  join public.challenge_versions cv on cv.id = p.challenge_version_id
  join public.challenges c on c.id = cv.challenge_id
  where p.id = p_proposal_id
    and v.version_no = coalesce(p_version_no,
          (select max(v2.version_no) from public.proposal_versions v2 where v2.proposal_id = p.id));
$$;

create or replace function public.submit_proposal(
  p_proposal_id uuid,
  p_client_request_id uuid,
  p_declaration_version text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_hit       public.proposals%rowtype;
  v_p         public.proposals%rowtype;
  v_cv        public.challenge_versions%rowtype;
  v_profile   public.profiles%rowtype;
  v_decl      text;
  v_data      jsonb;
  v_errors    jsonb;
  v_ref       text;
  v_version   uuid;
  v_now       timestamptz := now();
begin
  if v_uid is null or not private.has_permission('proposal.submit') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  if p_proposal_id is null or p_client_request_id is null then
    perform private.raise_error('VALIDATION', 'proposal_id and client_request_id are required.');
  end if;

  -- Idempotency (APP-03, BCR-001 B2): same key + same case -> the original receipt;
  -- same key + anything else -> REQUEST_CONFLICT.
  select * into v_hit from public.proposals p where p.client_request_id = p_client_request_id;
  if v_hit.id is not null then
    if v_hit.id = p_proposal_id and v_hit.applicant_id = v_uid then
      return private.receipt(v_hit.id, 1) || jsonb_build_object('replayed', true);
    end if;
    perform private.raise_error('REQUEST_CONFLICT', 'This request key was already used for a different submission.');
  end if;

  -- Serialise concurrent submits of the same case.
  select * into v_p from public.proposals p where p.id = p_proposal_id and p.deleted_at is null for update;
  if v_p.id is null or v_p.applicant_id <> v_uid then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  if v_p.client_request_id = p_client_request_id then          -- lost the race to our own retry
    return private.receipt(v_p.id, 1) || jsonb_build_object('replayed', true);
  end if;
  if v_p.status <> 'draft' then
    perform private.raise_error('INVALID_STATE', 'This idea has already been submitted.',
      jsonb_build_object('actual', v_p.status));
  end if;

  -- IAM-02: verified email and recorded consent.
  if not exists (select 1 from auth.users u where u.id = v_uid and u.email_confirmed_at is not null) then
    perform private.raise_error('FORBIDDEN', 'Verify your email address before submitting. Your draft is saved.');
  end if;
  select * into v_profile from public.profiles pr where pr.id = v_uid;
  if v_profile.consent_version is null then
    perform private.raise_error('VALIDATION', 'Accept the privacy notice before submitting. Your draft is saved.',
      jsonb_build_object('fields', jsonb_build_object('consent', 'Accept the privacy notice')));
  end if;

  select * into v_cv from public.challenge_versions cv where cv.id = v_p.challenge_version_id;
  if not private.challenge_is_open(v_cv.challenge_id) then
    perform private.raise_error('CHALLENGE_CLOSED', 'This challenge is no longer accepting submissions. Your draft is saved.');
  end if;

  -- D-22: the declaration on the final step, stored with the version.
  v_decl := private.current_notice_version('declaration');
  if v_decl is null then
    perform private.raise_error('INVALID_STATE', 'The submission declaration is not configured. Contact the portal administrator.');
  end if;
  if p_declaration_version is distinct from v_decl then
    perform private.raise_error('VALIDATION', 'Accept the declaration to submit. Your draft is saved.',
      jsonb_build_object('fields', jsonb_build_object('declaration', 'Accept the current declaration')));
  end if;

  select d.data into v_data from public.proposal_drafts d where d.proposal_id = v_p.id;
  v_data := private.clean_form_data(v_cv.form_schema, coalesce(v_data, '{}'::jsonb));
  v_errors := private.validate_submission(v_cv.form_schema, v_cv.required_docs, v_data, v_p.id);
  if v_errors <> '{}'::jsonb then
    perform private.raise_error('VALIDATION', 'Some answers need attention. Your draft is saved.',
      jsonb_build_object('fields', v_errors));
  end if;

  -- D-12: readable reference from a sequence.
  v_ref := format('CEDA-%s-%s',
                  to_char(v_now at time zone 'Africa/Gaborone', 'YYYY'),
                  lpad(nextval('private.proposal_reference_seq')::text, 4, '0'));

  insert into public.proposal_versions
    (proposal_id, version_no, data, submitted_at, submitted_by, declaration_version, declaration_accepted_at)
  values (v_p.id, 1, v_data, v_now, v_uid, v_decl, v_now)
  returning id into v_version;

  update public.attachments set version_id = v_version
  where proposal_id = v_p.id and version_id is null and deleted_at is null;

  update public.proposals
  set status = 'submitted', reference = v_ref, current_version_id = v_version, submitted_at = v_now,
      client_request_id = p_client_request_id, title = left(btrim(coalesce(v_data ->> 'title', title)), 200)
  where id = v_p.id and status = 'draft';

  delete from public.proposal_drafts where proposal_id = v_p.id;

  insert into public.case_events (proposal_id, from_status, to_status, public_stage, actor_id)
  values (v_p.id, 'draft', 'submitted', 'submission', v_uid);

  perform private.write_audit('proposal.submitted', 'proposal', v_p.id::text, v_p.id,
    jsonb_build_object('reference', v_ref, 'version_no', 1, 'client_request_id', p_client_request_id,
                       'declaration_version', v_decl),
    private.acting_role('proposal.submit'));

  perform private.notify(v_uid, v_p.id, 'proposal.submitted', 'Idea submitted',
    format('Your idea was received. Reference %s.', v_ref),
    'proposal_submitted', jsonb_build_object('reference', v_ref));

  return private.receipt(v_p.id, 1) || jsonb_build_object('replayed', false);
end;
$$;

-- Receipt lookup: after a reload, or to resolve an unknown outcome with the same
-- request key (design record §3: "Not confirmed yet — checking…").
create or replace function public.get_submission_receipt(
  p_proposal_id uuid default null,
  p_client_request_id uuid default null,
  p_version_no integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    perform private.raise_error('FORBIDDEN', 'Sign in first.');
  end if;
  if (p_proposal_id is null) = (p_client_request_id is null) then
    perform private.raise_error('VALIDATION', 'Give exactly one of proposal_id or client_request_id.');
  end if;

  select p.id into v_id from public.proposals p
  where p.applicant_id = auth.uid() and p.deleted_at is null and p.status <> 'draft'
    and (p.id = p_proposal_id or p.client_request_id = p_client_request_id);

  if v_id is null then
    -- Not submitted (yet), or not yours: the caller cannot tell which.
    return jsonb_build_object('found', false);
  end if;
  return private.receipt(v_id, p_version_no) || jsonb_build_object('found', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- APP-02: attachments
-- -----------------------------------------------------------------------------

-- Called after the browser uploads to proposal-files/<proposal_id>/<uuid>.<ext>.
-- Size and type come from what Storage recorded, not from the client.
create or replace function public.register_attachment(
  p_proposal_id uuid,
  p_storage_path text,
  p_filename text,
  p_doc_key text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_p         public.proposals%rowtype;
  v_cv        public.challenge_versions%rowtype;
  v_obj       storage.objects%rowtype;
  v_existing  public.attachments%rowtype;
  v_att       public.attachments%rowtype;
  v_name      text;
  v_size      bigint;
  v_mime      text;
begin
  if v_uid is null or not private.has_permission('proposal.submit') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;

  select * into v_p from public.proposals p where p.id = p_proposal_id and p.deleted_at is null for update;
  if v_p.id is null or v_p.applicant_id <> v_uid then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  if v_p.status <> 'draft' then
    perform private.raise_error('INVALID_STATE', 'Files can only be added to a draft.');
  end if;

  if p_storage_path is null
     or p_storage_path !~ ('^' || p_proposal_id::text || '/[0-9a-f-]{36}\.(pdf|docx|xlsx|png|jpg|jpeg)$') then
    perform private.raise_error('VALIDATION', 'Upload the file again.',
      jsonb_build_object('fields', jsonb_build_object('file', 'Unexpected file location')));
  end if;

  -- Idempotent: registering the same object twice returns the first row.
  select * into v_existing from public.attachments a where a.storage_path = p_storage_path and a.deleted_at is null;
  if v_existing.id is not null then
    return to_jsonb(v_existing) - 'storage_path';
  end if;

  select * into v_obj from storage.objects o
  where o.bucket_id = 'proposal-files' and o.name = p_storage_path
    and (o.owner_id = v_uid::text or o.owner = v_uid);
  if v_obj.id is null then
    perform private.raise_error('VALIDATION', 'Upload the file again.',
      jsonb_build_object('fields', jsonb_build_object('file', 'File not found in storage')));
  end if;

  v_size := (v_obj.metadata ->> 'size')::bigint;
  v_mime := v_obj.metadata ->> 'mimetype';
  if v_size is null or v_size <= 0 or v_size > 10485760 then
    perform private.raise_error('VALIDATION', 'Files must be 10 MB or smaller.',
      jsonb_build_object('fields', jsonb_build_object('file', 'Files must be 10 MB or smaller')));
  end if;
  if v_mime is null or v_mime not in (
       'application/pdf',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
       'image/png', 'image/jpeg') then
    perform private.raise_error('VALIDATION', 'Use a PDF, DOCX, XLSX, PNG or JPG file.',
      jsonb_build_object('fields', jsonb_build_object('file', 'Unsupported file type')));
  end if;

  select * into v_cv from public.challenge_versions cv where cv.id = v_p.challenge_version_id;
  if p_doc_key is not null and not exists (
       select 1 from jsonb_array_elements(v_cv.required_docs) d where d ->> 'key' = p_doc_key) then
    perform private.raise_error('VALIDATION', 'Choose which document this is.',
      jsonb_build_object('fields', jsonb_build_object('doc_key', 'Unknown document type')));
  end if;

  if (select count(*) from public.attachments a
      where a.proposal_id = v_p.id and a.version_id is null and a.deleted_at is null) >= 10 then
    perform private.raise_error('VALIDATION', 'You can attach up to 10 files.',
      jsonb_build_object('fields', jsonb_build_object('file', 'Too many files')));
  end if;

  -- Display name only: strip any path and control characters.
  v_name := regexp_replace(coalesce(p_filename, ''), '^.*[\\/]', '');
  v_name := left(btrim(regexp_replace(v_name, '[[:cntrl:]]', '', 'g')), 200);
  if v_name = '' then v_name := 'file'; end if;

  insert into public.attachments (proposal_id, doc_key, storage_path, filename, mime, size_bytes, uploaded_by)
  values (v_p.id, p_doc_key, p_storage_path, v_name, v_mime, v_size, v_uid)
  returning * into v_att;

  perform private.write_audit('attachment.uploaded', 'attachment', v_att.id::text, v_p.id,
    jsonb_build_object('mime', v_mime, 'size_bytes', v_size, 'doc_key', p_doc_key),
    private.acting_role('proposal.submit'));

  return to_jsonb(v_att) - 'storage_path';
end;
$$;

create or replace function public.remove_attachment(p_attachment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_att public.attachments%rowtype;
  v_p   public.proposals%rowtype;
begin
  if auth.uid() is null or not private.has_permission('proposal.submit') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  select * into v_att from public.attachments a where a.id = p_attachment_id and a.deleted_at is null;
  select * into v_p from public.proposals p where p.id = v_att.proposal_id for update;
  if v_att.id is null or v_p.applicant_id <> auth.uid() then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  if v_att.version_id is not null or v_p.status <> 'draft' then
    perform private.raise_error('INVALID_STATE', 'Submitted files cannot be removed.');
  end if;

  update public.attachments set deleted_at = now() where id = v_att.id;
  perform private.write_audit('attachment.removed', 'attachment', v_att.id::text, v_p.id, '{}'::jsonb,
    private.acting_role('proposal.submit'));
  return jsonb_build_object('id', v_att.id, 'removed', true);
end;
$$;

-- Called by the attachment-url Edge Function *with the user's JWT*. Returns the
-- object path only when the caller may read the file (N2, N3, N10). The Edge
-- Function then signs a 60-second URL with the service role.
create or replace function public.authorize_attachment_download(p_attachment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_att    public.attachments%rowtype;
  v_owner  boolean;
begin
  if auth.uid() is null then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this file.');
  end if;
  select * into v_att from public.attachments a where a.id = p_attachment_id and a.deleted_at is null;
  if v_att.id is null then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this file.');
  end if;

  v_owner := private.is_case_owner(v_att.proposal_id);
  if not (v_owner or (v_att.version_id is not null and private.can_read_case(v_att.proposal_id))) then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this file.');
  end if;

  perform private.write_audit('attachment.download_authorised', 'attachment', v_att.id::text, v_att.proposal_id,
    jsonb_build_object('as_owner', v_owner),
    case when v_owner then 'applicant' else coalesce(private.acting_role('case.read_all'), private.acting_role('scorecard.submit')) end);

  return jsonb_build_object('storage_path', v_att.storage_path, 'filename', v_att.filename,
                            'mime', v_att.mime, 'size_bytes', v_att.size_bytes, 'expires_in', 60);
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants: RPCs are the only write path (D-02).
-- -----------------------------------------------------------------------------

revoke all on function
  public.record_consent(text),
  public.save_draft(jsonb, uuid, uuid),
  public.submit_proposal(uuid, uuid, text),
  public.get_submission_receipt(uuid, uuid, integer),
  public.register_attachment(uuid, text, text, text),
  public.remove_attachment(uuid),
  public.authorize_attachment_download(uuid)
from public, anon;

grant execute on function
  public.record_consent(text),
  public.save_draft(jsonb, uuid, uuid),
  public.submit_proposal(uuid, uuid, text),
  public.get_submission_receipt(uuid, uuid, integer),
  public.register_attachment(uuid, text, text, text),
  public.remove_attachment(uuid),
  public.authorize_attachment_download(uuid)
to authenticated;

revoke all on all functions in schema private from public;
grant execute on function
  private.has_permission(text), private.mfa_satisfied(), private.setting(text),
  private.is_cleared_reviewer(uuid), private.can_read_case(uuid), private.is_case_owner(uuid),
  private.owns_assignment(uuid), private.has_submitted_peer_view(uuid, uuid),
  private.uuid_or_null(text), private.can_upload_to(uuid)
to anon, authenticated;
