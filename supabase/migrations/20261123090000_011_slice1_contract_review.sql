-- 011: Slice 1 contract review (frontend review of PR #16).
--
-- 1. An unverified email on submit_proposal now returns VALIDATION with
--    fields.email instead of FORBIDDEN. FORBIDDEN means "no access or does not
--    exist" to the UI, so the applicant could not be told to verify their email.
--    Same shape as the consent check. Only that one statement changes; the rest
--    of the function is copied unchanged from 002 (create or replace keeps grants).
-- 2. An applicant can still read the challenge row their own case belongs to
--    after the challenge is unpublished, so the draft or case page can show the
--    challenge title with a "no longer open" banner (ADM-02). Closed challenges
--    were already readable; challenge_versions already had the same owner rule.
--    The check runs in a security-definer helper: a plain subquery would read
--    challenge_versions, whose policy reads challenges again (infinite recursion).
--    Like the other policy helpers (010), it is callable by anon and signed-in
--    users; for anon, auth.uid() is null and it returns false.

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
    perform private.raise_error('VALIDATION', 'Verify your email address before submitting. Your draft is saved.',
      jsonb_build_object('fields', jsonb_build_object('email', 'Verify your email address')));
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

create or replace function private.owns_case_in_challenge(p_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.proposals p
    join public.challenge_versions cv on cv.id = p.challenge_version_id
    where cv.challenge_id = p_challenge_id and p.applicant_id = auth.uid() and p.deleted_at is null
  );
$$;
revoke all on function private.owns_case_in_challenge(uuid) from public;
grant execute on function private.owns_case_in_challenge(uuid) to anon, authenticated;

drop policy challenges_read on public.challenges;
create policy challenges_read on public.challenges for select to anon, authenticated
  using (
    status in ('published','closed')
    or (select private.has_permission('config.manage'))
    -- an applicant keeps seeing the challenge their own case belongs to (ADM-02)
    or (select private.owns_case_in_challenge(id))
  );
