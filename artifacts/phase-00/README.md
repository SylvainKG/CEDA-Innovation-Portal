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
| Supabase staging project, Vercel staging, `.env.example`, health check | Stacey + Sylvain | Not run | |
| Migration 001: core tables, RLS default-deny, audit/immutability triggers, `has_permission()` | Stacey | Not run | |
| Seed script (fictional, `DEMO_PASSWORD` from env), one user per role | Stacey | Not run | |
| API contract doc + generated TS types | Stacey (author), Obvious (review) | Not run | |
| Figma MCP verified; inventory, T01–T15 mapping, gap list, backlog | Sandra | Not run | |
| `figma-handoff/` first snapshot | Sandra | Not run | |
| Tokens → Tailwind theme; shell + navigation skeleton; state kit | Obvious | Not run | |
| Region latency measured (D-14) | Stacey + Sylvain | Not run | `region-latency.md` |
| Every member runs the same commit locally | All | Not run | Table below |

## Same commit on every machine

Commit: `__________`

| Member | OS | Node / npm | Docker | Supabase CLI | `npm ci` | `supabase start` | `db reset` | lint | typecheck | test | build | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sandra | | | | | | | | | | | | |
| Obvious | | | | | | | | | | | | |
| Stacey | | | | | | | | | | | | |
| Sylvain | | | | | | | | | | | | |

## Results summary

- Automated: see `automated-test-summary.txt` (CI run link and quoted result lines)
- Security/isolation status: no workflow yet. Secret scan result: —
- Defects: see `defects.md`
- Branch protection: enforced by GitHub / by agreement (delete one)
