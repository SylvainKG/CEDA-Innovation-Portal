-- 016: signed-out visitors can read published challenge versions again.
--
-- The challenge brief page (/challenges/:slug) reads public.challenge_versions. Its
-- read policy (001) lets an applicant keep seeing the version their own case was
-- submitted against (ADM-02) through a plain subquery on public.proposals. anon has
-- no SELECT on proposals, so for a signed-out visitor every read of
-- challenge_versions failed with 42501 ("permission denied for table proposals"),
-- even for published challenges, and no challenge brief opened on the hosted build.
-- 011 fixed the same pattern on challenges with a security-definer helper; this
-- does the same here. The policy's meaning is unchanged.
--
-- Like the other policy helpers (010, 011), the helper is callable by anon and
-- signed-in users; for anon, auth.uid() is null and it returns false. It is added
-- to the allow-lists in tests/database/010_security_privileges.test.sql.

create or replace function private.owns_case_on_version(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.proposals p
    -- deleted_at: the old subquery ran under proposals' own policy (can_read_case), which hides deleted cases
    where p.challenge_version_id = p_version_id and p.applicant_id = auth.uid() and p.deleted_at is null
  );
$$;
revoke all on function private.owns_case_on_version(uuid) from public;
grant execute on function private.owns_case_on_version(uuid) to anon, authenticated;

drop policy challenge_versions_read on public.challenge_versions;
create policy challenge_versions_read on public.challenge_versions for select to anon, authenticated
  using (
    (published_at is not null and exists (
      select 1 from public.challenges c where c.id = challenge_id and c.status in ('published','closed')))
    or (select private.has_permission('config.manage'))
    -- an applicant keeps seeing the version their own case was submitted against (ADM-02)
    or (select private.owns_case_on_version(id))
  );
