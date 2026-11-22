# 5. Shawnjembu's implementation plan (UI-only demo)

**14 tasks · 134 h expected (101–188) · 49.1% of the work.** Ordered as he should work them. Each task is one pull request on its own `ui/` or `test/` branch from the latest `main`. Every screen is behind `VITE_TOOLKIT_DEMO` and shows `DemoNotice`. No task touches `supabase/` or any server function. Hours are expected (frontend / sample data / testing).

**Common to every task:**
- **Tests:** unit tests for the panel's states; a smoke row at 360 and 1280 px.
- **Acceptance:** the existing reviewer screens behave exactly as today when the flag is off; keyboard use works.
- **Integration point:** reads sample data through Stacey's demo store (U-01) and `useDemoEvidence`.

---

### U-02 · Shared components · 16 h (13/0/3)
- **Scope:** one version each, in `src/components/`:
  - `MoneyInput`;
  - `BarChart`: moved from `ReportsPage.tsx` `BarList`, with Reports switched to it;
  - `SourceBadge`, `PrintLayout`, `ToolCard`, `EvidenceCard`;
  - `DemoNotice`: "Demo: sample data, not saved".
- **Existing files:** `src/components/index.ts`, `DashboardCard`, `button-styles.ts`, `src/lib/money.ts`, `ReportsPage.tsx`.
- **Dependencies:** U-01 types.
- **Acceptance:** the Reports page looks unchanged; ABM's visual review against document 7.
- **PR:** `ui/toolkit-shared-components`.
- **Integration point:** Stacey's screens use these from her second task on.

### I-03 · Business Model Canvas · 12 h (9/1/2)
- **Scope:** 9 blocks on sample data, a versions list, a print view with `PrintLayout`.
- **Dependencies:** U-03.
- **PR:** `ui/business-model-canvas`.
- **Integration point:** included through U-04; shown in R-01.

### R-01 · Evidence-to-Criteria Mapper · 12 h (9/2/1)
- **Scope:** an "Evidence" panel on `ScorePage` and `StaffCasePage` (mock mode, flag on): items grouped by rubric criterion, unmapped items, provenance; hidden until the reviewer has declared (imitating N10).
- **Existing files:** `src/pages/review/ScorePage.tsx` (`ProposalPanel`), `src/pages/staff/StaffCasePage.tsx`.
- **New files:** `src/pages/review/EvidencePanelDemo.tsx`.
- **Dependencies:** U-01, U-02.
- **PR:** `ui/evidence-mapper-demo`.

### R-03 · Financial Analysis Viewer · 10 h (8/0/2)
- **Scope:** read-only budget, pricing and break-even from the included items; scenario tabs; `SourceBadge` on every figure; no recalculation.
- **Dependencies:** R-01, I-07.
- **PR:** `ui/financial-viewer-demo`.

### Q-01 · Demo journey tests (mock mode) · 10 h (0/0/10)
- **Scope:** Playwright on a mock build with the flag on: Applicant A edits the budget, includes it, submits; Reviewer 1 declares and sees it in the Evidence and Financial panels; requests a revision; V2 compare shows the change. Plus: the panels are hidden before declaring, and the flag-off build is unchanged.
- **New files:** `tests/e2e/toolkit-demo.spec.ts`.
- **Dependencies:** U-04, R-01.
- **PR:** `test/toolkit-demo-journey`.

### I-04 · Business Plan Generator · 14 h (11/1/2)
- **Scope:** a plan assembled from the sample canvas, budget, market and roadmap, with a source label per section; editable; print view.
- **Dependencies:** I-03, I-01, I-06.
- **PR:** `ui/business-plan-demo`.

### I-05 · Pitch Deck Builder · 14 h (11/1/2)
- **Scope:** slides (problem, solution, market, traction, financial highlights) from sample data; reorder; presenter and print view.
- **Dependencies:** I-04.
- **PR:** `ui/pitch-deck-demo`.

### R-04 · Structured Feedback Builder · 8 h (6/1/1)
- **Scope:** strengths, next steps and templates in `RequestFeedbackDialog` (mock mode); tasks can point at an evidence item.
- **PR:** `ui/structured-feedback-demo`.

### R-05 · Version and evidence comparison · 8 h (6/1/1)
- **Scope:** `VersionCompare` shows the included items of V1 and V2 (added, removed, changed).
- **PR:** `ui/evidence-compare-demo`.

### R-02 · Guided Evaluation Assistant · 5 h (4/0/1)
- **Scope:** a criterion guidance panel; a "cite evidence" prompt. No automatic scoring.
- **PR:** `ui/guided-evaluation-demo`.

### R-07 · Clarification and question builder · 5 h (4/0/1)
- **Scope:** question templates; pick an evidence item.
- **PR:** `ui/clarification-builder-demo`.

### R-08 · Review Workload Manager · 6 h (5/0/1)
- **Scope:** summary cards (due this week, overdue, in progress, submitted) computed from the mock queue.
- **PR:** `ui/review-workload-demo`.

### R-06 · Reviewer Learning Hub · 6 h (4/1/1)
- **Scope:** a staff hub page with sample guidance articles (rubric use, example assessments) rendered with `PlainMarkdown`.
- **PR:** `ui/reviewer-learning-hub-demo`.

### Q-02 · Accessibility and responsive pass · 8 h (0/0/8)
- **Scope:** keyboard, focus, labels, reduced motion and 360/1280 px on every new screen; fixes, or issues logged for the owner.
- **PR:** `test/toolkit-demo-a11y`.
