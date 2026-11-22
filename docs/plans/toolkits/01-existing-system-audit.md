# 1. Existing system audit

**Checked against:** `main` `49425b2` and hosted staging (migration 016), 22 Nov 2026. "Existing" means the code and a test are on `main` today; nothing in this table is a proposal.

## 1.1 The platform today

| Area | What is there | Where |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind; React Router 7; TanStack Query; Radix Dialog; lucide icons; no chart or PDF library | `package.json`, `src/` (219 `.ts/.tsx` files) |
| API layer | One port per module with a mock and a Supabase adapter (`VITE_API_MODE`) | `src/lib/api/<module>.ts`, `mock/`, `supabase/` |
| Routes | Public, applicant (`/ideas/*`), staff (`/staff/*`), oversight, admin | `src/routes/router.tsx`, guards in `src/routes/guards.tsx` |
| Database | 33 tables, RLS on all, 0 write grants to browsers; every state change is a `SECURITY DEFINER` RPC (D-02) | `supabase/migrations/001`–`016` |
| Access helpers | `is_case_owner`, `can_read_case`, `is_cleared_reviewer` (assigned + declared), `owns_assignment`, `has_permission` (with MFA rule, D-07), `has_submitted_peer_view` | schema `private` |
| Immutability | Guard triggers on versions, scorecards, decisions, audit (C-06) | `*_guard` functions, migration 001 |
| Files | Private bucket `proposal-files` (10 MB), public `challenge-files`; downloads only through the `attachment-url` Edge Function (60 s signed URL after a database check) | `supabase/functions/attachment-url` |
| Tests | 513 pgTAP assertions in 14 files; 354 Vitest tests in 49 files; 3 Playwright specs (smoke, headers, real-backend journey) | `supabase/tests/database`, `src/**/*.test.*`, `tests/e2e` |
| Design system | Tokens as CSS variables (`src/styles/tokens.css`), semantic Tailwind names, 24 shared components | `tailwind.config.ts`, `src/components/` |

## 1.2 Reviewer Empowerment Toolkit (8 tools)

| Feature | Existing status | Reusable components | Remaining work | Complexity |
|---|---|---|---|---|
| My assignments / **Review Workload Manager** | **Partial**: My reviews queue with due dates and status; staff home counts | `src/pages/review/MyReviewsPage.tsx`, `my_review_queue`, `src/pages/staff/StaffHomePage.tsx`, `DashboardCard` | A workload summary (due this week, overdue, submitted) and a workload RPC | Low |
| **Guided Evaluation Assistant** | **Existing** (core): rubric anchors, weights, guidance text, required reason of 20+ characters, live weighted score, peer scores hidden until submit (S3) | `src/pages/review/ScorePage.tsx`, `src/lib/scoring.ts`, `rubric_criteria.anchors/guidance` | Show criterion guidance beside each score; prompt to cite evidence (links to the evidence mapper) | Low |
| **Clarification & Question Builder** | **Existing**: request clarification with required reply and deadline; reply returns the case to its stage | `src/pages/staff/RequestFeedbackDialog.tsx`, `request_feedback`, `respond_clarification` | Question templates; link a question to an evidence item | Low |
| **Structured Feedback Builder** | **Partial**: revision request with 1–8 tasks, each linkable to a criterion (`feedback_tasks.criterion_id`); applicant marks addressed + explanation | `RequestFeedbackDialog.tsx`, `src/pages/feedback/FeedbackList.tsx`, `request_feedback`, `get_roadmap` | Strengths and recommended next steps; task templates by criterion | Medium |
| **Version Comparison & Improvement Tracker** | **Existing**: side-by-side V1/V2 with each change named (INN-01); reviewers verify each task on V2; V1 scores kept (C-13) | `src/pages/staff/VersionCompare.tsx`, `src/features/versions/compare.ts`, `verify_feedback_task` | Compare evidence snapshots between versions (needs the snapshot) | Low–Medium |
| **Evidence-to-Criteria Mapper** | **Missing**: the scorecard shows the proposal answers and a file list, not grouped by criterion | `ScorePage.tsx` `ProposalPanel`, `rubric_criteria`, `attachment-url` | Evidence snapshot, criterion tags, reviewer evidence view grouped by criterion | High (depends on the snapshot) |
| **Financial Analysis Viewer** | **Missing** | `formatBWP` (`src/lib/money.ts`), Reports `BarList` (`src/pages/oversight/ReportsPage.tsx`) | Read-only budget, pricing and break-even view of the submitted snapshot; estimates labelled as estimates | Medium |
| **Reviewer Learning Hub** | **Partial**: help pages and content admin exist for public content kinds (`faq`, `contact`, `referral`, `support`) | `src/pages/help/HelpPages.tsx`, `ContentAdminPage.tsx`, `content_pages`, `save_content_page` | A staff-only content kind (`reviewer_guide`), its RLS and a hub page | Low |

