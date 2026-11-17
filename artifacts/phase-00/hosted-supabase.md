# Hosted Supabase project: run record

**Recorded by:** Stacey · **Date:** 17 Nov 2026 · **Project:** ref `hncwpxyuolfxafbemapb`, region EU Central (Frankfurt), Free plan, Postgres 17.12

The run records behind the hosted results in the runbook (§1), the data-handling note (§2), the API contract (§9) and the claim register. Times are UTC, with CAT (UTC+2) in brackets.

## 1. Schema and seed

| When | Commit | Command | Result |
|---|---|---|---|
| 17 Nov, morning | `db/security-checks` (migrations 001–010, PR #29) | `supabase db push --db-url "$SUPABASE_DB_URL" --include-seed` (after `supabase migration repair` for 001) | **Passed:** 10 migrations, 13 demo users, 8 cases |
| 17 Nov, ~12:50 (14:50) | `ebc076d` (migration 011, PR #34) | `supabase db push --db-url "$SUPABASE_DB_URL"`, after a `--dry-run` listing only 011 | **Passed:** 11 migrations; `health()` reported `20261123090000` |
| 17 Nov, ~15:15 (17:15) | `5820cca` (migration 012, PR #35) | Same, after a dry run listing only 012 | **Passed:** 12 migrations; `health()` reported `20261123100000` |

## 2. pgTAP on the hosted database

Each test file runs in its own transaction and rolls back. The case-reference sequence is recorded and restored, so the next demo reference stays `CEDA-2026-0009`.

| When | Test files from | Command | Summary line |
|---|---|---|---|
| 17 Nov, 10:15 (12:15) | `db/security-checks` (migrations 001–010) | Local `pg` runner, the same method as below | `TOTAL 457 assertions, 0 failed` |
| 17 Nov, ~12:55 (14:55) | `ebc076d` (after 011) | Same | `TOTAL 460 assertions, 0 failed` |
| 17 Nov, ~15:15 (17:15) | `5820cca` (after 012) | Same | `TOTAL 463 assertions, 0 failed` |
| **17 Nov, 16:30:35 (18:30:35)** | **`cf664d7` (`main`)**, against the database at migration 012 | `node --env-file=.env tools/pglite-db-tests/run-hosted.mjs` (this PR) | **`TOTAL 460 assertions, 0 failed (hosted, 9.3 s)`**; sequence `8 -> restored to 8` |

Output of the last run (all files `ok`):

```
hosted run started 2026-11-17T16:30:35.819Z · Postgres 17.12 · latest migration 20261123100000
ok   001_foundation.test.sql: 39 passed, 0 failed
ok   002_slice1_submit.test.sql: 59 passed, 0 failed
ok   003_slice2_screen_assign.test.sql: 56 passed, 0 failed
ok   004_slice3_evaluate.test.sql: 61 passed, 0 failed
ok   005_slice4_revise.test.sql: 72 passed, 0 failed
ok   006_slice5_decide_award.test.sql: 45 passed, 0 failed
ok   007_slice6_reports_audit_chat.test.sql: 45 passed, 0 failed
ok   008_slice6_admin_settings.test.sql: 52 passed, 0 failed
ok   009_scheduled_jobs.test.sql: 20 passed, 0 failed
ok   010_security_privileges.test.sql: 11 passed, 0 failed
reference sequence 8 -> restored to 8

TOTAL 460 assertions, 0 failed (hosted, 9.3 s)
```

`main` has 460 assertions; PR #35 adds the 3 whitespace tests (463 in total, also passed on hosted, row 3 above).

## 3. Accounts, Edge Functions, scheduled jobs (17 Nov)

| Check | Result |
|---|---|
| Demo sign-in through the Auth API: `applicant.a@…` and `admin@…` with `DEMO_PASSWORD`; then a wrong password | **Passed:** both signed in; the wrong password got `invalid_credentials` |
| Edge Functions `attachment-url`, `email-relay`, `invite-staff` deployed (`supabase functions deploy --use-api`) | **Passed** (deployed) |
| Function secrets present (names only): `APP_ORIGINS`, `PORTAL_URL`, `RELAY_SECRET` (`APP_ORIGINS` is the Amplify staging URL plus `http://localhost:5173`; `PORTAL_URL` is the Amplify staging URL) | **Passed:** names confirmed through the Management API, 17 Nov 16:2x |
| `attachment-url` refusals: no sign-in / malformed id / someone else's or unknown file | **Passed:** 401 / 422 `VALIDATION` / 403 `FORBIDDEN` |
| `invite-staff` called by an applicant | **Passed:** 403 `FORBIDDEN` |
| `email-relay`: wrong secret / right secret | **Passed:** 403 / 200 `skipped: SMTP not configured` (email **Simulated**) |
| `private.trigger_email_relay()` from the database (Vault entries) | **Passed:** `nothing_due` |
| Public `health()` with the publishable key, signed out (`POST /rest/v1/rpc/health`) | **Passed:** 200 `{"ok": true, …, "migration_version": "20261123100000"}` |
| Auth URL configuration (`hosting-aws-amplify.md` §4) and minimum password length, set through the Management API (`PATCH /v1/projects/{ref}/config/auth`), 17 Nov 16:42 (18:42). Before: Site URL `http://localhost:3000`, no redirect URLs, minimum 6 | **Passed** (read back 16:43): Site URL `https://main.d270qrk6a7zs47.amplifyapp.com`; Redirect URLs `https://main.d270qrk6a7zs47.amplifyapp.com,http://localhost:5173` (no wildcards); `password_min_length` 10. Not yet observed: a verification or reset email arriving (SMTP deferred; Supabase's built-in sender is rate-limited) |

## 4. Not done or not run

| Item | Status |
|---|---|
| Leaked-password protection | Disabled (Pro feature; Free plan) |
| Successful download link (60-second expiry), staff invitation, real email, Realtime delivery | **Not run** (needs the frontend, an approved test invitation, and SMTP, which is deferred) |
| Restore drill (OPS-01) | **Not run** |
