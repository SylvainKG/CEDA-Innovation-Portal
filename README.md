# CEDA-Innovation-Portal
CEDA Innovation hackathon portal

A demonstration prototype for the CEDA Innovation Portal Hackathon (Botswana). It shows how a confidential innovation proposal moves from submission through screening, evaluation, feedback, revision, decision and award. **All data is fictional. It is not a production system.**

Planning documents: `docs/blueprint/` (MVP blueprint, UI/UX specification) and `docs/design/figma-handoff/`.

## Start here

| If you want to | Read or run |
|---|---|
| Try the portal as a judge | [`docs/submission/judge-guide.md`](docs/submission/judge-guide.md) (demo accounts, the main journey, access checks) |
| Understand the design and evidence | [`docs/submission/technical-proposal.md`](docs/submission/technical-proposal.md) and [`docs/testing/claim-register.md`](docs/testing/claim-register.md) |
| Install and run it locally | `scripts/install.sh --serve` (below) |
| Deploy or operate it | [`docs/runbook.md`](docs/runbook.md) and [`docs/process/hosting-aws-amplify.md`](docs/process/hosting-aws-amplify.md) |
| Read the data-handling note | [`docs/submission/data-handling-note.md`](docs/submission/data-handling-note.md) |
| See the Figma designs (PDF, one screen per file) | [`Figma pdf/`](Figma%20pdf/) (index in its README); build snapshots in [`docs/design/figma-handoff/snapshots/`](docs/design/figma-handoff/snapshots/) |
| Change the logo or brand name | [`docs/design/brand.md`](docs/design/brand.md) (one file, `src/brand/index.ts`, plus favicons and the page title) |

**Quick install** (Node.js 20.19 or later, npm 10 or later; no backend, Docker or credentials needed):

```bash
scripts/install.sh --serve   # npm ci, lint, type-check, tests, demo build, then http://localhost:4173
```

## Frontend

React 18 + TypeScript + Vite, Tailwind CSS, Radix UI, React Router 7, TanStack Query, Vitest. Architecture decisions are in [`docs/adr/ADR-001-frontend-architecture.md`](docs/adr/ADR-001-frontend-architecture.md).

### Requirements
- Node.js 24 (see `.nvmrc`; at least 20.19)
- npm 10 or later

### Setup
```bash
npm ci
cp .env.example .env    # names only; VITE_API_MODE=mock needs no backend
npm run dev             # http://localhost:5173
```

### Scripts
| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run typecheck` | TypeScript check only |
| `npm run lint` | ESLint (including the rule that only `src/lib/api/` may import Supabase) |
| `npm run test` | Unit and component tests (Vitest) |
| `npm run test:e2e -- --trace off` | Browser tests (Playwright, 360 and 1280 px) against a local mock build, or a deployed site with `E2E_BASE_URL` |

### Environment variables (names only)
| Name | Purpose |
|---|---|
| `VITE_API_MODE` | `mock` (typed mock adapters, fictional data, no backend) or `supabase` (the real backend: Supabase Auth, RLS and the workflow RPCs) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase project URL and publishable key, needed when `VITE_API_MODE=supabase` (public by design; RLS protects data). Never the service-role key |

### Mock session (development only)
With `VITE_API_MODE=mock`, the sign-in page also offers fictional demo personas so the team can preview each role. **This is not authentication** and grants no access to real data. With `VITE_API_MODE=supabase`, sign-in is Supabase Auth with the seeded demo accounts (`docs/submission/judge-guide.md`).

### Project structure
```
src/
  components/       shared components and the state kit (owned by the frontend lead; see .github/CODEOWNERS)
  layouts/          public, applicant and staff shells
  navigation/       role navigation from docs/design/figma-handoff/navigation-map.md
  routes/           route table and route guards (UI convenience; the server enforces access)
  lib/api/          typed API ports and adapters (the only place allowed to talk to Supabase)
  lib/              status wording, CAT date formatting, helpers
  pages/            screens, one folder per area (public, auth, applicant, staff, review, admin, support, oversight, help)
  brand/            the logo, name and tagline, in one place (docs/design/brand.md)
  styles/           design tokens (tokens.css) and base styles
```

## Backend (Supabase)

Postgres schema, row-level security, workflow functions and the demo seed live in `supabase/`. Reads go through tables protected by RLS; every change goes through a database function (blueprint D-02). Contracts, error codes and the permission matrix: [`docs/blueprint/03-api-contracts-and-permissions.md`](docs/blueprint/03-api-contracts-and-permissions.md).

```
supabase/
  migrations/       one numbered sequence (owner: backend lead)
  seed.sql          fictional demo data: one account per role, 8 cases (demo case becomes CEDA-2026-0009)
  tests/database/   pgTAP tests (access isolation, negatives N1–N11, idempotency, append-only history)
  functions/        Edge Functions (attachment-url: 60-second download links; email-relay: outbox sender; invite-staff)
scripts/            set-demo-passwords.mjs (sets DEMO_PASSWORD on seeded accounts through the Auth admin API)
tools/pglite-db-tests/  runs migrations + seed + pgTAP without Docker (stand-in, not the Supabase stack)
```

### Local database (needs Docker and the Supabase CLI)
```bash
supabase start
supabase db reset          # migrations + seed
supabase test db           # pgTAP
node --env-file=.env scripts/set-demo-passwords.mjs   # needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD
```

### Without Docker
```bash
cd tools/pglite-db-tests && npm ci && npm test   # npm ci keeps the committed lockfile unchanged
```

### Backend environment variables (names only)
| Name | Where | Purpose |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Local `.env` for scripts; Supabase injects them into Edge Functions | Admin operations. **Never** in the browser or the repo |
| `DEMO_PASSWORD` | Local `.env`; CI secret | Password for seeded demo accounts (D-17) |
| `APP_ORIGINS` | Edge Function secret | Comma-separated browser origins allowed to call `attachment-url` |
| `RELAY_SECRET` | Edge Function secret | Shared secret the scheduler sends as `x-relay-secret` to `email-relay` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Edge Function secrets | SMTP for `email-relay`. Unset = no email is sent and the outbox is shown as Simulated |
| `PORTAL_URL` | Edge Function secret | Link in emails and the staff invitation redirect |
| `SUPABASE_DB_URL` | Local `.env` only (backend lead) | Session-pooler URL of the hosted project, for the hosted test runner, the restore drill and the reset tool |
| `SUPABASE_CA_CERT` | Local `.env` only | Path to the Supabase CA certificate file (kept outside the repo); those tools verify TLS with it and stop without it |
| `STAGING_PROJECT_REF` | Local `.env` only | The project the staging reset tool may act on; it refuses any other project, and refuses after code freeze (#68) |
