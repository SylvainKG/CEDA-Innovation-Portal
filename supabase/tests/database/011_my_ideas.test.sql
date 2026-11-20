-- list_my_ideas (T06, migration 014): own cases only, safe columns, expired requests.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Seed: a1 = Applicant A (0008, in evaluation); a5 owns 0003 (action required,
-- open clarification due 20 Nov) and 0006 (awarded).
set local role anon;
select throws_ok($$select public.list_my_ideas()$$, '42501', null, 'signed out, list_my_ideas cannot be called');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select is(jsonb_array_length(public.list_my_ideas()), 1, 'Applicant A sees exactly one idea');
select is(public.list_my_ideas() -> 0 ->> 'reference', 'CEDA-2026-0008', 'it is their own case 0008');
select is((select array_agg(k order by k) from jsonb_object_keys(public.list_my_ideas() -> 0) k),
  array['challenge','id','open_feedback','reference','stages','status','title','updated_at'],
  'only the documented fields are returned (no reasons, actors or staff-only fields)');
select is(public.list_my_ideas() -> 0 -> 'stages', (
    select jsonb_agg(jsonb_build_object('stage', s, 'at', a) order by a) from (
      select e.public_stage s, min(e.at) a from public.case_events e
      join public.proposals p on p.id = e.proposal_id where p.reference = 'CEDA-2026-0008'
      group by e.public_stage) t),
  'stages are the public stages reached, with the first time each was reached');
select is(public.list_my_ideas() -> 0 -> 'open_feedback', 'null'::jsonb, 'no request waits on Applicant A');

-- a new draft appears, without a reference or stages
select public.save_draft('{"title":"Shade nets for seedlings"}'::jsonb, null, '20000000-0000-4000-8000-000000000001');
select is(jsonb_array_length(public.list_my_ideas()), 2, 'a new draft is listed too');
select ok(exists (select 1 from jsonb_array_elements(public.list_my_ideas()) i
                  where i ->> 'status' = 'draft' and i -> 'reference' = 'null'::jsonb
                    and i ->> 'title' = 'Shade nets for seedlings' and i -> 'stages' = '[]'::jsonb),
  'the draft has its title, no reference and no stages');

-- the a5 applicant: an open clarification, then the same request expired
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a5","role":"authenticated"}', true);
select is(jsonb_array_length(public.list_my_ideas()), 2, 'the a5 applicant sees their two cases');
select is((select i -> 'open_feedback' ->> 'status' from jsonb_array_elements(public.list_my_ideas()) i
           where i ->> 'reference' = 'CEDA-2026-0003'), 'open', 'the clarification on 0003 is open');
select is((select i -> 'open_feedback' ->> 'kind' from jsonb_array_elements(public.list_my_ideas()) i
           where i ->> 'reference' = 'CEDA-2026-0003'), 'clarification', 'with its kind');
reset role;
update public.feedback_requests set status = 'expired'
where proposal_id = (select id from public.proposals where reference = 'CEDA-2026-0003');
set local role authenticated;
select is((select i -> 'open_feedback' ->> 'status' from jsonb_array_elements(public.list_my_ideas()) i
           where i ->> 'reference' = 'CEDA-2026-0003'), 'expired',
  'an expired request is still shown while the case waits on the applicant');
select is((select i -> 'open_feedback' from jsonb_array_elements(public.list_my_ideas()) i
           where i ->> 'reference' = 'CEDA-2026-0006'), 'null'::jsonb, 'an awarded case has no request');

-- staff see none of the applicants' ideas through this function
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select is(public.list_my_ideas(), '[]'::jsonb, 'a screening officer has no ideas of their own here');

select * from finish();
rollback;
