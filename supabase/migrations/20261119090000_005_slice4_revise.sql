-- =============================================================================
-- Migration 005 — Slice 4: feedback, revision (V2), Feedback Roadmap, email outbox
-- REV-04 (clarification / revision), APP-04 (V2 with history), INN-02 (roadmap
-- tasks -> applicant response -> reviewer verification), NTF-02 (opt-in email
-- through a transactional outbox). D-09, D-10, D-21; BCR-001 B1, B4, B6, B9.
-- Contract: docs/blueprint/03-api-contracts-and-permissions.md §4.4
-- =============================================================================

-- transition_case also manages return_stage (set on entering action_required,
-- cleared on leaving it), so both columns change in one statement.
drop function if exists private.transition_case(uuid, text[], text, text, text);

create or replace function private.transition_case(
  p_proposal_id uuid, p_expected text[], p_to text, p_reason text default null,
  p_closed_reason text default null, p_return_stage text default null)
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

  update public.proposals
  set status        = p_to,
      closed_reason = case when p_to = 'closed' then p_closed_reason else closed_reason end,
      return_stage  = case when p_to = 'action_required' then p_return_stage end
  where id = p_proposal_id;

  insert into public.case_events (proposal_id, from_status, to_status, public_stage, actor_id, reason)
  values (p_proposal_id, v_from, p_to, private.public_stage(p_to), auth.uid(), p_reason);

  return v_from;
end;
$$;
revoke all on function private.transition_case(uuid, text[], text, text, text, text) from public;

insert into public.app_settings (key, value) values ('email_max_attempts', '5'::jsonb)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

create or replace function private.open_feedback(p_proposal_id uuid, p_kind text default null)
returns public.feedback_requests
language sql
stable
security definer
set search_path = ''
as $$
  select r.* from public.feedback_requests r
  where r.proposal_id = p_proposal_id and r.status = 'open' and (p_kind is null or r.kind = p_kind)
  order by r.created_at desc
  limit 1;
$$;

-- The applicant may edit the working copy: a draft, or a case waiting on a revision.
create or replace function private.is_editable(p_proposal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.proposals p
    where p.id = p_proposal_id and p.deleted_at is null
      and (p.status = 'draft'
           or (p.status = 'action_required' and exists (
                 select 1 from public.feedback_requests r
                 where r.proposal_id = p.id and r.status = 'open' and r.kind = 'revision')))
  );
$$;

