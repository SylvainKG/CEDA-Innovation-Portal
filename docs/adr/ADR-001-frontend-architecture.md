# ADR-001 Frontend architecture

**Status:** Proposed (needs team approval in the scaffold PR) · **Author:** Obvious (frontend) · **Date:** 16 Nov 2026

## Context

Blueprint v0.3 (D-01) fixes React 18 + TypeScript + Vite + Tailwind + Radix, with Supabase behind the API and Vercel hosting. It leaves several frontend choices open: routing, server-state handling, how mocks are wired before the backend exists, testing, and how the "only the API layer talks to Supabase" rule is enforced.

The design source is a Figma Make prototype (TASK-01). Its colours and typeface are approved; its type scale and several contrasts fail the spec's accessibility requirements.

## Decision

| Concern | Choice | Why |
|---|---|---|
| Routing | React Router 7 in library mode (`createBrowserRouter`) | One route table (`src/routes/router.tsx`) transcribed from `navigation-map.md`. v7 because v6 has an open-redirect advisory with no 6.x fix (npm audit, 16 Nov 2026). The post-sign-in `next` path is also validated (`src/lib/safe-redirect.ts`) |
| Server state | TanStack Query 5 | Caching, loading and error states, and invalidation from Realtime events later. **Mutations are never retried automatically**: a retry must reuse the same request key (evidence skill, principle 8) |
| API boundary | Typed ports in `src/lib/api/`, with adapters chosen once from `VITE_API_MODE` (`mock` today). Only workflow operations from the approved API contract will be added | Screens never depend on Supabase directly; mocks can be swapped without changing UI. Unknown modes fail fast |
| Enforcement | ESLint `no-restricted-imports` forbids `@supabase/supabase-js` outside `src/lib/api/` | Makes the architecture rule checkable in CI (`docs/process/ci-and-environments.md`) |
| Styling | Tailwind 3 mapped to CSS variables in `src/styles/tokens.css`. No raw colours in components | One place for visual values; a brand change edits values only (D-32) |
| Typography | Inter (self-hosted via Fontsource) on the spec scale (16 px body and inputs, 14 px small) | Make's 7–10 px text fails the spec. Self-hosting avoids a third-party font request on confidential pages |
| Components | Own components on Radix primitives where behaviour is hard (Dialog); native elements where they are already accessible (select, file input) | Accessibility with less code |
| Icons | Lucide, always with a visible or screen-reader text label | Spec §3.3 |
| Session before Auth exists | Mock session adapter with fictional personas and a development-only role switcher, clearly labelled | Lets the team review role shells now; grants no access to data |
| Unbuilt screens | Routes render an honest "Not built yet: Txx" placeholder | No decorative UI pretending to work |
| Tests | Vitest 5 + Testing Library (jsdom); stable roles and names for Sylvain's Playwright tests | Matches the test plan. Vitest 5 because earlier versions carry critical advisories (Tinypool, mocker) |

## Alternatives considered

- **Next.js:** rejected in the blueprint (D-01) because access rules would live in app code.
- **Radix Select:** rejected for now; the native select is accessible and better on mobile.
- **Tailwind 4:** possible later; v3 chosen for stable tooling during the build.
- **Google Fonts link:** rejected; it adds a third-party request on pages showing confidential data.

## Consequences

- Workflow screens wait for the API contract (`03-api-contracts-and-permissions.md`). Until then, only presentation, navigation and the state kit are built.
- Router tests use `MemoryRouter` + `useRoutes` with the same route table: the data router's `Request`/`AbortSignal` does not work under jsdom on Node 24.
- ESLint 9 is end-of-life upstream (npm warns). We stay on 9 until the React plugins support 10.
- `npm audit` leaves 7 **moderate** findings in development-only lint tooling (typescript-eslint → minimatch). `npm audit --audit-level=high` passes. Recorded as debt, to revisit when typescript-eslint ships a fix.

## Required evidence

Type-check, lint, unit tests and build pass in CI (D-42). The rendering checks at 360 and 1280 px are recorded in the scaffold PR.

## Revisit trigger

The API contract lands (add Supabase adapters); a router or major-version upgrade; CEDA brand guidance arrives.
