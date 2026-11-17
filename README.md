# CEDA-Innovation-Portal
CEDA Innovation hackathon portal

A demonstration prototype for the CEDA Innovation Portal Hackathon (Botswana). It shows how a confidential innovation proposal moves from submission through screening, evaluation, feedback, revision, decision and award. **All data is fictional. It is not a production system.**

Planning documents: `docs/blueprint/` (MVP blueprint, UI/UX specification) and `docs/design/figma-handoff/`.

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

### Environment variables (names only)
| Name | Purpose |
|---|---|
| `VITE_API_MODE` | `mock` (typed mock adapters, no backend). `supabase` arrives with the API contract |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase project (public by design; RLS protects data). Not used yet |

### Mock session (development only)
With `VITE_API_MODE=mock`, the sign-in page offers fictional demo personas so the team can preview each role's navigation. **This is not authentication** and grants no access to data. Real sign-in arrives with Supabase Auth.

### Project structure
```
src/
  components/       shared components and the state kit (owned by the frontend lead; see .github/CODEOWNERS)
  layouts/          public, applicant and staff shells
  navigation/       role navigation from docs/design/figma-handoff/navigation-map.md
  routes/           route table and route guards (UI convenience; the server enforces access)
  lib/api/          typed API ports and adapters (the only place allowed to talk to Supabase)
  lib/              status wording, CAT date formatting, helpers
  pages/            screens (unbuilt routes show an honest "Not built yet" placeholder)
  styles/           design tokens (tokens.css) and base styles
```

## Backend (Supabase)

Postgres schema, row-level security, workflow functions and the demo seed live in `supabase/`. Reads go through tables protected by RLS; every change goes through a database function (blueprint D-02). Contracts, error codes and the permission matrix: [`docs/blueprint/03-api-contracts-and-permissions.md`](docs/blueprint/03-api-contracts-and-permissions.md).

```
supabase/
  migrations/       one numbered sequence (owner: backend lead)
  seed.sql          fictional demo data: one account per role, 8 cases (demo case becomes CEDA-2026-0009)
  tests/database/   pgTAP tests (access isolation, negatives N1–N10, idempotency, append-only history)
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
cd tools/pglite-db-tests && npm install && npm test
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
