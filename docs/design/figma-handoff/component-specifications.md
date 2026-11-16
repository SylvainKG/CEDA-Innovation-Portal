# Component specifications

**Maintained by:** Sandra · **Implemented by:** Obvious (`src/components/`) · **Last updated:** 16 Nov 2026 (TASK-01 first pass)

Each Figma component maps one-to-one to a React component with the same name. Variants map to props (spec §10).
- The full list of required components, with their variants and dev notes, is in `02-figma-ui-ux-spec.md` §5. This file records **what actually exists in Figma** and where.
- Status values: *Exists in Figma* · *Extended* (an existing component given new variants) · *New* · *Missing*.

**Note on this pass:** the design source is a Figma Make prototype. Its "components" are React functions in the Make file's `src/App.tsx`, not Figma library components with variants. Where one exists it is marked *Exists in Figma (Make code)*, with the Make component name in the link column. They are a visual reference, not a reusable library: no states beyond default/hover are drawn, and text sizes need the fixes in `design-tokens.md`.

| Component | Figma component (link / node) | Status | Variants and states drawn | Props (code) | Used in templates | Notes |
|---|---|---|---|---|---|---|
| Button | Make: `Button` + `.button-*` | Exists in Figma (Make code) | primary, secondary, ghost, danger · leading icon · hover | `variant`, `size`, `icon`, `loading`, `disabled` | all | Missing: sm/md sizes, loading, disabled + reason, focus-visible. Primary fails contrast (F2). Rename `danger` → `destructive`, add `tertiary` |
| Link | Make: `.text-link`, `.table-action` | Extended needed | inline orange text with arrow | `kind` (inline, standalone, external) | all | Not underlined; fails contrast (F2) |
| TextField / TextArea | Make: `FormGrid`, `.field-grid` | Exists in Figma (Make code) | default, focus, character counter | `label`, `help`, `error`, `required`, `maxLength` | T02, T04, T10, T12 | Missing: help text, error, read-only. Required shown as "*" only; inputs 10 px (F1) |
| Select / Checkbox / RadioGroup / DateTimeField | Make: native `select`, `.acknowledge` checkbox, `input[type=date]`, `.decision-options` (radio cards) | Exists in Figma (Make code) | default | | T04, T10, T12 | No CAT label on dates. Radio cards in `Comparison` are a good RadioGroup "card" variant |
| FileUpload | Make: `UploadSection` | Exists in Figma (Make code) | empty drop zone, uploaded (100%) | `accept`, `maxSize`, `state` | T04 | Missing: uploading %, failed + retry, rejected. Shows 20 MB + PPTX (handoff-notes #8). Remove button is icon-only |
| StatusBadge | Make: `Status` | Exists in Figma (Make code) | 4 tones, dot + text | `status`, `audience` (applicant/staff) | T06–T08 | Needs icon, 8 statuses, separate applicant/staff labels (spec §6), 14 px text (F1, F4) |
| StageTimeline | Make: `.stage-timeline`, `Journey` (`.mini-journey`) | Exists in Figma (Make code) | horizontal: done, current, upcoming | `stages`, `orientation` | T06, T08 | 6 stages, not 5 (handoff-notes #2). Missing vertical (mobile) and skipped state |
| ReferencePill | Make: reference text in `SuccessState`, `.detail-heading small` | Missing | — | `reference`, `copyable` | T05–T08 | Reference shown as plain text, no copy |
| IdeaCard | — | Missing | — | `idea`, `primaryAction` | T06 | Applicant dashboard uses a table |
| KpiTile | Make: `MetricCard` | Exists in Figma (Make code) | icon, label, value, note · tones orange, grey, red, gold | `label`, `value`, `definition` | T06, T13 | Good base. Add definition tooltip; tone must not be the only signal |
| DataTable (+ mobile cards) | Make: `ApplicationTable`, Users table, Audit table | Exists in Figma (Make code) | default, 3 column modes | `columns`, `rows`, `sort` | T07, T12–T14 | Missing: sort, selectable, empty, sticky header, mobile stacked cards. Table text 8–10 px (F1) |
| FilterBar | Make: `TableTools`, `.report-filters` | Exists in Figma (Make code) | search + 2 selects + Filters button | `filters` | T07, T13, T14 | Missing chips + "Clear all", URL state, focus ring |
| Tabs | Make: `.detail-tabs`, `.admin-tabs` | Exists in Figma (Make code) | default, active, count badge | `tabs` | T08, T13 | Two different tab styles — merge into one. Add keyboard behaviour and mobile scroll |
| Dialog / SideSheet | Make: `Modal` | Exists in Figma (Make code) | confirm (icon, title, text, Cancel + action) | `title`, `consequence`, `primaryLabel` | T10 | Confirm variant only. SideSheet (form) variant missing. Close button has no accessible name |
| Banner / Toast | Make: `.alert-banner`, `.deadline-banner`, `.feedback-alert`, `.restricted-note`, `.legal-note`, `.conflict-note` | Exists in Figma (Make code) | 6 ad-hoc banner styles | `kind` | all | Consolidate into one Banner with kinds info / action required / warning / error / success / demo. Toast missing |
| PageHeader *(extra)* | Make: `PageHeader` | Exists in Figma (Make code) | eyebrow, title, text, action | `eyebrow`, `title`, `text`, `action` | all staff pages | Not in spec §5; worth keeping |
| Panel *(extra)* | Make: `Panel` | Exists in Figma (Make code) | title, subtitle, action slot | `title`, `subtitle`, `action` | all | Not in spec §5; the card container for most screens |
| SuccessState *(extra)* | Make: `SuccessState` | Exists in Figma (Make code) | full, compact | | T05, T09, T10 | Base for ReceiptCard and success state in the state kit |
| EmptyState / ErrorState / ForbiddenState / Skeleton | — | Missing | — | | all | State kit |
| CompletenessMeter / FieldHelp | Make: `.score-progress` (bar), `.form-help` aside | Missing (patterns exist) | — | | T04 | INN-03. Progress bar and help aside can be reused |
| DeclarationPanel | Make: `.acknowledge` checkboxes in `ReviewSummary` | Extended needed | applicant: 2 checkboxes | `kind` (applicant, reviewer) | T04, T09 | Reviewer variant (conflict path) missing |
| ReceiptCard | Make: `.reference-card` in `SuccessState` | Extended needed | reference, date, status | | T05 | Add version, CAT time, form version, files, declaration line |
| VersionPicker / DiffView | Make: `.version-row` in `Feedback` | Missing (pattern exists) | static V1/V2 row | | T08 | INN-01 |
| ScoreInput / ScorePanel | Make: `.score-selector`, `.criterion`, `.total-score`, `.comparison-grid` | Exists in Figma (Make code) | 1–5 segmented buttons + comment | `anchors` (1–5) | T09 | No anchors, no required reason, unweighted total. ScorePanel concept differs (handoff-notes #3) |
| FeedbackTaskBuilder / FeedbackTaskResponse / TaskVerification / RoadmapSummary | — | Missing | — | | T04, T08–T10 | INN-02 — primary differentiator |
| NotificationItem | Make: `.notification-item` in `NotificationPopover` | Exists in Figma (Make code) | unread, read | | T11 | Add case reference; no proposal content in text |
| ChatWidget / ChatThread | — | Missing | — | `state` (open, busy, closed, offline) | T15 | |
| AuditRow | Make: Audit table rows | Exists in Figma (Make code) | time, user, action, case, previous/new status | | T14 | Add actor role, "View details" |
| NextStepsPanel | Make: `FutureCard` (nearest) | Missing | — | | T08 | INN-05, Sample label |
| DemoBadge / SampleLabel | — | Missing | — | | all | Make has a footer prototype note only |
| Shell: Sidebar / TopBar *(extra)* | Make: `AppShell` | Exists in Figma (Make code) | desktop sidebar, mobile drawer, top bar with search, bell, profile | `role`, `items` | all staff | Basis for the staff shell. Applicant shell (top bar + bottom nav) missing |
| Charts *(extra)* | Make: `DonutChart`, `LineChart`, `BarChart`, `ProgressList` | Exists in Figma (Make code) | static | | T06, T13 | Donut not allowed (spec T13). Add titles, definitions, table toggle |
