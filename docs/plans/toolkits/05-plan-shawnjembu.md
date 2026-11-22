# 5. Shawnjembu's implementation plan

**17 tasks · 354 h expected (266–496) · 48.8% of the work.** Ordered as he should work them. Each task is one pull request on its own branch from the latest `main` (document 6 §5). Each must keep the existing tests green. Hours are expected (frontend / backend / testing).

**SQL in his tasks (64 h):** he drafts the SQL in the PR. Stacey is the required reviewer for `supabase/` and gives the migration its number (document 6 §5). Until a backend part is merged, his screens run on the mock adapter.

---

### F-06 · Contract in TypeScript · 10 h (10/0/0)
- **Scope:** turn F-01 into `src/lib/api/toolkit-types.ts`, the ports `src/lib/api/workspace.ts` and `src/lib/api/evidence.ts`, and the mock adapters with fixtures (a full workspace for Applicant A and a frozen evidence set on the demo case). Also the route list for the toolkit pages.
- **Result:** both developers can build screens before the database exists.
- **Existing files:** `src/lib/api/index.ts` (adapter switch), `src/lib/api/mock/fixtures.ts`, `src/lib/api/types.ts` (left unchanged to avoid collisions).
- **New files:** the three files above, `src/lib/api/mock/workspace.ts`, `src/lib/api/mock/evidence.ts`.
- **DB changes:** none. **Dependencies:** F-01.
- **Tests:** typecheck; the mock passes the contract's example payloads.
- **Acceptance:** Stacey approves; F-03, F-05 and R-01 compile against it.
- **PR:** `ui/toolkit-contract-types`.
- **Integration point:** M1. Every later task uses these types.

### F-07 · Shared components · 20 h (16/0/4)
- **Scope:** one shared version of each, in `src/components/`:
  - `MoneyInput`: BWP, thebe, `parseBWP`;
  - `BarChart`: extracted from `ReportsPage.tsx` `BarList`, including its table view, with Reports switched to it;
  - `SourceBadge`: entered, estimate, calculated, last updated;
  - `PrintLayout`: Peolwane header and footer for exports;
  - `ToolCard`;
  - `EvidenceCard`.
- **Result:** both developers reuse one version of each, so no duplicates.
- **Existing files:** `src/components/index.ts`, `DashboardCard`, `button-styles.ts`, `src/lib/money.ts`, `ReportsPage.tsx`.
- **New files:** the six components and their tests.
- **Dependencies:** F-06.
- **Tests:** unit and accessibility (labels, roles, keyboard); Reports unchanged on screen.
- **Acceptance:** ABM's visual review against the frames (document 7).
- **PR:** `ui/toolkit-shared-components`.
- **Integration point:** Stacey's F-03, F-05 and I-01 use them.

### I-03 · Business Model Canvas · 32 h (18/8/6)
- **Scope:** the nine blocks; save, duplicate and version (revision history); attach evidence files; print/PDF through `PrintLayout`; reuses profile and products.
- **Existing files:** `TextField`, `AutosaveIndicator`, `useAutosave`.
- **New files:** `src/pages/toolkit/CanvasPage.tsx`, the canvas kind validator (SQL, through Stacey), tests.
- **DB changes:** a `canvas` shape validator in `save_workspace_document` (migration 021).
- **Dependencies:** F-02, F-07.
- **Tests:** unit (blocks, versions); pgTAP for the validator.
- **Acceptance:** the printed canvas carries the Peolwane header; works at 360 px.
- **PR:** `ui/business-model-canvas`.
- **Integration point:** frozen canvases appear in R-01; I-04 compiles from it.

### R-01 · Evidence-to-Criteria Mapper · 30 h (18/6/6)
- **Scope:** an "Evidence" panel on the scorecard (`ScorePage`) and on the staff case page: frozen items grouped by rubric criterion, unmapped items listed, files through `attachment-url`, provenance shown. The reviewer can cite an item in a score reason.
- **Existing files:** `src/pages/review/ScorePage.tsx` (`ProposalPanel`), `src/pages/staff/StaffCasePage.tsx`, `rubric_criteria`, `attachment-url`.
- **New files:** `src/pages/review/EvidencePanel.tsx`, `src/features/review/evidence.ts`, tests.
- **DB changes:** an optional `evidence_ids` on score reasons (SQL through Stacey).
- **Dependencies:** F-04 (real data), F-06 (mock first).
- **Tests:** unit (grouping, empty and forbidden states); the panel absent before the declaration (N10).
- **Acceptance:** no evidence visible to an undeclared or unassigned reviewer; works on the mock, then on F-04 data.
- **PR:** `ui/evidence-mapper`.
- **Integration point:** M2 switch from the mock.

