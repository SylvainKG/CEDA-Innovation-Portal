# 1. Existing system audit (UI)

**Checked against:** `main` `49425b2`, 22 Nov 2026. For a UI-only demo, what matters is which screens, components and sample data already exist. Server-side features are listed only where a demo screen imitates them.

## 1.1 What the demo builds on

| Area | What is there | Where |
|---|---|---|
| Mock mode | Every API module has a mock adapter with in-memory state that lasts until reload; switched by `VITE_API_MODE=mock` | `src/lib/api/index.ts`, `src/lib/api/mock/*` |
| Sample data | Fixtures copied from the demo seed: challenges, forms, rubric criteria, the 8 demo cases, demo accounts | `src/lib/api/mock/fixtures.ts` |
| Role switching | The mock session stores the demo role (`ceda.mock.role`), so one browser can play applicant, reviewer, adjudicator | `src/lib/api/mock/session.ts` |
| Mock builds | `scripts/install.sh` builds the mock demo; the smoke suite runs against it | `scripts/install.sh`, `tests/e2e/shell-smoke.spec.ts` |
| Shells and navigation | Public, applicant and staff shells; route guards | `src/layouts/*`, `src/routes/router.tsx` |
| Components | 24 shared components (buttons, fields, tables, dialogs, tabs, banners, states, badges, meters) | `src/components/` |
| Tokens | Colours, type scale, radii, shadows as CSS variables; Inter Variable | `src/styles/tokens.css`, `tailwind.config.ts` |
| Money and dates | `formatBWP`, `parseBWP`; `formatDateCAT` | `src/lib/money.ts`, `src/lib/format.ts` |
| Charts | A one-series bar list with a "Show as table" toggle (on the Reports page) | `src/pages/oversight/ReportsPage.tsx` (`BarList`) |
| Tests | 354 Vitest tests; Playwright smoke at 360 and 1280 px | `src/**/*.test.tsx`, `tests/e2e/` |

## 1.2 Reviewer Empowerment Toolkit (8 tools)

| Feature | Existing status | Reusable components | Remaining work (demo) | Complexity |
|---|---|---|---|---|
| Review Workload Manager | **Partial**: My reviews queue with due dates; staff home counts | `MyReviewsPage.tsx`, `StaffHomePage.tsx`, `DashboardCard`, mock `myQueue` | Summary cards computed from the mock queue | Low |
| Guided Evaluation Assistant | **Existing**: anchors, guidance, required reasons, weighted score | `ScorePage.tsx`, `src/lib/scoring.ts` | Guidance panel beside each score; "cite evidence" prompt | Low |
| Clarification & Question Builder | **Existing**: request clarification dialog | `RequestFeedbackDialog.tsx`, mock `feedback` | Question templates; pick an evidence item | Low |
| Structured Feedback Builder | **Partial**: revision tasks linked to criteria | `RequestFeedbackDialog.tsx`, `FeedbackList.tsx` | Strengths and next-steps fields (kept in the mock store) | Low–Medium |
| Version Comparison & Improvement Tracker | **Existing**: V1/V2 compare | `VersionCompare.tsx`, `src/features/versions/compare.ts` | Show the sample evidence of two versions side by side | Low |
| Evidence-to-Criteria Mapper | **Missing** | `ScorePage` `ProposalPanel`, rubric criteria in fixtures | Evidence panel grouped by criterion, from sample data | Medium |
| Financial Analysis Viewer | **Missing** | `formatBWP`, `BarList` | Read-only budget, pricing, break-even from sample data | Medium |
| Reviewer Learning Hub | **Partial**: help pages, content admin | `HelpPages.tsx`, `PlainMarkdown`, mock `content` | Hub page with sample guidance articles | Low |

## 1.3 Innovator Business Toolkit (14 tools)

There is **no business workspace screen** today. The applicant side has the proposal form (autosave, completeness meter), receipt, revise page and My ideas, all of which work in mock mode.

| Feature | Existing status | Reusable components | Remaining work (demo) | Complexity |
|---|---|---|---|---|
| Toolkit hub + shared profile | Missing | `ApplicantShell`, `DashboardCard`, `TextField` | Hub of tool cards; profile form on sample data | Low |
| 01 Business Budgeter | Missing | `DataTable`, `formatBWP`, `BarList` | Lines, 3 scenarios, monthly totals, chart | Medium |
| 02 Mini CRM | Missing | `DataTable`, `QueueFilters`, `Dialog` | Contacts, interactions, pipeline board | Medium |
| 03 Business Model Canvas | Missing | `TextField`, `Tabs`, `AutosaveIndicator` | 9-block canvas, versions list, print view | Medium |
| 04 Business Plan Generator | Missing | `PlainMarkdown` | Plan assembled from sample canvas, budget, market data; print view | Medium |
| 05 Pitch Deck Builder | Missing | none | Slides from sample data; reorder; presenter and print view | Medium |
| 06 Market Research & Competitor Analyzer | Missing | `DataTable` | Competitor matrix, segments, sources | Low–Medium |
| 07 Break-Even & Pricing Calculator | Missing | `money.ts` | Calculator (real arithmetic in the browser) | Low–Medium |
| 08 SWOT Analysis Builder | Missing | `TextField` | Four lists, items to actions | Low |
| 09 Customer Survey & Validation | Missing | Form patterns | Survey builder, a sample share link and QR (not live), sample results | Medium |
| 10 Business Name & Branding Studio | Missing | none | Names, positioning, palette, notice | Low |
| 11 Innovation Roadmap & Milestones | Missing | `StageTimeline` (pattern) | Milestone board | Low–Medium |
| 12 Funding Readiness Checker | Missing | `CompletenessMeter`, `form-check.ts` | Transparent checklist over the sample workspace | Low–Medium |
| 13 Inventory & Sales Tracker | Missing | `DataTable` | Stock list, movements, reorder flags | Low–Medium |
| 14 AI Business Mentor | Missing; Peolwane AI exists for site help | `src/features/assistant/` (UI pattern) | **Scripted** sample replies, clearly labelled; no AI service is called | Low |

## 1.4 What the demo must not disturb

The judged build runs in Supabase mode against staging. The demo is off unless `VITE_TOOLKIT_DEMO` is set, and it runs only in a mock-mode build. The existing screens and their tests (354 unit, smoke, journey) must stay unchanged and green.
