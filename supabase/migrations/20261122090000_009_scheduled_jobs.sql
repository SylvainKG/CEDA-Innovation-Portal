-- =============================================================================
-- Migration 009 — scheduled maintenance
-- REV-04: overdue feedback requests become `expired` and the requester is told;
--         staff can reopen one with a new deadline.
-- CHT-03: unanswered chats are swept to `missed` even when nobody opens chat.
-- NTF-02: the email relay is triggered on a schedule (pg_net), using a URL and
--         secret stored in Supabase Vault, never in the repository.
-- pg_cron / pg_net / Vault exist on Supabase (hosted and local); where they do
-- not (PGlite stand-in), the schedules are skipped and the functions stay callable.
-- Contract: docs/blueprint/03-api-contracts-and-permissions.md §4.8
-- =============================================================================

-- -----------------------------------------------------------------------------
-- REV-04: expiry and extension
-- -----------------------------------------------------------------------------

create or replace function private.expire_overdue_requests()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r     record;
  v_count integer := 0;
begin
  for v_r in
    update public.feedback_requests r
    set status = 'expired'
    where r.status = 'open' and r.due_at < now()
    returning r.id, r.proposal_id, r.requested_by, r.kind
  loop
    v_count := v_count + 1;
    insert into public.audit_events (actor_id, actor_role, action, target_type, target_id, proposal_id, metadata)
    values (null, 'system', 'feedback.expired', 'feedback_request', v_r.id::text, v_r.proposal_id,
            jsonb_build_object('kind', v_r.kind));
    perform private.notify(v_r.requested_by, v_r.proposal_id, 'feedback.expired', 'Response deadline passed',
      format('%s: the applicant did not respond in time. Extend the deadline or close the case.',
             (select p.reference from public.proposals p where p.id = v_r.proposal_id)));
  end loop;
  return v_count;
end;
$$;

-- Reopens an expired (or still open) request with a new deadline. The case stays
-- waiting on the applicant; the applicant is told.
create or replace function public.extend_feedback_deadline(p_feedback_request_id uuid, p_due_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r public.feedback_requests%rowtype;
  v_p public.proposals%rowtype;
begin
  if not private.has_permission('case.request_feedback') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  select * into v_r from public.feedback_requests r where r.id = p_feedback_request_id for update;
  select * into v_p from public.proposals p where p.id = v_r.proposal_id;
  if v_r.id is null or not ((private.has_permission('case.read_all') and private.can_read_case(v_p.id))
                            or private.is_cleared_reviewer(v_p.id)) then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  if v_r.status not in ('open', 'expired') or v_p.status <> 'action_required' then
    perform private.raise_error('INVALID_STATE', 'This request has been answered or the case has moved on.');
  end if;
  if p_due_at is null or p_due_at <= now() then
    perform private.raise_error('VALIDATION', 'The new deadline must be in the future.',
      jsonb_build_object('fields', jsonb_build_object('due_at', 'Must be in the future')));
  end if;

  update public.feedback_requests set status = 'open', due_at = p_due_at where id = v_r.id;
  perform private.write_audit('feedback.deadline_extended', 'feedback_request', v_r.id::text, v_p.id,
    jsonb_build_object('due_at', p_due_at, 'was', v_r.status), private.acting_role('case.request_feedback'));
  perform private.notify(v_p.applicant_id, v_p.id, 'feedback.extended', 'New deadline',
    format('%s: please respond by %s.', v_p.reference, private.format_cat(p_due_at)),
    'feedback_requested', jsonb_build_object('reference', v_p.reference, 'kind', v_r.kind, 'due_at', p_due_at));
  return jsonb_build_object('feedback_request_id', v_r.id, 'status', 'open', 'due_at', p_due_at);
end;
$$;

-- -----------------------------------------------------------------------------
-- NTF-02: trigger the email relay from the database
-- Vault secrets (set once per environment, never committed):
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/email-relay', 'email_relay_url');
--   select vault.create_secret('<RELAY_SECRET>', 'email_relay_secret');
--   select vault.create_secret('<anon key>', 'email_relay_anon_key');
-- -----------------------------------------------------------------------------

create or replace function private.trigger_email_relay()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
  v_anon   text;
  v_id     bigint;
begin
  if to_regclass('vault.decrypted_secrets') is null or to_regnamespace('net') is null then
    return 'not_available';
  end if;
  execute $q$select (select decrypted_secret from vault.decrypted_secrets where name = 'email_relay_url'),
                    (select decrypted_secret from vault.decrypted_secrets where name = 'email_relay_secret'),
                    (select decrypted_secret from vault.decrypted_secrets where name = 'email_relay_anon_key')$q$
    into v_url, v_secret, v_anon;
  if v_url is null or v_secret is null then
    return 'not_configured';
  end if;
  -- Only call when something is due, so an idle portal makes no requests.
  if not exists (select 1 from public.email_outbox o
                 where o.status in ('pending', 'retryable', 'unknown_outcome') and o.next_attempt_at <= now()) then
    return 'nothing_due';
  end if;
  execute $q$select net.http_post(url := $1, body := '{}'::jsonb,
                                  headers := jsonb_build_object('Content-Type', 'application/json',
                                                                'x-relay-secret', $2,
                                                                'Authorization', 'Bearer ' || coalesce($3, '')),
                                  timeout_milliseconds := 30000)$q$
    into v_id using v_url, v_secret, v_anon;
  return 'requested';
end;
$$;

-- -----------------------------------------------------------------------------
-- One entry point for the scheduler (and for manual runs by an operator)
-- -----------------------------------------------------------------------------

create or replace function public.run_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired integer;
  v_missed  integer;
begin
  v_expired := private.expire_overdue_requests();
  with swept as (
    update public.chat_sessions
    set status = 'missed', closed_at = now()
    where status = 'queued' and (queued_at < now() - interval '30 minutes' or not private.chat_is_open())
    returning 1)
  select count(*) into v_missed from swept;
  return jsonb_build_object('ran_at', now(), 'expired_requests', v_expired, 'missed_chats', v_missed);
end;
$$;

revoke all on function public.run_maintenance(), public.extend_feedback_deadline(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.run_maintenance() to service_role;
grant execute on function public.extend_feedback_deadline(uuid, timestamptz) to authenticated;
revoke all on function private.expire_overdue_requests(), private.trigger_email_relay() from public;

-- -----------------------------------------------------------------------------
-- Schedules (only where pg_cron and pg_net are available)
-- -----------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron with schema pg_catalog;
    create extension if not exists pg_net with schema extensions;
    perform cron.schedule('ceda-maintenance', '*/10 * * * *', 'select public.run_maintenance()');
    perform cron.schedule('ceda-email-relay', '*/2 * * * *', 'select private.trigger_email_relay()');
  else
    raise notice 'pg_cron or pg_net not available: schedules skipped (run public.run_maintenance() manually)';
  end if;
end $$;
