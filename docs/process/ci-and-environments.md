# CI and environments plan

**Owner:** Sylvain (CI, release) with Stacey (Supabase) · **Status:** Draft for team review · 15 Nov 2026
**Implements:** blueprint §5 Phase 0, D-14, D-17, D-40, D-42 · Evidence skill: "Delivery application"
CI (§2) is live; other items stay **Not run** until they have a run record in `artifacts/phase-NN/`.

---

## 1. Environments

| Environment | What runs | Database | Who deploys | Data |
|---|---|---|---|---|
| **Local** | `npm run dev` + Supabase CLI local stack (Docker) | Local Postgres from migrations + seed | Each developer | Fictional seed |
| **CI** | GitHub Actions on every PR and push to `main` | Disposable local Supabase stack inside the job | Automatic | Fictional seed / test fixtures |
| **Preview** | None: Amplify pull request previews are off (`hosting-aws-amplify.md` §3) | — | — | — |
| **Staging** | AWS Amplify deployment of `main` | Staging Supabase project | Automatic on merge to `main` | Fictional seed + demo runs |
| **Judging** | AWS Amplify deployment of the `release` branch (the release commit) | Supabase **Pro** project, region per D-14 | Sylvain (release), Stacey (Supabase) | Fresh fictional seed; wiped after judging (D-15) |

**Hosting:** AWS Amplify replaces Vercel (proposed D-44). Set-up, ownership and the Supabase side are in [`hosting-aws-amplify.md`](hosting-aws-amplify.md).

## 2. CI pipeline (D-42)

Maintained by Sylvain. All three stages are live: **stage 1** (`secrets`) and **stage 2** (`lint`, `typecheck`, `unit`, `build`, `audit`) in `.github/workflows/ci.yml`; **stage 3** (database) in `.github/workflows/db.yml` (Stacey). Since 20 Nov 2026 the `main` ruleset requires seven checks: `secrets`, `lint`, `typecheck`, `unit`, `build`, `audit` and **`Database gate`**. `e2e` is not required (it tests the deployed site). Node version comes from `.nvmrc`; dependencies are installed with `npm ci` from the committed lockfile.

