# Runbook

**Owner:** Stacey (backend sections) · Sylvain (release, frontend hosting, monitoring) · **Status:** Draft · 17 Nov 2026
**Answers:** backlog OPS-01 (provider, region, storage cost assumptions, monitoring, 24/7 plan, backup and restore, recovery check), OPS-03, REL-01
Every step marked **Not run** has no run record yet. Results go to `artifacts/phase-07/` with the commit, environment, command, date (UTC and CAT) and the quoted output.

---

## 1. Hosting

| Item | Choice | Status |
|---|---|---|
| Database, Auth, Storage, Realtime, Edge Functions | Supabase, project ref `hncwpxyuolfxafbemapb`, region EU Central. **Free plan now**; Pro recommended from judging (see the free-plan limits below) | Migrations 001–012 and the seed applied 17 Nov 2026; every pgTAP suite **Passed** on the hosted database (460/460 from `main`, 463/463 with #35); Edge Functions deployed. Run record: `artifacts/phase-00/hosted-supabase.md` (run record, branch `test/hosted-pgtap-run`) |
| Region | Lowest measured p95 latency from Gaborone, EU vs Mumbai (D-14; method in `docs/process/ci-and-environments.md` §5) | EU Central measured from Gaborone on mobile data: p50 263 ms, p95 315 ms (`artifacts/phase-00/region-latency.md`). Mumbai **Not run** |
| Frontend | Static build on AWS Amplify (`docs/process/hosting-aws-amplify.md`). Staging: `https://main.d270qrk6a7zs47.amplifyapp.com` | Sylvain |
| Email | No SMTP for the MVP (decided by Stacey, 17 Nov 2026). Alerts are queued and the relay runs, but nothing is sent; the relay answers "SMTP not configured" and the admin outbox view shows **Simulated** | Deferred |

### Free-plan limits (Supabase pricing page; verify on the day of any plan decision)

- **No backups you can restore from the dashboard.** The restore drill in §6 therefore uses a logical dump, and the fallback is a rebuild from the repository: `supabase db push --db-url "$SUPABASE_DB_URL" --include-seed` into a new project recreates the schema and the fictional demo data (proven on 17 Nov 2026, and in CI on every push). Anything entered after seeding is lost in that case.
- **Projects pause after about a week without activity.** A paused project breaks OPS-03 (the portal must stay live until 3 Dec 2026). Mitigation (staying on Free, 17 Nov 2026): Sylvain's uptime monitor (§4) calls `POST /rest/v1/rpc/health` every few minutes, which also keeps the project active; the scheduled keep-alive workflow (PR #37, every second day) is a fallback that fails visibly if the project stops answering. **Who is alerted:** GitHub emails a failed scheduled run to the person who last changed its `cron` line, currently **Stacey**, who checks the dashboard and restores the project if it has paused; the uptime monitor alerts the named contact (DEF-01). Still check the dashboard before judging. Moving to Pro remains a cost decision for the project owner.
- **Leaked-password protection** (HaveIBeenPwned check) is a Pro feature. The security advisor still reports it disabled on 17 Nov 2026. The minimum password length (Auth settings) is **12** on hosted (spec T02; raised from 10 on 19 Nov 2026 and read back; `supabase/config.toml` matches).

### Storage and cost assumptions (to verify against the providers' pricing pages on the day of the decision)

| Assumption | Value | Basis |
|---|---|---|
| Attachments per idea | 3 files, 2 MB average, 10 MB maximum each | Upload limits in migration 002 |
| Storage per 1,000 ideas | about 6 GB typical, 30 GB worst case | 1,000 × 3 × 2 MB; 1,000 × 3 × 10 MB |
| Database size per 1,000 ideas | well under 1 GB | Text fields capped (contract §4.2); history and audit rows are small |
| Plan | Supabase Pro covers the demo and a first real cohort within its included quotas | **ASSUMED**; confirm quotas and price on supabase.com/pricing and record the date |

No figure here is a measured cost. The submitted proposal quotes prices only with the date they were checked.

## 2. Configuration (names only; values never in the repository)

| Where | Names |
|---|---|
| Local `.env` (scripts) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_PASSWORD` |
| Edge Function secrets | `APP_ORIGINS`, `PORTAL_URL`, `RELAY_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). **Staging, set 17 Nov 2026:** `APP_ORIGINS` = the Amplify staging URL + `http://localhost:5173`; `PORTAL_URL` = the Amplify staging URL; `RELAY_SECRET` set; no `SMTP_*` (email Simulated) |
| Auth URL configuration (`hosting-aws-amplify.md` §4) | Site URL = the Amplify staging URL; Redirect URLs = the Amplify staging URL and `http://localhost:5173`, each also with a `/**` path pattern so the e-mail links to `/auth/sign-in` and `/auth/reset` are allowed (19 Nov); no wildcard domains. **Set on 17 Nov 2026** and read back (run record §3); for judging, switch both to the `release` URL |
| Supabase Vault (SQL editor) | `email_relay_url`, `email_relay_secret`, `email_relay_anon_key` (contract §4.8) |
| App settings (table `app_settings`, admin RPCs) | `demo_mfa_exempt`, `chat_demo_override`, `review_quorum`, `email_max_attempts` |

