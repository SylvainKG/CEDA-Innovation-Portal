-- =============================================================================
-- Migration 006 — Slice 5: decide, publish, award, close
-- DEC-01 (record + publish; invisible until published), DEC-02 (award after
-- approval, a separate event), D-05 (award by Administrator). N4, N5, N6.
-- Contract: docs/blueprint/03-api-contracts-and-permissions.md §4.5
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DEC-01: record_decision (draft; the case stays in_adjudication)
-- -----------------------------------------------------------------------------

create or replace function public.record_decision(p_proposal_id uuid, p_outcome text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p      public.proposals%rowtype;
  v_reason text;
  v_prev   public.decisions%rowtype;
  v_id     uuid;
begin
  if not private.has_permission('decision.record') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  select * into v_p from public.proposals p where p.id = p_proposal_id and p.deleted_at is null for update;
  if v_p.id is null or v_p.status = 'draft' or not private.can_read_case(v_p.id) then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  if p_outcome is null or p_outcome not in ('approved', 'not_approved') then
    perform private.raise_error('VALIDATION', 'Choose Approved or Not approved.',
      jsonb_build_object('fields', jsonb_build_object('outcome', 'Choose Approved or Not approved')));
  end if;
  v_reason := private.require_text(p_reason, 'reason', 1, 4000, 'Give a reason (up to 4,000 characters).');
  if v_p.status <> 'in_adjudication' then
    perform private.raise_error('INVALID_STATE', 'A decision can be recorded only when the case is ready for decision.',
      jsonb_build_object('actual', v_p.status));
  end if;

  -- Re-recording before publication supersedes the earlier draft; history is kept.
  select * into v_prev from public.decisions d
  where d.proposal_id = v_p.id and d.superseded_at is null for update;
  if v_prev.published_at is not null then
    perform private.raise_error('INVALID_STATE', 'The decision has already been published.');
  end if;
  if v_prev.id is not null then
    update public.decisions set superseded_at = now() where id = v_prev.id;
  end if;

  insert into public.decisions (proposal_id, version_id, outcome, reason, recorded_by)
  values (v_p.id, v_p.current_version_id, p_outcome, v_reason, auth.uid())
  returning id into v_id;

  -- The outcome is recorded for auditors only; the applicant is not notified (DEC-01).
  perform private.write_audit('decision.recorded', 'decision', v_id::text, v_p.id,
    jsonb_build_object('outcome', p_outcome, 'supersedes', v_prev.id), private.acting_role('decision.record'));

  return jsonb_build_object('decision_id', v_id, 'outcome', p_outcome, 'published', false,
                            'supersedes', v_prev.id, 'case_status', v_p.status);
end;
$$;

-- -----------------------------------------------------------------------------
-- DEC-01: publish_decision
-- -----------------------------------------------------------------------------

create or replace function public.publish_decision(p_decision_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_d   public.decisions%rowtype;
  v_p   public.proposals%rowtype;
  v_now timestamptz := now();
begin
  if not private.has_permission('decision.publish') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  select * into v_d from public.decisions d where d.id = p_decision_id for update;
  if v_d.id is null or not private.can_read_case(v_d.proposal_id) then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  select * into v_p from public.proposals p where p.id = v_d.proposal_id for update;

  if v_d.published_at is not null or v_d.superseded_at is not null then
    perform private.raise_error('INVALID_STATE', 'This decision has already been published or replaced.');
  end if;
  if v_d.version_id is distinct from v_p.current_version_id then
    perform private.raise_error('INVALID_STATE',
      'This decision was recorded on an earlier version. Record a new decision for the current version.');
  end if;

  update public.decisions set published_at = v_now, published_by = auth.uid() where id = v_d.id;
  -- Two publishers racing: the second finds the case no longer in_adjudication.
  perform private.transition_case(v_p.id, array['in_adjudication'], v_d.outcome, 'Decision published');

  perform private.write_audit('decision.published', 'decision', v_d.id::text, v_p.id,
    jsonb_build_object('outcome', v_d.outcome), private.acting_role('decision.publish'));
  perform private.notify(v_p.applicant_id, v_p.id, 'decision.published',
    case v_d.outcome when 'approved' then 'Your idea was approved' else 'Decision on your idea' end,
    format('A decision on %s has been published. Open your idea to read it.', v_p.reference),
    'decision_published', jsonb_build_object('reference', v_p.reference));

  return jsonb_build_object('decision_id', v_d.id, 'outcome', v_d.outcome, 'published_at', v_now,
                            'case_status', v_d.outcome);
end;
$$;

-- -----------------------------------------------------------------------------
-- DEC-02 / D-05: record_award (separate event after approval)
-- -----------------------------------------------------------------------------

create or replace function public.record_award(p_proposal_id uuid, p_amount_minor bigint, p_description text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p     public.proposals%rowtype;
  v_d     public.decisions%rowtype;
  v_aw    public.awards%rowtype;
  v_desc  text;
begin
  if not private.has_permission('award.record') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  select * into v_p from public.proposals p where p.id = p_proposal_id and p.deleted_at is null for update;
  if v_p.id is null or v_p.status = 'draft' or not private.can_read_case(v_p.id) then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;

  -- Retry of the same award returns it; a different award is refused.
  select * into v_aw from public.awards a where a.proposal_id = v_p.id;
  if v_aw.id is not null then
    if v_aw.amount_minor = p_amount_minor and v_aw.description = btrim(coalesce(p_description, '')) then
      return jsonb_build_object('award_id', v_aw.id, 'amount_minor', v_aw.amount_minor, 'currency', v_aw.currency,
                                'case_status', v_p.status, 'replayed', true);
    end if;
    perform private.raise_error('INVALID_STATE', 'An award has already been recorded for this case.');
  end if;

  if v_p.status <> 'approved' then
    perform private.raise_error('CASE_NOT_APPROVED', 'An award can be recorded only after an approval is published.',
      jsonb_build_object('actual', v_p.status));
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 10000000000 then
    perform private.raise_error('VALIDATION', 'Enter an amount between BWP 0.01 and BWP 100,000,000.',
      jsonb_build_object('fields', jsonb_build_object('amount_minor', 'Enter a positive amount in thebe')));
  end if;
  v_desc := private.require_text(p_description, 'description', 1, 1000, 'Describe the award (up to 1,000 characters).');

  select * into v_d from public.decisions d
  where d.proposal_id = v_p.id and d.superseded_at is null and d.published_at is not null and d.outcome = 'approved';

  insert into public.awards (proposal_id, decision_id, amount_minor, currency, description, recorded_by)
  values (v_p.id, v_d.id, p_amount_minor, 'BWP', v_desc, auth.uid())
  returning * into v_aw;

  perform private.transition_case(v_p.id, array['approved'], 'awarded', 'Award recorded');
  perform private.write_audit('award.recorded', 'award', v_aw.id::text, v_p.id,
    jsonb_build_object('amount_minor', p_amount_minor, 'currency', 'BWP'), private.acting_role('award.record'));
  perform private.notify(v_p.applicant_id, v_p.id, 'award.recorded', 'Award recorded',
    format('An award has been recorded for %s. Open your idea for details.', v_p.reference),
    'award_recorded', jsonb_build_object('reference', v_p.reference));

  return jsonb_build_object('award_id', v_aw.id, 'amount_minor', v_aw.amount_minor, 'currency', 'BWP',
                            'case_status', 'awarded', 'replayed', false);
end;
$$;

-- -----------------------------------------------------------------------------
-- close_case (screening officer, adjudicator)
-- -----------------------------------------------------------------------------

create or replace function public.close_case(p_proposal_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p       public.proposals%rowtype;
  v_reason  text;
  v_expired integer;
begin
  if not private.has_permission('case.close') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  select * into v_p from public.proposals p where p.id = p_proposal_id and p.deleted_at is null;
  if v_p.id is null or v_p.status = 'draft' or not private.can_read_case(v_p.id) then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  v_reason := private.require_text(p_reason, 'reason', 1, 500, 'Give a reason (up to 500 characters).');

  -- approved/awarded cases are not closed here: an approval stands once published.
  perform private.transition_case(v_p.id,
    array['submitted', 'in_evaluation', 'action_required', 'in_adjudication', 'not_approved'],
    'closed', v_reason, v_reason);

  update public.feedback_requests set status = 'expired' where proposal_id = v_p.id and status = 'open';
  get diagnostics v_expired = row_count;

  perform private.write_audit('case.closed', 'proposal', v_p.id::text, v_p.id,
    jsonb_build_object('from_status', v_p.status, 'expired_requests', v_expired), private.acting_role('case.close'));
  perform private.notify(v_p.applicant_id, v_p.id, 'case.closed', 'Your idea was closed',
    format('%s has been closed. Open your idea to see the reason.', v_p.reference),
    'case_closed', jsonb_build_object('reference', v_p.reference));

  return jsonb_build_object('proposal_id', v_p.id, 'case_status', 'closed', 'expired_requests', v_expired);
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

revoke all on function
  public.record_decision(uuid, text, text),
  public.publish_decision(uuid),
  public.record_award(uuid, bigint, text),
  public.close_case(uuid, text)
from public, anon;

grant execute on function
  public.record_decision(uuid, text, text),
  public.publish_decision(uuid),
  public.record_award(uuid, bigint, text),
  public.close_case(uuid, text)
to authenticated;
