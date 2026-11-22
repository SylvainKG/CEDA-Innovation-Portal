# 4. Stacey's implementation plan

**18 tasks · 372 h expected (279–521) · 51.2% of the work.** Ordered as she should work them. Each task is one pull request on its own branch from the latest `main` (document 6 §5). Each must keep the existing 513 pgTAP assertions and 354 unit tests green. Hours are expected (frontend / backend / testing).

Branch prefixes follow `docs/process/repository-rules.md` §1: `db/`, `ui/`, `test/`, `docs/`. New screens stay hidden behind the `VITE_TOOLKIT` flag until Phase 3 sign-off.

---

### F-01 · Integration contract: database and RPCs · 8 h (0/8/0)
- **Scope:** write §3.2–§3.3 of document 3 as the contract section for the toolkits: entities, columns, RLS rule per table, RPC signatures, error codes, snapshot shape per kind (with each tool owner).
- **Result:** one agreed contract that both developers build against.
- **Existing files:** `docs/blueprint/03-api-contracts-and-permissions.md` (contract format), migrations 001–016.
- **New files:** contract section "Toolkits" in that document.
- **DB / API changes:** none (text only).
- **Dependencies:** none. **Tests:** none.
- **Acceptance:** Shawnjembu signs off in the contract session (M1); no open questions marked "TBD".
- **PR:** `docs/toolkit-contract`.
- **Integration point:** Shawnjembu's F-06 turns it into TypeScript the same week.

### F-02 · Business workspace core · 20 h (0/14/6)
- **Scope:** migration `017_business_workspace`:
  - tables `business_profiles`, `business_products`, `workspace_documents`, `workspace_document_revisions`, `workspace_files`;
  - the `workspace-files` bucket and owner-only RLS;
  - RPCs `save_business_profile`, `get_my_workspace`, `save_workspace_document` (with `expected_revision` → `REQUEST_CONFLICT`);
  - revision history for versioned kinds.
- **Result:** an innovator can save and read their own workspace; nobody else can.
- **Existing files:** `supabase/migrations/001` (patterns: `proposal_drafts`, guard triggers), `private.is_case_owner`, `supabase/tests/database/010_security_privileges.test.sql` (allow-lists).
- **New files:** `supabase/migrations/2026…_017_business_workspace.sql`, `supabase/tests/database/015_business_workspace.test.sql`, `src/lib/api/supabase/workspace.ts`.
- **DB changes:** 5 tables, 1 bucket, RLS, 3 RPCs. **API changes:** `workspace` port (methods agreed in F-06).
- **Dependencies:** F-01.
- **Tests:** pgTAP owner can read/write; another applicant, every staff role and anon refused; revision conflict; 010 allow-list updated.
- **Acceptance:** PGlite and Supabase-stack suites pass; no browser write grants (D-02 check in 010).
- **PR:** `db/business-workspace`.
- **Integration point:** unblocks Shawnjembu's I-03, I-06 and I-10 backends.

### F-04 · Evidence snapshot · 36 h (0/24/12)
- **Scope:** migration `018_evidence_snapshot`:
  - tables `evidence_selections` and `version_evidence` (guard trigger, no SELECT policy);
  - `private.freeze_evidence` called from `submit_proposal` and `submit_revision` (file copy into `proposal-files`, `attachments` rows with `version_id`);
  - RPCs `set_evidence_selection`, `get_evidence_preview` and `get_case_evidence` (is_cleared_reviewer / `case.read_all` / owner);
  - never-selectable kinds.
- **Result:** the frozen, criterion-tagged copy that reviewers read.
- **Existing files:** `002_slice1_submit.sql`, `005_slice4_revise.sql` (the two submit RPCs), `private.is_cleared_reviewer`, `authorize_attachment_download`, `supabase/functions/attachment-url`.
- **New files:** migration 018, `supabase/tests/database/016_evidence_snapshot.test.sql`, `src/lib/api/supabase/evidence.ts`.
- **DB changes:** 2 tables, 1 private function, 3 RPCs, 2 RPCs extended. **API changes:** `evidence` port.
- **Dependencies:** F-02.
- **Tests:** every item in document 3 §3.6; `002` and `005` unchanged and green; idempotent replay still returns the same receipt.
- **Acceptance:** an unassigned reviewer, an undeclared reviewer, the committee and support are refused; workspace edits after submit don't change the copy; V1's copy survives V2.
- **PR:** `db/evidence-snapshot`.
- **Integration point:** M2. Shawnjembu's R-01, R-03 and R-05 switch from the mock to this.

