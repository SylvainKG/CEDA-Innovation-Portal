# Component specifications

**Maintained by:** Sandra · **Implemented by:** Obvious (`src/components/`) · **Last updated:** —

Each Figma component maps one-to-one to a React component with the same name. Variants map to props (spec §10).
- The full list of required components, with their variants and dev notes, is in `02-figma-ui-ux-spec.md` §5. This file records **what actually exists in Figma** and where.
- Status values: *Exists in Figma* · *Extended* (an existing component given new variants) · *New* · *Missing*.

| Component | Figma component (link / node) | Status | Variants and states drawn | Props (code) | Used in templates | Notes |
|---|---|---|---|---|---|---|
| Button | | Missing | | `variant`, `size`, `icon`, `loading`, `disabled` | all | |
| Link | | Missing | | `kind` (inline, standalone, external) | all | |
| TextField / TextArea | | Missing | | `label`, `help`, `error`, `required`, `maxLength` | T02, T04, T10, T12 | |
| Select / Checkbox / RadioGroup / DateTimeField | | Missing | | | T04, T10, T12 | Dates in CAT |
| FileUpload | | Missing | | `accept`, `maxSize`, `state` | T04 | |
| StatusBadge | | Missing | | `status`, `audience` (applicant/staff) | T06–T08 | Icon + text |
| StageTimeline | | Missing | | `stages`, `orientation` | T06, T08 | |
| ReferencePill | | Missing | | `reference`, `copyable` | T05–T08 | |
| IdeaCard | | Missing | | `idea`, `primaryAction` | T06 | |
| KpiTile | | Missing | | `label`, `value`, `definition` | T06, T13 | |
| DataTable (+ mobile cards) | | Missing | | `columns`, `rows`, `sort` | T07, T12–T14 | |
| FilterBar | | Missing | | `filters` | T07, T13, T14 | |
| Tabs | | Missing | | `tabs` | T08, T13 | |
| Dialog / SideSheet | | Missing | | `title`, `consequence`, `primaryLabel` | T10 | |
| Banner / Toast | | Missing | | `kind` | all | |
| EmptyState / ErrorState / ForbiddenState / Skeleton | | Missing | | | all | State kit |
| CompletenessMeter / FieldHelp | | Missing | | | T04 | INN-03 |
| DeclarationPanel | | Missing | | `kind` (applicant, reviewer) | T04, T09 | |
| ReceiptCard | | Missing | | | T05 | |
| VersionPicker / DiffView | | Missing | | | T08 | INN-01 |
| ScoreInput / ScorePanel | | Missing | | `anchors` (1–5) | T09 | |
| FeedbackTaskBuilder / FeedbackTaskResponse / TaskVerification / RoadmapSummary | | Missing | | | T04, T08–T10 | INN-02 |
| NotificationItem | | Missing | | | T11 | |
| ChatWidget / ChatThread | | Missing | | `state` (open, busy, closed, offline) | T15 | |
| AuditRow | | Missing | | | T14 | |
| NextStepsPanel | | Missing | | | T08 | INN-05, Sample label |
| DemoBadge / SampleLabel | | Missing | | | all | |

Update *Status* during TASK-01 for every component you find. Add rows for any extra components that exist in Figma.
