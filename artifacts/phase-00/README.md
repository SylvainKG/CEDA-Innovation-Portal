# Phase 0 evidence — Foundation

**Phase:** 0 (14–15 Nov 2026) · **Coordinator:** Sylvain · **Decision:** Pending (Accept / Reject)
**Commit tested:** — · **Environments:** local ×4, CI, staging · **Recorded by:** —

## Exit checklist (blueprint §5, Phase 0)

| Item | Owner | Status | Evidence |
|---|---|---|---|
| D-01, D-02, D-07, D-14, D-16, D-35 closed and recorded (BCR-001 Part C) | All; Sylvain records | Not run | |
| Repo rules agreed (`docs/process/repository-rules.md`) | Sylvain | Not run | |
| `main` protected and review rules applied, **or** "by agreement" recorded (plan limitation) | Sylvain | Not run | |
| CI running: lint, type-check, Vitest, pgTAP, secret scan, `npm audit` | Sylvain | Not run | CI run link |
| Supabase staging project, Amplify staging (`hosting-aws-amplify.md`), `.env.example`, health check | Stacey + Sylvain | Supabase part Passed: hosted project `hncwpxyuolfxafbemapb` (EU Central) migrated and seeded, `health()` ok, 457/457 pgTAP on the hosted database; Amplify part: Sylvain | Contract §9 on PR #29 (commits `4799517`, `a893898`) |
| Amplify inventory and access recorded (account alias, region, branches, env var names, second AWS user, MFA, budget alert) | Sylvain | Not run | |
| Migration 001: core tables, RLS default-deny, audit/immutability triggers, `has_permission()` | Stacey | Passed (Supabase local stack in CI; not yet on the hosted project) | Workflow `Database`, run 43907353789, commit `cc7c6bb` on `db/security-checks`, 16 Nov 2026 16:25 UTC: `supabase start` applied migrations 001–010 and the seed; `supabase test db` passed every pgTAP file (incl. `001_foundation`, `010_security_privileges`). Branch not merged yet |
| Seed script (fictional, `DEMO_PASSWORD` from env), one user per role | Stacey | Passed (Supabase local stack in CI) | Same run. `supabase/seed.sql` + `scripts/set-demo-passwords.mjs` (passwords set from `DEMO_PASSWORD`; the script itself not yet run against a project) |
| API contract doc + generated TS types | Stacey (author), Obvious (review) | Contract in review (PR #21); generated types Passed in CI (workflow `Database`, run 44054597509 on `86cf5d7`, artifact `database-types`); not yet generated from the hosted project | `docs/blueprint/03-api-contracts-and-permissions.md` (PR #21 for Slice 1; full contract on `db/security-checks`, PR #29) |
| Figma MCP verified; inventory, T01–T15 mapping, gap list, backlog | Sandra | Not run | |
| `figma-handoff/` first snapshot | Sandra | Not run | |
| Tokens → Tailwind theme; shell + navigation skeleton; state kit | Obvious | Not run | |
| Region latency measured (D-14) | Stacey + Sylvain | Partly run: EU Central (hosted project) p50 263 ms, p95 315 ms; Mumbai comparison Not run | `region-latency.md` |
| Every member runs the same commit locally | All | Not run | Table below |

## Same commit on every machine

Commit: `__________`

| Member | OS | Node / npm | Docker | Supabase CLI | `npm ci` | `supabase start` | `db reset` | lint | typecheck | test | build | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sandra | | | | | | | | | | | | |
| Obvious | | | | | | | | | | | | |
| Stacey | Windows 11 Pro (10.0.26200) | 25.0.0 / 11.6.2 | Not installed | 2.108.0 | Passed (451 packages) | Not run (no Docker) | Not run (no Docker); covered by CI run 43907353789 | Passed | Passed | Passed (55/55) | Passed | Run on `621307e` (origin/main), 16 Nov 2026. Database checks also pass on the PGlite stand-in (`tools/pglite-db-tests`, 457/457 on `cc7c6bb`) |
| Sylvain | | | | | | | | | | | | |

## Results summary

- Automated: see `automated-test-summary.txt` (CI run link and quoted result lines)
- Security/isolation status: no workflow yet. Secret scan result: —
- Defects: see `defects.md`
- Branch protection: enforced by GitHub / by agreement (delete one)
