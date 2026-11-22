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
| 22 Nov, 09:52 (11:52) | `cd17218` (migration 016, PR #148, merged; reviewed in #150) | Same, from a temporary checkout of `main` (`0311e5e`); dry run listed only 016 | **Passed:** 16 migrations, level with `main`. Before: a signed-out (`anon`) read of `challenge_versions` failed with `42501 permission denied for table proposals`, so no challenge brief opened signed out. After: the same read returns the 2 published versions, and `anon` is still refused on `proposals`. No data changed (8 cases, 13 accounts, 1 file). The CLI warned that it couldn't cache its migration catalogue without Docker (local only) |

## 2. pgTAP on the hosted database

Each test file runs in its own transaction and rolls back. The case-reference sequence is restored afterwards, never below the highest existing reference, so the next demo reference stays `CEDA-2026-0009`.

**Process note (Sylvain's review of #35):** migrations 012 and 013 were applied to hosted before their PRs were reviewed, so hosted is ahead of `main` until #35 and #40 merge. From now on, only migrations already on `main` are applied to hosted. The runner is for staging only, never for the judging project after code freeze (22 Nov, 18:00 CAT).

**Since 22 Nov, 09:52 UTC, hosted is at migration 016, level with `main`** (§1, `list_migrations` read back: `20261116100000` to `20261123140000`). Before that:

**Hosted matched `main` from 21 Nov, 10:27 UTC**, when #40 merged (`694dc65`). Both list the same 15 migrations, `20261116100000` to `20261123130000` (hosted read through the Management API). The 013 file on `main` is identical to the one applied on 17 Nov from `ae1aaa6` (`git diff ae1aaa6 694dc65` on that file is empty).

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
| **21 Nov, 10:29:40 (12:29:40)** | **`main` (`694dc65`)**, all 13 suites, hosted at migration 015 and level with `main` | `run-hosted.mjs`, TLS verified | **`TOTAL 507 assertions, 0 failed (hosted, 12.2 s)`**; sequence `8 -> restored to 8`. The same count as CI on `main`, including the report reconciliation suite (`013`) on the live data |
| **22 Nov, 14:15:04 (16:15:04): final pre-freeze run (P7-01)** | **`main` (`1b89b25`)**, all 14 suites, hosted at migration 016 and level with `main` | `run-hosted.mjs`, TLS verified | **`TOTAL 513 assertions, 5 failed (hosted, 22.3 s)`**; sequence `8 -> restored to 8`. All 5 failures come from data added through the deployed site after the 07:06 reset, not from code (§3i): `001` #9 (one real, non-demo account) and `011` #2, #3, #5, #7 (two drafts by Applicant A). The same suites pass 513/513 on a clean database: CI run 45004119862, ABM's local stack (#153), Stacey's PGlite run on `85aee03` |

Output of the final pre-freeze run (22 Nov):

```
hosted run started 2026-11-22T14:15:04.320Z · Postgres 17.12 · latest migration 20261123140000
FAIL 001_foundation.test.sql: 38 passed, 1 failed
ok   002_slice1_submit.test.sql: 62 passed, 0 failed
ok   003_slice2_screen_assign.test.sql: 61 passed, 0 failed
ok   004_slice3_evaluate.test.sql: 61 passed, 0 failed
ok   005_slice4_revise.test.sql: 72 passed, 0 failed
ok   006_slice5_decide_award.test.sql: 45 passed, 0 failed
ok   007_slice6_reports_audit_chat.test.sql: 46 passed, 0 failed
ok   008_slice6_admin_settings.test.sql: 52 passed, 0 failed
ok   009_scheduled_jobs.test.sql: 20 passed, 0 failed
ok   010_security_privileges.test.sql: 11 passed, 0 failed
FAIL 011_my_ideas.test.sql: 10 passed, 4 failed
ok   012_alert_preference.test.sql: 10 passed, 0 failed
ok   013_report_reconciliation.test.sql: 14 passed, 0 failed
ok   014_public_catalogue.test.sql: 6 passed, 0 failed
reference sequence 8 -> restored to 8 (highest existing reference 8)

TOTAL 513 assertions, 5 failed (hosted, 22.3 s)
```

The failed checks, as the runner printed them:
- `001` #9 "every seeded profile is flagged DEMO": have 1, want 0.
- `011` #2 "Applicant A sees exactly one idea": have 3, want 1.
- `011` #3 "it is their own case 0008": have NULL.
- `011` #5 "stages are the public stages reached…": have [].
- `011` #7 "a new draft is listed too": have 4, want 2.

Each follows from the data in §3i. No database test tool runs against this project after the 18:00 CAT freeze (runbook §3 step 9).

Output of the 21 Nov run (all files `ok`):

```
hosted run started 2026-11-21T10:29:40.813Z · Postgres 17.12 · latest migration 20261123130000
ok   001_foundation.test.sql: 39 passed, 0 failed
ok   002_slice1_submit.test.sql: 62 passed, 0 failed
ok   003_slice2_screen_assign.test.sql: 61 passed, 0 failed
ok   004_slice3_evaluate.test.sql: 61 passed, 0 failed
ok   005_slice4_revise.test.sql: 72 passed, 0 failed
ok   006_slice5_decide_award.test.sql: 45 passed, 0 failed
ok   007_slice6_reports_audit_chat.test.sql: 46 passed, 0 failed
ok   008_slice6_admin_settings.test.sql: 52 passed, 0 failed
ok   009_scheduled_jobs.test.sql: 20 passed, 0 failed
ok   010_security_privileges.test.sql: 11 passed, 0 failed
ok   011_my_ideas.test.sql: 14 passed, 0 failed
ok   012_alert_preference.test.sql: 10 passed, 0 failed
ok   013_report_reconciliation.test.sql: 14 passed, 0 failed
reference sequence 8 -> restored to 8 (highest existing reference 8)

TOTAL 507 assertions, 0 failed (hosted, 12.2 s)
```

The release-time run was planned for after the freeze, but runbook §3 step 9 bars test tools on the judging project after 18:00 CAT, and staging is that project. So the final run was the 22 Nov pre-freeze run above.

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
| Keep-alive workflow (`.github/workflows/keep-alive.yml`, #37), first manual run after the repository settings were added (`SUPABASE_URL` variable, `SUPABASE_PUBLISHABLE_KEY` secret), 21 Nov 08:47 UTC | **Passed:** [run 44886552253](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44886552253) returned `{"ok": true, …, "migration_version": "20261123130000"}`; the scheduled runs (every second day) use the same settings |
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
| N-k in the browser (network loss) | **Passed** on 21 Nov in the browser (§3e) |

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

## 3e. Browser journey against hosted (issue #61, #72) and its reset (21 Nov 2026)

Sylvain's Playwright suite `tests/e2e/hosted-journey.spec.ts`, run from GitHub Actions: the merged screens built in `supabase` mode on `localhost:5173`, against this project, Chromium at 1280 px.

| Run | Scope | Result |
|---|---|---|
| [44886380703](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44886380703), 08:47 UTC | Read-only | **4 passed, 1 skipped**: every demo account signs in to its own home; a wrong password is refused without saying which part; staff screens show Forbidden to the wrong roles; N-a (Applicant B can't open A's idea or receipt) |
| [44886824024](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44886824024), 08:51–08:54 UTC | Write | **5 passed**: Applicant A submits with a PDF; the submit reply is cut after the server handled it ("Not confirmed yet."); **Check status** finds the receipt; exactly one card has the reference (N-k) |

**Database check before the reset (read-only):** exactly one new case, `CEDA-2026-0009` (Applicant A, `submitted`, **1 version**), and one file. That's the server-side half of N-k.

**Snapshot and reset:** snapshot at 08:50:29 UTC (33 tables, 259 rows, sequence 8, 1 storage object). `staging-reset.mjs reset --confirm` at 08:54 UTC:
- it removed 1 case, 1 version, 1 attachment, 1 case event, 1 notification and 3 audit entries, and set the sequence from 9 to 8;
- all 33 tables were identical to the snapshot before commit, with 19 triggers re-enabled;
- the PDF was deleted (200).

Independent check afterwards: 8 cases, sequence 8, 1 file. The snapshot file was deleted.

The first attempt (run 44886087299) failed on a test selector (the password field's accessible name is "PasswordRequired"), wrote nothing, and was fixed in #72.

## 3f. Browser journey steps 5–17 against hosted, and two exact resets (21 Nov 2026)

The same suite, extended with steps 5–17 (#72). Each staging run had its own snapshot before it and an exact reset after it, using `staging-reset.mjs` from `main` (#68), with project `hncwpxyuolfxafbemapb` confirmed as staging.

| Run | Snapshot | Result | Reset |
|---|---|---|---|
| [44898204783](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44898204783), 11:15–11:18 UTC | 11:06:30 UTC: 33 tables, 259 rows, sequence 8, 1 storage object | Tests 1–5 passed; steps 5–15 passed; **failed at step 16** (the consultant's chat reply never reached the applicant: the page closed before the send finished, which left 1 chat message where a full exchange has 2). Fixed in #72 (`fcd971a`) | ~11:24 UTC, see below |
| [44909107002](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44909107002), 13:31–13:32 UTC, from `main` (`f035194`) | 13:28:40 UTC: 33 tables, 259 rows (same as the 11:06 baseline), sequence 8, 1 storage object | **6 passed: the full main journey, steps 0–17, through the real screens against this project.** This includes chat both ways, the CSV export containing the case, and the audit log filtered by the case | ~13:39 UTC, see below |

Between the two runs, the throwaway-stack rehearsal (run 44898567700, `journey_local`) wrote nothing here.

**A setting changed by a run has to go back to its exact snapshot value before the reset.** Both runs touched `app_settings.chat_demo_override`. The first left it on `"open"` after failing; the second put it back to `null` itself, through `set_chat_override(null)`. That function also sets `updated_at = now()`, so in both cases the row still differed from the snapshot, and the reset would roll back rather than overwrite an existing row (by design). Before each reset I restored the row's exact snapshot values with one guarded update: `value = null`, `updated_at = 2026-11-17 07:13:46.482239+00`, applied only while the row still held the run's value. `app_settings` has no triggers.

**What each reset removed** (all 33 tables identical to the snapshot before commit; 19 triggers paused and re-enabled; the run's PDF deleted through the Storage API, HTTP 200):

| Table | Run 1 (11:24) | Run 2 (13:39) |
|---|---|---|
| `proposals` / `proposal_versions` / `attachments` | 1 / 2 / 2 | 1 / 2 / 2 |
| `case_events` | 9 | 9 |
| `feedback_requests` / `feedback_tasks` / `task_verifications` | 2 / 3 / 6 | 2 / 3 / 6 |
| `assignments` / `scorecards` / `scorecard_items` | 2 / 3 / 12 | 2 / 3 / 12 |
| `internal_notes` / `decisions` / `awards` | 1 / 1 / 1 | 1 / 1 / 1 |
| `chat_sessions` / `chat_messages` | 1 / 1 | 1 / **2** |
| `notifications` / `audit_events` | 14 / 29 | 14 / 30 |
| Reference sequence | 9 → 8 | 9 → 8 |

**Independent check after each reset:** 8 cases (highest `CEDA-2026-0008`), sequence 8, 8 versions, 1 storage object (the demo template), chat override `null`, and no disabled triggers in `public`; after the second, also 13 accounts. The demo starts at `CEDA-2026-0009`. Both snapshot files were deleted.

## 3g. Readiness for the Amplify site in Supabase mode (21 Nov 2026, ~13:55 UTC)

Checked before Sylvain switches the Amplify staging build from `VITE_API_MODE=mock` to `supabase`. Until then the deployed bundle is mock mode: it contains no Supabase URL, so a registration on the site creates nothing here. That was confirmed on 21 Nov with 13 accounts, none created in the last 24 hours.

| Check | Result |
|---|---|
| Auth Site URL and Redirect URLs (Management API) | Site URL `https://main.d270qrk6a7zs47.amplifyapp.com`; Redirect URLs: that host and `…/**`, plus `http://localhost:5173` and `…/**`; minimum password length 12 |
| Edge Function secrets (names only) and status | `PORTAL_URL`, `APP_ORIGINS`, `RELAY_SECRET`; `attachment-url`, `email-relay`, `invite-staff` all ACTIVE |
| `APP_ORIGINS`, tested by behaviour: CORS preflight to `attachment-url` and `invite-staff` | From the Amplify origin: `204` with `Access-Control-Allow-Origin` set to that origin. From a foreign origin: `204` with no allow-origin, so the browser blocks it |
| Email | **Simulated** (C-22): no custom SMTP. Supabase's built-in sender only mails the project's team members, at 2 per hour, and `mailer_autoconfirm` is off. So a **new** registration waits for a confirmation email that doesn't arrive; judges use the seeded, already-verified demo accounts |

**Supabase advisors, same session:** unchanged in substance from the 17 Nov baseline (API contract, test record):
- **Security:** `SECURITY DEFINER` RPCs callable signed in (63, by design, D-02; the exact list is pinned by `010_security_privileges`, which passed on hosted at 10:29 UTC) and signed out (`health`, `chat_status`); `app_settings` and `email_outbox` have no policies (intentional: no client access); leaked-password protection is off (Pro feature).
- **Performance (INFO):** 34 unindexed foreign keys and one table with two permissive `SELECT` policies, both recorded debt; unused indexes are down from 15 to 1, now that the tables have been used.

## 3h. N9 through the real screens against hosted, and an exact reset (22 Nov 2026, 06:56–07:06 UTC)

ABM asked for N9 (a closed challenge refuses the submit and keeps the draft) through the real screens on the real backend (#140, test 7 in `hosted-journey.spec.ts`). The workflow runs the whole write suite, so tests 5–6 ran again too.

| Step | When (UTC) | Result |
|---|---|---|
| Snapshot (`staging-reset.mjs` from `main` `cbb1df3`) | 06:56:39 | 33 tables, 259 rows, sequence 8, 1 storage object: the demo baseline |
| First attempt, [run 44996020945](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44996020945) | 06:57 | Stopped in test 1 (sign-ins) before any write: seven sign-ins behind the loading splash took longer than 30 s. Only Auth sessions were written |
| [Run 44996202242](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44996202242), branch `test/n9-closed-challenge` (`a6f1a93`) | 07:00–07:03 | **7 passed (2.5 m):** tests 1–6 (the full main journey) and **test 7, N9:** the admin closes Water-Smart while Applicant A's form is open, the submit is refused with `CHALLENGE_CLOSED` ("This challenge is no longer accepting submissions. Your draft is saved."), My ideas still lists the draft, and the challenge is reopened |
| Existing rows restored to their snapshot values | 07:05 | One atomic block, each update guarded to exactly one row: `app_settings.chat_demo_override` back to `null` @ `2026-11-17 07:13:46.482239+00`, and Water-Smart's `challenges.updated_at` back to `2026-11-17 09:57:31.392665+00` (status already `published` again). That needed the `challenges_updated_at` trigger, which stamps `now()`, paused for that single update and re-enabled in the same block |
| Exact reset | 07:06 | `database reset COMMITTED: 33 tables identical to the snapshot; 19 triggers paused and re-enabled`; the run's PDFs deleted through the Storage API (HTTP 200); `storage objects: 1 now, 1 in snapshot, identical: true`; sequence 9 → 8 |

**Rows removed by the reset:** `proposals` 2 (the journey case and the N9 draft), `proposal_versions` 2, `proposal_drafts` 1, `attachments` 3, `assignments` 2, `scorecards` 3, `scorecard_items` 12, `feedback_requests` 2, `feedback_tasks` 3, `task_verifications` 6, `decisions` 1, `awards` 1, `internal_notes` 1, `case_events` 9, `audit_events` 34 (including the two `challenge.status_changed` rows), `notifications` 14, `chat_sessions` 1, `chat_messages` 2.

**Checked before the run:**
- Water-Smart had no unpublished form version, so reopening (`publish_challenge`) changed only `status`.
- The refused submit writes nothing: `private.raise_error` only raises, so the transaction rolls back.

**Independent check (07:06:23 UTC):** 8 cases (highest `CEDA-2026-0008`), sequence 8, 0 drafts, 0 attachments, 1 storage object, 13 accounts, audit 24, case events 21, notifications 2, chat messages 8, the chat override and Water-Smart at their original timestamps, and no disabled triggers in `public`. The snapshot file was deleted. Reported on #61.

## 3i. Baseline check before the freeze, as found (22 Nov 2026, 14:15 UTC / 16:15 CAT)

Read with SQL right after the final run (§2). Since the 07:06 reset (§3h), the deployed site (Supabase mode since 21 Nov) has been used, and three rows were added:

| When (UTC) | Audit row | What |
|---|---|---|
| 12:37:53 | `account.registered` (#878) | A real person registered (a Gmail address, email confirmed, signed in at 12:38). Applicant role, `is_demo = false` |
| 13:29:51 | `proposal.draft_created` (#879) | A draft started as `applicant.a@demo.ceda-portal.test`, no reference |
| 13:32:15 | `proposal.draft_created` (#880) | A second draft as Applicant A, no reference |

| | Expected (demo baseline) | Found |
|---|---|---|
| Cases (`proposals`) | 8 | **10**: 8 submitted + 2 drafts by Applicant A (both with `proposal_drafts` rows) |
| Highest reference / sequence | `CEDA-2026-0008` / 8 | `CEDA-2026-0008` / 8: **the next demo case is still `CEDA-2026-0009`** (drafts take no reference) |
| Accounts | 13 | **14**: the 13 demo accounts + 1 real registration |
| Storage objects / attachments | 1 / 0 | 1 / 0 |
| `chat_demo_override` | `null` @ 2026-11-17 07:13:46.482239+00 | Same |
| Water-Smart challenge | `published` @ 2026-11-17 09:57:31.392665+00 | Same |
| Disabled triggers in `public` | 0 | 0 |
| `audit_events` / `case_events` / `notifications` / `chat_messages` | 24 / 21 / 2 / 8 | **27** / 21 / 2 / 8 |

**Recorded as found, not changed** (Stacey's decision, 22 Nov):
- The app has no function that deletes a draft.
- Audit rows are append-only.
- The runbook bars deleting rows on the judging project.
- The morning's snapshot was deleted after its reset, so the exact-reset tool has nothing to reset to.

The judges' journey is unaffected (the next case is `0009`), but Applicant A's My ideas shows two extra drafts. The real account is personal data in a fictional-data demo; whether it is removed is a team decision, after the freeze (#61). The demo password was also changed on 22 Nov at 13:34 UTC (`scripts/set-demo-passwords.mjs`, 13 accounts; sign-in checked, HTTP 200). That changes no table counted above.

## 4. Not done or not run

| Item | Status |
|---|---|
| Leaked-password protection | Disabled (Pro feature; Free plan) |
| Successful download link (60-second expiry) and Realtime isolation | **Passed** through the API with the browser client library (§3d); not yet checked on screen |
| Staff invitation, real email | **Not run** (needs an approved test invitation, and SMTP, which is deferred) |
| Restore drill (OPS-01) | Recorded in `artifacts/phase-07/restore-drill.md` (#44) |