### R-03 · Financial Analysis Viewer · 23 h (14/4/5)
- **Scope:** a read-only view of the frozen budget, pricing and break-even, with scenario tabs, `BarChart` and `SourceBadge` on every figure. It never recalculates: it shows `finance.ts` outputs stored at freeze.
- **Dependencies:** F-04, I-07.
- **Tests:** the shared finance test cases render identically; estimates labelled.
- **Acceptance:** no figure differs from the innovator's view of the same revision.
- **PR:** `ui/financial-viewer`.

### R-04 · Structured Feedback Builder · 23 h (10/8/5)
- **Scope:** strengths and recommended next steps on revision requests; task templates by criterion; a task can point at an evidence item.
- **Existing files:** `src/pages/staff/RequestFeedbackDialog.tsx`, `src/pages/feedback/FeedbackList.tsx`, `request_feedback`, `feedback_tasks.criterion_id`.
- **DB changes:** two columns and an optional `evidence_id` on tasks (SQL through Stacey).
- **Dependencies:** F-06.
- **Tests:** pgTAP (fields stored, audit); unit (builder); the applicant sees them only as today (hidden until publication where B6 applies).
- **PR:** `ui/structured-feedback`.

### R-02 · Guided Evaluation Assistant · 8 h (6/0/2)
- **Scope:** criterion guidance beside each score; a prompt to cite evidence; no automatic scoring.
- **Dependencies:** R-01. **PR:** `ui/guided-evaluation`.

### R-05 · Version and evidence comparison · 17 h (10/3/4)
- **Scope:** extend `VersionCompare` with the evidence sets of two versions (added, removed, changed), linked to the tasks they answer.
- **Existing files:** `src/pages/staff/VersionCompare.tsx`, `src/features/versions/compare.ts`.
- **Dependencies:** F-04. **PR:** `ui/evidence-compare`.

### R-07 · Clarification and question builder · 10 h (5/3/2)
- **Scope:** question templates; link a question to an evidence item.
- **Dependencies:** R-01. **PR:** `ui/clarification-builder`.

### R-08 · Review workload manager · 15 h (8/4/3)
- **Scope:** `my_review_workload()` (due this week, overdue, in progress, submitted) and cards on My reviews and staff home.
- **Existing files:** `MyReviewsPage.tsx`, `StaffHomePage.tsx`, `my_review_queue`.
- **Dependencies:** none. **PR:** `ui/review-workload`.

### Q-01 · End-to-end journeys, accessibility and responsive pass · 24 h (0/0/24)
- **Scope:** extend `tests/e2e/hosted-journey.spec.ts`: an innovator fills a canvas and a budget, selects them, submits, a reviewer declares and opens the evidence, scores, requests a revision, and V2 is compared. Refusal tests for an unassigned and an undeclared reviewer. A keyboard and 360/1280 px pass on every new page.
- **Dependencies:** F-05, R-01.
- **Acceptance:** passes on a throwaway stack (`journey_local`), then on staging between Stacey's snapshot and reset (Q-05).
- **PR:** `test/toolkit-journey`.

### I-06 · Market Research and Competitor Analyzer · 24 h (14/6/4)
- **Scope:** competitors, offerings and prices (BWP), segments, a cited source per assumption; a matrix and a summary.
- **Dependencies:** F-02. **PR:** `ui/market-research`.

### I-04 · Business Plan Generator · 36 h (22/8/6)
- **Scope:** compile an editable plan from the reviewed canvas, budget, market and roadmap, with a source label per section and print/PDF. Word export only after an ADR for a new dependency.
- **Dependencies:** I-03, I-01, I-06.
- **Acceptance:** each section shows where its data came from; nothing generated is presented as fact.
- **PR:** `ui/business-plan`.

### I-05 · Pitch Deck Builder · 34 h (22/6/6)
- **Scope:** slides (problem, solution, market, traction, financial highlights) from approved data; reorder; print/PDF.
- **Dependencies:** I-04, F-07. **PR:** `ui/pitch-deck`.

### I-10 · Business Name and Branding Studio · 17 h (10/4/3)
- **Scope:** names, positioning, voice, colours; a trademark-check notice; a brief export.
- **Dependencies:** F-02. **PR:** `ui/branding-studio`.

### R-06 · Reviewer Learning Hub · 15 h (8/4/3)
- **Scope:** a staff-only `reviewer_guide` content kind (SQL through Stacey), editable in content admin; a hub page (rubric interpretation, example assessments, policies).
- **Existing files:** `HelpPages.tsx`, `ContentAdminPage.tsx`, `save_content_page`.
- **PR:** `ui/reviewer-learning-hub`.

### I-14a · AI Business Mentor panel · 16 h (12/0/4) · **blocked until a change request is approved**
- **Scope:** an optional panel; the user picks which workspace fields to share; AI output labelled and linked to tools; never a funding judgement.
- **Existing files:** `src/features/assistant/` (pattern).
- **Dependencies:** I-14b. **PR:** `ui/ai-mentor`.
