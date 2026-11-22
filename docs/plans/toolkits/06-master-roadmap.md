# 6. Master roadmap

## 1. Decisions needed before work starts

| # | Decision | Who | Why |
|---|---|---|---|
| 1 | Approve a change request for the toolkits (new innovator workspace screens) | Sylvain (scope), ABM (design owner) | D-28 says "no new standalone screens" |
| 2 | Develop against a **separate Supabase project**, never the judging project | Team | Judging runs 25–30 Nov, with the top-5 presentation on 3 Dec; runbook §3 step 9 bars test tools on the judging project |
| 3 | Confirm Shawnjembu's availability (about 354 h) | Shawnjembu, Sylvain | He has been out since 21 Nov; his frontend work was handed to ABM (#119). If unavailable, ABM takes his plan unchanged |
| 4 | AI Business Mentor and any reviewer AI: new change request + processor agreement | Sylvain, Stacey | D-25 bars proposal data going to outside AI; BCR-004 covers site help only |
| 5 | Word (.docx) export for the plan and deck | Team | Needs a new dependency and an ADR (repository rules §2.6); print-to-PDF needs none |
| 6 | Release target: demonstration slice, MVP or full scope (§3) | Team | Decides how many phases are committed |

No work starts before the 23 Nov upload. Everything is built behind a `VITE_TOOLKIT` flag, so `main` stays releasable (repository rules §1).

## 2. Phases (expected hours: Stacey / Shawnjembu)