## 1.3 Innovator Business Toolkit (14 tools)

There is **no business workspace** today. The innovator side has the proposal form (with autosave and a rule-based completeness meter, INN-03), attachments, receipt, revision with task answers, and My ideas. `proposals.readiness_stage` exists in migration 001 but no screen or RPC uses it.

| Feature | Existing status | Reusable components | Remaining work | Complexity |
|---|---|---|---|---|
| Shared business profile (the workspace all tools share) | **Missing** | `ApplicantShell`, `TextField`, `AutosaveIndicator`, `useAutosave` | Tables, owner-only RLS, RPCs, hub page | Medium |
| 01 Business Budgeter | **Missing** | `formatBWP`/`parseBWP`, `DataTable`, `BarList` | Budget lines, scenarios, monthly forecast, cash flow | High |
| 02 Mini CRM | **Missing** | `DataTable`, `QueueFilters`, `Dialog` | Contacts, interactions, reminders, pipeline; private by design (third-party personal data) | Medium |
| 03 Business Model Canvas Builder | **Missing** | `TextField`, `Tabs`, `AutosaveIndicator` | 9 blocks, versions, evidence attachments, print/PDF | Medium |
| 04 Business Plan Generator | **Missing** | `PlainMarkdown` | Compile from canvas, budget, market data; editable draft; PDF (Word needs a new dependency, an ADR) | High |
| 05 Pitch Deck Builder | **Missing** | None | Slides from approved data; print/PDF | High |
| 06 Market Research & Competitor Analyzer | **Missing** | `DataTable` | Competitor matrix, segments, cited sources | Medium |
| 07 Break-Even & Pricing Calculator | **Missing** | `money.ts` | Calculation library shared with the budget and the reviewer viewer; scenarios | Medium (correctness-critical) |
| 08 SWOT Analysis Builder | **Missing** | `TextField` | Four lists + actions | Low |
| 09 Customer Survey & Validation Tool | **Missing** | Form-schema validator (`validate_form_schema`) as a pattern | Questionnaires, **public links that let signed-out people answer** (new anonymous-write path), consent, QR, summaries, retention | High (security) |
| 10 Business Name & Branding Studio | **Missing** | None | Names, positioning, colours, trademark-check notice | Low |
| 11 Innovation Roadmap & Milestone Tracker | **Missing** | `StageTimeline` (pattern only) | Milestones with owners, dates, evidence | Medium |
| 12 Funding Readiness Checker | **Missing** (`readiness_stage` column unused) | `CompletenessMeter`, `src/lib/form-check.ts` | Transparent checklist over workspace data; gap list; never a prediction | Medium |
| 13 Inventory & Sales Tracker | **Missing** | `DataTable`, `formatBWP` | Stock, purchases, sales, reorder thresholds | Medium |
| 14 AI Business Mentor | **Missing**; Peolwane AI (site help, BCR-004) exists | `src/features/assistant/` (UI pattern only) | Blocked by D-25: proposal and workspace data may not go to an outside AI without a new change request and a processor agreement | High + approval |

## 1.4 Workflow the toolkits must not disturb

Submission (APP-01/03), screening, assignment, declaration (N10), independent scoring with peer isolation (S3), quorum, clarification and revision (INN-02), adjudication, publication (N4), award (N5), audit (SEC-01). Every one is covered by pgTAP on `main` and on hosted (513/513 on a clean database), and the main journey passes in the browser on staging. Any change to `submit_proposal` or `submit_revision` (needed for the snapshot) must keep the existing tests in `002` and `005` green unchanged.
