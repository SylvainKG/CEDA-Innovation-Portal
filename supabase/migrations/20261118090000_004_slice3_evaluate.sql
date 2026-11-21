-- =============================================================================
-- Migration 004 — Slice 3: declare, score, panel, quorum, live updates
-- REV-02 (versioned rubric), REV-03 (independent scoring + panel), NTF-01,
-- D-11 (automatic move to adjudication on quorum), D-19 (declaration gate),
-- D-20 (1–5, reason required), BCR-001 B7 (spread flag >= 2). N10, N11.
-- Contract: docs/blueprint/03-api-contracts-and-permissions.md §4.3
-- =============================================================================

-- -----------------------------------------------------------------------------
-- REV-02: published rubrics and challenge versions are frozen
-- -----------------------------------------------------------------------------

create or replace function private.rubric_versions_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_sum   numeric;
  v_count integer;
begin
  if tg_op = 'INSERT' then
    if new.published_at is not null then
      raise exception using errcode = 'PT422', message = 'VALIDATION',
        hint = 'Create the rubric version as a draft, add criteria, then publish it';
    end if;
    return new;
  end if;
  if old.published_at is not null then
    raise exception using errcode = 'PT409', message = 'IMMUTABLE', hint = 'Published rubric versions are locked';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if new.published_at is not null then
    select coalesce(sum(c.weight), 0), count(*) into v_sum, v_count
    from public.rubric_criteria c where c.rubric_version_id = new.id;
    if v_count = 0 or v_sum <> 100 then
      raise exception using errcode = 'PT422', message = 'VALIDATION',
        hint = format('Criteria weights must total 100%% before publishing (now %s%%)', v_sum);
    end if;
  end if;
  return new;
end;
$$;
create trigger rubric_versions_guard before insert or update or delete on public.rubric_versions
  for each row execute function private.rubric_versions_guard();

create or replace function private.rubric_criteria_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_version uuid := case when tg_op = 'DELETE' then old.rubric_version_id else new.rubric_version_id end;
begin
  if exists (select 1 from public.rubric_versions v where v.id = v_version and v.published_at is not null)
     or (tg_op = 'UPDATE' and exists (select 1 from public.rubric_versions v
                                      where v.id = old.rubric_version_id and v.published_at is not null)) then
    raise exception using errcode = 'PT409', message = 'IMMUTABLE', hint = 'Criteria of a published rubric are locked';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger rubric_criteria_guard before insert or update or delete on public.rubric_criteria
  for each row execute function private.rubric_criteria_guard();

create or replace function private.challenge_versions_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.published_at is not null then
    raise exception using errcode = 'PT409', message = 'IMMUTABLE',
      hint = 'Published challenge versions are locked; publish a new version instead';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger challenge_versions_guard before update or delete on public.challenge_versions
  for each row execute function private.challenge_versions_guard();

-- -----------------------------------------------------------------------------
-- Draft scorecards may be incomplete; completeness is enforced on submit.
-- -----------------------------------------------------------------------------

alter table public.scorecard_items drop constraint if exists scorecard_items_score_check;
alter table public.scorecard_items drop constraint if exists scorecard_items_reason_check;
alter table public.scorecard_items alter column score drop not null;
alter table public.scorecard_items alter column reason set default '';
alter table public.scorecard_items add constraint scorecard_items_score_range check (score is null or score between 1 and 5);
alter table public.scorecard_items add constraint scorecard_items_reason_length check (char_length(reason) <= 4000);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- The caller's own, active assignment (any declaration state).
create or replace function private.my_active_assignment(p_assignment_id uuid)
returns public.assignments
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_a public.assignments%rowtype;
begin
  if not private.has_permission('scorecard.submit') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  select * into v_a from public.assignments a
  where a.id = p_assignment_id and a.reviewer_id = auth.uid() and a.revoked_at is null;
  if v_a.id is null then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  return v_a;
end;
$$;