### F-03 · Workspace hub, profile and navigation · 17 h (14/0/3)
- **Scope:** "Business toolkit" entry in the applicant navigation; hub page listing the tools (`ToolCard`); profile and products form with autosave and `SourceBadge`.
- **Result:** an innovator can find the toolkit and fill the shared profile once.
- **Existing files:** `src/layouts/ApplicantShell.tsx`, `src/routes/router.tsx`, `src/features/submission/useAutosave.ts`, `TextField`, `AutosaveIndicator`.
- **New files:** `src/pages/toolkit/ToolkitHubPage.tsx`, `src/pages/toolkit/ProfilePage.tsx`, `src/features/workspace/queries.ts`, tests.
- **DB / API changes:** none beyond F-02.
- **Dependencies:** F-02, F-07 (`ToolCard`, `SourceBadge`).
- **Tests:** unit (render, save, conflict message), smoke at 360/1280 px.
- **Acceptance:** keyboard-only use works; one h1; no sideways scroll.
- **PR:** `ui/toolkit-hub`.
- **Integration point:** the tool pages of both developers hang off this hub (route list agreed in F-06).

### F-05 · Evidence selection step · 18 h (14/0/4)
- **Scope:** a step on the proposal form's review stage and on the revise page: pick workspace items, tag criteria, preview "what reviewers will see", with never-shared kinds shown as not selectable.
- **Result:** the innovator controls what is frozen.
- **Existing files:** `src/pages/applicant/ProposalForm.tsx`, `RevisePage.tsx`, `DeclarationPanel`, `ErrorSummary`.
- **New files:** `src/pages/applicant/EvidenceStep.tsx`, test.
- **API changes:** uses `set_evidence_selection`, `get_evidence_preview`.
- **Dependencies:** F-04, F-07.
- **Tests:** unit (select, tag, preview, refusal); hosted-journey step extended in Q-01.
- **Acceptance:** submit without evidence still works exactly as today; preview matches what `get_case_evidence` returns after submit.
- **PR:** `ui/evidence-step`.
- **Integration point:** the preview and the reviewer view (R-01) use the same `EvidenceCard`.

### I-07 · Break-even and pricing calculator + calculation library · 24 h (10/6/8)
- **Scope:** `src/lib/finance.ts` (thebe, scenarios, break-even units/revenue, margins) and matching `private.finance_*` used at freeze; calculator page.
- **Result:** one set of numbers for innovators and reviewers.
- **New files:** `src/lib/finance.ts`, `src/lib/finance.test.ts`, a shared test-case table, `src/pages/toolkit/PricingPage.tsx`.
- **DB changes:** private functions in migration 019.
- **Dependencies:** F-02.
- **Tests:** at least 30 shared test cases giving identical results in TypeScript and SQL (zero volume, negative margin, rounding).
- **Acceptance:** all cases agree to the thebe; inputs labelled entered/estimate.
- **PR:** `db/finance-calculations` + `ui/pricing-calculator`.
- **Integration point:** Shawnjembu's R-03 renders these outputs only; it never recalculates.

### I-01 · Business Budgeter · 38 h (20/10/8)
- **Scope:** startup costs, monthly operating costs, revenue, cash flow; optimistic/baseline/conservative scenarios; `BarChart`; CSV download.
- **Existing files:** `formatBWP`/`parseBWP`, Reports `BarList` (via F-07 `BarChart`), `src/features/oversight/csv.ts`.
- **New files:** `src/pages/toolkit/BudgetPage.tsx`, budget kind validator, tests.
- **Dependencies:** I-07, F-07.
- **Tests:** unit (totals, scenario switch); pgTAP validator; snapshot freeze of a budget.
- **Acceptance:** totals match `finance.ts`; works at 360 px.
- **PR:** `ui/business-budgeter`.
- **Integration point:** frozen budgets feed R-03.

