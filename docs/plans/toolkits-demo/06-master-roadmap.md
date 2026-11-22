# 6. Master roadmap (UI-only demo)

## 1. Decisions needed before work starts

| # | Decision | Who | Why |
|---|---|---|---|
| 1 | **Where the demo runs:** a mock-mode build with `VITE_TOOLKIT_DEMO=true`, either a separate Amplify branch or locally (`scripts/install.sh --serve`). Never the judging site | Sylvain (Amplify owner) | The judged build is in Supabase mode and frozen; the demo needs mock mode |
| 2 | A short scope note for the demo screens | Sylvain (scope), ABM (design owner) | D-28 says "no new standalone screens"; a demo behind a flag still adds screens |
| 3 | Shawnjembu's availability (about 134 h) | Shawnjembu, Sylvain | He has been out since 21 Nov; ABM can take his plan unchanged |
| 4 | Which release: the core demo or all 22 tools (§3) | Team | Decides how many phases are committed |

No work starts before the 23 Nov upload. With the flag off (the default), every existing screen and route is unchanged.

## 2. Phases (expected hours: Stacey / Shawnjembu)

| Phase | Content | Stacey | Shawnjembu | Exit gate |
|---|---|---|---|---|
| 0: planning | This folder; the one-hour shapes session | done | done | Decisions 1–3; shapes agreed |
| 1: foundation | U-01, U-03, U-04 (Stacey); U-02 (Shawnjembu) | 28 | 16 | The hub opens; "include" copies an item onto the demo case |
| 2: core demo | I-07, I-01 (Stacey); I-03, R-01, R-03, Q-01 (Shawnjembu) | 26 | 44 | **Core demo:** budget and canvas included and shown in the reviewer's Evidence and Financial panels; journey test green |
| 3: remaining tools | I-02, I-06, I-08–I-14 (Stacey); I-04, I-05, R-02, R-04–R-08 (Shawnjembu) | 81 | 66 | Every tool reachable from the hub or the reviewer pages |
| 4: polish | Q-03 walkthrough (Stacey); Q-02 accessibility pass (Shawnjembu) | 4 | 8 | Walkthrough rehearsed; accessibility checks pass |
| **Total** | | **139** | **134** | |

## 3. Schedule

The 15% buffer covers reviews and rework. The critical path is the busier developer's hours.

| Release | Hours (Stacey + Shawnjembu) | 20 h/week each | 35 h/week each |
|---|---|---|---|
| **Core demo** (Phases 1–2) | 54 + 60 = 114 | **3–4 weeks** | **2 weeks** |
| **All 22 tools** (Phases 1–4) | 139 + 134 = 273 | **8 weeks** | **4–5 weeks** |

**In parallel:**
- U-02 with U-01;
- R-01 with I-01 (both read U-01);
- almost all Phase 3 screens (each is independent).

**In sequence:**
- U-01 → U-03 → the tools;
- I-07 → I-01 → R-03;
- I-03 + I-01 + I-06 → I-04 → I-05;
- I-01 + I-03 + I-11 → I-12;
- U-04 + R-01 → Q-01.

**Milestones:**
- **D1** shapes agreed (week 1);
- **D2** core demo (end of Phase 2);
- **D3** all tools reachable;
- **D4** walkthrough rehearsed.

The journey test runs at D2 and D3.

**Bottlenecks:**
- U-01 (everyone needs the store: keep it small and merge it first);
- U-02 (Stacey's screens wait for `MoneyInput` and `BarChart`: merge them early);
- I-04 (waits on three tools).

## 4. Dependency matrix

| Feature | Sample data needed | Shared components | Data from another tool | Owner | Blocked by | Order |
|---|---|---|---|---|---|---|
| Demo store (U-01) | All fixtures | — | — | Stacey | Shapes session | 1 |
| Shared components (U-02) | — | builds them | — | Shawnjembu | U-01 types | 1 |
| Hub + profile (U-03) | Profile, products | `ToolCard`, `DemoNotice` | — | Stacey | U-01, U-02 | 2 |
| Include step (U-04) | Any includable kind | `EvidenceCard` | All tools | Stacey | U-01, U-02 | 2 |
| Pricing (I-07) | Products | `MoneyInput`, `SourceBadge` | — | Stacey | U-03 | 3 |
| Budget (I-01) | Budget | `MoneyInput`, `BarChart` | Pricing | Stacey | I-07 | 4 |
| Canvas (I-03) | Canvas | `PrintLayout` | Profile | Shawnjembu | U-03 | 3 |
| Evidence mapper (R-01) | Evidence on the demo case | `EvidenceCard` | Included items | Shawnjembu | U-01 | 3 |
| Financial viewer (R-03) | Included budget/pricing | `BarChart`, `SourceBadge` | Pricing, budget | Shawnjembu | R-01, I-07 | 5 |
| Feedback, compare, guided, clarification (R-04, R-05, R-02, R-07) | Evidence ids | `EvidenceCard` | R-01 | Shawnjembu | R-01 | 6 |
| Workload, learning hub (R-08, R-06) | Mock queue, sample articles | `DashboardCard`, `PlainMarkdown` | — | Shawnjembu | U-02 | any |
| CRM, market, roadmap, SWOT, inventory, survey, branding, mentor | Their own fixtures | `DataTable`, `MoneyInput`, `BarChart` | — | Stacey | U-03 | 6 |
| Plan (I-04) → deck (I-05) | Plan, deck | `PrintLayout` | Canvas, budget, market, roadmap | Shawnjembu | I-03, I-01, I-06 | 7–8 |
| Readiness (I-12) | — | `CompletenessMeter` | Budget, canvas, roadmap | Stacey | I-01, I-03, I-11 | 8 |

**Coordination points:**
- the shapes session;
- U-02 merged before tool screens;
- I-07 ↔ R-03 (shared finance outputs);
- U-04 ↔ R-01 (included items).

## 5. Git collaboration

- **Branches:** one short-lived branch per task from the latest `main`, with the prefixes `ui/`, `test/` and `docs/` (repository rules §1). Each task's branch name is in documents 4 and 5. Not two long-lived branches: the flag keeps `main` safe, and small PRs avoid a large final merge.
- **Shared files:**
  - Stacey owns `src/features/toolkit-demo/*`, `src/lib/finance.ts` and the toolkit route list;
  - Shawnjembu owns new files in `src/components/`;
  - `src/routes/router.tsx` and the shells are changed only in a PR that touches nothing else.
- **No migrations or `supabase/` changes in this plan.** If a PR touches them, it's out of scope.
- **Reviews:** the other developer reviews every PR; `src/components/` changes also get ABM's visual review; Sylvain merges, one at a time, after green CI.
- **Commits:** an imperative summary under 72 characters plus a body naming the task ID (`I-01`). No co-author trailers that name a tool.
- **Conflicts:** merge `main` into your branch daily; never rebase shared work or force-push. If a CHANGELOG-only conflict, keep both entries; otherwise ask the file's owner.
- **Integration runs:** both run the demo journey (Q-01) on a mock build at D2 and D3.