-- Weighted score on the 1–5 scale; null while any criterion is unscored.
create or replace function private.weighted_score(p_scorecard_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select case when count(i.score) = count(c.id) and count(c.id) > 0
              then round(sum(i.score * c.weight) / sum(c.weight), 2) end
  from public.scorecards s
  join public.rubric_criteria c on c.rubric_version_id = s.rubric_version_id
  left join public.scorecard_items i on i.scorecard_id = s.id and i.criterion_id = c.id
  where s.id = p_scorecard_id;
$$;

create or replace function private.review_quorum()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(1, coalesce((private.setting('review_quorum'))::text::integer, 2));
$$;

create or replace function private.submitted_count(p_proposal_id uuid, p_version_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.scorecards s
  join public.assignments a on a.id = s.assignment_id
  where a.proposal_id = p_proposal_id and a.revoked_at is null
    and s.version_id = p_version_id and s.status = 'submitted';
$$;

-- -----------------------------------------------------------------------------
-- D-19 / N10 / N11: declare_assignment
-- -----------------------------------------------------------------------------

create or replace function public.declare_assignment(
  p_assignment_id uuid,
  p_has_conflict boolean,
  p_confidentiality_accepted boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a      public.assignments%rowtype;
  v_p      public.proposals%rowtype;
  v_admin  record;
begin
  if p_has_conflict is null then
    perform private.raise_error('VALIDATION', 'Say whether you have a conflict of interest.',
      jsonb_build_object('fields', jsonb_build_object('has_conflict', 'Required')));
  end if;

  -- Retry of an already-recorded declaration: same answer -> same result.
  select * into v_a from public.assignments a
  where a.id = p_assignment_id and a.reviewer_id = auth.uid();
  if v_a.id is not null and v_a.declared_at is not null and private.has_permission('scorecard.submit') then
    if v_a.has_conflict = p_has_conflict then
      return jsonb_build_object('assignment_id', v_a.id, 'has_conflict', v_a.has_conflict,
                                'declared_at', v_a.declared_at, 'revoked', v_a.revoked_at is not null, 'replayed', true);
    end if;
    perform private.raise_error('INVALID_STATE', 'Your declaration for this case is already recorded.');
  end if;

  v_a := private.my_active_assignment(p_assignment_id);
  select * into v_p from public.proposals p where p.id = v_a.proposal_id;
  if v_p.status not in ('in_evaluation', 'action_required', 'in_adjudication') then
    perform private.raise_error('INVALID_STATE', 'This case is no longer being reviewed.',
      jsonb_build_object('actual', v_p.status));
  end if;

  if p_has_conflict then
    update public.assignments
    set declared_at = now(), has_conflict = true,
        revoked_at = now(), revoke_reason = 'Conflict of interest declared by the reviewer'
    where id = v_a.id;

    perform private.write_audit('assignment.conflict_declared', 'assignment', v_a.id::text, v_p.id,
      jsonb_build_object('reviewer_id', v_a.reviewer_id), private.acting_role('scorecard.submit'));
    for v_admin in
      select distinct ur.user_id from public.user_roles ur
      join public.role_permissions rp on rp.role_key = ur.role_key
      where ur.revoked_at is null and rp.permission = 'case.assign'
    loop
      perform private.notify(v_admin.user_id, v_p.id, 'assignment.conflict', 'Reviewer declared a conflict',
        format('A reviewer on %s declared a conflict of interest. Assign another reviewer.', v_p.reference));
    end loop;
    return jsonb_build_object('assignment_id', v_a.id, 'has_conflict', true, 'revoked', true, 'replayed', false);
  end if;

  if not coalesce(p_confidentiality_accepted, false) then
    perform private.raise_error('VALIDATION', 'Accept the confidentiality declaration to open the case.',
      jsonb_build_object('fields', jsonb_build_object('confidentiality', 'Required')));
  end if;

  update public.assignments
  set declared_at = now(), has_conflict = false, confidentiality_accepted_at = now()
  where id = v_a.id;

  perform private.write_audit('assignment.declared', 'assignment', v_a.id::text, v_p.id,
    jsonb_build_object('has_conflict', false), private.acting_role('scorecard.submit'));
  return jsonb_build_object('assignment_id', v_a.id, 'has_conflict', false, 'revoked', false, 'replayed', false);
end;
$$;

-- -----------------------------------------------------------------------------
-- REV-03: save_scorecard / submit_scorecard
-- p_items: [{ "criterion_id": uuid, "score": 1–5 | null, "reason": text }]
-- -----------------------------------------------------------------------------

create or replace function private.write_scorecard(p_a public.assignments, p_items jsonb, p_overall_comment text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p       public.proposals%rowtype;
  v_rubric  uuid;
  v_card    public.scorecards%rowtype;
  v_item    jsonb;
  v_crit    public.rubric_criteria%rowtype;
  v_score   integer;
  v_errors  jsonb := '{}'::jsonb;
begin
  if p_a.declared_at is null or p_a.has_conflict then
    perform private.raise_error('FORBIDDEN', 'Complete the declaration before scoring.');
  end if;

  select * into v_p from public.proposals p where p.id = p_a.proposal_id for update;
  if v_p.status <> 'in_evaluation' then
    perform private.raise_error('INVALID_STATE', 'Scoring is closed for this case.',
      jsonb_build_object('actual', v_p.status));
  end if;
  select cv.rubric_version_id into v_rubric from public.challenge_versions cv where cv.id = v_p.challenge_version_id;

  select * into v_card from public.scorecards s
  where s.assignment_id = p_a.id and s.version_id = v_p.current_version_id;
  if v_card.status = 'submitted' then
    perform private.raise_error('INVALID_STATE', 'You have already submitted your scores for this version.');
  end if;

  if p_overall_comment is not null and char_length(p_overall_comment) > 4000 then
    v_errors := v_errors || jsonb_build_object('overall_comment', 'Use 4,000 characters or fewer');
  end if;

  if p_items is not null then
    if jsonb_typeof(p_items) <> 'array' then
      perform private.raise_error('VALIDATION', 'Scores must be a list.');
    end if;
    if (select count(*) from jsonb_array_elements(p_items) e)
       <> (select count(distinct e ->> 'criterion_id') from jsonb_array_elements(p_items) e) then
      perform private.raise_error('VALIDATION', 'Each criterion can be scored once.');
    end if;
    for v_item in select * from jsonb_array_elements(p_items) loop
      select * into v_crit from public.rubric_criteria c
      where c.id = private.uuid_or_null(v_item ->> 'criterion_id') and c.rubric_version_id = v_rubric;
      if v_crit.id is null then
        perform private.raise_error('VALIDATION', 'A score refers to a criterion that is not in this rubric.');
      end if;
      if jsonb_typeof(v_item -> 'score') not in ('null', 'number') and v_item ? 'score' then
        v_errors := v_errors || jsonb_build_object(v_crit.key, 'Choose a score from 1 to 5');
        continue;
      end if;
      v_score := (v_item ->> 'score')::numeric::integer;
      if v_score is not null and ((v_item ->> 'score')::numeric <> v_score or v_score not between 1 and 5) then
        v_errors := v_errors || jsonb_build_object(v_crit.key, 'Choose a score from 1 to 5');
      elsif char_length(coalesce(v_item ->> 'reason', '')) > 4000 then
        v_errors := v_errors || jsonb_build_object(v_crit.key, 'Use 4,000 characters or fewer');
      end if;
    end loop;
  end if;
  if v_errors <> '{}'::jsonb then
    perform private.raise_error('VALIDATION', 'Some scores need attention.', jsonb_build_object('fields', v_errors));
  end if;

  if v_card.id is null then
    insert into public.scorecards (assignment_id, version_id, rubric_version_id, overall_comment)
    values (p_a.id, v_p.current_version_id, v_rubric, coalesce(p_overall_comment, ''))
    returning * into v_card;
    perform private.write_audit('scorecard.started', 'scorecard', v_card.id::text, v_p.id,
      jsonb_build_object('version_id', v_p.current_version_id), private.acting_role('scorecard.submit'));
  elsif p_overall_comment is not null then
    update public.scorecards set overall_comment = p_overall_comment where id = v_card.id;
  end if;

  if p_items is not null then
    delete from public.scorecard_items where scorecard_id = v_card.id;
    insert into public.scorecard_items (scorecard_id, criterion_id, score, reason)
    select v_card.id, (e ->> 'criterion_id')::uuid, (e ->> 'score')::numeric::smallint, coalesce(e ->> 'reason', '')
    from jsonb_array_elements(p_items) e;
  end if;

  return v_card.id;
end;
$$;

create or replace function public.save_scorecard(
  p_assignment_id uuid,
  p_items jsonb default null,
  p_overall_comment text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  v_id := private.write_scorecard(private.my_active_assignment(p_assignment_id), p_items, p_overall_comment);
  return jsonb_build_object('scorecard_id', v_id, 'status', 'draft', 'saved_at', now(),
                            'weighted_score', private.weighted_score(v_id));
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
  if v_errors <> '{}'::jsonb then
    perform private.raise_error('VALIDATION', 'Score every criterion and give a reason for each. Your scores are saved.',
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
-- REV-03: panel view (adjudicator/admin; a reviewer only after submitting own)
-- -----------------------------------------------------------------------------

create or replace function public.get_score_panel(p_proposal_id uuid, p_version_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_p       public.proposals%rowtype;
  v_version uuid;
  v_rubric  uuid;
  v_cards   jsonb;
  v_crit    jsonb;
  v_agg     jsonb;
  v_rub     jsonb;
begin
  select * into v_p from public.proposals p where p.id = p_proposal_id and p.deleted_at is null;
  v_version := coalesce(p_version_id, v_p.current_version_id);

  if v_p.id is null or v_p.status = 'draft' or not (
       (private.has_permission('scorecard.read_panel') and private.can_read_case(v_p.id))
       or (private.is_cleared_reviewer(v_p.id) and exists (
             select 1 from public.scorecards s join public.assignments a on a.id = s.assignment_id
             where a.proposal_id = v_p.id and a.reviewer_id = auth.uid() and a.revoked_at is null
               and s.version_id = v_version and s.status = 'submitted'))) then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  if not exists (select 1 from public.proposal_versions v where v.id = v_version and v.proposal_id = v_p.id) then
    perform private.raise_error('VALIDATION', 'Unknown version for this case.');
  end if;

  select cv.rubric_version_id into v_rubric from public.challenge_versions cv where cv.id = v_p.challenge_version_id;

  select coalesce(jsonb_agg(jsonb_build_object('criterion_id', c.id, 'key', c.key, 'label', c.label,
                                               'weight', c.weight, 'anchors', c.anchors) order by c.position), '[]'::jsonb)
  into v_rub from public.rubric_criteria c where c.rubric_version_id = v_rubric;

  with cards as (
    select s.id, s.assignment_id, a.reviewer_id, pr.full_name, s.submitted_at, s.overall_comment
    from public.scorecards s
    join public.assignments a on a.id = s.assignment_id
    join public.profiles pr on pr.id = a.reviewer_id
    where a.proposal_id = v_p.id and a.revoked_at is null and s.version_id = v_version and s.status = 'submitted'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'scorecard_id', cards.id, 'assignment_id', cards.assignment_id, 'reviewer_id', cards.reviewer_id,
           'reviewer_name', cards.full_name, 'submitted_at', cards.submitted_at,
           'overall_comment', cards.overall_comment, 'weighted_score', private.weighted_score(cards.id),
           'items', (select jsonb_agg(jsonb_build_object('criterion_id', i.criterion_id, 'score', i.score, 'reason', i.reason))
                     from public.scorecard_items i where i.scorecard_id = cards.id))
         order by cards.submitted_at), '[]'::jsonb)
  into v_cards from cards;

  -- Per-criterion mean, range and spread (flag at >= 2 points, BCR-001 B7).
  select coalesce(jsonb_agg(e), '[]'::jsonb) into v_crit
  from (
    select jsonb_build_object('criterion_id', c.id, 'key', c.key,
             'mean', round(avg(i.score), 2), 'min', min(i.score), 'max', max(i.score),
             'spread', max(i.score) - min(i.score), 'flagged', coalesce(max(i.score) - min(i.score) >= 2, false)) e
    from public.rubric_criteria c
    left join (
      select i.criterion_id, i.score
      from public.scorecards s
      join public.assignments a on a.id = s.assignment_id
      join public.scorecard_items i on i.scorecard_id = s.id
      where a.proposal_id = v_p.id and a.revoked_at is null and s.version_id = v_version and s.status = 'submitted'
    ) i on i.criterion_id = c.id
    where c.rubric_version_id = v_rubric
    group by c.id, c.key, c.position
    order by c.position
  ) rows;

  select jsonb_build_object(
           'mean_weighted', round(avg(w), 2), 'min_weighted', min(w), 'max_weighted', max(w),
           'spread', max(w) - min(w),
           'flagged', coalesce(max(w) - min(w) >= 2, false)
                      or exists (select 1 from jsonb_array_elements(v_crit) e where (e ->> 'flagged')::boolean))
  into v_agg
  from (select (e ->> 'weighted_score')::numeric as w from jsonb_array_elements(v_cards) e) x;

  return jsonb_build_object(
    'proposal_id', v_p.id, 'reference', v_p.reference, 'version_id', v_version,
    'version_no', (select v.version_no from public.proposal_versions v where v.id = v_version),
    'rubric_version_id', v_rubric, 'criteria', v_rub, 'scorecards', v_cards,
    'criteria_summary', v_crit, 'aggregate', v_agg,
    'submitted_count', jsonb_array_length(v_cards), 'quorum', private.review_quorum(),
    'spread_flag_threshold', 2);
end;
$$;

-- -----------------------------------------------------------------------------
-- T07 reviewer queue. Before declaring, a reviewer sees what they need to judge
-- a conflict (reference, title, challenge, organisation), never the proposal.
-- -----------------------------------------------------------------------------

create or replace function public.my_review_queue()
returns table (
  assignment_id uuid, proposal_id uuid, reference text, title text, challenge_title text,
  applicant_organisation text, version_no integer, due_at timestamptz, case_status text, my_status text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('scorecard.submit') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  return query
    select a.id, p.id, p.reference, p.title, c.title, pr.organisation, v.version_no, a.due_at, p.status,
           case
             when a.declared_at is null then 'declaration_needed'
             when s.status = 'submitted' then 'submitted'
             when s.id is not null then 'in_progress'
             else 'not_started'
           end
    from public.assignments a
    join public.proposals p on p.id = a.proposal_id
    join public.proposal_versions v on v.id = p.current_version_id
    join public.challenge_versions cv on cv.id = p.challenge_version_id
    join public.challenges c on c.id = cv.challenge_id
    join public.profiles pr on pr.id = p.applicant_id
    left join public.scorecards s on s.assignment_id = a.id and s.version_id = p.current_version_id
    where a.reviewer_id = auth.uid() and a.revoked_at is null and p.deleted_at is null
    order by a.due_at nulls last, p.reference;
end;
$$;

-- -----------------------------------------------------------------------------
-- NTF-01: notifications read state + Realtime
-- -----------------------------------------------------------------------------

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    perform private.raise_error('FORBIDDEN', 'Sign in first.');
  end if;
  update public.notifications n set read_at = now()
  where n.user_id = auth.uid() and n.read_at is null and (p_ids is null or n.id = any (p_ids));
  get diagnostics v_count = row_count;
  return jsonb_build_object('updated', v_count);
end;
$$;

-- Realtime "postgres_changes" respects the SELECT policies above, so a
-- subscriber only receives rows they could read. Both tables are append-only
-- or own-row, so delete events (which bypass RLS) never carry case data.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications, public.case_events;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

revoke all on function
  public.declare_assignment(uuid, boolean, boolean),
  public.save_scorecard(uuid, jsonb, text),
  public.submit_scorecard(uuid, jsonb, text),
  public.get_score_panel(uuid, uuid),
  public.my_review_queue(),
  public.mark_notifications_read(uuid[])
from public, anon;

grant execute on function
  public.declare_assignment(uuid, boolean, boolean),
  public.save_scorecard(uuid, jsonb, text),
  public.submit_scorecard(uuid, jsonb, text),
  public.get_score_panel(uuid, uuid),
  public.my_review_queue(),
  public.mark_notifications_read(uuid[])
to authenticated;

revoke all on function
  private.my_active_assignment(uuid), private.weighted_score(uuid), private.review_quorum(),
  private.submitted_count(uuid, uuid), private.write_scorecard(public.assignments, jsonb, text)
from public;