### I-02 · Mini CRM · 32 h (18/8/6)
- **Scope:** contacts (customers, suppliers, partners, leads), interactions, reminders, pipeline stages.
- **New files:** CRM tables in migration 020, `src/pages/toolkit/CrmPage.tsx`, tests.
- **Dependencies:** F-02.
- **Tests:** pgTAP owner-only, never selectable as evidence.
- **Acceptance:** no staff role or reviewer can reach a contact; deletion removes the contact and its interactions.
- **PR:** `db/mini-crm` + `ui/mini-crm`.
- **Integration point:** none by design (private).

### Q-02 · Cross-role security suite · 10 h (0/4/6)
- **Scope:** one pgTAP file that walks every new table and RPC as anon, each applicant, each staff role and each reviewer state.
- **Dependencies:** F-04. **Acceptance:** all refusals proven; added to CI's database gate.
- **PR:** `test/toolkit-access`. **Integration point:** Shawnjembu's tool backends add their rows to it.

### Q-03 · Contract, data-handling note, runbook · 8 h (0/8/0)
- **Scope:** final contract; data-handling note: new personal data (CRM contacts, survey respondents), retention, deletion; runbook rows (bucket, flag).
- **Dependencies:** F-04. **PR:** `docs/toolkit-data-handling`.

### Q-04 · Hosted migrations and run record · 6 h (0/4/2)
- **Scope:** dry run then apply 017+ from `main` to the development project (never the judging project during judging); hosted suites; run record.
- **Dependencies:** Q-02. **PR:** `docs/hosted-run-record-toolkits`.

### Q-05 · Staging journey with snapshot and reset · 4 h (0/0/4)
- **Scope:** snapshot, Shawnjembu's journey run (Q-01), exact reset, verification. **Dependencies:** Q-01, Q-04.

### I-11 · Innovation Roadmap and Milestone Tracker · 22 h (12/6/4)
- **Scope:** milestones (research, prototype, test, launch, growth) with owner, date, status and evidence link; board and summary.
- **Dependencies:** F-02. **PR:** `ui/roadmap-tracker`. **Integration point:** I-12 reads it.

### I-08 · SWOT Analysis Builder · 15 h (8/4/3)
- **Scope:** four lists, each item turnable into an action (links to the roadmap).
- **Dependencies:** F-02. **PR:** `ui/swot`.

### I-13 · Inventory and Sales Tracker · 27 h (14/8/5)
- **Scope:** items, stock movements, sales, reorder thresholds; totals summary (the only part that can be evidence).
- **Dependencies:** F-02. **PR:** `db/inventory` + `ui/inventory`.

### I-12 · Funding Readiness Checker · 21 h (10/6/5)
- **Scope:** a transparent checklist over the workspace (profile, canvas, budget, roadmap, evidence present); a gap list with links. Labelled "not an approval prediction".
- **Existing:** `CompletenessMeter`, `src/lib/form-check.ts`, unused `proposals.readiness_stage`.
- **Dependencies:** I-01, I-03, I-11. **PR:** `ui/readiness-checker`.
- **Acceptance:** every rule visible to the user; no score is presented as CEDA's judgement.

### I-09 · Customer Survey and Validation · 46 h (18/18/10)
- **Scope:** questionnaires, a public link and QR, consented anonymous answers through `submit_survey_response`, rate limit, closing date, summaries, retention and deletion.
- **Dependencies:** F-02, Q-02. **PR:** `db/surveys` + `ui/surveys`.
- **Tests:** anonymous write only through the RPC; expired or closed token refused; summaries hold no personal data.
- **Acceptance:** the data-handling note covers respondents' data before release.

### I-14b · AI Business Mentor, server side · 20 h (0/16/4) · **blocked until a change request is approved**
- **Scope:** Edge Function with server-side credentials, per-user limits, consent check, only the fields the innovator chooses to share, no storage of conversations unless agreed, audit of use.
- **Dependencies:** a BCR narrowing D-25 for workspace data, and a processor agreement. **PR:** `db/ai-mentor`.
- **Integration point:** Shawnjembu's I-14a panel.
