# 4. Stacey's implementation plan (UI-only demo)

**15 tasks · 139 h expected (104–195) · 50.9% of the work.** Ordered as she should work them. Each task is one pull request on its own `ui/` branch from the latest `main`. Every screen is behind `VITE_TOOLKIT_DEMO` and shows `DemoNotice`. No task touches `supabase/`, the Supabase adapters or any server function. Hours are expected (frontend / sample data / testing).

**Common to every task:**
- **Tests:** unit tests for loading, empty and error states and for any calculation; a smoke row at 360 and 1280 px.
- **Acceptance:** keyboard-only use works; one h1; no sideways scroll; the existing tests stay green.
- **Integration point:** each tool's sample data shape goes into the demo store (U-01) so Shawnjembu's panels can show it.

---

### U-01 · Demo store and sample data · 8 h (0/6/2)
- **Scope:** shapes (document 3 §3.3), the in-memory store, fixtures for Applicant A's workspace, and the pre-filled evidence on `CEDA-2026-0008`; a `useDemoEvidence` hook.
- **Existing files:** `src/lib/api/mock/fixtures.ts`, `src/lib/api/mock/submission.ts` (store pattern).
- **New files:** `src/features/toolkit-demo/{types,store,fixtures}.ts`, `store.test.ts`.
- **Dependencies:** the shapes session.
- **Acceptance:** Shawnjembu's components compile against the types; a reload resets the store.
- **PR:** `ui/toolkit-demo-store`.
- **Integration point:** the starting point for every other task, his included.

### U-03 · Toolkit hub, profile, navigation, flag · 10 h (8/1/1)
- **Scope:** a "Business toolkit" item in `ApplicantShell` (flag on, mock mode only); a hub of `ToolCard`s; a profile and products form.
- **Existing files:** `src/layouts/ApplicantShell.tsx`, `src/routes/router.tsx`, `TextField`, `DashboardCard`.
- **New files:** `src/pages/toolkit/ToolkitHubPage.tsx`, `ProfilePage.tsx`.
- **Dependencies:** U-01, U-02.
- **Acceptance:** with the flag off, the shell and routes are byte-for-byte unchanged.
- **PR:** `ui/toolkit-hub`.
- **Integration point:** owns the route list; Shawnjembu adds his tool routes in his own PRs.

### U-04 · "Include in submission" step · 10 h (7/2/1)
- **Scope:** a step on the proposal form's review stage and on the revise page: tick items, tag criteria, preview "what reviewers would see"; on mock submit, copy the items onto the case version in the demo store.
- **Existing files:** `src/pages/applicant/ProposalForm.tsx`, `RevisePage.tsx`, `src/features/submission/useSubmitIdea.ts`.
- **New files:** `src/pages/applicant/EvidenceStepDemo.tsx`.
- **Dependencies:** U-01, U-02.
- **Acceptance:** with the flag off, the form is unchanged; workspace edits after submit don't change the copied items.
- **PR:** `ui/toolkit-include-step`.
- **Integration point:** feeds R-01 and R-05.

### I-07 · Break-even and pricing calculator · 10 h (7/1/2)
- **Scope:** `src/lib/finance.ts` (thebe arithmetic: break-even units and revenue, margin, scenarios) and a calculator screen.
- **Tests:** at least 15 cases (zero volume, negative margin, rounding).
- **Acceptance:** figures labelled entered, estimate or calculated.
- **PR:** `ui/pricing-calculator`.
- **Integration point:** R-03 shows these outputs and never recalculates.

### I-01 · Business Budgeter · 16 h (12/2/2)
- **Scope:** startup costs, monthly costs, revenue, cash flow; three scenarios; `BarChart`; print view.
- **Dependencies:** I-07, U-02.
- **Acceptance:** totals match `finance.ts`; usable at 360 px.
- **PR:** `ui/business-budgeter`.

### I-02 · Mini CRM · 12 h (9/2/1)
- **Scope:** contacts, interactions, reminders, a pipeline board; marked "never shared with reviewers".
- **PR:** `ui/mini-crm`.

### I-06 · Market Research and Competitor Analyzer · 10 h (7/2/1)
- **Scope:** a competitor matrix (prices in BWP), segments, a cited source per assumption.
- **PR:** `ui/market-research`.
- **Integration point:** I-04 reads it.

### I-11 · Innovation Roadmap and Milestone Tracker · 9 h (7/1/1)
- **Scope:** milestones with owner, date, status; board and summary.
- **PR:** `ui/roadmap-tracker`.

### I-08 · SWOT Analysis Builder · 5 h (4/0/1)
- **Scope:** four lists; turn an item into a roadmap action.
- **PR:** `ui/swot`.

### I-13 · Inventory and Sales Tracker · 10 h (7/2/1)
- **Scope:** stock list, movements, sales, reorder flags; a totals summary (the only part that can be included).
- **PR:** `ui/inventory`.

### I-09 · Customer Survey and Validation · 12 h (9/2/1)
- **Scope:** a survey builder; a sample share link and QR **that open nothing**, labelled so; sample results with a `BarChart`.
- **PR:** `ui/surveys`.

### I-10 · Business Name and Branding Studio · 7 h (5/1/1)
- **Scope:** names, positioning, voice, palette; a trademark-check notice.
- **PR:** `ui/branding-studio`.

### I-12 · Funding Readiness Checker · 8 h (6/1/1)
- **Scope:** a transparent checklist over the sample workspace; a gap list with links; "not an approval prediction".
- **Existing:** `CompletenessMeter`.
- **Dependencies:** I-01, I-03, I-11.
- **PR:** `ui/readiness-checker`.

### I-14 · AI Business Mentor (scripted) · 8 h (6/1/1)
- **Scope:** a panel with scripted sample questions and answers, labelled "Sample answers: no AI is used in this demo". The user picks which sample fields "to share", to show the consent step.
- **Existing:** `src/features/assistant/` (layout pattern only; no network call).
- **Acceptance:** no network request leaves the page (checked in the test).
- **PR:** `ui/ai-mentor-demo`.

### Q-03 · Demo walkthrough script and sample-data guide · 4 h (0/0/4)
- **Scope:** a 10-minute click path through both dashboards, with the role switches, and what is sample-only.
- **New file:** `docs/plans/toolkits-demo/walkthrough.md`.
- **PR:** `docs/toolkit-demo-walkthrough`.