create or replace function private.can_upload_to(p_proposal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_proposal_id is not null and private.has_permission('proposal.submit') and exists (
    select 1 from public.proposals p
    where p.id = p_proposal_id and p.applicant_id = auth.uid() and p.deleted_at is null
  ) and private.is_editable(p_proposal_id);
$$;

create or replace function private.notify_case_staff(p_proposal_id uuid, p_type text, p_title text, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user record;
begin
  for v_user in
    select distinct a.reviewer_id as user_id from public.assignments a
    where a.proposal_id = p_proposal_id and a.revoked_at is null and a.declared_at is not null and not a.has_conflict
  loop
    perform private.notify(v_user.user_id, p_proposal_id, p_type, p_title, p_body);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- REV-04 / INN-02: request_feedback
-- -----------------------------------------------------------------------------

create or replace function public.request_feedback(
  p_proposal_id uuid,
  p_kind text,
  p_message text,
  p_due_at timestamptz default null,
  p_tasks text[] default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p      public.proposals%rowtype;
  v_msg    text;
  v_due    timestamptz := coalesce(p_due_at, now() + interval '7 days');
  v_req    uuid;
  v_n      integer := coalesce(cardinality(p_tasks), 0);
  v_errors jsonb := '{}'::jsonb;
  i        integer;
begin
  if not private.has_permission('case.request_feedback') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;

  select * into v_p from public.proposals p where p.id = p_proposal_id and p.deleted_at is null for update;
  -- D-09: screening officer, adjudicator (case.read_all) or an assigned, declared reviewer.
  if v_p.id is null or v_p.status = 'draft'
     or not ((private.has_permission('case.read_all') and private.can_read_case(v_p.id))
             or private.is_cleared_reviewer(v_p.id)) then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;

  if p_kind is null or p_kind not in ('clarification', 'revision') then
    perform private.raise_error('VALIDATION', 'Choose clarification or revision.',
      jsonb_build_object('fields', jsonb_build_object('kind', 'Choose clarification or revision')));
  end if;
  v_msg := private.require_text(p_message, 'message', 1, 4000, 'Write a message (up to 4,000 characters).');
  if v_due <= now() then
    perform private.raise_error('VALIDATION', 'The deadline must be in the future.',
      jsonb_build_object('fields', jsonb_build_object('due_at', 'Must be in the future')));
  end if;
  -- D-21: a clarification is a question; only a revision carries roadmap tasks.
  if p_kind = 'clarification' and v_n > 0 then
    perform private.raise_error('VALIDATION', 'A clarification is a single question without tasks.',
      jsonb_build_object('fields', jsonb_build_object('tasks', 'Remove the tasks or choose revision')));
  end if;
  if v_n > 10 then
    perform private.raise_error('VALIDATION', 'Use up to 10 tasks.',
      jsonb_build_object('fields', jsonb_build_object('tasks', 'Use up to 10 tasks')));
  end if;
  for i in 1 .. v_n loop
    if char_length(btrim(coalesce(p_tasks[i], ''))) not between 1 and 1000 then
      v_errors := v_errors || jsonb_build_object('task:' || i, 'Write the task (up to 1,000 characters)');
    end if;
  end loop;
  if v_errors <> '{}'::jsonb then
    perform private.raise_error('VALIDATION', 'Some tasks need attention.', jsonb_build_object('fields', v_errors));
  end if;

  perform private.transition_case(v_p.id, array['submitted', 'in_evaluation', 'in_adjudication'], 'action_required',
    case p_kind when 'clarification' then 'Clarification requested' else 'Revision requested' end,
    null, v_p.status);

  insert into public.feedback_requests (proposal_id, version_id, requested_by, from_stage, kind, message, due_at)
  values (v_p.id, v_p.current_version_id, auth.uid(), v_p.status, p_kind, v_msg, v_due)
  returning id into v_req;

  for i in 1 .. v_n loop
    insert into public.feedback_tasks (feedback_request_id, position, text)
    values (v_req, i, btrim(p_tasks[i]));
  end loop;

  perform private.write_audit('feedback.requested', 'feedback_request', v_req::text, v_p.id,
    jsonb_build_object('kind', p_kind, 'tasks', v_n, 'due_at', v_due, 'from_stage', v_p.status),
    private.acting_role('case.request_feedback'));

  perform private.notify(v_p.applicant_id, v_p.id, 'feedback.requested',
    case p_kind when 'clarification' then 'Action required: answer a question' else 'Action required: revise your idea' end,
    format('%s: please respond by %s.', v_p.reference, private.format_cat(v_due)),
    'feedback_requested', jsonb_build_object('reference', v_p.reference, 'kind', p_kind, 'due_at', v_due));

  return jsonb_build_object('feedback_request_id', v_req, 'kind', p_kind, 'status', 'action_required',
                            'return_stage', v_p.status, 'due_at', v_due, 'tasks', v_n);
end;
$$;

-- -----------------------------------------------------------------------------
-- D-21 / BCR-001 B1: respond_clarification (same version; case returns)
-- -----------------------------------------------------------------------------

create or replace function public.respond_clarification(p_feedback_request_id uuid, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r    public.feedback_requests%rowtype;
  v_p    public.proposals%rowtype;
  v_text text;
  v_now  timestamptz := now();
begin
  select * into v_r from public.feedback_requests r where r.id = p_feedback_request_id;
  select * into v_p from public.proposals p where p.id = v_r.proposal_id and p.deleted_at is null for update;
  if v_r.id is null or v_p.id is null or v_p.applicant_id <> auth.uid() or not private.has_permission('proposal.submit') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  if v_r.kind <> 'clarification' or v_r.status <> 'open' or v_p.status <> 'action_required' then
    perform private.raise_error('INVALID_STATE', 'This question has already been answered.');
  end if;
  v_text := private.require_text(p_text, 'response', 10, 1000, 'Write a reply of 10 to 1,000 characters.');

  update public.feedback_requests
  set status = 'answered', response_text = v_text, responded_at = v_now, responded_by = auth.uid()
  where id = v_r.id;

  perform private.transition_case(v_p.id, array['action_required'], v_p.return_stage, 'Clarification answered');

  perform private.write_audit('feedback.clarification_answered', 'feedback_request', v_r.id::text, v_p.id,
    jsonb_build_object('returned_to', v_p.return_stage), private.acting_role('proposal.submit'));
  perform private.notify(v_r.requested_by, v_p.id, 'feedback.answered', 'Clarification answered',
    format('%s: the applicant has replied.', v_p.reference));

  return jsonb_build_object('feedback_request_id', v_r.id, 'status', 'answered', 'responded_at', v_now,
                            'case_status', v_p.return_stage);
end;
$$;

-- -----------------------------------------------------------------------------
-- APP-04 / INN-02: submit_revision (new immutable version, same reference)
-- p_task_responses: [{ "task_id": uuid, "status": "addressed" | "not_addressed", "explanation": text }]
-- -----------------------------------------------------------------------------

create or replace function public.submit_revision(
  p_proposal_id uuid,
  p_client_request_id uuid,
  p_change_note text,
  p_task_responses jsonb,
  p_declaration_version text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_hit      public.proposal_versions%rowtype;
  v_p        public.proposals%rowtype;
  v_req      public.feedback_requests%rowtype;
  v_cv       public.challenge_versions%rowtype;
  v_decl     text;
  v_note     text;
  v_resps    jsonb := coalesce(p_task_responses, '[]'::jsonb);
  v_task     record;
  v_resp     jsonb;
  v_expl     text;
  v_terrors  jsonb := '{}'::jsonb;
  v_data     jsonb;
  v_errors   jsonb;
  v_ver_no   integer;
  v_new      uuid;
  v_old      uuid;
  v_now      timestamptz := now();
  v_total    integer;
  v_addr     integer;
begin
  if v_uid is null or not private.has_permission('proposal.submit') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  if p_proposal_id is null or p_client_request_id is null then
    perform private.raise_error('VALIDATION', 'proposal_id and client_request_id are required.');
  end if;

  -- BCR-001 B9: same key + same case -> original receipt; otherwise a conflict.
  select * into v_hit from public.proposal_versions v where v.client_request_id = p_client_request_id;
  if v_hit.id is not null then
    if v_hit.proposal_id = p_proposal_id and v_hit.submitted_by = v_uid then
      return private.receipt(v_hit.proposal_id, v_hit.version_no) || jsonb_build_object('replayed', true);
    end if;
    perform private.raise_error('REQUEST_CONFLICT', 'This request key was already used for a different submission.');
  end if;

  select * into v_p from public.proposals p where p.id = p_proposal_id and p.deleted_at is null for update;
  if v_p.id is null or v_p.applicant_id <> v_uid then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  select * into v_hit from public.proposal_versions v where v.client_request_id = p_client_request_id;
  if v_hit.id is not null then
    return private.receipt(v_hit.proposal_id, v_hit.version_no) || jsonb_build_object('replayed', true);
  end if;
  if v_p.status <> 'action_required' then
    perform private.raise_error('INVALID_STATE', 'No revision is waiting for this idea.', jsonb_build_object('actual', v_p.status));
  end if;
  select * into v_req from public.feedback_requests r
  where r.proposal_id = v_p.id and r.status = 'open' and r.kind = 'revision'
  for update;
  if v_req.id is null then
    perform private.raise_error('INVALID_STATE', 'No revision is waiting for this idea.');
  end if;

  v_decl := private.current_notice_version('declaration');
  if v_decl is null or p_declaration_version is distinct from v_decl then
    perform private.raise_error('VALIDATION', 'Accept the declaration to submit. Your changes are saved.',
      jsonb_build_object('fields', jsonb_build_object('declaration', 'Accept the current declaration')));
  end if;
  v_note := private.require_text(p_change_note, 'change_note', 1, 2000,
    'Say what changed in this version (up to 2,000 characters).');

  -- INN-02: every task needs a status and an explanation.
  if jsonb_typeof(v_resps) <> 'array' then
    perform private.raise_error('VALIDATION', 'Task responses must be a list.');
  end if;
  if exists (select 1 from jsonb_array_elements(v_resps) e
             where not exists (select 1 from public.feedback_tasks t
                               where t.feedback_request_id = v_req.id and t.id::text = e ->> 'task_id')) then
    perform private.raise_error('VALIDATION', 'A response refers to a task that is not part of this request.');
  end if;
  for v_task in select t.* from public.feedback_tasks t where t.feedback_request_id = v_req.id order by t.position loop
    select e into v_resp from jsonb_array_elements(v_resps) e where e ->> 'task_id' = v_task.id::text limit 1;
    v_expl := btrim(coalesce(v_resp ->> 'explanation', ''));
    if v_resp is null or coalesce(v_resp ->> 'status', '') not in ('addressed', 'not_addressed') then
      v_terrors := v_terrors || jsonb_build_object('task:' || v_task.position, 'Mark this task Addressed or Not addressed');
    elsif char_length(v_expl) not between 1 and 500 then
      v_terrors := v_terrors || jsonb_build_object('task:' || v_task.position, 'Explain what you did (up to 500 characters)');
    end if;
  end loop;
  if v_terrors <> '{}'::jsonb then
    perform private.raise_error('VALIDATION', 'Answer every task before submitting. Your changes are saved.',
      jsonb_build_object('fields', v_terrors));
  end if;

  -- Form content: the revision working copy, or the current version unchanged.
  select * into v_cv from public.challenge_versions cv where cv.id = v_p.challenge_version_id;
  select d.data into v_data from public.proposal_drafts d where d.proposal_id = v_p.id;
  if v_data is null then
    select v.data into v_data from public.proposal_versions v where v.id = v_p.current_version_id;
  end if;
  v_data := private.clean_form_data(v_cv.form_schema, v_data);
  v_errors := private.validate_submission(v_cv.form_schema, v_cv.required_docs, v_data, v_p.id);
  -- Documents already on the current version carry forward and count.
  v_errors := v_errors - coalesce((
    select array_agg('doc:' || a.doc_key) from public.attachments a
    where a.version_id = v_p.current_version_id and a.doc_key is not null and a.deleted_at is null), array[]::text[]);
  if v_errors <> '{}'::jsonb then
    perform private.raise_error('VALIDATION', 'Some answers need attention. Your changes are saved.',
      jsonb_build_object('fields', v_errors));
  end if;

  select max(v.version_no) + 1 into v_ver_no from public.proposal_versions v where v.proposal_id = v_p.id;
  v_old := v_p.current_version_id;

  insert into public.proposal_versions
    (proposal_id, version_no, data, submitted_at, submitted_by, responds_to_feedback_id, change_note,
     declaration_version, declaration_accepted_at, client_request_id)
  values (v_p.id, v_ver_no, v_data, v_now, v_uid, v_req.id, v_note, v_decl, v_now, p_client_request_id)
  returning id into v_new;

  -- Files: earlier files carry forward unless replaced by a new upload of the same document type.
  insert into public.attachments (proposal_id, version_id, doc_key, storage_path, filename, mime, size_bytes, sha256, uploaded_by, created_at)
  select a.proposal_id, v_new, a.doc_key, a.storage_path, a.filename, a.mime, a.size_bytes, a.sha256, a.uploaded_by, a.created_at
  from public.attachments a
  where a.version_id = v_old and a.deleted_at is null
    and (a.doc_key is null or a.doc_key not in (
          select n.doc_key from public.attachments n
          where n.proposal_id = v_p.id and n.version_id is null and n.deleted_at is null and n.doc_key is not null));
  update public.attachments set version_id = v_new
  where proposal_id = v_p.id and version_id is null and deleted_at is null;

  update public.feedback_tasks t
  set applicant_status = e ->> 'status',
      applicant_explanation = btrim(e ->> 'explanation'),
      addressed_in_version_id = v_new
  from jsonb_array_elements(v_resps) e
  where t.feedback_request_id = v_req.id and t.id::text = e ->> 'task_id';

  update public.feedback_requests
  set status = 'answered', answered_version_id = v_new, responded_at = v_now, responded_by = v_uid
  where id = v_req.id;

  update public.proposals
  set current_version_id = v_new, title = left(btrim(coalesce(v_data ->> 'title', title)), 200)
  where id = v_p.id;

  -- D-10: back to the stage that asked for the revision.
  perform private.transition_case(v_p.id, array['action_required'], v_p.return_stage,
    format('Version %s submitted', v_ver_no));

  delete from public.proposal_drafts where proposal_id = v_p.id;

  select count(*), count(*) filter (where t.applicant_status = 'addressed') into v_total, v_addr
  from public.feedback_tasks t where t.feedback_request_id = v_req.id;

  perform private.write_audit('proposal.revised', 'proposal', v_p.id::text, v_p.id,
    jsonb_build_object('reference', v_p.reference, 'version_no', v_ver_no, 'client_request_id', p_client_request_id,
                       'tasks_total', v_total, 'tasks_addressed', v_addr, 'returned_to', v_p.return_stage),
    private.acting_role('proposal.submit'));

  perform private.notify(v_uid, v_p.id, 'proposal.revised', format('Version %s submitted', v_ver_no),
    format('Your revised idea was received. Reference %s.', v_p.reference),
    'proposal_revised', jsonb_build_object('reference', v_p.reference, 'version_no', v_ver_no));
  perform private.notify_case_staff(v_p.id, 'case.new_version', format('Version %s ready to review', v_ver_no),
    format('%s: the applicant submitted version %s.', v_p.reference, v_ver_no));
  if not exists (select 1 from public.assignments a where a.proposal_id = v_p.id and a.reviewer_id = v_req.requested_by
                 and a.revoked_at is null and a.declared_at is not null and not a.has_conflict) then
    perform private.notify(v_req.requested_by, v_p.id, 'case.new_version', format('Version %s submitted', v_ver_no),
      format('%s: the applicant answered your revision request.', v_p.reference));
  end if;

  return private.receipt(v_p.id, v_ver_no) || jsonb_build_object('replayed', false);
end;
$$;

-- -----------------------------------------------------------------------------
-- INN-02: verify_feedback_task (each reviewer, each task, on the new version)
-- -----------------------------------------------------------------------------

create or replace function public.verify_feedback_task(
  p_task_id uuid,
  p_assignment_id uuid,
  p_result text,
  p_note text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a    public.assignments%rowtype;
  v_t    public.feedback_tasks%rowtype;
  v_p    public.proposals%rowtype;
  v_note text := btrim(coalesce(p_note, ''));
  v_at   timestamptz := now();
begin
  v_a := private.my_active_assignment(p_assignment_id);
  if v_a.declared_at is null or v_a.has_conflict then
    perform private.raise_error('FORBIDDEN', 'Complete the declaration first.');
  end if;
  select t.* into v_t from public.feedback_tasks t
  join public.feedback_requests r on r.id = t.feedback_request_id
  where t.id = p_task_id and r.proposal_id = v_a.proposal_id;
  if v_t.id is null then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;

  select * into v_p from public.proposals p where p.id = v_a.proposal_id for update;
  if v_p.status <> 'in_evaluation' then
    perform private.raise_error('INVALID_STATE', 'Scoring is closed for this case.', jsonb_build_object('actual', v_p.status));
  end if;
  if v_t.addressed_in_version_id is distinct from v_p.current_version_id then
    perform private.raise_error('INVALID_STATE', 'This task belongs to an earlier version.');
  end if;
  if exists (select 1 from public.scorecards s where s.assignment_id = v_a.id
             and s.version_id = v_p.current_version_id and s.status = 'submitted') then
    perform private.raise_error('INVALID_STATE', 'Your scorecard for this version is submitted; verifications are locked.');
  end if;

  if p_result is null or p_result not in ('verified', 'not_verified') then
    perform private.raise_error('VALIDATION', 'Choose Verified or Not verified.',
      jsonb_build_object('fields', jsonb_build_object('result', 'Choose Verified or Not verified')));
  end if;
  if char_length(v_note) > 1000 or (p_result = 'not_verified' and v_note = '') then
    perform private.raise_error('VALIDATION', 'Explain why the task is not verified (up to 1,000 characters).',
      jsonb_build_object('fields', jsonb_build_object('note', 'Explain why (up to 1,000 characters)')));
  end if;

  insert into public.task_verifications (feedback_task_id, assignment_id, version_id, result, note, verified_at)
  values (v_t.id, v_a.id, v_p.current_version_id, p_result, v_note, v_at)
  on conflict (feedback_task_id, assignment_id)
  do update set result = excluded.result, note = excluded.note, verified_at = excluded.verified_at,
                version_id = excluded.version_id;

  perform private.write_audit('task.verified', 'feedback_task', v_t.id::text, v_p.id,
    jsonb_build_object('result', p_result, 'assignment_id', v_a.id), private.acting_role('scorecard.submit'));
  return jsonb_build_object('task_id', v_t.id, 'result', p_result, 'verified_at', v_at);
end;
$$;

-- Verifications lock with the reviewer's scorecard for that version.
create or replace function private.task_verifications_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' or exists (
       select 1 from public.scorecards s
       where s.assignment_id = old.assignment_id and s.version_id = old.version_id and s.status = 'submitted') then
    raise exception using errcode = 'PT409', message = 'IMMUTABLE', hint = 'Verifications are locked with the scorecard';
  end if;
  return new;
end;
$$;
create trigger task_verifications_guard before update or delete on public.task_verifications
  for each row execute function private.task_verifications_guard();

-- BCR-001 B6: the applicant sees reviewers' verifications only after the decision is published.
create policy task_verifications_read_applicant on public.task_verifications for select to authenticated
  using (exists (
    select 1 from public.feedback_tasks t
    join public.feedback_requests r on r.id = t.feedback_request_id
    where t.id = task_verifications.feedback_task_id
      and (select private.is_case_owner(r.proposal_id))
      and exists (select 1 from public.decisions d
                  where d.proposal_id = r.proposal_id and d.published_at is not null and d.superseded_at is null)));

-- -----------------------------------------------------------------------------
-- INN-02: roadmap summary (T08 Feedback tab, T09 panel)
-- -----------------------------------------------------------------------------

create or replace function public.get_roadmap(p_proposal_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_owner boolean := private.is_case_owner(p_proposal_id);
  v_show  boolean;
begin
  if not private.can_read_case(p_proposal_id) then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  v_show := not v_owner or exists (select 1 from public.decisions d where d.proposal_id = p_proposal_id
                                   and d.published_at is not null and d.superseded_at is null);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'feedback_request_id', r.id, 'kind', r.kind, 'status', r.status, 'message', r.message,
      'due_at', r.due_at, 'created_at', r.created_at,
      'version_no', (select v.version_no from public.proposal_versions v where v.id = r.version_id),
      'answered_version_no', (select v.version_no from public.proposal_versions v where v.id = r.answered_version_id),
      'response_text', r.response_text, 'responded_at', r.responded_at,
      'tasks', coalesce((
        select jsonb_agg(jsonb_build_object(
          'task_id', t.id, 'position', t.position, 'text', t.text,
          'applicant_status', t.applicant_status, 'applicant_explanation', t.applicant_explanation,
          'verifications', case when v_show then coalesce((
            select jsonb_agg(jsonb_build_object('reviewer_name', pr.full_name, 'result', tv.result,
                                                'note', tv.note, 'verified_at', tv.verified_at) order by tv.verified_at)
            from public.task_verifications tv
            join public.assignments a on a.id = tv.assignment_id
            join public.profiles pr on pr.id = a.reviewer_id
            where tv.feedback_task_id = t.id and a.revoked_at is null), '[]'::jsonb) end)
          order by t.position)
        from public.feedback_tasks t where t.feedback_request_id = r.id), '[]'::jsonb),
      'summary', (
        select jsonb_build_object(
          'tasks', count(*),
          'addressed', count(*) filter (where t.applicant_status = 'addressed'),
          'verified', case when v_show then (
              select count(*) from public.task_verifications tv join public.assignments a on a.id = tv.assignment_id
              join public.feedback_tasks t2 on t2.id = tv.feedback_task_id
              where t2.feedback_request_id = r.id and a.revoked_at is null and tv.result = 'verified') end,
          'not_verified', case when v_show then (
              select count(*) from public.task_verifications tv join public.assignments a on a.id = tv.assignment_id
              join public.feedback_tasks t2 on t2.id = tv.feedback_task_id
              where t2.feedback_request_id = r.id and a.revoked_at is null and tv.result = 'not_verified') end)
        from public.feedback_tasks t where t.feedback_request_id = r.id))
      order by r.created_at)
    from public.feedback_requests r where r.proposal_id = p_proposal_id), '[]'::jsonb);
end;
$$;

-- -----------------------------------------------------------------------------
-- NTF-02: outbox relay support (single retry owner: the email-relay function)
-- -----------------------------------------------------------------------------

-- Claims due rows with a lease, so a crashed relay's rows become due again later.
create or replace function public.claim_outbox_batch(p_limit integer default 10)
returns table (id uuid, template text, payload jsonb, to_email text, attempts integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max integer := coalesce((private.setting('email_max_attempts'))::text::integer, 5);
begin
  return query
    with due as (
      select o.id from public.email_outbox o
      where o.status in ('pending', 'retryable', 'unknown_outcome')
        and o.next_attempt_at <= now() and o.attempts < v_max
      order by o.created_at
      limit greatest(1, least(coalesce(p_limit, 10), 50))
      for update skip locked
    )
    update public.email_outbox o
    set attempts = o.attempts + 1, last_attempt_at = now(), next_attempt_at = now() + interval '10 minutes'
    from due, public.profiles pr
    where o.id = due.id and pr.id = o.user_id
    returning o.id, o.template, o.payload, pr.email, o.attempts;
end;
$$;

-- Records what the relay observed (BCR-001 B4 vocabulary). Never moves an
-- accepted row backwards. Gives up after email_max_attempts.
create or replace function public.record_outbox_result(
  p_id uuid, p_outcome text, p_provider_message_id text default null, p_error text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_o   public.email_outbox%rowtype;
  v_max integer := coalesce((private.setting('email_max_attempts'))::text::integer, 5);
  v_status text;
begin
  if p_outcome is null or p_outcome not in ('accepted', 'rejected', 'retryable', 'unknown_outcome') then
    perform private.raise_error('VALIDATION', 'Unknown outcome.');
  end if;
  select * into v_o from public.email_outbox o where o.id = p_id for update;
  if v_o.id is null then
    perform private.raise_error('VALIDATION', 'Unknown outbox row.');
  end if;
  if v_o.status in ('accepted', 'rejected') then
    return jsonb_build_object('id', v_o.id, 'status', v_o.status, 'changed', false);
  end if;

  v_status := case when p_outcome in ('retryable', 'unknown_outcome') and v_o.attempts >= v_max then 'rejected'
                   else p_outcome end;
  update public.email_outbox
  set status = v_status,
      provider_message_id = coalesce(p_provider_message_id, provider_message_id),
      last_error = case when v_status = 'rejected' and p_outcome <> 'rejected'
                        then left(format('Gave up after %s attempts: %s', v_o.attempts, coalesce(p_error, p_outcome)), 1000)
                        else left(p_error, 1000) end,
      -- exponential backoff with jitter: 2^attempts minutes +/- 20%
      next_attempt_at = case when v_status in ('retryable', 'unknown_outcome')
                             then now() + make_interval(secs => (60 * power(2, v_o.attempts)) * (0.8 + random() * 0.4))
                             else next_attempt_at end
  where id = v_o.id;
  return jsonb_build_object('id', v_o.id, 'status', v_status, 'changed', true);
end;
$$;

-- Admin outbox viewer (shown as "Simulated" while SMTP is not configured).
create or replace function public.list_email_outbox(p_limit integer default 50)
returns table (id uuid, template text, status text, attempts integer, recipient text,
               created_at timestamptz, last_attempt_at timestamptz, next_attempt_at timestamptz, last_error text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('config.manage') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  return query
    select o.id, o.template, o.status, o.attempts, pr.email, o.created_at, o.last_attempt_at, o.next_attempt_at, o.last_error
    from public.email_outbox o join public.profiles pr on pr.id = o.user_id
    order by o.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;

-- -----------------------------------------------------------------------------
-- Earlier functions, extended for revision mode (copied from 002/004 and patched)
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
    if not private.is_editable(v_p.id) then
      perform private.raise_error('INVALID_STATE', 'This idea can''t be edited now.',
        jsonb_build_object('actual', v_p.status));
    end if;
    select * into v_cv from public.challenge_versions cv where cv.id = v_p.challenge_version_id;

    v_clean := private.clean_form_data(v_cv.form_schema, p_data);
    v_title := left(btrim(coalesce(v_clean ->> 'title', '')), 200);

    insert into public.proposal_drafts (proposal_id, data, updated_at) values (v_p.id, v_clean, v_saved_at)
    on conflict (proposal_id) do update set data = excluded.data, updated_at = excluded.updated_at;
    update public.proposals set title = v_title where id = v_p.id;
    -- Autosave runs every few seconds: only draft creation is audited.
    -- A revision (action_required) is edited here too; submit_revision turns it into a new version.
  end if;

  return jsonb_build_object('proposal_id', v_p.id, 'saved_at', v_saved_at, 'title', v_title);
end;
$$;

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
  if not private.is_editable(v_p.id) then
    perform private.raise_error('INVALID_STATE', 'Files can only be added to a draft or a requested revision.');
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
  if v_att.version_id is not null or not private.is_editable(v_p.id) then
    perform private.raise_error('INVALID_STATE', 'Submitted files cannot be removed.');
  end if;

  update public.attachments set deleted_at = now() where id = v_att.id;
  perform private.write_audit('attachment.removed', 'attachment', v_att.id::text, v_p.id, '{}'::jsonb,
    private.acting_role('proposal.submit'));
  return jsonb_build_object('id', v_att.id, 'removed', true);
end;
$$;

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
    and (p.id = p_proposal_id or p.client_request_id = p_client_request_id
         or exists (select 1 from public.proposal_versions v
                    where v.proposal_id = p.id and v.client_request_id = p_client_request_id));

  if v_id is null then
    -- Not submitted (yet), or not yours: the caller cannot tell which.
    return jsonb_build_object('found', false);
  end if;
  -- A request key identifies one version: V1's key is on the case, later keys on their version (B9).
  return private.receipt(v_id, coalesce(p_version_no,
           (select v.version_no from public.proposal_versions v
            where v.proposal_id = v_id and v.client_request_id = p_client_request_id),
           (select 1 from public.proposals p where p.id = v_id and p.client_request_id = p_client_request_id)))
         || jsonb_build_object('found', true);
end;
$$;

create or replace function public.submit_scorecard(
  p_assignment_id uuid,
  p_items jsonb default null,
  p_overall_comment text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a       public.assignments%rowtype;
  v_p       public.proposals%rowtype;
  v_card    public.scorecards%rowtype;
  v_id      uuid;
  v_errors  jsonb;
  v_count   integer;
  v_quorum  integer := private.review_quorum();
  v_reached boolean := false;
  v_adj     record;
begin
  v_a := private.my_active_assignment(p_assignment_id);
  select * into v_p from public.proposals p where p.id = v_a.proposal_id;

  -- Retry after a lost reply: return the recorded result, change nothing.
  select * into v_card from public.scorecards s
  where s.assignment_id = v_a.id and s.version_id = v_p.current_version_id and s.status = 'submitted';
  if v_card.id is not null then
    return jsonb_build_object('scorecard_id', v_card.id, 'status', 'submitted', 'submitted_at', v_card.submitted_at,
      'weighted_score', private.weighted_score(v_card.id),
      'submitted_count', private.submitted_count(v_p.id, v_p.current_version_id), 'quorum', v_quorum,
      'quorum_reached', v_p.status <> 'in_evaluation', 'replayed', true);
  end if;

  v_id := private.write_scorecard(v_a, p_items, p_overall_comment);

  -- D-20: every criterion scored, each with a reason of at least 20 characters.
  select coalesce(jsonb_object_agg(c.key,
           case when i.score is null then 'Choose a score from 1 to 5'
                else 'Give a reason of at least 20 characters' end), '{}'::jsonb)
  into v_errors
  from public.scorecards s
  join public.rubric_criteria c on c.rubric_version_id = s.rubric_version_id
  left join public.scorecard_items i on i.scorecard_id = s.id and i.criterion_id = c.id
  where s.id = v_id and (i.score is null or char_length(btrim(i.reason)) < 20);
  -- INN-02: on a revised version, every roadmap task must be verified by this reviewer first.
  v_errors := v_errors || coalesce((
    select jsonb_object_agg('task:' || t.position, 'Verify this roadmap task')
    from public.feedback_tasks t
    where t.addressed_in_version_id = v_p.current_version_id
      and not exists (select 1 from public.task_verifications tv
                      where tv.feedback_task_id = t.id and tv.assignment_id = v_a.id
                        and tv.version_id = v_p.current_version_id)), '{}'::jsonb);
  if v_errors <> '{}'::jsonb then
    perform private.raise_error('VALIDATION', 'Score every criterion with a reason, and verify every roadmap task. Your scores are saved.',
      jsonb_build_object('fields', v_errors));
  end if;

  update public.scorecards set status = 'submitted', submitted_at = now() where id = v_id
  returning * into v_card;

  perform private.write_audit('scorecard.submitted', 'scorecard', v_id::text, v_p.id,
    jsonb_build_object('version_id', v_p.current_version_id, 'weighted_score', private.weighted_score(v_id)),
    private.acting_role('scorecard.submit'));

  -- D-11: enough submitted scorecards on the current version -> adjudication.
  v_count := private.submitted_count(v_p.id, v_p.current_version_id);
  if v_count >= v_quorum then
    perform private.transition_case(v_p.id, array['in_evaluation'], 'in_adjudication',
      format('Review quorum reached (%s of %s scorecards)', v_count, v_quorum));
    perform private.write_audit('case.quorum_reached', 'proposal', v_p.id::text, v_p.id,
      jsonb_build_object('submitted_count', v_count, 'quorum', v_quorum), private.acting_role('scorecard.submit'));
    for v_adj in
      select distinct ur.user_id from public.user_roles ur
      join public.role_permissions rp on rp.role_key = ur.role_key
      where ur.revoked_at is null and rp.permission = 'decision.record'
    loop
      perform private.notify(v_adj.user_id, v_p.id, 'case.ready_for_decision', 'Case ready for decision',
        format('%s has the scorecards it needs.', v_p.reference));
    end loop;
    v_reached := true;
  end if;

  return jsonb_build_object('scorecard_id', v_id, 'status', 'submitted', 'submitted_at', v_card.submitted_at,
    'weighted_score', private.weighted_score(v_id), 'submitted_count', v_count, 'quorum', v_quorum,
    'quorum_reached', v_reached, 'replayed', false);
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

revoke all on function
  public.request_feedback(uuid, text, text, timestamptz, text[]),
  public.respond_clarification(uuid, text),
  public.submit_revision(uuid, uuid, text, jsonb, text),
  public.verify_feedback_task(uuid, uuid, text, text),
  public.get_roadmap(uuid),
  public.claim_outbox_batch(integer),
  public.record_outbox_result(uuid, text, text, text),
  public.list_email_outbox(integer)
from public, anon, authenticated;

grant execute on function
  public.request_feedback(uuid, text, text, timestamptz, text[]),
  public.respond_clarification(uuid, text),
  public.submit_revision(uuid, uuid, text, jsonb, text),
  public.verify_feedback_task(uuid, uuid, text, text),
  public.get_roadmap(uuid),
  public.list_email_outbox(integer)
to authenticated;

-- The relay runs with the service role only; browsers can never claim or settle outbox rows.
grant execute on function
  public.claim_outbox_batch(integer),
  public.record_outbox_result(uuid, text, text, text)
to service_role;

revoke all on function
  private.open_feedback(uuid, text), private.notify_case_staff(uuid, text, text, text)
from public;
grant execute on function private.is_editable(uuid) to authenticated;
