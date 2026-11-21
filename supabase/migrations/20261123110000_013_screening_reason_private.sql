-- 013: an eligible screening reason stays with staff (found in the review of PR #38).
--
-- record_screening wrote the screener's free-text reason into case_events.reason
-- for both results. The applicant can read their own case history (RLS:
-- case_events_read via can_read_case), so a reason such as "eligible, but the
-- budget looks thin" would have reached the applicant. The contract only promises
-- the applicant a reason when a case is closed (ineligible screening, close_case).
--
-- Now: eligible -> the case event says "Screened: eligible" and the reason becomes
-- an internal note (readable by staff with case.note, never by the applicant);
-- ineligible -> unchanged (reason in the case event and closed_reason).
-- No existing rows need cleaning: on 17 Nov 2026 the hosted project had no
-- eligible screening event with a reason. The rest of the function is copied
-- unchanged from 003; create or replace keeps its grants.

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
  v_note   uuid;
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
  -- The case history (case_events) is readable by the applicant, so it carries the
  -- free-text reason only when the applicant is meant to see it (ineligible: the
  -- case closes with that reason). An eligible screener's reason is staff-only and
  -- goes into the case's internal notes instead.
  perform private.transition_case(v_p.id, array['submitted'], v_to,
    case when v_to = 'closed' then v_reason else 'Screened: eligible' end,
    case when v_to = 'closed' then 'Ineligible: ' || v_reason end);

  if v_to = 'in_evaluation' then
    insert into public.internal_notes (proposal_id, author_id, body)
    values (v_p.id, auth.uid(), 'Screening (eligible): ' || v_reason)
    returning id into v_note;
  end if;

  -- One action, one audit row: the note's id is recorded with the screening (never its text).
  perform private.write_audit('case.screened', 'proposal', v_p.id::text, v_p.id,
    jsonb_build_object('result', p_result, 'reference', v_p.reference)
      || case when v_note is not null then jsonb_build_object('note_id', v_note) else '{}'::jsonb end,
    private.acting_role('case.screen'));

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
