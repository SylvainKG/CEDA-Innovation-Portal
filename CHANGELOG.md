# Changelog

Classification follows the evidence-led skill: `feature`, `refactor`, `repair`, `policy change`.

## [Unreleased]

- `policy change` **DEMO badge and Sample label colours** (Sandra, #47 review, 20 Nov: brand neutrals only). DEMO is a dark pill, `#333333` with white text (12.63:1) and the flask icon; Sample labels are `#F3F2EF` with `#333333` text and a 1 px dashed `#8A8580` border. Tokens `demo`, `demo-on`, `demo-subtle`, `demo-border` replace the placeholder purple `#6941C6`; `design-tokens.md` records them as decided.

- `feature` `list_my_ideas()` for the applicant's My ideas page (T06, migration 014, asked for in PR #38): one read with only safe fields (no case-event reasons or actors), own cases only, drafts included, and the latest feedback request while the case waits on the applicant, including an expired one. Contract §5 now documents challenge template downloads from the public `challenge-files` bucket.
- `feature` Hosted pgTAP runner and run record: `tools/pglite-db-tests/run-hosted.mjs` runs every pgTAP file against the hosted database without Docker (each file rolls back; the reference sequence is restored), and `artifacts/phase-00/hosted-supabase.md` records the hosted schema, test, account and Edge Function results with commits and times, including the Auth URL configuration and the 10-character password minimum set on 17 Nov.
- `feature` Slice 1 behaviour hooks (APP-01, APP-03; no screens yet), in `src/features/submission/`:
  - `useSubmitIdea`: one request key per draft, reused on every retry; a lost reply is "Not confirmed yet" with a status check by key; opening the page with a pending key checks before allowing another submit;
  - `useAutosave`: debounced, one save at a time, every change also kept on the device; lost updates retried with back-off; the first (unkeyed) save and refusals are never retried blindly;
  - read hooks for the challenge form, declaration, draft and receipt.

  Evidence: 9 new tests (81 in total), lint, type-check and build pass. Mock only.

  Review fixes (Stacey, Sylvain): typing during the first save is kept on the device under the new draft id; `INVALID_STATE` and `REQUEST_CONFLICT` on submit look up this idea's receipt by its id (never by the conflicting key); a pending key that belongs to another idea is dropped; device copies and submit keys are cleared whenever the person changes (`clearDeviceData`); the draft id is returned from state. 93 tests.
- `feature` Slice 1 data layer, mock only (APP-01, APP-02, APP-03; no screens yet):
  - types for the form schema, draft, attachments and receipt, copied from the API contract (Stacey, Draft for review, `db/phase-0-foundation`);
  - `SubmissionPort` mapping one-to-one to the documented reads and RPCs (`save_draft`, `register_attachment`, `remove_attachment`, `submit_proposal`, `get_submission_receipt`);
  - RPC error mapping: a known code is a refusal with field errors; a lost reply on a keyed command is an unknown outcome, never "failed";
  - submit request keys kept per draft until a receipt arrives (contract §4.1 rule 1);
  - client form check mirroring the server's rules and wording, plus completeness counts;
  - mock adapter following the contract's check order, idempotent replay, `REQUEST_CONFLICT`, first reference `CEDA-2026-0009` (B10), and a lost-reply switch for testing the unknown path. Fixtures copied from the seed.

  Evidence: 17 new unit tests (72 in total), lint, type-check and build pass. Proves the mock only; server behaviour is evidenced by the pgTAP suites.

  Review fixes (Stacey, Sylvain): `IMMUTABLE` is a known refusal, never an unknown outcome; "open" is status **and** dates (`isChallengeOpen`, as `private.challenge_is_open`), with `opens_at` and the `unpublished` status from migration 011; mock attachment refusals use the server's wording and field keys; lengths count characters as Postgres does; optional `versionNo` on the receipt lookup. 76 tests.
- `feature` Supabase keep-alive workflow (OPS-03): the hosted project stays on the Free plan, which pauses after about a week without activity, so `.github/workflows/keep-alive.yml` calls the public `health()` RPC every second day and on demand. Needs the `SUPABASE_URL` variable and `SUPABASE_PUBLISHABLE_KEY` secret in the repository settings.
- `policy change` CI `audit` gate (SEC-02): fails on high or critical findings in **shipped** packages (`npm audit --omit=dev`). Findings in dev-only tooling are listed in the job summary and the saved report, and must be recorded in ADR-001; they no longer block every PR while no fix exists (GHSA-fc5q-39xc-vjpf in `picomatch`, build and test tooling only, 18 Nov 2026).
- `repair` Whitespace-only answers (migration 012): `private.validate_submission` trimmed with `btrim`, which strips only spaces, so an answer of newlines or tabs passed "Required" on submit and revision while the browser refused it. Answers are now trimmed of all surrounding whitespace before every check.
- `policy change` Slice 1 contract review (migration 011, from the frontend review in PR #16): `submit_proposal` refuses an unverified email with `VALIDATION` and `fields.email` instead of `FORBIDDEN`, so the form can tell the applicant to verify; an applicant keeps reading the challenge their own case belongs to after it is unpublished (ADM-02), through the definer helper `private.owns_case_in_challenge`. The first-autosave duplicate risk is recorded as known debt.
- `repair` Function privileges (SEC-02, migration 010): the schema-level default-privilege lines in migration 001 could not remove PostgreSQL's built-in PUBLIC execute, so `my_access()` was callable signed out (it returned null) and internal `private` helpers were executable by everyone (not reachable through the API). New functions now start closed, `my_access` is signed-in only, and `private` exposes only the helpers access policies use.
- `feature` Privilege regression suite `010_security_privileges.test.sql`: exact function allow-lists, `search_path` pinning, no views, no browser table writes, private proposal bucket.

  Evidence: PGlite stand-in run, 010 suite 11/11 (all suites 457/457).

- `feature` Scheduled maintenance (REV-04, CHT-03, NTF-02): `run_maintenance` expires overdue feedback requests (requester notified, audited as system) and sweeps missed chats; `extend_feedback_deadline` reopens a request; `pg_cron` runs maintenance every 10 minutes and triggers `email-relay` every 2 minutes through `pg_net`, with the relay URL and secret kept in Supabase Vault. Schedules are skipped where `pg_cron` is unavailable.

  Evidence: PGlite stand-in run, 009 suite 20/20 (all suites 446/446). Schedules not run on Supabase yet.

- `feature` CI database workflow (`.github/workflows/db.yml`, D-42): pgTAP on the PGlite stand-in, pgTAP on the real Supabase local stack (`supabase start` + `supabase test db`), and `deno check` on every Edge Function. Runs on pull requests and on pushes to `main`, `db/**` and `test/ci-db-**` that touch the database.

- `feature` Slice 6b backend: admin settings (ADM-01/02, HLP-01, CHT-02, ARC-01, IAM-01):
  - content pages with draft/published and versioned privacy and declaration wording;
  - chat hours, closure days and the demo override;
  - new roles and their permissions as data (ARC-01); built-in roles protected;
  - rubric drafts, criteria with 1/3/5 anchors, publish at 100% (ARC-01 new criterion);
  - challenges: create, edit, validated form schema, publish, new form versions without touching existing ideas, unpublish/close, delete unused drafts;
  - `invite-staff` Edge Function.

  Evidence: PGlite stand-in run, 008 suite 52/52 (all suites 426/426). Not run on the Supabase stack yet.

- `feature` Slice 6a backend: reports, audit, chat (RPT-01, SEC-03, CHT-01/02/03):
  - `get_programme_report` (participation, outcomes, funnel, time in stage, overdue, impact) and `report_case_rows` for CSV, reconciled with the seed;
  - `query_audit` with case, actor, action-prefix and date filters and keyset paging;
  - chat: hours in Gaborone time with holidays and a demo override, one conversation per applicant, consultants hold several, missed-chat sweep, statistics, Realtime on messages and sessions.
- `repair` Audit action filter: `%` and `_` are matched literally instead of acting as wildcards.

  Evidence: PGlite stand-in run, 007 suite 45/45 (all suites 374/374). Not run on the Supabase stack yet.

- `feature` Slice 5 backend (DEC-01, DEC-02, D-05):
  - `record_decision`: unpublished, invisible to the applicant (N4), re-recordable before publication with history kept;
  - `publish_decision`: approved / not approved, once, only for the current version;
  - `record_award`: administrator only, after a published approval (N5 `CASE_NOT_APPROVED`), a separate Award stage, safe to retry;
  - `close_case`: with a reason the applicant can read; expires open requests;
  - email templates for decision and award (no outcome in the email).

  Evidence: PGlite stand-in run, 006 suite 45/45 (all suites 329/329). Not run on the Supabase stack yet.

- `feature` Slice 4 backend (REV-04, APP-04, INN-02, NTF-02):
  - `request_feedback`: clarification (a question) or revision with up to 10 roadmap tasks; the case waits on the applicant and remembers where it came from;
  - `respond_clarification`: required reply, no new version, case returns (BCR-001 B1);
  - `submit_revision`: new immutable version with change note and an answer to every task, same reference, files carried forward, idempotent (B9), case returns to the requesting stage (D-10);
  - `verify_feedback_task` and the verification gate on V2 scorecards; verifications lock with the scorecard and stay hidden from the applicant until publication (B6); `get_roadmap` summary;
  - email outbox relay: lease-based claim, outcome recording with backoff (B4), `email-relay` Edge Function, admin outbox viewer.

  Evidence: PGlite stand-in run, 005 suite 72/72 (all suites 284/284). Not run on the Supabase stack; SMTP not configured (email Simulated).

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
