# PGlite database tests (stand-in)

Runs `supabase/migrations/*.sql`, `supabase/seed.sql` and the pgTAP files in `supabase/tests/database/` inside [PGlite](https://pglite.dev), which is Postgres compiled to WebAssembly. Use it on a machine without Docker.

```bash
cd tools/pglite-db-tests
npm install
npm test            # every test file
npm test -- 002     # only files whose name contains "002"
```

**What it proves:** the SQL is valid, the migrations and seed apply in order, and the pgTAP assertions hold on Postgres 18 with RLS and grants enforced. Identities are simulated with `request.jwt.claims` and `SET ROLE authenticated`, the same way `supabase test db` tests run.

**What it does not prove:** Auth, Storage, PostgREST, Realtime and Edge Functions are stubbed (`supabase-stub.sql`). Supabase runs Postgres 17. The authoritative run is `supabase db reset && supabase test db` on the real local stack (CI stage 3). Record results from this tool as "PGlite stand-in", never as a staging or CI run.

## Running the same tests on the hosted project

```bash
# from the repo root; SUPABASE_DB_URL in .env is the session-pooler URL (never committed)
node --env-file=.env tools/pglite-db-tests/run-hosted.mjs          # every file
node --env-file=.env tools/pglite-db-tests/run-hosted.mjs 002      # only "002"
```

It needs two settings in `.env` (both outside git): `SUPABASE_DB_URL`, the session-pooler URL, and `SUPABASE_CA_CERT`, the path to the project's CA certificate (Dashboard → Database settings → SSL configuration). The server certificate is always verified; without the certificate the runner stops.

Each test file rolls itself back. The case-reference sequence is restored afterwards, never below the highest reference that exists. Record the output as **hosted**, with the commit, the UTC time and the `TOTAL` line (for example `artifacts/phase-00/hosted-supabase.md`).

**Rules:**
- **Staging only, when nobody is using it.** The tests change rows inside their own transactions.
- **Never against the judging project after code freeze (22 Nov 2026, 18:00 CAT).** For judging, use `health()` and read-only checks.
- Apply only migrations that are already on `main` before running it, so the hosted project matches the repository.

## Snapshot and exact reset around a staging test run

```bash
node --env-file=.env tools/pglite-db-tests/staging-reset.mjs snapshot <file-outside-the-repo>
# ... run the tests that write real data (for example the browser journey, issue #61) ...
node --env-file=.env tools/pglite-db-tests/staging-reset.mjs reset <same-file> --confirm
```

`snapshot` is read-only. `reset` removes only the rows and Storage objects that are **not** in the snapshot, inside one transaction (protective triggers paused, then re-enabled), restores the reference sequence, and **commits only if every table is identical to the snapshot row by row**; otherwise it rolls back and nothing changes. It never edits rows that existed in the snapshot. Files need `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (the JWT service-role key; Storage refuses the `sb_secret_` key). Staging only; never against the judging project after code freeze. Delete the snapshot afterwards (it holds account e-mails). First used on 20 Nov for the #61 main journey (record in `artifacts/phase-00/hosted-supabase.md`).

**Mutation check:** `MUTATE="<sql>" npm test` applies extra SQL after the seed. For example, replacing `private.can_read_case` with `select true` should make the isolation tests fail.
