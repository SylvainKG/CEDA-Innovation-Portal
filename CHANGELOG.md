# Changelog

Classification follows the evidence-led skill: `feature`, `refactor`, `repair`, `policy change`.

## [Unreleased]

- `feature` Slice 1 data layer, mock only (APP-01, APP-02, APP-03; no screens yet):
  - types for the form schema, draft, attachments and receipt, copied from the API contract (Stacey, Draft for review, `db/phase-0-foundation`);
  - `SubmissionPort` mapping one-to-one to the documented reads and RPCs (`save_draft`, `register_attachment`, `remove_attachment`, `submit_proposal`, `get_submission_receipt`);
  - RPC error mapping: a known code is a refusal with field errors; a lost reply on a keyed command is an unknown outcome, never "failed";
  - submit request keys kept per draft until a receipt arrives (contract §4.1 rule 1);
  - client form check mirroring the server's rules and wording, plus completeness counts;
  - mock adapter following the contract's check order, idempotent replay, `REQUEST_CONFLICT`, first reference `CEDA-2026-0009` (B10), and a lost-reply switch for testing the unknown path. Fixtures copied from the seed.

  Evidence: 17 new unit tests (72 in total), lint, type-check and build pass. Proves the mock only; server behaviour is evidenced by the pgTAP suites.
- `feature` Browser test harness (QA-01, SEC-02 groundwork): Playwright `1.63.0` with `npm run test:e2e`, projects at 360 px and 1280 px, local mock-mode build by default or `E2E_BASE_URL` for a deployed site. First suite `tests/e2e/shell-smoke.spec.ts` (10 checks × 2 widths): one h1 and the DEMO label per page, no horizontal scroll, skip link focus and outline, signed-out redirect, Forbidden and Not-found states, 44 px targets. Separate `E2E` workflow (not required yet). Vitest now only collects `src/**` tests.

  Evidence: 20 passed locally (Ubuntu, Node 22); the workflow run on the PR.

- `feature` Slice 1 components (UX-01, APP-03 presentation only):
  - ReferencePill (copyable), StageTimeline (5 stages; Feedback only when it occurred), IdeaCard, ReceiptCard;
  - Banner (one style for all messages), CompletenessMeter (INN-03), DeclarationPanel (applicant D-22 and reviewer D-19 with the conflict path), AutosaveIndicator (server-confirmed vs device-only);
  - development-only component gallery at `/dev/components` (mock mode only, lazy-loaded).

  Evidence: the components PR.

- `feature` Frontend foundation (FND-01, UX-01):
  - Vite + React + TypeScript scaffold;
  - design tokens from the Figma Make audit;
  - public, applicant and staff shells with role navigation;
  - route table with honest "Not built yet" placeholders;
  - state kit, including the unknown-outcome state;
  - shared components: Button, TextField, Select, StatusBadge, DataTable, Dialog, FileUpload, ProgressIndicator, NotificationItem, DashboardCard, DemoBadge;
  - typed API layer with a development-only mock session;
  - ADR-001.

  Evidence: the scaffold PR.
