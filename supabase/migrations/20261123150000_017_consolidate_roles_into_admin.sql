-- 017: the Administrator absorbs the Adjudicator, Support consultant / Support lead
-- and External committee member roles.
--
-- Decision (project owner, 22 Nov 2026): one staff role — Administrator — now carries
-- every staff duty. The adjudicator (record/publish decisions), the support consultant
-- and lead (handle chat, read chat statistics) and the external committee member
-- (status-only oversight) no longer have their own dashboards or accounts; the admin
-- does that work instead.
--
-- Authorisation here is permission-driven (private.has_permission reads
-- role_permissions), so absorbing a role is a data change: grant the absorbed
-- permissions to 'admin'. The absorbed roles and their own role_permissions rows are
-- LEFT IN PLACE on purpose — audit rows, historical user_roles and the pgTAP suite
-- still reference them, and keeping them makes this reversible. They are simply no
-- longer granted or shown (the app hides them; see src/lib/api/types.ts
-- ABSORBED_INTO_ADMIN).
--
-- Permissions the admin already held before this migration:
--   case.read_all, case.assign, case.note, scorecard.read_panel, award.record,
--   role.manage, config.manage, report.read, audit.read.
-- committee_member's case.read_status is a strict subset of case.read_all, so the
-- admin already covers it and it is not added here.

insert into public.role_permissions (role_key, permission) values
  -- from Adjudicator
  ('admin', 'decision.record'),
  ('admin', 'decision.publish'),
  ('admin', 'case.request_feedback'),
  ('admin', 'case.close'),
  -- from Support consultant / Support lead
  ('admin', 'chat.handle'),
  ('admin', 'chat.stats')
on conflict (role_key, permission) do nothing;