| Phase | Content | Stacey | Shawnjembu | Exit gate |
|---|---|---|---|---|
| 0: assessment and planning | This folder; contract session | done | done | Decisions 1–3 taken; M1 contract signed |
| 1: shared foundation | F-01–F-05 (Stacey); F-06, F-07 (Shawnjembu) | 99 | 30 | M2: evidence snapshot merged with its isolation tests |
| 2: core tools | I-07, I-01, I-02 (Stacey); I-03, R-01, R-03, R-04 (Shawnjembu) | 94 | 108 | Canvas and budget frozen and readable by a cleared reviewer on the development project |
| 3: end-to-end | Q-02–Q-05 (Stacey); R-02, R-05, R-07, R-08, Q-01 (Shawnjembu) | 28 | 74 | M3: the full journey passes on staging between a snapshot and a reset; **MVP** |
| 4: remaining tools | I-08, I-09, I-11, I-12, I-13 (Stacey); I-04, I-05, I-06, I-10, R-06 (Shawnjembu) | 131 | 126 | Each tool's tests and access rows in Q-02 |
| 5: AI (if approved) | I-14b (Stacey); I-14a (Shawnjembu) | 20 | 16 | Change request signed; usage limits proven |
| 6: release readiness | Regression, accessibility, performance, docs, demo (inside each task's testing hours and Q-01/Q-02) | — | — | Document 8 §4 checklist |
| **Total** | | **372** | **354** | |

**Phase 3 balance:** in Phases 1–3 together, Stacey has 221 h and Shawnjembu 212 h. In Phase 1 Shawnjembu works ahead on Phase 2 screens against the mock adapter.

## 3. Schedule

The 15% buffer covers integration, review waits and rework. The critical path is the busier developer's hours.

| Release | Content | Hours (Stacey + Shawnjembu) | 20 h/week each | 35 h/week each |
|---|---|---|---|---|
| **Demonstration slice** | F-01–F-07, I-07, I-01, I-03, R-01, R-03, Q-05, and the journey part of Q-01 | 165 + 129 = 294 | **9–10 weeks** | **5–6 weeks** |
| **Functional MVP** | Phases 1–3 | 221 + 212 = 433 | **12–13 weeks** | **7–8 weeks** |
| **Full scope** | Phases 1–6 (AI only if approved) | 372 + 354 = 726 | **21–22 weeks** | **12–13 weeks** |

**In parallel:**
- F-06/F-07 with F-02;
- Shawnjembu's reviewer screens (on the mock) with F-04;
- all Phase 4 tools except I-12, I-04 and I-05.

**In sequence:**
- F-01 → F-02 → F-04 → F-05;
- I-07 → I-01 → R-03;
- I-03 + I-01 + I-06 → I-04 → I-05;
- I-01 + I-03 + I-11 → I-12;
- I-14b → I-14a.

**Milestones:**
- **M1** contract signed (week 1);
- **M2** evidence snapshot merged (about week 4 at 20 h, week 3 at 35 h);
- **M3** MVP journey on staging;
- **M4** all tools merged;
- **M5** release checks.

Testing milestones: the pgTAP access suite grows with each backend PR. The journey (Q-01) runs at M3 and again at M4.

**Bottlenecks:**
- **F-04** (only Stacey; everything on the reviewer side waits for real data);
- **Stacey's review of Shawnjembu's SQL** (plan one review slot a week);
- **I-04** (the plan generator waits on three tools).

## 4. Dependency matrix

| Feature | Database structures | API functions | Shared components | Data from another tool | Owner | Blocked by | Order |
|---|---|---|---|---|---|---|---|
| Workspace core (F-02/F-03) | profiles, products, documents, revisions, files | `save_business_profile`, `get_my_workspace`, `save_workspace_document` | `ToolCard`, `SourceBadge` | — | Stacey | F-01 | 1 |
| Evidence snapshot (F-04/F-05) | `evidence_selections`, `version_evidence` | `set_evidence_selection`, `get_evidence_preview`, `get_case_evidence`; submit RPCs | `EvidenceCard` | Any selectable kind | Stacey | F-02 | 2 |
| Pricing / break-even (I-07) | finance functions | `finance_*` (private) | `MoneyInput`, `SourceBadge` | Products | Stacey | F-02 | 3 |
| Budgeter (I-01) | budget kind | `save_workspace_document` | `MoneyInput`, `BarChart` | Products, finance | Stacey | I-07 | 4 |
| Mini CRM (I-02) | CRM tables | `crm_*` | `DataTable`, `Dialog` | — (never shared) | Stacey | F-02 | 4 |
| Canvas (I-03) | canvas kind | `save_workspace_document` | `PrintLayout` | Profile, products | Shawnjembu | F-02 | 4 |
| Evidence mapper (R-01) | `version_evidence` | `get_case_evidence` | `EvidenceCard` | Frozen items, rubric criteria | Shawnjembu | F-04 | 4 (mock 2) |
| Financial viewer (R-03) | — | `get_case_evidence` | `BarChart`, `SourceBadge` | Frozen budget/pricing | Shawnjembu | F-04, I-07 | 5 |
| Structured feedback (R-04) | 2 columns + task `evidence_id` | `request_feedback` | — | Evidence ids | Shawnjembu | F-06 | 4 |
| Version compare (R-05) | — | `get_case_evidence` × 2 | `EvidenceCard` | Two frozen sets | Shawnjembu | F-04 | 6 |
| Guided evaluation (R-02), clarification (R-07) | — / `evidence_id` | existing | — | R-01 | Shawnjembu | R-01 | 6 |
| Workload (R-08) | — | `my_review_workload` | `DashboardCard` | — | Shawnjembu | — | any |
| Learning hub (R-06) | content kind | `save_content_page` | — | — | Shawnjembu | — | any |
| Market research (I-06) | market kind | `save_workspace_document` | `DataTable` | Products | Shawnjembu | F-02 | 7 |
| Plan generator (I-04) | plan kind + revisions | same | `PrintLayout` | Canvas, budget, market, roadmap | Shawnjembu | I-03, I-01, I-06 | 9 |
| Pitch deck (I-05) | deck kind | same | `PrintLayout` | Plan data | Shawnjembu | I-04 | 10 |
| Branding (I-10), SWOT (I-08), roadmap (I-11) | own kinds | same | — | — | Shawnjembu / Stacey / Stacey | F-02 | 7 |
| Inventory (I-13) | inventory tables | `inventory_*` | `DataTable`, `MoneyInput` | Products | Stacey | F-02 | 7 |
| Survey (I-09) | survey tables | `survey_*`, `submit_survey_response` | — | — | Stacey | F-02, Q-02 | 8 |
| Readiness (I-12) | readiness kind | same | `CompletenessMeter` | Profile, canvas, budget, roadmap | Stacey | I-01, I-03, I-11 | 9 |
| AI mentor (I-14) | usage log | Edge Function | — | Fields the user shares | Stacey + Shawnjembu | Change request | 11 |

**Coordination points:**
- **M1:** the contract;
- **F-07:** the shared components, before any tool screen;
- **I-07 ↔ R-03:** the shared finance test cases;
- **F-04 ↔ R-01:** the mock-to-real switch;
- **every SQL PR of Shawnjembu's:** Stacey's review and migration number.

## 5. Git collaboration

- **Branches:** short-lived task branches from the latest `main`, one per task, as the repository rules require (§1: "merge within a day or two"). The prefixes are `db/`, `ui/`, `test/` and `docs/`; each task's branch name is in documents 4 and 5. The suggested long-lived `feature/innovator-toolkit-stacey` and `feature/reviewer-toolkit-shawnjembu` are **not** recommended: two big branches over 12+ weeks would produce the last-minute merge conflicts this plan is meant to avoid. The `VITE_TOOLKIT` flag gives the same isolation on `main`.
- **Shared files and their owners:**
  - Stacey: `supabase/**`, `src/lib/api/supabase/{workspace,evidence}.ts`, `src/lib/finance.ts`;
  - Shawnjembu: `src/components/**` (new components), `src/lib/api/toolkit-types.ts`, the mock adapters;
  - shared, so changed only in a PR that touches nothing else: `src/routes/router.tsx` and `src/layouts/ApplicantShell.tsx` / `StaffShell.tsx`.
- **Migrations:** Stacey owns the sequence (repository rules §3). Numbers are reserved up front:

  | Number | For |
  |---|---|
  | 017 | Workspace |
  | 018 | Evidence |
  | 019 | Finance |
  | 020 | CRM |
  | 021 | Canvas validator |
  | 022 | Feedback fields |
  | 023 | Review workload |
  | 024 | Learning hub |

  Later numbers are given out by Stacey when a PR opens. A migration is never renumbered after merge. Two open migration PRs never share a number.
- **Reviews:**
  - `supabase/**` needs Stacey; `src/components/**` needs Shawnjembu (or ABM);
  - the developer never approves their own PR; the other developer reviews;
  - Sylvain merges, one at a time, squash, after green CI.
- **Commits:** an imperative summary under 72 characters plus a body with the task ID (`I-01`), as today. No co-author trailers that name a tool.
- **Conflicts:** merge `main` into the task branch, never rebase a shared branch and never force-push. If a CHANGELOG-only conflict, keep both entries. Any other conflict: talk to the file's owner first.
- **Sync:** merge `main` into your branch daily while it is open. Both developers run the journey (Q-01) on a throwaway stack at each milestone (M2, M3, M4), and before any staging run.
