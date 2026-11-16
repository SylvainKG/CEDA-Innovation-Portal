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

### Hosting (team review site)
The `main` branch is built and published by **AWS Amplify Hosting** at <https://main.d270qrk6a7zs47.amplifyapp.com/> on every push to `main`. The build steps and security headers are in [`amplify.yml`](amplify.yml).

- The site runs in `mock` mode (fictional data, no backend) until `VITE_API_MODE` and the Supabase variables are set in the Amplify environment variables.
- Deep links need one rewrite rule in the Amplify console; it is documented at the top of `amplify.yml`.
- The development-only component gallery is at `/dev/components`.