| Job | Command (proposed) | Required for merge from | Notes |
|---|---|---|---|
| `lint` | `npm run lint` (ESLint) | **Required** (since 20 Nov 2026) | Includes a rule forbidding `supabase-js` imports outside `src/lib/api/` (evidence skill, architecture mapping) |
| `typecheck` | `npm run typecheck` (`tsc --noEmit`) | **Required** (since 20 Nov 2026) | |
| `unit` | `npm run test` (Vitest, run mode) | **Required** (since 20 Nov 2026) | |
| `build` | `npm run build` (type-check + Vite production build), with `VITE_API_MODE=mock` set explicitly | **Required** (since 20 Nov 2026) | Catches build-only failures the other jobs miss |
| `db` (`.github/workflows/db.yml`: PGlite stand-in, Supabase local stack with `supabase test db`, `deno check`) | Migrations + seed + pgTAP; Edge Function type check | **`Database gate` is required** in the `main` ruleset (since 20 Nov 2026); the three jobs behind it are not required on their own | Runs on every pull request. The gate passes at once when no file under `supabase/`, `tools/pglite-db-tests/` or `db.yml` changed, and otherwise only when all three database jobs pass, so a required database check never blocks other PRs (issue #14, item 1). Disposable database; needs no secrets. Seed reads `DEMO_PASSWORD` from a CI-only dummy value |
| `secrets` | Secret scanner over the PR diff and full history (e.g. gitleaks) | **Required** (from Phase 0) | Covers R-10 |
| `audit` | `npm audit --omit=dev --audit-level=high` (packages that ship in the built site); the full report, dev tooling included, is saved as a job artifact and listed in the job summary | **Required** (since 20 Nov 2026) | The report feeds SEC-02. A high or critical finding in a shipped package blocks merge. One in dev-only tooling (build, test, lint) does not block, but must be recorded with a reason in ADR-001 and upgraded once a fix exists (since 18 Nov 2026: GHSA-fc5q-39xc-vjpf in `picomatch`, no patched version) |
| `e2e` | Playwright against staging, `--trace off` | **Not required** for merge; runs after deploy to staging and on demand | Chrome, Edge, Firefox + one mobile viewport (QA-01). Results go to `artifacts/phase-NN/` |
| `keep-alive` (`.github/workflows/keep-alive.yml`) | `POST /rest/v1/rpc/health` with the publishable key, every second day at 06:17 UTC, and on demand | Not a merge check | Keeps the Free-plan project from pausing until judging ends (OPS-03). Needs the `SUPABASE_URL` variable and the `SUPABASE_PUBLISHABLE_KEY` secret, set by a repository admin. Fails if the project does not answer `ok: true` |

**Rules:**
- CI never receives production or staging secrets for the jobs above. The `e2e` job needs staging demo account passwords, held in GitHub Actions secrets, never in the repo.
- A failing required job blocks merge. Nobody skips, disables or quarantines a test to get green; a flaky test is fixed or logged as a defect.
- CI run links are quoted in the evidence for each phase.

## 3. Configuration and secrets (D-17, D-40)

`.env.example` lists **names only**:

| Variable | Used by | Where the real value lives | Reaches the browser? |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | Amplify environment variables (per branch); local `.env` | Yes (public by design) |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Amplify environment variables (per branch); local `.env` | Yes (public by design; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions only | Supabase Edge Function secrets | **Never** |
| `DEMO_PASSWORD` | Seed script only | Local `.env`; CI secret; set once per environment | **Never** |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Email relay Edge Function | Supabase Edge Function secrets | **Never** |
| `VITE_API_MODE` | Frontend: `mock` or `supabase`; production builds fail if it is missing | Amplify environment variables (per branch); local `.env` | Yes (not secret) |
| `DEMO_MFA_EXEMPT` | Feature flag for D-07 | Environment config | No |

The frontend validates its configuration at startup (Zod) and fails with a clear message if a value is missing.

## 4. Health check

- **Frontend:** the deployed app loads `/` and shows the DEMO badge.
- **Backend:** a read-only RPC `health()` returns `{ ok, migration_version, server_time }` with no confidential data. It is called by the uptime monitor (OPS-01) and by the Phase 0 smoke test.
- Health check RPC is proposed to Stacey for the API contract.

## 5. Region latency test (D-14)

Method, run from a machine in Gaborone or on a Botswana network if anyone has one; otherwise record where it was run from:
1. Create two free throwaway Supabase projects, one in an EU region and one in Mumbai.
2. From the same machine and network, send 30 sequential requests to each project's REST health endpoint at two times of day.
3. Record p50 and p95 round-trip time, the network type and the location in `artifacts/phase-00/region-latency.md`.
4. Choose the region with the lower p95; delete the throwaway projects.

The numbers are recorded as measured. No estimate goes into D-14.

## 6. Phase 0 "same commit everywhere" check

Every member records one row in `artifacts/phase-00/README.md` for the same commit SHA: OS, Node, npm, Docker, Supabase CLI versions, then the result of `npm ci`, `supabase start`, `supabase db reset`, lint, type-check, tests and `npm run build`. Phase 0 exits when all four rows pass, or a failure is logged with an owner.

## 7. Release (Phase 7, coordinator Sylvain)

- **Code freeze:** 22 Nov 2026, 18:00 CAT. After that, only fixes for defects found in the demo run.
- The release commit is tagged (e.g. `v1.0-judging`). That exact SHA is deployed to judging and named in every evidence record, the README and the release recommendation.
- Before upload: one full main journey and one permission-denied journey on the **hosted** build, recorded with the SHA.
- The source package excludes `.env`, `node_modules`, build output and large binaries, and must be 150 MB or less. Licence list generated from the lockfile.
- Upload by **12:00 CAT on 23 Nov 2026** (hard cut-off 17:00).
