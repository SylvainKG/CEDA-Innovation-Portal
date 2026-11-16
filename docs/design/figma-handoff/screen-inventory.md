# Screen inventory

**Maintained by:** Sandra · **Backup:** Obvious · **Last updated:** 16 Nov 2026 · **Status:** TASK-01 first pass, for review by Sylvain (scope) and Obvious (buildability)
Never record tokens, passwords or cookies here (D-40).

## Summary

- **Design source:** one **Figma Make** file. It is a coded React + Tailwind prototype, not a canvas file: it has **no pages, frames, node IDs, Figma components or Figma variables**. "Frames" below are the prototype's views (React components in `src/App.tsx`).
- **Coverage:** 9 of the 15 templates exist in some form; 0 are complete; T02, T03, T10 and T15 are missing; the state kit is missing. See `screen-status.md`.
- **CEDA branding:** **Partly present**: the CEDA logo asset, CEDA orange `#F58220` and the Inter typeface. Whether this is CEDA-approved branding is open (D-04, handoff-notes #1).
- **Biggest blocker:** the type scale (most text is 7–10 px) and the primary button contrast (white on `#F58220` = 2.59:1). See `design-tokens.md`.

## Connection record (D-35)

| Date (CAT) | Person | Connection mode | Seat type | Plan | Tools load? | MCP calls used today | Notes |
|---|---|---|---|---|---|---|---|
| 16 Nov 2026 | Sandra (own login) | Remote `https://mcp.figma.com/mcp` | Full | **Starter** (personal team) | Yes | ~5 read calls | **Starter plan read limit: about 20 calls per month** (Figma's rate-limit page; some Figma sources still say 6). That is not enough for TASK-01/TASK-02 as planned. Canvas tools (`get_metadata`, `get_screenshot`, `get_variable_defs`, `create_session`) **do not support Make files**; only the Make source can be read. **Inventory continued manually (TASK-01 B2) from the Make source.** |

## Files and access (D-34)

| File | URL | Location (team project / personal drafts) | Team-level owners | Editors | Viewers / Dev Mode |
|---|---|---|---|---|---|
| CEDA Innovation Management Portal (Figma Make) | https://www.figma.com/make/zrioM3hOSeeP6xpFstPgen/CEDA-Innovation-Management-Portal | Sandra's personal Starter team | Sandra only | Sandra | To confirm |

**Gaps against D-34:** one owner, one editor, Starter plan (risk R-01, R-02). No Figma Design (canvas) file exists yet, so the `MVP — Working (Sandra)` page in TASK-02 has nowhere to live. See handoff-notes #10.

## Frames (prototype views)

File for every row: the Make file above. Breakpoint for every row: responsive CSS (layout changes at 1100, 820 and 520 px). Node ID: not applicable (Make).

| Make view (component) | Role | Template | Variant / role | Completeness | Notes |
|---|---|---|---|---|---|
| `PublicHome` | Public | T01 | Public home | Incomplete | Marketing landing (hero, journey, sectors, 5-step process, footer). No challenge list, closing dates or status. Process steps differ from the 5 public stages |
| `AppShell` (sidebar + top bar) | All signed in | Shells | Staff shell (also used for applicant) | Incomplete | No DEMO badge, skip link or footer. Applicant should use top bar + bottom nav (spec §4) |
| `NotificationPopover` | All signed in | T11 | Bell popover | Incomplete | No full page, no email preferences |
| `ApplicantView` (dashboard) | Applicant | T06 | Applicant "My ideas" | Incomplete | KPI tiles + table instead of one IdeaCard per idea; 6-stage journey; "Coming next" card |
| `ApplicantView` (applications) | Applicant | T06 | Applicant list | Incomplete | Table of 4 applications; overlaps the dashboard |
| `ApplicationForm` steps 1–5 | Applicant | T04 | Draft + attachments | Incomplete | 6-step stepper, help aside, upload list. No validation or error summary, autosave time, completeness meter or field help |
| `ApplicationForm` step 6 (`ReviewSummary`) | Applicant | T04 | Review & declare | Incomplete | Section summary + privacy and IP checkboxes |
| `SuccessState` | Applicant | T05 | Receipt V1 | Incomplete | Reference, date, status, next steps. No version, CAT server time, form version, file list or print |
| `ApplicationDetail` (Overview, Documents, Activity) | Applicant | T08 | Applicant case view | Incomplete | Header, 6-stage timeline, tabs |
| `ApplicationDetail` → `Feedback` | Applicant | T08 | Feedback tab | Incomplete | Free-text revision request + V1/V2 row. No task list, deadline or clarification reply |
| `EvaluatorView` (dashboard + assigned) | Reviewer ("Evaluator") | T06 + T07 | Staff home + reviewer queue | Incomplete | KPIs, deadline banner, shared table. No "Declaration needed" grouping |
| `EvaluationReview` | Reviewer | T09 | Scorecard | Incomplete | Split view, 6 criteria, 1–5 buttons, comments, total /30. No declaration gate, anchors, required reasons, weights or peer panel |
| `AdjudicatorView` | Adjudicator | T06 + T07 | Staff home + decision queue | Incomplete | Shortlist ranked by score /100 |
| `Comparison` | Adjudicator | T09 / T10 | Panel view + record decision | Incomplete (conflicts) | Compares **two different applications**, not reviewers on one case. Decision options differ from the blueprint. See handoff-notes #3–#4 |
| `AdminView` (overview) | Administrator | T06 | Admin home | Incomplete | 6 KPI tiles, donut, line, bar, progress list |
| `AdminView` (applications) | Administrator | T07 | Admin all cases | Incomplete | Shared table; "View" does nothing |
| `ProgrammeSetup` → Programme | Administrator | T12 | Challenge editor | Incomplete | Name, status, dates, description |
| `ProgrammeSetup` → Evaluation stages | Administrator | — | — | **Unmapped** | Drag-to-reorder workflow stages; the blueprint workflow is fixed |
| `ProgrammeSetup` → Scoring rubric | Administrator | T12 | Rubric editor | Incomplete | Criteria list + reviewer preview. No anchors or weights total |
| `ProgrammeSetup` → Reviewer assignment | Administrator | T10 / T12 | Assign reviewers (as a page) | Incomplete | Reviewer workload list; blueprint has assignment as a T10 dialog per case |
| `ProgrammeSetup` → Users & roles | Administrator | T12 | Users & roles | Incomplete | Table only. No grant/revoke; own row not locked |
| `Reports` | Administrator | T13 | Reports | Incomplete | 4 KPIs, bar + line. No tabs, impact, chat or table toggle |
| `AuditLog` | Administrator | T14 | Audit log | Incomplete | Table only. No filters, detail drawer or immutability banner |
| `Modal` | All | T10 | Confirm dialog | Incomplete | Generic confirm only |

**Not present at all:** T02 auth set · T03 content pages · T10 workflow dialogs · T15 chat · state kit · screening officer, support consultant, committee member and auditor views.

## Design system found

Source: `src/index.css` and `src/App.tsx` in the Make file. Full values in `design-tokens.md`; components in `component-specifications.md`.

| Kind | Name in Figma | Value / description | Code token name (§8.6) | Notes |
|---|---|---|---|---|
| Colour | CSS `--orange` | `#F58220` | `brand-primary` | Fails contrast with white text (2.59:1) |
| Colour | CSS `--orange-dark` | `#D96508` | `brand-primary-hover` | 3.61:1 on white |
| Colour | CSS `--gold` | `#F9C51C` | `brand-accent` | Shortlisted / selected |
| Colour | CSS `--red` | `#E53935` | `feedback-error` | Also used for "Feedback requested" |
| Colour | CSS `--ink`, `--muted`, `--line`, `--bg` | `#333`, `#727272`, `#E6E3DF`, `#F7F7F5` | `text-primary`, `text-secondary`, `border-default`, `surface-page` | About 70 more hex values are hard-coded |
| Typography | CSS `font-family` | Inter 400–800 (Google Fonts) | `font-family` | 25 distinct sizes, mostly 7–10 px |
| Spacing / radius | — | Ad hoc spacing; radii 3, 4, 5, 6, 7, 8, 9, 10, 12, 20 px | `space-*`, `radius-*` | No scale defined |
| Component | React components in `App.tsx` | Button, Status, MetricCard, Panel, PageHeader, ApplicationTable, TableTools, Modal, SuccessState, timelines, tabs, upload list | See `component-specifications.md` | Code only; nothing in a Figma library |

**CEDA branding present in the file?** Partly. Logo asset `src/assets/ceda-logo.png` (alt text "CEDA — Finance, Develop, Sustain"), orange and gold palette, Inter. No CEDA brand guide has been received to confirm it (D-04).

## Unmapped frames (scope check by Sylvain)

| Frame | Link | What it shows | Proposed action (ignore / map / future scope) |
|---|---|---|---|
| `ProgrammeSetup` → Evaluation stages | Make file, Admin → Programme Setup → Evaluation stages | Drag-to-reorder list of 6 workflow stages with owners | **Ignore for the MVP** (fixed state machine, ADM-01 "no builder"). Optionally keep as a read-only stage list in T12 |
| `FutureCard` ("Beyond selection") | Make file, Applicant dashboard | Develop → Mentor → Monitor teaser | **Future scope**: matches "Development stage: Deferred, shown as future" (§1.2). Keep only as a timeline legend note |
| `PublicHome` → Opportunity areas (7 sectors) | Make file, Public home | Sector cards | **Map** into T01 as a filter for the challenge list, or drop |