## 3. Deploying the backend to a Supabase project

Run from a clean checkout of the release commit. Each step's output goes into the run record.

0. **Only migrations already merged to `main`** are applied to a hosted project, staging or judging (Sylvain's review of #35).
1. `supabase link --project-ref <ref>` (or use the database connection string with `--db-url`).
2. `supabase migration list` — **stop** if the remote shows migrations or tables that are not in `supabase/migrations/`; ask the backend lead.
3. `supabase db push --include-seed` — applies migrations 001 onwards in order, then the fictional seed. Seed only a fresh project.
4. `node --env-file=.env scripts/set-demo-passwords.mjs` — sets `DEMO_PASSWORD` on the seeded `@demo.ceda-portal.test` accounts.
5. `supabase functions deploy attachment-url email-relay invite-staff` and set the Edge Function secrets above.
6. Create the three Vault secrets (contract §4.8) once the email relay should run.
7. Smoke test: `select public.health();` returns `ok: true` and the latest migration version; signing in as `applicant.a@demo.ceda-portal.test` shows two idea cards.
8. **Judging project only, before code freeze (22 Nov 2026, 18:00 CAT):** the allowed origins and Auth URLs name the `release` URL **and nothing else**. Remove `http://localhost:5173` from `APP_ORIGINS` (set `PORTAL_URL` to the release URL) and both localhost entries (`http://localhost:5173` and `http://localhost:5173/**`) from the Auth Redirect URLs; the release URL gets the same two entries (origin and `/**`), and set the Auth Site URL to the release URL. Read the settings back and record them in the run record.
9. After code freeze, do not run the pgTAP runner (`tools/pglite-db-tests/run-hosted.mjs`) against the judging project; use `health()` and read-only checks.

## 4. Health checks and monitoring

| Signal | How | Expected |
|---|---|---|
| API alive | `POST /rest/v1/rpc/health` with the anon key | `{"ok": true, "migration_version": "…", "server_time": "…"}` |
| Scheduled jobs | `select jobname, schedule, active from cron.job;` and `select * from cron.job_run_details order by start_time desc limit 10;` | `ceda-maintenance` (every 10 min) and `ceda-email-relay` (every 2 min) active and succeeding |
| Email backlog | Admin outbox view (`list_email_outbox`), or `select status, count(*), min(created_at) from email_outbox group by status;` | No `pending`/`retryable` row older than about 15 minutes once SMTP is configured |
| Errors | Supabase logs (Postgres, Auth, Edge Functions); Edge Function logs are structured JSON with outcome codes only | No repeated `UNAVAILABLE`, `SIGN_FAILED` or `CLAIM_FAILED` |
| Uptime of the hosted URL | External uptime monitor (OPS-03), alert to the named contact | Sylvain to configure and name the responder |

**24/7 plan for judging (OPS-03):** Supabase and the frontend host run unattended; the uptime monitor alerts the named contact; nothing is deployed after the deadline without organiser approval, and any approved change is logged.

## 5. Routine operations

| Task | How |
|---|---|
| Run maintenance now | As the service role: `select public.run_maintenance();` (expires overdue requests, sweeps missed chats) |
| Send queued email now | Invoke `email-relay` with header `x-relay-secret`, or `select private.trigger_email_relay();` |
| Show chat as open/closed for a demo | Admin: `set_chat_override('open' / 'closed' / null)` |
| Demo staff without MFA | `app_settings.demo_mfa_exempt = true` (default for the demo). **Set to false for any real use** |
| Stuck outbox row | Rows with `attempts = email_max_attempts` become `rejected` with the reason; fix the cause, then reset the row to `pending` with `attempts = 0` (service role) |

## 6. Backup and restore (OPS-01)

**Backups:** on the Free plan there are no dashboard backups; the logical dump in step 2 below is the backup. On Pro, Supabase takes daily backups (retention per plan). Storage objects (attachments) are **not** part of database backups; for the demo they are fictional and re-creatable. For real use, schedule an object-storage copy.

**Restore drill (to run once before judging, then record):**

1. Note the time and the current state: `select count(*) from proposals; select max(id) from audit_events;`.
2. Create a logical backup from the hosted database: `supabase db dump --db-url "$SUPABASE_DB_URL" -f backup-schema.sql` and `supabase db dump --db-url "$SUPABASE_DB_URL" --data-only -f backup-data.sql` (keep these files outside the repository; they contain the seeded fictional accounts).
3. Restore into a disposable target, the local stack (`supabase start`, then `psql "$LOCAL_DB_URL" -f backup-schema.sql -f backup-data.sql`) or a fresh Supabase project.
4. Verify on the target: the same counts as step 1; `select public.health();`; the 0009 demo case and its audit trail are present; pgTAP passes (`supabase test db`).
5. Record the elapsed time (recovery time) and the age of the backup (recovery point) in `artifacts/phase-07/restore-drill.md`.
6. For a dashboard restore (Pro): Database → Backups → Restore, into the same or a new project; then repeat step 4.

**Status (18 Nov 2026): Passed for the database data, by the Free-plan method.** With no dashboard backups and no Docker on hand, the drill ran as `node --env-file=.env tools/pglite-db-tests/restore-drill.mjs <dir outside the repo>`: a read-only logical backup (TLS verified, no password hashes), a rebuild of an empty PGlite stand-in (Postgres in WebAssembly, platform stubbed) from the migrations, the data load, then verification (every table row by row, foreign keys, `health()`, the sequence, all pgTAP suites). Result: 33 tables identical, 460/460 tests, **recovery time 5.2 s**; the recovery point is the time of the last backup. A self-test that damages the copy makes the drill fail. Record: `artifacts/phase-07/restore-drill.md`. Still **Not run**: Storage objects, and loading a backup into a real Supabase project. Take a fresh backup before judging and after any demo-data change.

## 7. Recovering from common failures

| Symptom | Likely cause | Action |
|---|---|---|
| Every staff action returns `FORBIDDEN` | MFA required and the session is `aal1`, with the demo exemption off | Enrol and verify TOTP, or (demo only) set `demo_mfa_exempt` to true |
| Uploads fail with a row-level security error | Case is not a draft or an open revision, or the object path is not `<proposal_id>/<uuid>.<ext>` | Check the case status; check the client's path |
| Downloads return `FORBIDDEN` | Caller cannot read the case (expected for N1–N3, N10) | None if expected; otherwise check the assignment and declaration |
| `INVALID_STATE` on a workflow action | The case moved on (another user acted) | Refresh; the error is designed to change nothing |
| Emails not arriving | SMTP not configured, Vault secrets missing, or rows `rejected` | Check `list_email_outbox`, `cron.job_run_details`, Edge Function logs |
