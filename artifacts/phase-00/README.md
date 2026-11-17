# Phase 0 evidence — Foundation

**Phase:** 0 (14–15 Nov 2026) · **Coordinator:** Sylvain · **Decision:** Pending (Accept / Reject)
**Commit tested:** `f126c10` (main, 17 Nov) unless a row says otherwise · **Environments:** local, CI (GitHub Actions), staging (AWS Amplify) · **Recorded by:** Sylvain, 17 Nov 2026

## Exit checklist (blueprint §5, Phase 0)

| Item | Owner | Status | Evidence |
|---|---|---|---|
| D-01, D-02, D-07, D-14, D-16, D-35 closed and recorded (BCR-001 Part C) | All; Sylvain records | In progress: Obvious signed off all six (PR #3 review, recorded in BCR-001 by PR #7); D-04 confirmed by the project owner; D-44 (Amplify) and BCR-002 signed off by Obvious (PRs #10, #11). Sandra, Stacey and Sylvain sign-offs outstanding | `docs/blueprint/change-requests/BCR-001…`, `BCR-002…` |
| Repo rules agreed (`docs/process/repository-rules.md`) | Sylvain | In place: merged in PR #3; `CODEOWNERS` and the PR template active; squash-only merges since PR #4 | PRs #3, #4–#15 |
| `main` protected and review rules applied, **or** "by agreement" recorded (plan limitation) | Sylvain | **Passed (enforced by GitHub).** The repository is public, so the `main` ruleset is enforced: on 16 Nov it blocked PR #4 with "Review required", the required `secrets` check and "out-of-date with the base branch". Required stage-2 checks (`lint`, `typecheck`, `unit`, `build`, `audit`): to be confirmed by the repository owner | PR #4 merge box (screenshot shared 16 Nov); every merge since needed an approval |
| CI running: lint, type-check, Vitest, pgTAP, secret scan, `npm audit` | Sylvain | **Passed except pgTAP on `main`.** `secrets`, `lint`, `typecheck`, `unit` (Vitest), `build` and `audit` run on every PR and push to `main`. pgTAP runs in Stacey's `Database` workflow on the `db/*` branches (not on `main` yet) | [CI on `main` `f126c10`, run 44047975587](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44047975587) (all 6 jobs passed); [Database, run 43907353789](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/43907353789) on `db/security-checks` |
| Supabase staging project, Amplify staging (`hosting-aws-amplify.md`), `.env.example`, health check | Stacey + Sylvain | **Amplify staging: Passed (frontend, mock mode).** Supabase staging project, the `health()` check and the frontend↔backend connection: Not run | [E2E against `https://main.d270qrk6a7zs47.amplifyapp.com`, run 44048702417](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44048702417): `20 passed (5.9s)` on `f126c10`, including deep links (SPA rewrite). Security headers: [run 44051061592](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44051061592) (branch `test/e2e-security-headers`): `24 passed, 4 skipped`. HTTPS, all six `customHttp.yml` headers, and `/`, `/staff`, `/ideas/123` answering 200 with HTML |
| Amplify inventory and access recorded (account alias, region, branches, env var names, second AWS user, MFA, budget alert) | Sylvain | Not run | |
| Migration 001: core tables, RLS default-deny, audit/immutability triggers, `has_permission()` | Stacey | Not run | |
| Seed script (fictional, `DEMO_PASSWORD` from env), one user per role | Stacey | Not run | |
| API contract doc + generated TS types | Stacey (author), Obvious (review) | Not run | |
| Figma MCP verified; inventory, T01–T15 mapping, gap list, backlog | Sandra | Done: inventory, mapping, gap list and backlog merged (PR #4). MCP: **manual fallback** (Starter plan; D-35) | `docs/design/figma-handoff/` |
| `figma-handoff/` first snapshot | Sandra | Not run | |
| Tokens → Tailwind theme; shell + navigation skeleton; state kit | Obvious | **Passed** (independent re-check) | PR #6 review comments: 55 unit tests, browser check at 360/1280 px; now covered by the E2E smoke suite |
| Region latency measured (D-14) | Stacey + Sylvain | Not run | `region-latency.md` |
| Every member runs the same commit locally | All | Not run | Table below |

## Same commit on every machine

Commit: `__________`

| Member | OS | Node / npm | Docker | Supabase CLI | `npm ci` | `supabase start` | `db reset` | lint | typecheck | test | build | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sandra | | | | | | | | | | | | |
| Obvious | | | | | | | | | | | | |
| Stacey | | | | | | | | | | | | |
| Sylvain | Ubuntu 24.04 (cloud container) | 22.23.4 / 10.9.9 | 29.9.2 | Not installed | Passed | Not run | Not run (PGlite stand-in: 457 assertions passed on `db/security-checks`, 16 Nov) | Passed | Passed | Passed (55/55) | Passed | Commit `f126c10` (17 Nov) |

## Results summary

- Automated: CI on `main` run 44047975587 (6 jobs passed); E2E against staging run 44048702417 (`20 passed`).
- Security/isolation status: database layer Passed on Stacey's branches (CI run 43907353789; 457 pgTAP assertions re-run independently in PGlite, with a mutation check that fails 17 isolation assertions when access control is broken). Browser N-tests: Not run (screens not connected yet). Secret scan: Passed on every PR and on `main`.
- Defects: none open from Phase 0. Review findings tracked on PRs #16, #18 and issue #14.
- Branch protection: **enforced by GitHub** (public repository, ruleset active).
