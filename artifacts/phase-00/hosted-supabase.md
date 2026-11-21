# Hosted Supabase project: run record

**Recorded by:** Stacey · **Date:** 17 Nov 2026 · **Project:** ref `hncwpxyuolfxafbemapb`, region EU Central (Frankfurt), Free plan, Postgres 17.12

The run records behind the hosted results in the runbook (§1), the data-handling note (§2), the API contract (§9) and the claim register. Times are UTC, with CAT (UTC+2) in brackets.

## 1. Schema and seed

| When | Commit | Command | Result |
|---|---|---|---|
| 17 Nov, morning | `db/security-checks` (migrations 001–010, PR #29) | `supabase db push --db-url "$SUPABASE_DB_URL" --include-seed` (after `supabase migration repair` for 001) | **Passed:** 10 migrations, 13 demo users, 8 cases |
| 17 Nov, ~12:50 (14:50) | `ebc076d` (migration 011, PR #34) | `supabase db push --db-url "$SUPABASE_DB_URL"`, after a `--dry-run` listing only 011 | **Passed:** 11 migrations; `health()` reported `20261123090000` |
| 17 Nov, ~15:15 (17:15) | `5820cca` (migration 012, PR #35) | Same, after a dry run listing only 012 | **Passed:** 12 migrations; `health()` reported `20261123100000` |
| 17 Nov, 17:36 (19:36) | `ae1aaa6` (migration 013, PR #40) | Same, from a temporary checkout of `main` + 012 + 013 (the branch alone lacked 012); dry run listed only 013 | **Passed:** 13 migrations; `health()` reported `20261123110000` |
| 20 Nov, 13:47 (15:47) | `c71ae04` (migration 014, PR #42, merged) | Same, from a temporary checkout of `main` + the 013 file (013 is on hosted but not yet merged, #40); dry run listed only 014 | **Passed:** 14 migrations; `list_my_ideas()` live |
| 21 Nov, 08:30 (10:30) | `ee53f8b` (migration 015, PR #88, merged) | Same, from a temporary checkout of `main` (`f42e31d`) + the 013 file; dry run listed only 015 | **Passed:** 15 migrations; `set_alert_preference` live |

## 2. pgTAP on the hosted database

Each test file runs in its own transaction and rolls back. The case-reference sequence is restored afterwards, never below the highest existing reference, so the next demo reference stays `CEDA-2026-0009`.

**Process note (Sylvain's review of #35):** migrations 012 and 013 were applied to hosted before their PRs were reviewed, so hosted is ahead of `main` until #35 and #40 merge. From now on, only migrations already on `main` are applied to hosted. The runner is for staging only, never for the judging project after code freeze (22 Nov, 18:00 CAT).

| When | Test files from | Command | Summary line |
|---|---|---|---|
| 17 Nov, 10:15 (12:15) | `db/security-checks` (migrations 001–010) | Local `pg` runner, the same method as below | `TOTAL 457 assertions, 0 failed` |
| 17 Nov, ~12:55 (14:55) | `ebc076d` (after 011) | Same | `TOTAL 460 assertions, 0 failed` |
| 17 Nov, ~15:15 (17:15) | `5820cca` (after 012) | Same | `TOTAL 463 assertions, 0 failed` |
| **17 Nov, 16:30:35 (18:30:35)** | **`cf664d7` (`main`)**, against the database at migration 012 | `node --env-file=.env tools/pglite-db-tests/run-hosted.mjs` (this PR) | **`TOTAL 460 assertions, 0 failed (hosted, 9.3 s)`**; sequence `8 -> restored to 8` |
| 17 Nov, 17:37 (19:37) | `main` + 012 + 013 tests (after 013) | Local `pg` runner | `TOTAL 468 assertions, 0 failed`; sequence restored to 8 |
| 18 Nov, 04:22 (06:22) | this branch, `010` only | `run-hosted.mjs` with **TLS verified** against the Supabase Root 2021 CA | `TOTAL 11 assertions, 0 failed (hosted, 2.9 s)`; with a wrong CA the connection is refused (`self-signed certificate in certificate chain`) |
| 20 Nov, 13:47:44 (15:47:44) | `main` + 013 tests (after 014) | `run-hosted.mjs`, TLS verified with the dashboard CA (`prod-ca-2021.crt`) | `TOTAL 482 assertions, 0 failed (hosted, 14.2 s)`; sequence `8 -> restored to 8` |
| 21 Nov, 08:30:07 (10:30:07) | `main` (`f42e31d`) + 013's suite, after 015 | `run-hosted.mjs`, TLS verified | `TOTAL 492 assertions, 4 failed`: `009` #7, #8, #15 and `007` #24 counted genuine history on hosted (0003's real expiry at 14:00 UTC and its extension at 14:06 UTC on 20 Nov). Not a defect: the checks assumed a fresh seed |
| 21 Nov, 08:38:49 (10:38:49) | branch `db/tests-hold-on-live-data` (#97) + 013's suite | Same | **`TOTAL 493 assertions, 0 failed`**: the four checks now count only their own transaction's rows; sequence 8 |

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
| Auth follow-up, 19 Nov 03:16 UTC (05:16 CAT), Management API, read back after 25 s: (1) Redirect URLs gain `/**` path patterns on our own hosts, because the e-mails link to `/auth/sign-in?verified=1` and `/auth/reset`, which a bare origin does not match (they would fall back to the Site URL); (2) minimum password length 10 → **12** (spec T02, Stacey's decision) | **Passed:** allow-list `https://main.d270qrk6a7zs47.amplifyapp.com`, `…/**`, `http://localhost:5173`, `…/**` (no wildcard domains); `password_min_length` 12. Negative: an 11-character sign-up refused (HTTP 422) and no account created (still 13); `applicant.a` still signs in |
| Challenge template for the demo (T03): a fictional one-page DOCX marked DEMO, uploaded by `admin@demo.ceda-portal.test` (`config.manage`) to `challenge-files/water-smart-agriculture-2026/proposal-template.docx`, 18 Nov 04:3x UTC | **Passed:** upload 200; public URL 200 (DOCX, 1,329 bytes). Negative: Applicant A's upload to the same bucket refused (`new row violates row-level security policy`), and no object was created |
| Auth URL configuration (`hosting-aws-amplify.md` §4) and minimum password length, set through the Management API (`PATCH /v1/projects/{ref}/config/auth`), 17 Nov 16:42 (18:42). Before: Site URL `http://localhost:3000`, no redirect URLs, minimum 6 | **Passed** (read back 16:43): Site URL `https://main.d270qrk6a7zs47.amplifyapp.com`; Redirect URLs `https://main.d270qrk6a7zs47.amplifyapp.com,http://localhost:5173` (no wildcards); `password_min_length` 10. Not yet observed: a verification or reset email arriving (SMTP deferred; Supabase's built-in sender is rate-limited) |

## 3b. Issue #61 refusal checks through the REST API (20 Nov 2026, 13:49 UTC)

Signed in as the demo accounts (Auth password grant, publishable key), calling the same REST endpoints and RPCs as the screens. Row counts in 12 tables (`proposals`, `case_events`, `audit_events`, `decisions`, `awards`, `feedback_requests`, `feedback_tasks`, `assignments`, `scorecards`, `scorecard_items`, `internal_notes`, `notifications`) were identical before and after.

| Row | Result |
|---|---|
| N-a Applicant B reads A's case 0008 (proposal, versions, files, receipt) | **Passed:** 0 rows each; receipt `found: false` |
| N-b Admin calls `record_screening` / `record_decision` | **Passed:** 403 `FORBIDDEN` both |
| N-c Adjudicator calls `record_award` | **Passed:** 403 `FORBIDDEN` |
| N-d Admin awards 0004 (not approved) | **Passed:** 409 `CASE_NOT_APPROVED` |
| N-e Reviewer 1 opens 0008 before declaring | **Passed:** no proposal, versions or files; only own assignment |
| N-f Reviewer 2 calls `get_score_panel` before submitting own | **Passed:** 403 `FORBIDDEN` |
| N-g Applicant C reads decisions on 0004 (in adjudication) | **Passed:** 0 rows |
| N-h Applicant D reads history of 0002 (screened eligible) | **Passed:** no reasons |
| N-i Second clarification on 0003 while one is open | **Passed:** 409 `INVALID_STATE` |
| N-k in the browser (network loss) | **Not run** (needs the browser build) |

## 3c. Issue #61 main journey through the REST API, then an exact reset (20 Nov 2026, 14:01–14:04 UTC)

Option A agreed with Stacey: run on two new cases only, then remove exactly what they created.

| Row | Result |
|---|---|
| 1 Register a new address | **Not run**: no SMTP; Supabase's built-in sender mails only project team addresses |
| 2 Applicant A: draft, PDF upload (Storage 200), `register_attachment`, submit | **Passed:** receipt `CEDA-2026-0009`, "20 Nov 2026, 16:01 CAT", 1 file. Same key again: `replayed: true`, same reference |
| 2 `list_my_ideas` | **Passed:** 0009 (submitted) and 0008 (in evaluation) |
| 3 Record screening: Eligible | **Passed:** `in_evaluation`; screener's text in a staff internal note |
| 3 / N-h live | Check mis-specified: it expected no reason, while 013 writes the fixed label `Screened: eligible` to the applicant-visible history by design. The free text staying hidden is asserted by pgTAP `003` on hosted (61/61, 20 Nov) |
| 4 Assign Reviewers 1 and 2 | **Passed:** both undeclared |
| 5 / N-j live: draft with a score and no reason | **Passed:** saved as `draft`, weighted score null |
| 5 Declare, score and submit ×2 | **Passed:** `in_adjudication` after the second (quorum 2) |
| 6 / N-g live: recorded, unpublished decision | **Passed:** applicant sees 0 decisions, `in_adjudication` |
| 6 Publish | **Passed:** applicant sees `approved` with the reason |
| 7 Award 25000050 | **Passed:** `awarded`, amount visible to the applicant |
| 8 Clarification on Applicant B's 0010, then reply | **Passed:** back to `submitted`, still 1 version |
| 9 Revision with 2 tasks | **Passed:** `action_required`; roadmap shows 2 tasks |

**Reset:**
- A consistent snapshot (33 tables, 257 rows, sequence 8, 1 storage object) was taken just before the journey.
- In one transaction: 19 protective triggers paused; exactly the 67 rows not in the snapshot deleted (14 tables); sequence set to 8; triggers re-enabled; **all 33 tables compared row by row with the snapshot: identical**; then commit.
- The two test PDFs were removed through the Storage API with the service-role key. The `sb_secret_` key is refused by Storage ("Invalid Compact JWS"), so the first attempt failed and was redone.
- Re-check at 14:04 UTC: no table differs from the snapshot, sequence 8, no trigger disabled, Storage back to the demo template only.
- The snapshot files were deleted (they held account e-mails).

**Demo-data note:** the seeded clarification on `CEDA-2026-0003` (due 20 Nov 16:00 CAT) was expired by the 14:00 UTC maintenance run, as designed, before the snapshot.

**0003 reopened (20 Nov, 14:06 UTC):** through the normal staff path, `extend_feedback_deadline` called as `screening@demo…` via the REST API, not a direct data edit. Before: `expired`, due 20 Nov 14:00 UTC. After: `open`, due **4 Dec 2026, 14:00 UTC (16:00 CAT)**; the case stays `action_required`, and Applicant E's `list_my_ideas` shows the open clarification. As designed, the call wrote a case event, an audit entry and a notification (snapshots after this show 259 rows instead of 257). The seed uses the same date since #67.

## 3d. C-02 link expiry and C-16 live-update isolation (20 Nov 2026, 14:46–14:48 UTC)

Run as the demo accounts with supabase-js 2.119.0 (the browser client), under a snapshot and the verified reset (`tools/pglite-db-tests/staging-reset.mjs`, #68).

| Claim | Check | Result |
|---|---|---|
| C-02 | Applicant B asks `attachment-url` for a link to A's draft file | **Passed:** 403 `FORBIDDEN` |
| C-02 | The owner's link, fetched at once | **Passed:** function 200, `expires_in` 60; download 200, 242 bytes identical to the upload |
| C-02 | The same link fetched 62 s later | **Passed:** 400 `InvalidJWT`, "`exp` claim timestamp check failed" |
| C-16 | Applicant A (control) subscribed to `notifications` and `case_events`; A submits | **Passed:** 2 events (`case_events` INSERT, `notifications` INSERT) |
| C-16 | Applicant B subscribed to the same tables at the same time | **Passed:** 0 events |

**Reset:** the extra rows (1 case, 1 version, 1 attachment, 1 case event, 1 notification, 4 audit entries) were removed and the sequence set from 9 back to 8. All 33 tables were identical to the snapshot before commit; the test file was deleted through the Storage API (200), and Storage again matches the snapshot. This was the first real use of the tool's delete path, files included. The snapshot was deleted afterwards.

## 4. Not done or not run

| Item | Status |
|---|---|
| Leaked-password protection | Disabled (Pro feature; Free plan) |
| Successful download link (60-second expiry), staff invitation, real email, Realtime delivery | **Not run** (needs the frontend, an approved test invitation, and SMTP, which is deferred) |
| Restore drill (OPS-01) | **Not run** |
