# Restore drill (OPS-01)

**Recorded by:** Stacey · **Date:** 18 Nov 2026 · **Status:** **Passed** (logical backup restored into a PGlite stand-in, Postgres in WebAssembly with the platform stubbed; a restore into a Supabase project **Not run**; scope and limits below)

## Why this method

The hosted project is on the Supabase **Free plan**: there are no dashboard backups to restore from, and this machine has no Docker for a local Supabase stack (runbook §1 and §6). The drill therefore tests the recovery path that is available to us:

1. a **logical backup** of the hosted data;
2. a **rebuild from the repository** (migrations) into a brand-new, empty Postgres;
3. **loading the backup** and **verifying** it.

## Command

```bash
# SUPABASE_DB_URL (session pooler) and SUPABASE_CA_CERT (Supabase CA file) in .env; both outside git
node --env-file=.env tools/pglite-db-tests/restore-drill.mjs <backup-dir-outside-the-repo>
```

- **Backup:** read-only, one consistent snapshot (`repeatable read`), over a **TLS-verified** connection. It covers every table in `public` (each row in Postgres's own row text form, so values round-trip exactly), the Auth accounts (identity and confirmation state; **no password hashes or tokens**), and the case-reference sequence.
- **Restore:** into PGlite (Postgres compiled to WebAssembly), as the platform stub, then `supabase/migrations/*.sql` from the checkout, with **no seed**, then the backup. Triggers and FK triggers are off during the load, as `pg_restore` does for data.
- **Verify:** every table compared **row by row** with the backup; every foreign key checked for orphans; `health()`; the sequence; then every pgTAP suite on the restored data.

## Result

Run on 18 Nov 2026, 04:46 UTC (06:46 CAT), branch `test/restore-drill` (on top of #39); schema from `main` (migrations 001–011).

```
backup   snapshot 2026-11-18T04:46:00.374Z · migration 20261123110000 · 33 tables, 255 rows, 13 accounts · 55 KB
restore  11 migrations (to 20261123090000_011_slice1_contract_review.sql) + data in 3.9 s · 33 tables compared row by row, 60 foreign keys checked · reference sequence 8
health   {"ok": true, "server_time": "2026-11-18T04:46:15.191+00:00", "migration_version": null}
pgTAP    on the restored data: 460 assertions, 0 failed
RESULT   PASSED · recovery point 2026-11-18T04:46:00.374Z · recovery time 5.2 s (restore + verify, excluding the backup itself)
```

| Measure | Value |
|---|---|
| **Recovery point (RPO)** | The snapshot time. Data written after the last backup is lost; there is no continuous backup on the Free plan |
| **Recovery time (RTO)**, database rebuild + data + verification | **5.2 s** for the demo data (33 tables, 255 rows) |
| Restored content | 33/33 tables identical row by row; 60/60 foreign keys resolve; reference sequence 8 (next demo reference `CEDA-2026-0009`) |
| pgTAP on the restored data | 460 / 460 |

**The check can fail:** with `DRILL_SELFTEST=1` the drill deletes one restored row (`app_settings.review_quorum`) before verifying. It then reports `PROBLEM app_settings: 3 rows restored, 4 in the backup` and `RESULT FAILED`, exit code 1 (same morning, 04:46:37 UTC). The pgTAP suites alone stayed green on that damaged copy, which is why the row-by-row comparison is part of the drill.

The two backup files were deleted after the run (they hold account e-mails).

## Limits (stated, not hidden)

| Not covered | Why / what to do |
|---|---|
| **Storage objects** (proposal files, the demo template) | Not part of any database backup on Supabase. Demo files are fictional and re-creatable; for real use, schedule an object-storage copy (runbook §6) |
| A restore into a **real Supabase project** (Auth, Storage, PostgREST, Edge Functions running) | The target here is Postgres only. The rebuild into a real project is `supabase db push --include-seed` (proven on 17 Nov for the hosted project and in CI on every push); loading backed-up data there is **Not run** |
| **Auth identities** (`auth.identities`) | Only `auth.users` is copied. On a real Supabase restore, email sign-in also needs each account's identity row; recreate them (or re-invite) before anyone signs in |
| Account count after restore | The backup holds 13 accounts, but the drill compares the `public` tables only; the accounts are loaded, not compared |
| Passwords | Not in the backup by design. After a restore, accounts need a password reset (demo accounts: `scripts/set-demo-passwords.mjs`) |
| `health().migration_version` is `null` on the restored copy | PGlite has no `supabase_migrations` history table; on Supabase `db push` records it |
| Schema 012 and 013 | The restore used `main` (001–011). Hosted is at 013, but 012 and 013 change functions only, not tables, so the data loads unchanged |
| Scale | 255 rows of demo data. Real volumes would need streaming (`COPY`) rather than one JSON file |
