# Innovator and Reviewer Toolkits: UI-only demo plan

**Status:** Proposed, for team approval. Nothing here is implemented. · **Prepared:** 22 Nov 2026 · **Owners:** Stacey and Shawnjembu (Obvious) · **Approvers:** Sylvain (scope), ABM (design owner, D-31)

**What this plan is:** a **clickable demonstration** of the 14 innovator tools and the 8 reviewer tools. It runs on sample data in the portal's existing **mock mode** (`VITE_API_MODE=mock`): no database tables, migrations, access rules, server functions or AI services. Changes last until the page reloads, as all mock screens do today. Every new screen says it is a demo with sample data.

The full production plan (database, access rules, evidence snapshot) stays in [`../toolkits/`](../toolkits/README.md) for when the team decides to build it for real. Nothing in this demo plan blocks or changes that design.

| # | Document | Answers |
|---|---|---|
| 1 | [Existing system audit (UI)](01-existing-system-audit.md) | Which screens, components and mock data already exist |
| 2 | [Workload distribution](02-workload-distribution.md) | Every task, its hours and its owner: Stacey 139 h (50.9%), Shawnjembu 134 h (49.1%) |
| 3 | [Demo data and screen linking](03-demo-data-and-linking.md) | How the innovator and reviewer screens connect on sample data |
| 4 | [Stacey's plan](04-plan-stacey.md) | Her 15 tasks in order |
| 5 | [Shawnjembu's plan](05-plan-shawnjembu.md) | His 14 tasks in order |
| 6 | [Master roadmap](06-master-roadmap.md) | Phases, schedule at 20 h and 35 h a week, dependencies, branches |
| 7 | [UI consistency specification](07-ui-consistency.md) | Existing components and tokens both must reuse |
| 8 | [Risks and testing](08-risks-and-testing.md) | Demo risks and the test strategy |

## Management summary

**A. Existing system**
- **Reuse:**
  - the mock mode (`src/lib/api/mock/*`, in-memory, seeded from the demo data, role switching);
  - all 24 shared components and the design tokens;
  - the reviewer screens to extend (`ScorePage`, `StaffCasePage`, `VersionCompare`, `RequestFeedbackDialog`, `MyReviewsPage`);
  - the Reports bar list, and `formatBWP`/`parseBWP`.
- **Build:** the screens of all 22 tools on a sample-data store, the "include in submission" step, and the reviewer evidence and financial panels.
- **Not built:** anything on the server.

**B. Work distribution** (frontend only; expected hours, low ×0.75, high ×1.4)
- Stacey: **139 h, 50.9%**, 15 tasks.
- Shawnjembu: **134 h, 49.1%**, 14 tasks.
- Difference: **1.8 percentage points**.
- **Why this split:** Stacey leads the innovator workspace and its calculation-heavy tools. Shawnjembu leads the reviewer screens, the shared components and the document-style tools (canvas, plan, pitch deck), so the balance is by hours, not by dashboard.
- **Flagged:** Stacey has led the backend so far; her frontend estimates may run towards the high end.

**C. Delivery** (total 273 h expected; 205 low, 382 high)

| Release | Hours (both) | At 20 h/week each | At 35 h/week each |
|---|---|---|---|
| Core demo (hub, budget, break-even, canvas, include step, evidence and financial panels) | 114 | 3–4 weeks | 2 weeks |
| All 22 tools as a clickable demo | 273 | 8 weeks | 4–5 weeks |

The schedule includes a 15% buffer for reviews and rework.

**D. Collaboration**
- **Stacey owns:** the sample-data store and fixtures, the hub, the "include in submission" step, and 11 innovator tools.
- **Shawnjembu owns:** the shared components, all 8 reviewer tools, the canvas, plan and pitch deck, and the demo journey tests.
- **Branches:** short task branches into `main` behind `VITE_TOOLKIT_DEMO`, off by default, so the judged build is unchanged.

**E. Approval**
- **Decisions** ([document 6 §1](06-master-roadmap.md#1-decisions-needed-before-work-starts)):
  - where the demo runs (a mock-mode preview, not the judging site);
  - a short scope note from Sylvain and ABM;
  - Shawnjembu's availability.
- **The biggest risk** is that a demo screen is mistaken for a working feature. Every screen carries a "Demo: sample data, not saved" label, and no document may claim the tools are built.
- **Next action:** approve the scope note and the split, agree the sample-data shapes (document 3) in a one-hour session, then start Phase 1.
