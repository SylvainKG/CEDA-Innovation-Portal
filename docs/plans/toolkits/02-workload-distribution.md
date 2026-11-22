# 2. Workload distribution

**Result:** Stacey **372 h (51.2%)**, Shawnjembu **354 h (48.8%)**: a 2.5-point difference, inside the 5-point limit. Total **726 h** expected (545 h low, 1,016 h high).

## 2.1 How the hours were estimated

- **Productive developer hours,** expected case. Low = ×0.75, high = ×1.4. These are planning estimates, not measurements.
- **Every task's total includes everything:**
  - frontend (screens, states, responsive, keyboard);
  - backend (migration, RLS, RPC, adapter, contract text);
  - testing (pgTAP, Vitest, the Playwright part of its own screen).

  Documentation is inside the Backend column for database and contract text, and inside the Frontend column for user-facing text.
- **Refined against the repository** (document 1). Tools that extend existing features (guided evaluation, clarification, version compare, workload) are small. Tools that need new tables with owner-only RLS start from the existing patterns (`proposal_drafts` + `save_draft`, `is_case_owner`).
- **Skill-dependent:** Shawnjembu has built the frontend on this project; Stacey has built the database. Shawnjembu's tasks include **64 h of SQL/RPC work** (drafted by him, reviewed and sequenced by Stacey, §2.4). If that work is new to him, expect it towards the high estimate, or move it to Stacey (that would give 60/40, §2.4). No skill levels are assumed beyond this.

## 2.2 Task table

| Task ID | Feature / Task | Developer | Frontend hrs | Backend hrs | Testing hrs | Total hrs | Dependencies |
|---|---|---|---|---|---|---|---|
| F-01 | Integration contract: database entities, RPC signatures, snapshot shape (doc 3 §5) | Stacey | 0 | 8 | 0 | 8 | — |
| F-02 | Business workspace core: profile, products, segments; owner-only RLS; save/read RPCs | Stacey | 0 | 14 | 6 | 20 | F-01 |
| F-03 | Workspace hub page, profile form, navigation entry | Stacey | 14 | 0 | 3 | 17 | F-02, F-07 |
| F-04 | Evidence snapshot: selection, freeze on submit/revision, criterion tags, immutability, `get_case_evidence`, evidence file URLs | Stacey | 0 | 24 | 12 | 36 | F-02 |
| F-05 | Evidence selection step in the proposal form and revise page (what reviewers will see) | Stacey | 14 | 0 | 4 | 18 | F-04, F-07 |
| F-06 | Contract in TypeScript: shared interfaces, ports, mock adapters | Shawnjembu | 10 | 0 | 0 | 10 | F-01 |
| F-07 | Shared components: `MoneyInput` (BWP), `BarChart` (from Reports `BarList`), `SourceBadge`, `PrintLayout`, `ToolCard`, `EvidenceCard` | Shawnjembu | 16 | 0 | 4 | 20 | F-06 |
| I-07 | Break-even and pricing calculator + the shared calculation library | Stacey | 10 | 6 | 8 | 24 | F-02 |
| I-01 | Business Budgeter (lines, 3 scenarios, monthly forecast, cash flow) | Stacey | 20 | 10 | 8 | 38 | I-07, F-07 |
| I-02 | Mini CRM (contacts, interactions, reminders, pipeline; never shared) | Stacey | 18 | 8 | 6 | 32 | F-02 |
| I-03 | Business Model Canvas (9 blocks, versions, print/PDF) | Shawnjembu | 18 | 8 | 6 | 32 | F-02, F-07 |
| R-01 | Evidence-to-Criteria Mapper (reviewer view grouped by criterion) | Shawnjembu | 18 | 6 | 6 | 30 | F-04, F-06 |
| R-03 | Financial Analysis Viewer (read-only budget, pricing, break-even from the snapshot) | Shawnjembu | 14 | 4 | 5 | 23 | F-04, I-07 |
| R-04 | Structured Feedback Builder (strengths, next steps, task templates) | Shawnjembu | 10 | 8 | 5 | 23 | F-06 |
| R-02 | Guided Evaluation Assistant (criterion guidance, evidence prompt) | Shawnjembu | 6 | 0 | 2 | 8 | R-01 |
| R-05 | Version and evidence comparison | Shawnjembu | 10 | 3 | 4 | 17 | F-04 |
| R-07 | Clarification and question builder (templates, link to evidence) | Shawnjembu | 5 | 3 | 2 | 10 | R-01 |
| R-08 | Review workload manager (summary RPC, cards) | Shawnjembu | 8 | 4 | 3 | 15 | — |
| Q-01 | End-to-end journeys (innovator → reviewer → feedback), accessibility and responsive pass | Shawnjembu | 0 | 0 | 24 | 24 | F-05, R-01 |
| Q-02 | Cross-role security suite: RLS and RPC refusals for every new table | Stacey | 0 | 4 | 6 | 10 | F-04 |
| Q-03 | Contract, data-handling note and runbook updates | Stacey | 0 | 8 | 0 | 8 | F-04 |
| Q-04 | Hosted migrations (dry run, apply from `main`) and run record | Stacey | 0 | 4 | 2 | 6 | Q-02 |
| Q-05 | Staging journey run between a snapshot and an exact reset | Stacey | 0 | 0 | 4 | 4 | Q-01, Q-04 |
| I-04 | Business Plan Generator (compile, edit, print/PDF) | Shawnjembu | 22 | 8 | 6 | 36 | I-03, I-01, I-06 |
| I-05 | Pitch Deck Builder (slides from approved data, print/PDF) | Shawnjembu | 22 | 6 | 6 | 34 | I-04, F-07 |
| I-06 | Market Research and Competitor Analyzer (matrix, segments, cited sources) | Shawnjembu | 14 | 6 | 4 | 24 | F-02 |
| I-10 | Business Name and Branding Studio | Shawnjembu | 10 | 4 | 3 | 17 | F-02 |
| R-06 | Reviewer Learning Hub (staff-only content kind, hub page) | Shawnjembu | 8 | 4 | 3 | 15 | — |
| I-08 | SWOT Analysis Builder | Stacey | 8 | 4 | 3 | 15 | F-02 |
| I-09 | Customer Survey and Validation (public links, consent, QR, summaries, retention) | Stacey | 18 | 18 | 10 | 46 | F-02, Q-02 |
| I-11 | Innovation Roadmap and Milestone Tracker | Stacey | 12 | 6 | 4 | 22 | F-02 |
| I-12 | Funding Readiness Checker (transparent checklist, gap list) | Stacey | 10 | 6 | 5 | 21 | I-01, I-03, I-11 |
| I-13 | Inventory and Sales Tracker | Stacey | 14 | 8 | 5 | 27 | F-02 |
| I-14b | AI Business Mentor: server side (Edge Function, consent, limits, logging) | Stacey | 0 | 16 | 4 | 20 | BCR approval |
| I-14a | AI Business Mentor: panel, consent, source labels | Shawnjembu | 12 | 0 | 4 | 16 | I-14b |

