# 2. Workload distribution (UI-only demo)

**Result:** Stacey **139 h (50.9%)**, Shawnjembu **134 h (49.1%)**: a 1.8-point difference. Total **273 h** expected (205 h low, 382 h high).

## 2.1 How the hours were estimated

- **Productive developer hours,** expected case. Low = ×0.75, high = ×1.4. These are planning estimates, not measurements.
- **No backend work:** no tables, migrations, access rules, server functions, AI services or file storage. The **Sample data** column is work on the in-memory demo store and its fixtures (document 3).
- **Testing** covers unit tests for each screen's states and calculations, the screen's row in the smoke suite, and the demo journey and accessibility passes. Demo documentation is counted there too.
- **Exports** are print views (the browser's "Save as PDF"), not generated files.
- **Skill-dependent:** Stacey has led the database work so far, and all her tasks here are frontend. Her estimates may run towards the high end; Shawnjembu's shared components (built first) shorten the learning curve.

## 2.2 Task table

| Task ID | Feature / Task | Developer | Frontend hrs | Sample data hrs | Testing hrs | Total hrs | Dependencies |
|---|---|---|---|---|---|---|---|
| U-01 | Demo store: sample-data types, fixtures (one innovator workspace, an evidence set on the demo case), in-memory store | Stacey | 0 | 6 | 2 | 8 | — |
| U-02 | Shared components: `MoneyInput`, `BarChart` (from Reports `BarList`), `SourceBadge`, `PrintLayout`, `ToolCard`, `EvidenceCard`, `DemoNotice` | Shawnjembu | 13 | 0 | 3 | 16 | U-01 (types) |
| U-03 | Toolkit hub, shared profile, navigation item, `VITE_TOOLKIT_DEMO` flag | Stacey | 8 | 1 | 1 | 10 | U-01, U-02 |
| U-04 | "Include in submission" step on the proposal form and revise page (copies sample items to the demo case) | Stacey | 7 | 2 | 1 | 10 | U-01, U-02 |
| I-07 | Break-even and pricing calculator (real browser arithmetic) | Stacey | 7 | 1 | 2 | 10 | U-03 |
| I-01 | Business Budgeter (lines, 3 scenarios, monthly totals, chart) | Stacey | 12 | 2 | 2 | 16 | I-07, U-02 |
| I-03 | Business Model Canvas (9 blocks, versions list, print view) | Shawnjembu | 9 | 1 | 2 | 12 | U-03 |
| R-01 | Evidence-to-Criteria Mapper (panel on the scorecard and case page) | Shawnjembu | 9 | 2 | 1 | 12 | U-01, U-02 |
| R-03 | Financial Analysis Viewer (read-only, labels estimates) | Shawnjembu | 8 | 0 | 2 | 10 | R-01, I-07 |
| Q-01 | Demo journey tests in mock mode (innovator → include → reviewer evidence → feedback) | Shawnjembu | 0 | 0 | 10 | 10 | U-04, R-01 |
| I-02 | Mini CRM (contacts, interactions, pipeline board; never shown to reviewers) | Stacey | 9 | 2 | 1 | 12 | U-03 |
| I-09 | Customer Survey and Validation (builder, sample link and QR, sample results) | Stacey | 9 | 2 | 1 | 12 | U-03 |
| I-13 | Inventory and Sales Tracker | Stacey | 7 | 2 | 1 | 10 | U-03 |
| I-06 | Market Research and Competitor Analyzer | Stacey | 7 | 2 | 1 | 10 | U-03 |
| I-11 | Innovation Roadmap and Milestone Tracker | Stacey | 7 | 1 | 1 | 9 | U-03 |
| I-12 | Funding Readiness Checker (transparent checklist, "not an approval prediction") | Stacey | 6 | 1 | 1 | 8 | I-01, I-03, I-11 |
| I-08 | SWOT Analysis Builder | Stacey | 4 | 0 | 1 | 5 | U-03 |
| I-10 | Business Name and Branding Studio | Stacey | 5 | 1 | 1 | 7 | U-03 |
| I-14 | AI Business Mentor (scripted sample replies, labelled; no AI service) | Stacey | 6 | 1 | 1 | 8 | U-03 |
| Q-03 | Demo walkthrough script and sample-data guide | Stacey | 0 | 0 | 4 | 4 | All innovator tools |
| I-04 | Business Plan Generator (assembled from sample data, print view) | Shawnjembu | 11 | 1 | 2 | 14 | I-03, I-01, I-06 |
| I-05 | Pitch Deck Builder (slides, reorder, presenter and print view) | Shawnjembu | 11 | 1 | 2 | 14 | I-04 |
| R-04 | Structured Feedback Builder (strengths, next steps, templates) | Shawnjembu | 6 | 1 | 1 | 8 | R-01 |
| R-05 | Version and evidence comparison | Shawnjembu | 6 | 1 | 1 | 8 | R-01 |
| R-02 | Guided Evaluation Assistant (guidance panel, evidence prompt) | Shawnjembu | 4 | 0 | 1 | 5 | R-01 |
| R-07 | Clarification and question builder (templates, link to evidence) | Shawnjembu | 4 | 0 | 1 | 5 | R-01 |
| R-08 | Review Workload Manager (summary cards) | Shawnjembu | 5 | 0 | 1 | 6 | U-02 |
| R-06 | Reviewer Learning Hub (sample guidance articles) | Shawnjembu | 4 | 1 | 1 | 6 | U-02 |
| Q-02 | Accessibility and responsive pass on every new screen | Shawnjembu | 0 | 0 | 8 | 8 | All screens |

## 2.3 Totals

**Stacey**
- Tasks: 15.
- Hours: **139** (frontend 94, sample data 24, testing 21). Range 104–195.
- Share of the workload: **50.9%**.

**Shawnjembu**
- Tasks: 14.
- Hours: **134** (frontend 90, sample data 8, testing 36). Range 101–188.
- Share of the workload: **49.1%**.

**Workload balance**
- **Difference:** 5 h, **1.8 percentage points**, inside the 5-point limit.
- **Fair:** yes.
  - Stacey has more tools (11 innovator screens), but most are small.
  - Shawnjembu has fewer, larger screens: the plan and pitch deck, plus the reviewer panels that change existing pages. He also carries the shared components and most of the testing.
- **Core demo (Phases 1–2):** Stacey 54 h, Shawnjembu 60 h, so the early work is balanced too.

## 2.4 Trade-off

Splitting by dashboard (all innovator screens to Stacey) would be about 70 / 30. Moving the canvas, plan and pitch deck to Shawnjembu fits his reviewer work: they are the documents the reviewer panels display.
