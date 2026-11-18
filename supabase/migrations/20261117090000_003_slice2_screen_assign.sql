-- =============================================================================
-- Migration 003 — Slice 2: screen, assign, roles, notes, committee view
-- REV-01 (screening + assign >= 2 reviewers), IAM-01 (grant/revoke, no self-grant),
-- D-08 (committee sees reference and stage only), N3, N7, N8.
-- Contract: docs/blueprint/03-api-contracts-and-permissions.md §4.2
-- =============================================================================

-- transition_case gains a closure reason (proposals requires one when closed).
drop function if exists private.transition_case(uuid, text[], text, text);

create or replace function private.transition_case(
  p_proposal_id uuid, p_expected text[], p_to text, p_reason text default null, p_closed_reason text default null)
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
  set status = p_to,
      closed_reason = case when p_to = 'closed' then p_closed_reason else closed_reason end
  where id = p_proposal_id;

  insert into public.case_events (proposal_id, from_status, to_status, public_stage, actor_id, reason)
  values (p_proposal_id, v_from, p_to, private.public_stage(p_to), auth.uid(), p_reason);

  return v_from;
end;
$$;
revoke all on function private.transition_case(uuid, text[], text, text, text) from public;

create or replace function private.require_text(p_value text, p_field text, p_min integer, p_max integer, p_message text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := btrim(coalesce(p_value, ''));
begin
  if char_length(v) < p_min or char_length(v) > p_max then
    perform private.raise_error('VALIDATION', p_message,
      jsonb_build_object('fields', jsonb_build_object(p_field, p_message)));
  end if;
  return v;
end;
$$;

-- user_roles: rows are never edited except to revoke once. (Deletes are not
-- reachable by clients: no grant.)
create or replace function private.user_roles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.revoked_at is not null
     or new.user_id <> old.user_id or new.role_key <> old.role_key
     or new.granted_by is distinct from old.granted_by or new.granted_at <> old.granted_at
     or new.revoked_at is null then
    raise exception using errcode = 'PT409', message = 'IMMUTABLE', hint = 'A role grant can only be revoked, once';
  end if;
  return new;
end;
$$;
create trigger user_roles_guard before update on public.user_roles
  for each row execute function private.user_roles_guard();

-- assignments: only declaration fields (Slice 3) and a single revocation may change.
create or replace function private.assignments_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = 'PT409', message = 'IMMUTABLE', hint = 'Assignments are revoked, never deleted';
  end if;
  if old.revoked_at is not null
     or new.proposal_id <> old.proposal_id or new.reviewer_id <> old.reviewer_id
     or new.assigned_by <> old.assigned_by or new.assigned_at <> old.assigned_at
     or (old.declared_at is not null and (new.declared_at is distinct from old.declared_at
                                          or new.has_conflict is distinct from old.has_conflict)) then
    raise exception using errcode = 'PT409', message = 'IMMUTABLE', hint = 'This assignment can no longer change';
  end if;
  return new;
end;
$$;
create trigger assignments_guard before update or delete on public.assignments
  for each row execute function private.assignments_guard();

-- -----------------------------------------------------------------------------
-- REV-01: record_screening
-- -----------------------------------------------------------------------------

create or replace function public.record_screening(p_proposal_id uuid, p_result text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_p      public.proposals%rowtype;
  v_to     text;
begin
  if not private.has_permission('case.screen') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  if p_result is null or p_result not in ('eligible', 'ineligible') then
    perform private.raise_error('VALIDATION', 'Choose Eligible or Ineligible.',
      jsonb_build_object('fields', jsonb_build_object('result', 'Choose Eligible or Ineligible')));
  end if;
  v_reason := private.require_text(p_reason, 'reason', 1, 1000, 'Give a reason (up to 1,000 characters).');

  select * into v_p from public.proposals p where p.id = p_proposal_id and p.deleted_at is null;
  if v_p.id is null or v_p.status = 'draft' then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;

  v_to := case p_result when 'eligible' then 'in_evaluation' else 'closed' end;
  perform private.transition_case(v_p.id, array['submitted'], v_to, v_reason,
    case when v_to = 'closed' then 'Ineligible: ' || v_reason end);

  perform private.write_audit('case.screened', 'proposal', v_p.id::text, v_p.id,
    jsonb_build_object('result', p_result, 'reference', v_p.reference), private.acting_role('case.screen'));

  if v_to = 'in_evaluation' then
    perform private.notify(v_p.applicant_id, v_p.id, 'case.under_review', 'Your idea is under review',
      format('%s passed screening and is now being reviewed.', v_p.reference),
      'case_under_review', jsonb_build_object('reference', v_p.reference));
  else
    perform private.notify(v_p.applicant_id, v_p.id, 'case.closed', 'Your idea was not taken forward',
      format('%s did not meet the challenge criteria. Open your idea to see the reason.', v_p.reference),
      'case_closed', jsonb_build_object('reference', v_p.reference));
  end if;

  return jsonb_build_object('proposal_id', v_p.id, 'status', v_to, 'result', p_result);
end;
$$;

-- -----------------------------------------------------------------------------
-- REV-01: assign_reviewers / revoke_assignment
-- -----------------------------------------------------------------------------

create or replace function private.is_active_reviewer(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role_key = ur.role_key
    where ur.user_id = p_user_id and ur.revoked_at is null and rp.permission = 'scorecard.submit'
  );
$$;

create or replace function public.assign_reviewers(
  p_proposal_id uuid,
  p_reviewer_ids uuid[],
  p_due_at timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p        public.proposals%rowtype;
  v_due      timestamptz := coalesce(p_due_at, now() + interval '14 days');
  v_rid      uuid;
  v_aid      uuid;
  v_assigned jsonb := '[]'::jsonb;
  v_already  jsonb := '[]'::jsonb;
begin
  if not private.has_permission('case.assign') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  if p_reviewer_ids is null or cardinality(p_reviewer_ids) = 0 or cardinality(p_reviewer_ids) > 10
     or array_position(p_reviewer_ids, null) is not null then
    perform private.raise_error('VALIDATION', 'Choose between 1 and 10 reviewers.',
      jsonb_build_object('fields', jsonb_build_object('reviewers', 'Choose between 1 and 10 reviewers')));
  end if;
  if v_due <= now() then
    perform private.raise_error('VALIDATION', 'The due date must be in the future.',
      jsonb_build_object('fields', jsonb_build_object('due_at', 'Must be in the future')));
  end if;

  select * into v_p from public.proposals p where p.id = p_proposal_id and p.deleted_at is null for update;
  if v_p.id is null or v_p.status = 'draft' then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  if v_p.status <> 'in_evaluation' then
    perform private.raise_error('INVALID_STATE', 'Reviewers can be assigned once the case has passed screening.',
      jsonb_build_object('actual', v_p.status));
  end if;

  -- Validate every reviewer before writing anything.
  foreach v_rid in array (select array_agg(distinct x) from unnest(p_reviewer_ids) x) loop
    if not private.is_active_reviewer(v_rid) then
      perform private.raise_error('VALIDATION', 'Everyone you assign must hold the reviewer role.',
        jsonb_build_object('fields', jsonb_build_object('reviewers', 'Not a reviewer'), 'reviewer_id', v_rid));
    end if;
    if v_rid = v_p.applicant_id or v_rid = auth.uid() then
      perform private.raise_error('VALIDATION', 'The applicant and the person assigning cannot review this case.',
        jsonb_build_object('fields', jsonb_build_object('reviewers', 'Not allowed for this case'), 'reviewer_id', v_rid));
    end if;
    if exists (select 1 from public.assignments a
               where a.proposal_id = v_p.id and a.reviewer_id = v_rid and a.has_conflict) then
      perform private.raise_error('VALIDATION', 'This reviewer declared a conflict of interest on this case.',
        jsonb_build_object('fields', jsonb_build_object('reviewers', 'Declared a conflict'), 'reviewer_id', v_rid));
    end if;
  end loop;

  foreach v_rid in array (select array_agg(distinct x) from unnest(p_reviewer_ids) x) loop
    select a.id into v_aid from public.assignments a
    where a.proposal_id = v_p.id and a.reviewer_id = v_rid and a.revoked_at is null;
    if v_aid is not null then
      v_already := v_already || jsonb_build_object('assignment_id', v_aid, 'reviewer_id', v_rid);
      continue;
    end if;

    insert into public.assignments (proposal_id, reviewer_id, assigned_by, due_at)
    values (v_p.id, v_rid, auth.uid(), v_due)
    returning id into v_aid;

    perform private.write_audit('assignment.created', 'assignment', v_aid::text, v_p.id,
      jsonb_build_object('reviewer_id', v_rid, 'due_at', v_due), private.acting_role('case.assign'));
    perform private.notify(v_rid, v_p.id, 'assignment.created', 'New case to review',
      format('%s has been assigned to you. Declare any conflict before opening it.', v_p.reference),
      'assignment_created', jsonb_build_object('reference', v_p.reference, 'due_at', v_due));
    v_assigned := v_assigned || jsonb_build_object('assignment_id', v_aid, 'reviewer_id', v_rid);
    v_aid := null;
  end loop;

  return jsonb_build_object('proposal_id', v_p.id, 'assigned', v_assigned, 'already_assigned', v_already,
    'active_reviewers', (select count(*) from public.assignments a where a.proposal_id = v_p.id and a.revoked_at is null));
end;
$$;

create or replace function public.revoke_assignment(p_assignment_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a      public.assignments%rowtype;
  v_ref    text;
  v_reason text;
begin
  if not private.has_permission('case.assign') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  v_reason := private.require_text(p_reason, 'reason', 1, 500, 'Give a reason (up to 500 characters).');

  select * into v_a from public.assignments a where a.id = p_assignment_id for update;
  if v_a.id is null then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  if v_a.revoked_at is not null then
    perform private.raise_error('INVALID_STATE', 'This assignment was already removed.');
  end if;

  update public.assignments set revoked_at = now(), revoke_reason = v_reason where id = v_a.id;
  select p.reference into v_ref from public.proposals p where p.id = v_a.proposal_id;

  perform private.write_audit('assignment.revoked', 'assignment', v_a.id::text, v_a.proposal_id,
    jsonb_build_object('reviewer_id', v_a.reviewer_id), private.acting_role('case.assign'));
  perform private.notify(v_a.reviewer_id, v_a.proposal_id, 'assignment.revoked', 'Case removed from your list',
    format('%s is no longer assigned to you.', v_ref));

  return jsonb_build_object('assignment_id', v_a.id, 'revoked', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- IAM-01: grant_role / revoke_role
-- A self-grant (N8) or self-revoke is refused AND audited. Raising an error
-- would roll the audit row back, so these refusals are returned as a result:
-- { "ok": false, "code": "FORBIDDEN", "message": … }. Other refusals raise.
-- -----------------------------------------------------------------------------

create or replace function public.grant_role(p_user_id uuid, p_role_key text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.has_permission('role.manage') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;

  if p_user_id = auth.uid() then
    perform private.write_audit('role.grant_refused', 'profile', p_user_id::text, null,
      jsonb_build_object('role_key', p_role_key, 'reason', 'self_grant'), private.acting_role('role.manage'));
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'You can''t grant a role to yourself. Ask another administrator.');
  end if;

  if not exists (select 1 from public.roles r where r.key = p_role_key) then
    perform private.raise_error('VALIDATION', 'Choose a role.',
      jsonb_build_object('fields', jsonb_build_object('role_key', 'Unknown role')));
  end if;
  if not exists (select 1 from public.profiles pr where pr.id = p_user_id) then
    perform private.raise_error('VALIDATION', 'Choose a registered user.',
      jsonb_build_object('fields', jsonb_build_object('user_id', 'Unknown user')));
  end if;

  select ur.id into v_id from public.user_roles ur
  where ur.user_id = p_user_id and ur.role_key = p_role_key and ur.revoked_at is null;
  if v_id is not null then
    return jsonb_build_object('ok', true, 'already', true, 'user_role_id', v_id);
  end if;

  insert into public.user_roles (user_id, role_key, granted_by)
  values (p_user_id, p_role_key, auth.uid())
  returning id into v_id;

  perform private.write_audit('role.granted', 'profile', p_user_id::text, null,
    jsonb_build_object('role_key', p_role_key, 'reason', left(p_reason, 500)), private.acting_role('role.manage'));
  perform private.notify(p_user_id, null, 'role.granted', 'Your access changed',
    format('You now have the %s role.', (select r.label from public.roles r where r.key = p_role_key)));

  return jsonb_build_object('ok', true, 'already', false, 'user_role_id', v_id);
end;
$$;

create or replace function public.revoke_role(p_user_id uuid, p_role_key text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id     uuid;
  v_reason text;
begin
  if not private.has_permission('role.manage') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;

  if p_user_id = auth.uid() then
    perform private.write_audit('role.revoke_refused', 'profile', p_user_id::text, null,
      jsonb_build_object('role_key', p_role_key, 'reason', 'self_revoke'), private.acting_role('role.manage'));
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'You can''t change your own roles. Ask another administrator.');
  end if;
  v_reason := private.require_text(p_reason, 'reason', 1, 500, 'Give a reason (up to 500 characters).');

  select ur.id into v_id from public.user_roles ur
  where ur.user_id = p_user_id and ur.role_key = p_role_key and ur.revoked_at is null
  for update;
  if v_id is null then
    perform private.raise_error('INVALID_STATE', 'This person does not hold that role.');
  end if;

  update public.user_roles set revoked_at = now(), revoked_by = auth.uid() where id = v_id;

  perform private.write_audit('role.revoked', 'profile', p_user_id::text, null,
    jsonb_build_object('role_key', p_role_key, 'reason', v_reason), private.acting_role('role.manage'));
  perform private.notify(p_user_id, null, 'role.revoked', 'Your access changed',
    format('The %s role was removed from your account.', (select r.label from public.roles r where r.key = p_role_key)));

  return jsonb_build_object('ok', true, 'user_role_id', v_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- Internal notes (T08 Notes tab). Never visible to the applicant.
-- -----------------------------------------------------------------------------

create or replace function public.add_internal_note(p_proposal_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_body text;
  v_id   uuid;
begin
  if not private.has_permission('case.note')
     or not private.can_read_case(p_proposal_id)
     or private.is_case_owner(p_proposal_id) then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  v_body := private.require_text(p_body, 'body', 1, 4000, 'Write a note (up to 4,000 characters).');

  insert into public.internal_notes (proposal_id, author_id, body)
  values (p_proposal_id, auth.uid(), v_body)
  returning id into v_id;

  -- The note text is confidential: the audit row records that a note exists, not what it says.
  perform private.write_audit('note.added', 'internal_note', v_id::text, p_proposal_id, '{}'::jsonb,
    private.acting_role('case.note'));
  return jsonb_build_object('id', v_id, 'created_at', now());
end;
$$;

-- -----------------------------------------------------------------------------
-- D-08: committee and dashboard views without proposal content
-- -----------------------------------------------------------------------------

-- Reference, challenge, applicant-facing stage and last update. No titles,
-- text, scores, notes or unpublished outcomes (an unpublished decision keeps
-- the case in_adjudication = "review").
create or replace function public.list_case_status(p_challenge_id uuid default null)
returns table (reference text, challenge_title text, public_stage text, last_update timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission('case.read_status') or private.has_permission('case.read_all')) then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  return query
    select p.reference, c.title, coalesce(private.public_stage(p.status), p.status), p.updated_at
    from public.proposals p
    join public.challenge_versions cv on cv.id = p.challenge_version_id
    join public.challenges c on c.id = cv.challenge_id
    where p.status <> 'draft' and p.deleted_at is null
      and (p_challenge_id is null or c.id = p_challenge_id)
    order by p.updated_at desc
    limit 500;
end;
$$;

create or replace function public.case_stage_counts(p_challenge_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission('case.read_status') or private.has_permission('case.read_all')
          or private.has_permission('report.read')) then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  return (
    select coalesce(jsonb_object_agg(stage, n), '{}'::jsonb)
    from (
      select coalesce(private.public_stage(p.status), p.status) as stage, count(*) as n
      from public.proposals p
      join public.challenge_versions cv on cv.id = p.challenge_version_id
      where p.status <> 'draft' and p.deleted_at is null
        and (p_challenge_id is null or cv.challenge_id = p_challenge_id)
      group by 1
    ) s
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

revoke all on function
  public.record_screening(uuid, text, text),
  public.assign_reviewers(uuid, uuid[], timestamptz),
  public.revoke_assignment(uuid, text),
  public.grant_role(uuid, text, text),
  public.revoke_role(uuid, text, text),
  public.add_internal_note(uuid, text),
  public.list_case_status(uuid),
  public.case_stage_counts(uuid)
from public, anon;

grant execute on function
  public.record_screening(uuid, text, text),
  public.assign_reviewers(uuid, uuid[], timestamptz),
  public.revoke_assignment(uuid, text),
  public.grant_role(uuid, text, text),
  public.revoke_role(uuid, text, text),
  public.add_internal_note(uuid, text),
  public.list_case_status(uuid),
  public.case_stage_counts(uuid)
to authenticated;

revoke all on function private.require_text(text, text, integer, integer, text), private.is_active_reviewer(uuid) from public;