## 2.3 Totals

**Stacey**
- Tasks: 18.
- Hours: **372** (frontend 138, backend 144, testing 90). Range 279–521.
- Share of the workload: **51.2%**.

**Shawnjembu**
- Tasks: 17.
- Hours: **354** (frontend 203, backend 64, testing 87). Range 266–496.
- Share of the workload: **48.8%**.

**Workload balance**
- **Difference:** 18 h, **2.5 percentage points**.
- **Fair:** yes. The split equalises hours, not features: Stacey owns the foundation and 8 innovator tools, plus the AI mentor's server side. Shawnjembu owns all 8 reviewer tools, 5 innovator tools, the AI mentor's panel and the shared components. Shawnjembu's share is mostly frontend; Stacey's is spread across all three columns.
- **The pressure is early, not in the totals.** In Phases 1–2 Stacey carries the critical path (F-02, F-04). This is evened out within the MVP (Stacey 221 h, Shawnjembu 212 h, 51/49) because Shawnjembu takes the canvas (I-03) and builds the reviewer screens against the mock adapter while F-04 is in progress.

## 2.4 Trade-offs considered

| Option | Split | Why not chosen |
|---|---|---|
| By dashboard: all innovator tools to Stacey, reviewer to Shawnjembu | ≈ 72 / 28 | The innovator tools are about 2.5 times the reviewer work |
| All SQL to Stacey (Shawnjembu frontend only) | 60 / 40 | Over the 5-point limit. Use it as the fallback if Shawnjembu's SQL estimate proves too optimistic |
| Chosen: one owner per tool end to end; Shawnjembu's SQL drafted by him, reviewed and sequenced by Stacey | 51 / 49 | Keeps one accountable owner per task and the repository rule "migrations: one sequence, owned by Stacey" |
