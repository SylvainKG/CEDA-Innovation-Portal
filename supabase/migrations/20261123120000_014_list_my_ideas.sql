-- 014: list_my_ideas() for the applicant's "My ideas" page (T06; asked for in PR #38).
--
-- One read that returns exactly what the page shows, instead of three client-side
-- reads of proposals, feedback_requests and case_events:
--   * only safe columns: never case_events.reason or actor_id, never staff-only
--     proposal fields (readiness_confirmed_by, return_stage, closed_reason);
--   * the applicant's own cases only (applicant_id = auth.uid()), drafts included;
--   * open_feedback also carries an EXPIRED request while the case still waits on
--     the applicant (migration 009 expires the request but leaves the case
--     action_required), so the page can say the deadline passed instead of
--     offering an action that cannot succeed.
-- A function rather than a view: 010 pins "no views in public", because a view
-- runs with its owner's rights and could bypass RLS.

create or replace function public.list_my_ideas()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x.item order by x.updated_at desc, x.id), '[]'::jsonb)
  from (
    select p.id, p.updated_at, jsonb_build_object(
      'id',         p.id,
      'reference',  p.reference,
      'title',      p.title,
      'status',     p.status,
      'challenge',  jsonb_build_object('id', c.id, 'title', c.title, 'closes_at', c.closes_at),
      'updated_at', p.updated_at,
      'open_feedback', (
        select jsonb_build_object('kind', r.kind, 'due_at', r.due_at, 'status', r.status)
        from public.feedback_requests r
        where r.proposal_id = p.id and p.status = 'action_required' and r.status in ('open', 'expired')
        order by r.created_at desc
        limit 1),
      'stages', coalesce((
        select jsonb_agg(jsonb_build_object('stage', s.public_stage, 'at', s.first_at) order by s.first_at)
        from (select e.public_stage, min(e.at) as first_at
              from public.case_events e
              where e.proposal_id = p.id and e.public_stage is not null
              group by e.public_stage) s), '[]'::jsonb)
    ) as item
    from public.proposals p
    join public.challenge_versions cv on cv.id = p.challenge_version_id
    join public.challenges c on c.id = cv.challenge_id
    where p.applicant_id = auth.uid() and p.deleted_at is null
  ) x;
$$;

revoke all on function public.list_my_ideas() from public;
grant execute on function public.list_my_ideas() to authenticated;
