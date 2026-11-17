# Runbook

**Owner:** Stacey (backend sections) · Sylvain (release, frontend hosting, monitoring) · **Status:** Draft · 22 Nov 2026
**Answers:** backlog OPS-01 (provider, region, storage cost assumptions, monitoring, 24/7 plan, backup and restore, recovery check), OPS-03, REL-01
Every step marked **Not run** has no run record yet. Results go to `artifacts/phase-07/` with the commit, environment, command, date (UTC and CAT) and the quoted output.

---

## 1. Hosting

| Item | Choice | Status |
|---|---|---|
| Database, Auth, Storage, Realtime, Edge Functions | Supabase, project ref `hncwpxyuolfxafbemapb`, region EU Central. **Free plan now**; Pro recommended from judging (see the free-plan limits below) | Migrations 001–010 and the seed applied 17 Nov 2026; pgTAP 457/457 Passed on the hosted database; Edge Functions deployed |
| Region | Lowest measured p95 latency from Gaborone, EU vs Mumbai (D-14; method in `docs/process/ci-and-environments.md` §5) | EU Central measured from Gaborone on mobile data: p50 263 ms, p95 315 ms (`artifacts/phase-00/region-latency.md`). Mumbai **Not run** |
| Frontend | Static build; AWS Amplify per the team's hosting guide (branch `docs/amplify-hosting`) | Sylvain |
| Email | No SMTP for the MVP (decided by Stacey, 17 Nov 2026). Alerts are queued and the relay runs, but nothing is sent; the relay answers "SMTP not configured" and the admin outbox view shows **Simulated** | Deferred |

### Free-plan limits (Supabase pricing page; verify on the day of any plan decision)

- **No backups you can restore from the dashboard.** The restore drill in §6 therefore uses a logical dump, and the fallback is a rebuild from the repository: `supabase db push --db-url "$SUPABASE_DB_URL" --include-seed` into a new project recreates the schema and the fictional demo data (proven on 17 Nov 2026, and in CI on every push). Anything entered after seeding is lost in that case.
- **Projects pause after about a week without activity.** A paused project breaks OPS-03 (the portal must stay live until 3 Dec 2026). Mitigation: upgrade to Pro before judging starts; until then, someone signs in or calls `health()` at least every few days, and checks the dashboard shows the project as active.
- **Leaked-password protection** (HaveIBeenPwned check) is a Pro feature. The security advisor still reports it disabled on 17 Nov 2026. Password length (10+) is enforced either way.

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
| Edge Function secrets | `APP_ORIGINS`, `PORTAL_URL`, `RELAY_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) |
| Supabase Vault (SQL editor) | `email_relay_url`, `email_relay_secret`, `email_relay_anon_key` (contract §4.8) |
| App settings (table `app_settings`, admin RPCs) | `demo_mfa_exempt`, `chat_demo_override`, `review_quorum`, `email_max_attempts` |

## 3. Deploying the backend to a Supabase project

Run from a clean checkout of the release commit. Each step's output goes into the run record.

1. `supabase link --project-ref <ref>` (or use the database connection string with `--db-url`).
2. `supabase migration list` — **stop** if the remote shows migrations or tables that are not in `supabase/migrations/`; ask the backend lead.
3. `supabase db push --include-seed` — applies migrations 001 onwards in order, then the fictional seed. Seed only a fresh project.
4. `node --env-file=.env scripts/set-demo-passwords.mjs` — sets `DEMO_PASSWORD` on the seeded `@demo.ceda-portal.test` accounts.
5. `supabase functions deploy attachment-url email-relay invite-staff` and set the Edge Function secrets above.
6. Create the three Vault secrets (contract §4.8) once the email relay should run.
7. Smoke test: `select public.health();` returns `ok: true` and the latest migration version; signing in as `applicant.a@demo.ceda-portal.test` shows two idea cards.

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

**Status: Not run.** Needs the hosted project to be populated first.

## 7. Recovering from common failures

| Symptom | Likely cause | Action |
|---|---|---|
| Every staff action returns `FORBIDDEN` | MFA required and the session is `aal1`, with the demo exemption off | Enrol and verify TOTP, or (demo only) set `demo_mfa_exempt` to true |
| Uploads fail with a row-level security error | Case is not a draft or an open revision, or the object path is not `<proposal_id>/<uuid>.<ext>` | Check the case status; check the client's path |
| Downloads return `FORBIDDEN` | Caller cannot read the case (expected for N1–N3, N10) | None if expected; otherwise check the assignment and declaration |
| `INVALID_STATE` on a workflow action | The case moved on (another user acted) | Refresh; the error is designed to change nothing |
| Emails not arriving | SMTP not configured, Vault secrets missing, or rows `rejected` | Check `list_email_outbox`, `cron.job_run_details`, Edge Function logs |
