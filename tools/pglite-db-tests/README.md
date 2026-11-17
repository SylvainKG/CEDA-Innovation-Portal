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

**Mutation check:** `MUTATE="<sql>" npm test` applies extra SQL after the seed. For example, replacing `private.can_read_case` with `select true` should make the isolation tests fail.
