# Changelog

Classification follows the evidence-led skill: `feature`, `refactor`, `repair`, `policy change`.

## [Unreleased]

- `feature` Slice 3 backend (REV-02, REV-03, NTF-01, D-11, D-19, D-20):
  - `declare_assignment`: the case opens only after a no-conflict declaration (N10); a conflict revokes the assignment and alerts admins (N11);
  - `save_scorecard` / `submit_scorecard`: 1–5 scores with reasons of at least 20 characters; quorum moves the case to adjudication automatically; retries are safe;
  - `get_score_panel` (weighted aggregate, spread, 2-point flag), `my_review_queue`, `mark_notifications_read`;
  - notifications and case history published for Realtime; published rubrics and challenge versions locked.

  Evidence: PGlite stand-in run, 004 suite 61/61 (all suites 212/212). Not run on the Supabase stack yet.

- `feature` Slice 2 backend (REV-01, IAM-01, D-08):
  - `record_screening` (eligible to evaluation, ineligible closes with reason), `assign_reviewers` (safe to retry; reviewer-role, conflict and self checks), `revoke_assignment`;
  - `grant_role` / `revoke_role`: a self-grant is refused and audited (N8);
  - `add_internal_note` (audit records the event, not the text);
  - `list_case_status` and `case_stage_counts` for the committee (reference and stage only);
  - user roles and assignments are revoke-only.

  Evidence: PGlite stand-in run, 003 suite 56/56 (all suites 151/151). Not run on the Supabase stack yet.

- `feature` Database foundation and Slice 1 backend (FND-01, IAM-02, APP-01/02/03, SEC-01):
  - migration 001: every core table, RLS on every table with SELECT-only grants, append-only versions/audit/history, `has_permission()` with the D-07 MFA rule, `health()`, `my_access()`;
  - migration 002: `save_draft`, `submit_proposal` (idempotent; `REQUEST_CONFLICT`), `get_submission_receipt`, private `proposal-files` bucket, attachment registration, `record_consent`, sign-up trigger;
  - `attachment-url` Edge Function (60-second signed links after an access check);
  - fictional seed (8 cases; demo case `CEDA-2026-0009`) and `scripts/set-demo-passwords.mjs`;
  - API contract `docs/blueprint/03-api-contracts-and-permissions.md`;
  - pgTAP suites (95 assertions) and a PGlite runner for machines without Docker.

  Evidence: PGlite stand-in run, 95/95 passed. Not run on the Supabase stack yet.

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
