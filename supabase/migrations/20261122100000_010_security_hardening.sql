-- =============================================================================
-- Migration 010 — security hardening (SEC-02), found by the privilege review
--
-- 1. `alter default privileges ... in schema` can add privileges but cannot
--    remove PostgreSQL's built-in default that lets PUBLIC execute every new
--    function. The schema-level lines in migration 001 therefore had no effect
--    for functions. Set the global default for the migration role instead, so
--    any future function starts closed and must be granted explicitly.
-- 2. public.my_access() was executable by anon (it returned null, no data).
-- 3. Internal helpers in `private` were executable by PUBLIC. That schema is not
--    exposed through the API and trigger functions cannot be called directly,
--    but the grant was broader than needed. Only the helpers that row-level
--    security and storage policies call are granted, and only to the roles that
--    evaluate those policies.
-- Guarded by supabase/tests/database/010_security_privileges.test.sql.
-- =============================================================================

alter default privileges revoke execute on functions from public;

revoke all on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;

revoke all on all functions in schema private from public, anon, authenticated;

-- Helpers referenced by RLS policies (tables) and by the proposal-files storage policy.
grant execute on function
  private.has_permission(text),
  private.can_read_case(uuid),
  private.is_case_owner(uuid),
  private.is_cleared_reviewer(uuid),
  private.owns_assignment(uuid),
  private.has_submitted_peer_view(uuid, uuid)
to anon, authenticated;

grant execute on function
  private.can_upload_to(uuid),
  private.uuid_or_null(text)
to authenticated;
