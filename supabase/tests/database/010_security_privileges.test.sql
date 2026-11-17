-- SEC-02: privilege regression guard. Fails when a migration exposes a function,
-- a table or a bucket more widely than reviewed. Adding a new RPC means adding it to
-- the allow-list below on purpose, in the same pull request.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Functions in public that belong to us (extension functions such as pgTAP are excluded).
create function pg_temp.our_public_functions_for(p_role text) returns setof text language sql stable as $$
  select distinct p.proname::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
    and has_function_privilege(p_role, p.oid, 'execute') $$;

select set_eq(
  $$select * from pg_temp.our_public_functions_for('anon')$$,
  array['health', 'chat_status'],
  'signed out, only health() and chat_status() can be called');

select set_eq(
  $$select * from pg_temp.our_public_functions_for('authenticated')$$,
  array[
    -- identity and Slice 1
    'health', 'my_access', 'record_consent', 'save_draft', 'submit_proposal', 'get_submission_receipt',
    'register_attachment', 'remove_attachment', 'authorize_attachment_download',
    -- Slice 2
    'record_screening', 'assign_reviewers', 'revoke_assignment', 'grant_role', 'revoke_role',
    'add_internal_note', 'list_case_status', 'case_stage_counts',
    -- Slice 3
    'declare_assignment', 'save_scorecard', 'submit_scorecard', 'get_score_panel', 'my_review_queue',
    'mark_notifications_read',
    -- Slice 4
    'request_feedback', 'respond_clarification', 'submit_revision', 'verify_feedback_task', 'get_roadmap',
    'list_email_outbox',
    -- Slice 5
    'record_decision', 'publish_decision', 'record_award', 'close_case',
    -- Slice 6
    'get_programme_report', 'report_case_rows', 'query_audit', 'chat_status', 'start_chat', 'send_chat_message',
    'accept_chat', 'close_chat', 'my_chat_inbox', 'chat_statistics',
    'save_content_page', 'set_service_hours', 'set_service_closure', 'set_chat_override', 'create_role',
    'set_role_permissions', 'create_rubric', 'create_rubric_draft', 'save_rubric_criterion',
    'remove_rubric_criterion', 'publish_rubric_version', 'create_challenge', 'update_challenge',
    'save_challenge_version', 'publish_challenge', 'set_challenge_status', 'delete_challenge',
    -- scheduled maintenance
    'extend_feedback_deadline'],
  'signed in, exactly the reviewed RPCs can be called');

select ok(not has_function_privilege('authenticated', 'public.claim_outbox_batch(integer)', 'execute')
          and not has_function_privilege('authenticated', 'public.record_outbox_result(uuid, text, text, text)', 'execute')
          and not has_function_privilege('authenticated', 'public.run_maintenance()', 'execute'),
  'relay and maintenance functions are service-role only');

select set_eq(
  $$select distinct p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and has_function_privilege('authenticated', p.oid, 'execute')$$,
  array['has_permission', 'can_read_case', 'is_case_owner', 'is_cleared_reviewer', 'owns_assignment',
        'has_submitted_peer_view', 'owns_case_in_challenge', 'can_upload_to', 'uuid_or_null'],
  'signed in, only the helpers used by access policies are callable in private');

select set_eq(
  $$select distinct p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and has_function_privilege('anon', p.oid, 'execute')$$,
  array['has_permission', 'can_read_case', 'is_case_owner', 'is_cleared_reviewer', 'owns_assignment',
        'has_submitted_peer_view', 'owns_case_in_challenge'],
  'signed out, only the helpers needed to evaluate public-catalogue policies are callable');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private') and p.prosecdef
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
     and not exists (select 1 from unnest(coalesce(p.proconfig, array[]::text[])) c where c like 'search_path=%')), 0,
  'every SECURITY DEFINER function pins its search_path');

-- A function created now (by the migration role) must start closed.
create function public.zz_new_function_probe() returns int language sql as 'select 1';
select ok(not has_function_privilege('anon', 'public.zz_new_function_probe()', 'execute')
          and not has_function_privilege('authenticated', 'public.zz_new_function_probe()', 'execute'),
  'new functions are not executable by anon or signed-in users until granted');

select is((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('v', 'm')
             and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')), 0,
  'no views in public (a view would bypass the tables'' row-level security)');

select is(
  (select count(*)::int from information_schema.role_table_grants
   where table_schema = 'public' and grantee in ('anon', 'authenticated')
     and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')), 0,
  'browsers can only read tables, never write them (D-02)');

select is((select public from storage.buckets where id = 'proposal-files'), false, 'the proposal-files bucket is private');
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and cmd in ('SELECT', 'ALL', 'UPDATE', 'DELETE')
     and (qual like '%proposal-files%' or with_check like '%proposal-files%')), 0,
  'nobody can read, change or delete proposal files directly; downloads go through attachment-url');

select * from finish();
rollback;
