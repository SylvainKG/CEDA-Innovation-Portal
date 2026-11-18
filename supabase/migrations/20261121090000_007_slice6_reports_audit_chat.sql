-- =============================================================================
-- Migration 007 — Slice 6a: reports, audit query, chat
-- RPT-01 (participation, outcomes, time-in-stage, impact; CSV rows), SEC-03
-- (audit viewer), CHT-01 (live chat), CHT-02 (09:00–16:00 Gaborone, working
-- days, demo override), CHT-03 (chat statistics). D-13: registered users only.
-- Contract: docs/blueprint/03-api-contracts-and-permissions.md §4.6
-- =============================================================================

-- -----------------------------------------------------------------------------
-- RPT-01: programme report (aggregates in SQL, never in the browser)
-- Period filter applies to the submission time. Figures come from case_events.
-- -----------------------------------------------------------------------------

create or replace function private.report_cases(p_challenge_id uuid, p_from timestamptz, p_to timestamptz)
returns table (id uuid, applicant_id uuid, status text, challenge_id uuid, challenge_title text, submitted_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.applicant_id, p.status, c.id, c.title, p.submitted_at
  from public.proposals p
  join public.challenge_versions cv on cv.id = p.challenge_version_id
  join public.challenges c on c.id = cv.challenge_id
  where p.status <> 'draft' and p.deleted_at is null
    and (p_challenge_id is null or c.id = p_challenge_id)
    and (p_from is null or p.submitted_at >= p_from)
    and (p_to is null or p.submitted_at < p_to);
$$;

create or replace function public.get_programme_report(
  p_challenge_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_out jsonb;
begin
  if not private.has_permission('report.read') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  if p_from is not null and p_to is not null and p_from >= p_to then
    perform private.raise_error('VALIDATION', 'The period must end after it starts.',
      jsonb_build_object('fields', jsonb_build_object('to', 'Must be after the start')));
  end if;

  with rc as materialized (select * from private.report_cases(p_challenge_id, p_from, p_to)),
       tot as (select count(*)::integer as n from rc)
  select jsonb_build_object(
    'filters', jsonb_build_object('challenge_id', p_challenge_id, 'from', p_from, 'to', p_to),
    'generated_at', now(),
    'participation', jsonb_build_object(
      'submitted', tot.n,
      'distinct_applicants', (select count(distinct applicant_id) from rc),
      'drafts_started', (select count(*) from public.proposals p
                         join public.challenge_versions cv on cv.id = p.challenge_version_id
                         where p.deleted_at is null
                           and (p_challenge_id is null or cv.challenge_id = p_challenge_id)
                           and (p_from is null or p.created_at >= p_from)
                           and (p_to is null or p.created_at < p_to)),
      'by_challenge', coalesce((select jsonb_agg(jsonb_build_object('challenge_id', challenge_id, 'title', challenge_title,
                                                                    'submitted', n) order by n desc)
                                from (select challenge_id, challenge_title, count(*) n from rc group by 1, 2) x), '[]'::jsonb)),
    'outcomes', jsonb_build_object(
      'by_current_stage', coalesce((select jsonb_object_agg(stage, n) from (
          select coalesce(private.public_stage(status), status) stage, count(*) n from rc group by 1) x), '{}'::jsonb),
      'approved', (select count(*) from rc where status in ('approved', 'awarded')),
      'not_approved', (select count(*) from rc where status = 'not_approved'
                         or (status = 'closed' and exists (select 1 from public.decisions d where d.proposal_id = rc.id
                               and d.published_at is not null and d.outcome = 'not_approved' and d.superseded_at is null))),
      'awarded', (select count(*) from rc where status = 'awarded'),
      'closed', (select count(*) from rc where status = 'closed'),
      'award_total_minor', (select coalesce(sum(a.amount_minor), 0) from public.awards a join rc on rc.id = a.proposal_id),
      'currency', 'BWP'),
    'funnel', (select jsonb_agg(jsonb_build_object('stage', s.stage, 'reached',
                 (select count(distinct e.proposal_id) from public.case_events e join rc on rc.id = e.proposal_id
                  where e.public_stage = s.stage)) order by s.ord)
               from (values (1, 'submission'), (2, 'review'), (3, 'feedback'), (4, 'approval'), (5, 'award')) s(ord, stage)),
    'time_in_stage', coalesce((
      select jsonb_agg(jsonb_build_object('status', to_status, 'cases', n, 'median_days', median_days) order by to_status)
      from (
        select to_status, count(*) n,
               round((percentile_cont(0.5) within group (order by days))::numeric, 1) median_days
        from (
          select e.to_status,
                 extract(epoch from (coalesce(lead(e.at) over (partition by e.proposal_id order by e.at, e.id), now()) - e.at)) / 86400.0 days
          from public.case_events e join rc on rc.id = e.proposal_id
        ) d
        where to_status not in ('approved', 'not_approved', 'awarded', 'closed')
        group by to_status
      ) t), '[]'::jsonb),
    'overdue', jsonb_build_object(
      'feedback_requests', (select count(*) from public.feedback_requests r join rc on rc.id = r.proposal_id
                            where r.status = 'open' and r.due_at < now()),
      'reviews', (select count(*) from public.assignments a join rc on rc.id = a.proposal_id
                  join public.proposals p on p.id = a.proposal_id
                  where a.revoked_at is null and a.due_at < now() and p.status = 'in_evaluation'
                    and not exists (select 1 from public.scorecards s where s.assignment_id = a.id
                                    and s.version_id = p.current_version_id and s.status = 'submitted'))),
    'impact', jsonb_build_object(
      -- reached Review or any later stage
      'reached_later_stage', (select count(*) from rc where exists (
          select 1 from public.case_events e where e.proposal_id = rc.id and e.public_stage in ('review', 'feedback', 'approval', 'award'))),
      'reached_later_stage_share', case when tot.n = 0 then null else round((select count(*) from rc where exists (
          select 1 from public.case_events e where e.proposal_id = rc.id
            and e.public_stage in ('review', 'feedback', 'approval', 'award')))::numeric / tot.n, 2) end,
      'resubmitted_after_feedback', (select count(*) from rc where exists (
          select 1 from public.proposal_versions v where v.proposal_id = rc.id and v.version_no >= 2)),
      'roadmap_tasks_verified_share', (select case when count(*) = 0 then null
                                              else round(count(*) filter (where tv.result = 'verified')::numeric / count(*), 2) end
                                       from public.task_verifications tv
                                       join public.assignments a on a.id = tv.assignment_id
                                       join rc on rc.id = a.proposal_id))
  )
  into v_out
  from tot;
  return v_out;
end;
$$;

-- One row per case for the CSV export (reference, not proposal content).
create or replace function public.report_case_rows(
  p_challenge_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null)
returns table (reference text, challenge_title text, public_stage text, status text, submitted_at timestamptz,
               versions integer, last_update timestamptz, days_in_current_stage numeric,
               published_outcome text, award_minor bigint, currency text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('report.read') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  return query
    select p.reference, rc.challenge_title, coalesce(private.public_stage(p.status), p.status), p.status, p.submitted_at,
           (select count(*)::integer from public.proposal_versions v where v.proposal_id = p.id),
           (select max(e.at) from public.case_events e where e.proposal_id = p.id),
           round((extract(epoch from now() - (select max(e.at) from public.case_events e where e.proposal_id = p.id)) / 86400.0)::numeric, 1),
           (select d.outcome from public.decisions d where d.proposal_id = p.id and d.published_at is not null and d.superseded_at is null),
           (select a.amount_minor from public.awards a where a.proposal_id = p.id),
           'BWP'::text
    from private.report_cases(p_challenge_id, p_from, p_to) rc
    join public.proposals p on p.id = rc.id
    order by p.reference;
end;
$$;

-- -----------------------------------------------------------------------------
-- SEC-03: audit query (admin, auditor). Keyset pagination: pass the last id seen.
-- -----------------------------------------------------------------------------

create or replace function public.query_audit(
  p_reference text default null,
  p_actor_id uuid default null,
  p_action text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 100,
  p_before_id bigint default null)
returns table (id bigint, at timestamptz, actor_id uuid, actor_name text, actor_role text, action text,
               target_type text, target_id text, reference text, metadata jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('audit.read') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  return query
    select a.id, a.at, a.actor_id, pr.full_name, a.actor_role, a.action, a.target_type, a.target_id, p.reference, a.metadata
    from public.audit_events a
    left join public.profiles pr on pr.id = a.actor_id
    left join public.proposals p on p.id = a.proposal_id
    where (p_reference is null or p.reference = upper(btrim(p_reference)))
      and (p_actor_id is null or a.actor_id = p_actor_id)
      -- prefix match; %, _ and \ in the filter are matched literally
      and (p_action is null or a.action like
             replace(replace(replace(btrim(p_action), '\', '\\'), '%', '\%'), '_', '\_') || '%')
      and (p_from is null or a.at >= p_from)
      and (p_to is null or a.at < p_to)
      and (p_before_id is null or a.id < p_before_id)
    order by a.id desc
    limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

-- -----------------------------------------------------------------------------
-- CHT-02: service hours in Africa/Gaborone (+ closures, + demo override)
-- -----------------------------------------------------------------------------

create or replace function private.chat_is_open_at(p_at timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.service_calendar s
    where s.weekday = extract(isodow from (p_at at time zone 'Africa/Gaborone'))::smallint
      and s.is_working
      and (p_at at time zone 'Africa/Gaborone')::time >= s.opens_at
      and (p_at at time zone 'Africa/Gaborone')::time < s.closes_at
  ) and not exists (
    select 1 from public.service_closures c where c.day = (p_at at time zone 'Africa/Gaborone')::date
  );
$$;

create or replace function private.chat_is_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case private.setting('chat_demo_override') #>> '{}'
           when 'open' then true
           when 'closed' then false
           else private.chat_is_open_at(now()) end;
$$;

-- Queued sessions nobody accepted within 30 minutes, or left waiting when the
-- service closed, become "missed" (counted in CHT-03).
create or replace function private.sweep_missed_chats()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.chat_sessions
  set status = 'missed', closed_at = now()
  where status = 'queued' and (queued_at < now() - interval '30 minutes' or not private.chat_is_open());
$$;

create or replace function public.chat_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'open', private.chat_is_open(),
    'mode', case private.setting('chat_demo_override') #>> '{}'
              when 'open' then 'demo_override_open' when 'closed' then 'demo_override_closed' else 'calendar' end,
    'timezone', 'Africa/Gaborone',
    'server_time_display', private.format_cat(now()),
    'hours', (select coalesce(jsonb_agg(jsonb_build_object('weekday', s.weekday, 'is_working', s.is_working,
                                                           'opens_at', to_char(s.opens_at, 'HH24:MI'),
                                                           'closes_at', to_char(s.closes_at, 'HH24:MI')) order by s.weekday), '[]'::jsonb)
              from public.service_calendar s));
$$;

-- -----------------------------------------------------------------------------
-- CHT-01: chat workflow
-- -----------------------------------------------------------------------------

create or replace function public.start_chat(p_message text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_body text;
  v_s    public.chat_sessions%rowtype;
begin
  if not private.has_permission('chat.start') then
    perform private.raise_error('FORBIDDEN', 'Sign in to chat with CEDA.');
  end if;
  v_body := private.require_text(p_message, 'message', 1, 2000, 'Write a message (up to 2,000 characters).');
  perform private.sweep_missed_chats();

  -- One open conversation per applicant: return it instead of opening another.
  select * into v_s from public.chat_sessions s
  where s.applicant_id = auth.uid() and s.status in ('queued', 'active')
  order by s.queued_at desc limit 1;
  if v_s.id is null then
    if not private.chat_is_open() then
      perform private.raise_error('INVALID_STATE',
        'Chat is open 09:00–16:00 CAT on working days. Try the FAQs, or come back during opening hours.',
        jsonb_build_object('reason', 'CHAT_CLOSED'));
    end if;
    insert into public.chat_sessions (applicant_id) values (auth.uid()) returning * into v_s;
  end if;

  insert into public.chat_messages (session_id, sender_id, body) values (v_s.id, auth.uid(), v_body);
  return jsonb_build_object('session_id', v_s.id, 'status', v_s.status, 'queued_at', v_s.queued_at);
end;
$$;

create or replace function public.send_chat_message(p_session_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s    public.chat_sessions%rowtype;
  v_body text;
  v_id   uuid;
begin
  select * into v_s from public.chat_sessions s where s.id = p_session_id;
  if v_s.id is null
     or not ((v_s.applicant_id = auth.uid() and private.has_permission('chat.start'))
             or (v_s.consultant_id = auth.uid() and private.has_permission('chat.handle'))) then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this conversation.');
  end if;
  if v_s.status not in ('queued', 'active') then
    perform private.raise_error('INVALID_STATE', 'This conversation has ended.');
  end if;
  v_body := private.require_text(p_body, 'body', 1, 2000, 'Write a message (up to 2,000 characters).');
  insert into public.chat_messages (session_id, sender_id, body) values (v_s.id, auth.uid(), v_body) returning id into v_id;
  return jsonb_build_object('message_id', v_id, 'session_id', v_s.id);
end;
$$;

create or replace function public.accept_chat(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.chat_sessions%rowtype;
begin
  if not private.has_permission('chat.handle') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this action.');
  end if;
  perform private.sweep_missed_chats();
  update public.chat_sessions s
  set status = 'active', consultant_id = auth.uid(), accepted_at = now()
  where s.id = p_session_id and s.status = 'queued'
  returning * into v_s;
  if v_s.id is null then
    perform private.raise_error('INVALID_STATE', 'Another consultant took this conversation, or it has ended.');
  end if;
  return jsonb_build_object('session_id', v_s.id, 'status', 'active', 'accepted_at', v_s.accepted_at);
end;
$$;

create or replace function public.close_chat(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.chat_sessions%rowtype;
begin
  select * into v_s from public.chat_sessions s where s.id = p_session_id for update;
  if v_s.id is null or not (v_s.applicant_id = auth.uid() or (v_s.consultant_id = auth.uid() and private.has_permission('chat.handle'))) then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this conversation.');
  end if;
  if v_s.status not in ('queued', 'active') then
    return jsonb_build_object('session_id', v_s.id, 'status', v_s.status, 'replayed', true);
  end if;
  update public.chat_sessions
  set status = case when v_s.status = 'queued' then 'missed' else 'closed' end, closed_at = now()
  where id = v_s.id
  returning * into v_s;
  return jsonb_build_object('session_id', v_s.id, 'status', v_s.status, 'replayed', false);
end;
$$;

-- Consultant inbox: the queue plus own active conversations (several at once).
create or replace function public.my_chat_inbox()
returns table (session_id uuid, status text, applicant_name text, queued_at timestamptz,
               waiting_seconds integer, last_message_at timestamptz, last_message text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('chat.handle') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  perform private.sweep_missed_chats();
  return query
    select s.id, s.status, pr.full_name, s.queued_at,
           case when s.status = 'queued' then extract(epoch from now() - s.queued_at)::integer end,
           m.created_at, left(m.body, 140)
    from public.chat_sessions s
    join public.profiles pr on pr.id = s.applicant_id
    left join lateral (select cm.created_at, cm.body from public.chat_messages cm
                       where cm.session_id = s.id and cm.deleted_at is null
                       order by cm.created_at desc limit 1) m on true
    where s.status = 'queued' or (s.status = 'active' and s.consultant_id = auth.uid())
    order by s.status desc, s.queued_at;
end;
$$;

-- -----------------------------------------------------------------------------
-- CHT-03: statistics (support lead)
-- -----------------------------------------------------------------------------

create or replace function public.chat_statistics(p_from timestamptz default null, p_to timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('chat.stats') then
    perform private.raise_error('FORBIDDEN', 'You don''t have access to this page.');
  end if;
  perform private.sweep_missed_chats();
  return (
    select jsonb_build_object(
      'filters', jsonb_build_object('from', p_from, 'to', p_to),
      'volume', count(*),
      'handled', count(*) filter (where s.accepted_at is not null),
      'missed', count(*) filter (where s.status = 'missed'),
      'waiting_now', count(*) filter (where s.status = 'queued'),
      'average_wait_seconds', round(avg(extract(epoch from s.accepted_at - s.queued_at)) filter (where s.accepted_at is not null)),
      'by_day', coalesce((
        select jsonb_agg(jsonb_build_object('day', d, 'volume', n, 'missed', m) order by d)
        from (select (s2.queued_at at time zone 'Africa/Gaborone')::date d, count(*) n,
                     count(*) filter (where s2.status = 'missed') m
              from public.chat_sessions s2
              where (p_from is null or s2.queued_at >= p_from) and (p_to is null or s2.queued_at < p_to)
              group by 1) x), '[]'::jsonb))
    from public.chat_sessions s
    where (p_from is null or s.queued_at >= p_from) and (p_to is null or s.queued_at < p_to)
  );
end;
$$;

-- Live chat (CHT-01): RLS on both tables limits events to participants.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.chat_messages, public.chat_sessions;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

revoke all on function
  public.get_programme_report(uuid, timestamptz, timestamptz),
  public.report_case_rows(uuid, timestamptz, timestamptz),
  public.query_audit(text, uuid, text, timestamptz, timestamptz, integer, bigint),
  public.chat_status(),
  public.start_chat(text),
  public.send_chat_message(uuid, text),
  public.accept_chat(uuid),
  public.close_chat(uuid),
  public.my_chat_inbox(),
  public.chat_statistics(timestamptz, timestamptz)
from public, anon;

grant execute on function
  public.get_programme_report(uuid, timestamptz, timestamptz),
  public.report_case_rows(uuid, timestamptz, timestamptz),
  public.query_audit(text, uuid, text, timestamptz, timestamptz, integer, bigint),
  public.chat_status(),
  public.start_chat(text),
  public.send_chat_message(uuid, text),
  public.accept_chat(uuid),
  public.close_chat(uuid),
  public.my_chat_inbox(),
  public.chat_statistics(timestamptz, timestamptz)
to authenticated;
-- The widget shows open/closed before sign-in.
grant execute on function public.chat_status() to anon;

revoke all on function
  private.report_cases(uuid, timestamptz, timestamptz), private.chat_is_open_at(timestamptz),
  private.chat_is_open(), private.sweep_missed_chats()
from public;
