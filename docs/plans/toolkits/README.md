# Innovator and Reviewer Toolkits: implementation plan

**Status:** Proposed, for team approval. Nothing here is implemented. · **Prepared:** 22 Nov 2026, after the code freeze · **Owners:** Stacey and Shawnjembu (Obvious) · **Approvers:** Sylvain (scope), ABM (design owner, D-31)

**Sources:** the two concept documents, *Peolwane Innovator's Business Toolkit (14 tools)* and *Peolwane Reviewer Empowerment Toolkit (8 tools)*, and the repository at `main` `49425b2` (hosted staging at migration 016).

This folder is the plan for adding both toolkits to the portal. The toolkits are linked: an innovator prepares business information, chooses what to submit, and an assigned reviewer reads a frozen copy of it while scoring.

| # | Document | Answers |
|---|---|---|
| 1 | [Existing system audit](01-existing-system-audit.md) | What exists, what is partial, what is missing |
| 2 | [Workload distribution](02-workload-distribution.md) | Every task, its hours and its owner: Stacey 372 h (51.2%), Shawnjembu 354 h (48.8%) |
| 3 | [Shared architecture and integration](03-architecture-and-integration.md) | Business workspace, evidence snapshot, reviewer access, contract |
| 4 | [Stacey's plan](04-plan-stacey.md) | Her 18 tasks in order |
| 5 | [Shawnjembu's plan](05-plan-shawnjembu.md) | His 17 tasks in order |
| 6 | [Master roadmap](06-master-roadmap.md) | Phases, schedule at 20 h and 35 h a week, dependencies, branches |
| 7 | [UI consistency specification](07-ui-consistency.md) | Existing components and tokens both must reuse |
| 8 | [Risks and testing](08-risks-and-testing.md) | Risk register, the five greatest risks, test strategy |

## Management summary

**A. Existing system**
- **Reuse:**
  - the whole reviewer workflow: queue, declaration gate (N10), scorecard with anchors and reasons, clarification, revision tasks linked to rubric criteria (`feedback_tasks.criterion_id`), task verification, version compare (INN-01), score panel;
  - the access helpers `private.is_cleared_reviewer`, `can_read_case`, `is_case_owner`;
  - the signed-URL function `attachment-url`, `formatBWP`/`parseBWP`, the Reports bar list, `DataTable`, `Dialog`, `Tabs`, the state components and the design tokens.
- **Build:**
  - all 14 innovator tools: there is no business workspace today;
  - the evidence snapshot and the reviewer evidence view;
  - the financial viewer;
  - the learning hub content type.
- **Improve:**
  - structured feedback (strengths and next steps on top of the existing tasks);
  - workload summary (on top of My reviews);
  - guided evaluation (criterion guidance beside each score);
  - clarification templates.

**B. Work distribution** (expected hours, ±: low ×0.75, high ×1.4)
- Stacey: **372 h, 51.2%**, 18 tasks.
- Shawnjembu: **354 h, 48.8%**, 17 tasks.
- Difference: **2.5 percentage points** (18 h).
- Why this split: the repository rules make Stacey the owner of the single migration sequence and of `supabase/`, and Shawnjembu the owner of shared components. So Stacey takes the database, security and the link, plus the calculation-heavy innovator tools. Shawnjembu takes the reviewer toolkit, shared components and the document-style innovator tools (canvas, plan, pitch deck, market research, branding). It is not a split by dashboard.

**C. Delivery** (total 726 h expected)

| Release | Hours (both) | At 20 h/week each | At 35 h/week each |
|---|---|---|---|
| Demonstration slice (link + canvas + budget + evidence and financial views) | 294 | 9–10 weeks | 5–6 weeks |
| Functional MVP (Phases 1–3) | 433 | 12–13 weeks | 7–8 weeks |
| Full scope (Phases 1–6) | 726 | 21–22 weeks | 12–13 weeks |

The schedule includes a 15% integration buffer.

Critical milestones:
- **M1:** the contract is agreed (end of week 1).
- **M2:** the evidence snapshot is merged with its isolation tests.
- **M3:** the end-to-end journey passes on staging.

**D. Collaboration**
- **Stacey owns:** `supabase/` (all migrations, RLS, RPCs, pgTAP), the Supabase adapters for new modules, the workspace hub, the evidence selection step, and the budget, pricing, CRM, survey, inventory, readiness, SWOT and roadmap tools.
- **Shawnjembu owns:** `src/components/` (new shared components), `src/pages/review/`, the reviewer toolkit, and the canvas, plan, pitch deck, market and branding tools.
- **Agreed before coding:** the contract in document 3 §5 (types, RPC names, snapshot shape).
- **Branches:** short-lived task branches into `main` behind a feature flag (document 6 §5), as the repository rules require, not two long-lived feature branches.

**E. Approval**
- Decisions in [document 6 §1](06-master-roadmap.md#1-decisions-needed-before-work-starts):
  - a change request (D-28 "no new standalone screens");
  - a separate Supabase project for development;
  - Shawnjembu's availability;
  - the AI tools (D-25, BCR-004);
  - Word export (new dependency).
- Five greatest risks: [document 8 §2](08-risks-and-testing.md#2-the-five-greatest-risks).
- **Next action:** Sylvain and ABM approve the scope change and this split; both developers agree the contract (document 3 §5) in a 2-hour session; then Phase 1 starts.
