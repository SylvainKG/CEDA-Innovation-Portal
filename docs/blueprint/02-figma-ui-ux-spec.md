# CEDA Innovation Portal — Figma UI/UX Specification (v0.1)

**Status:** Draft for team review · 14 Nov 2026 · **Design review gate: no coding until the team approves this spec.**
**Depends on:** [01-mvp-blueprint.md](01-mvp-blueprint.md) v0.2 (scope, roles, demo journey, data model, decisions D-01 to D-30)
**Scope:** 15 reusable templates (T01–T15), one component library, one state kit, 7 clickable prototypes. Per D-28, there are **no screens beyond these templates**. Every v0.2 feature lives inside an existing template.
**Brand:** CEDA layout, colour and font guidance has not been received (D-04). All visual tokens below are **placeholders** built so that a brand swap changes only variable values.

---

## 1. Design principles

| Principle | What it means on screen |
|---|---|
| **Private by default, visibly** | Confidential areas carry a small lock label ("Confidential — visible to you and assigned CEDA staff"). The forbidden state explains what happened, never what exists |
| **One clear next action** | Every idea card and case header shows a single primary action ("Continue draft", "Respond by 21 Nov", "Score Version 2"). Secondary actions sit in an overflow menu |
| **Applicant sees stages, staff see work** | Applicants see the 5-stage timeline only. Staff see queues, internal status and notes. Internal labels never appear in applicant views |
| **Text-first, low-bandwidth** | No hero images on task pages, no autoplay, system-font fallback, skeletons instead of spinners, upload progress with retry, draft backed up locally if the connection drops |
| **Every state is designed** | Loading, empty, error, forbidden and success are drawn for every template, not left to developers |
| **Plain English** | Sentence case, short labels, no jargon. Dates read "21 Nov 2026, 16:00 CAT" |
| **Traceable** | Every workflow action shows who, when and which version. Read-only history never looks editable |

**Anti-patterns to avoid:** a generic SaaS dashboard look, colour as the only status signal, icon-only buttons, modal stacks, tables that scroll sideways on mobile, any decorative control that changes no backend state.

---

## 2. Figma file structure

| Page | Contents |
|---|---|
| `00 Cover & changelog` | Version, status, review sign-off table |
| `01 Foundations` | Variables (colour, type, spacing, radius, elevation), grids, breakpoints, icon set |
| `02 Components` | Library in §5, every variant and state, with dev annotations |
| `03 State kit` | Loading, empty, error, forbidden, not found, offline, success, session-expiry |
| `04 Templates` | T01–T15, each at **360 px (mobile)** and **1280 px (desktop)**, plus 768 px where the layout changes |
| `05 Prototypes` | P1–P7 clickable flows (§8) |
| `06 Handoff` | Redlines, exported screenshots, copy deck, open questions |

**Naming:** frames `T08 / Case workspace / Reviewer / V2 / Desktop`; components `Status/Badge`, `Form/TextField`; variables `color/status/action-required/bg`. Component names match the React component names (§10).

---

## 3. Foundations (placeholder tokens)

### 3.1 Colour (Figma variables; light theme for the MVP; dark mode deferred)

| Token | Placeholder | Use |
|---|---|---|
| `color/brand/primary` | `#0B5A7A` | Primary buttons, active nav, links |
| `color/brand/primary-hover` | `#08465F` | Hover/pressed |
| `color/brand/accent` | `#C8962E` | Award highlights only |
| `color/surface/page` | `#F6F7F9` | Page background |
| `color/surface/card` | `#FFFFFF` | Cards, tables, dialogs |
| `color/surface/sunken` | `#EEF1F4` | Read-only fields, previous versions |
| `color/text/primary` | `#1A1F24` | Body text |
| `color/text/secondary` | `#4A5560` | Help text, metadata |
| `color/border/default` | `#D5DBE1` | Inputs, dividers |
| `color/focus/ring` | `#1A73E8` | 2 px focus outline + 2 px offset |
| `color/feedback/error` | `#B42318` | Field errors, destructive actions |
| `color/feedback/success` | `#067647` | Success toasts |
| `color/feedback/warning` | `#B54708` | Deadlines approaching |
| `color/demo` | `#6941C6` | DEMO badge, "Sample" labels |

**Status colours** (always paired with an icon and text, never colour alone):

| Status | Background / text | Icon (Lucide) |
|---|---|---|
| Draft | `#EEF1F4` / `#4A5560` | `pencil` |
| Submitted | `#E0EEF7` / `#0B5A7A` | `send` |
| Under review / adjudication | `#E8EAFB` / `#3538CD` | `search` |
| Action required | `#FEF0C7` / `#93370D` | `alert-circle` |
| Approved | `#DCFAE6` / `#067647` | `check-circle` |
| Not approved / Closed | `#F2F4F7` / `#344054` | `x-circle` |
| Awarded | `#FDF3DC` / `#7A4F0E` | `award` |

**Contrast target:** text ≥ 4.5:1, large text and UI parts ≥ 3:1. Checked with a Figma contrast plugin and recorded in `06 Handoff`. This is a target we measure, not a compliance claim.

### 3.2 Typography

Placeholder family: **Source Sans 3** (Google Fonts), with a `system-ui` fallback. Weights 400/600/700 only.

| Token | Size / line height | Use |
|---|---|---|
| `type/display` | 32/40, 700 | Public home title only |
| `type/h1` | 26/32, 700 | Page title |
| `type/h2` | 20/28, 600 | Section title |
| `type/h3` | 17/24, 600 | Card title, dialog title |
| `type/body` | 16/24, 400 | Default text (**never smaller for inputs**, so iOS doesn't zoom) |
| `type/body-strong` | 16/24, 600 | Labels |
| `type/small` | 14/20, 400 | Metadata, help text |
| `type/mono` | 14/20 | Case reference `CEDA-2026-0009` |

### 3.3 Space, shape and layout

- Spacing on a 4 px base: `4, 8, 12, 16, 24, 32, 48, 64`.
- Radius: `4` (inputs, badges), `8` (cards, dialogs), `999` (pills).
- Elevation: `0` (flat), `1` (cards: 0 1 2 rgba(16,24,40,.06)), `2` (dialogs, popovers).
- Breakpoints: `sm 360`, `md 768`, `lg 1024`, `xl 1280`. Content max width 1200 px. Form max width 720 px.
- Grid: 4 columns at 360 (16 px gutters/margins), 8 at 768, 12 at 1024+ (24 px gutters).
- Touch targets ≥ 44×44 px. Minimum page side gutter 16 px. No horizontal page scroll at 360 px.
- Icons: **Lucide only**, 20 px, always beside a visible text label (the only exception is the close "×", which has an accessible name).

---

## 4. App shells

| Shell | Used by | Desktop (≥ 1024) | Mobile (< 768) |
|---|---|---|---|
| **Public** | Signed-out visitors | Top bar: logo · Challenges · Help · Sign in · Register | Top bar with a menu button opening a full-height drawer |
| **Applicant** | Applicant | Top bar: logo · My ideas · Challenges · Help · bell · account. Chat launcher bottom-right | Top bar (logo, bell, account) + **bottom nav**: My ideas · Challenges · Help · Chat |
| **Staff** | Every other role | Left side nav (240 px, collapsible to 72 px with labels in tooltips) + top bar: global case search (reference), bell, account | Top bar + drawer nav. Tables become stacked cards |

**Always present:** a **DEMO** badge in the top bar ("Demo environment — fictional data"), a skip-to-content link, and a footer with Privacy, Fault support, FAQs and Contacts.

**Staff side nav by role** (items appear only if the role has the permission):

| Item | Screening | Reviewer | Adjudicator | Admin | Support | Committee | Auditor |
|---|---|---|---|---|---|---|---|
| Home (T06) | ● | ● | ● | ● | ● | ● | — |
| Screening queue (T07) | ● | | | ● | | | |
| My reviews (T07) | | ● | | | | | |
| Ready for decision (T07) | | | ● | ● | | | |
| All cases (T07) | | | | ● | | ◐ | |
| Reports (T13) | | | ● | ● | ◐ chat stats | ◐ D-08 | |
| Audit log (T14) | | | | ● | | | ● |
| Support inbox (T15) | | | | | ● | | |
| Settings (T12) | | | | ● | | | |

---

## 5. Component library

Every interactive component is drawn with **default, hover, focus-visible, active, disabled, error** states where they apply.

| Component | Variants | Notes for dev |
|---|---|---|
| `Button` | primary, secondary, tertiary, destructive · sm/md · with leading icon · loading | Loading keeps the width and shows a spinner + "Submitting…". Disabled buttons have a tooltip explaining why |
| `Link` | inline, standalone, external | Always underlined in body text. External links show an icon and "(opens new tab)" |
| `TextField` / `TextArea` | default, with help, with counter, read-only, error | Label above the field, required marker "Required" in text (not only an asterisk), error text below with an icon |
| `Select`, `Checkbox`, `RadioGroup`, `DateTimeField` | — | The date field shows CAT and stores UTC |
| `FileUpload` | empty, uploading (progress %), uploaded, failed + retry, rejected (type/size) | Accepted types and max size are shown before upload. Files offer download only, no inline preview |
| `StatusBadge` | 8 statuses (§3.1) | Icon + text. Applicant and staff label sets (§6) |
| `StageTimeline` | horizontal (≥ 768), vertical (mobile) | 5 stages: Submission · Review · Feedback · Approval · Award. States: done (date), current, upcoming, skipped. Feedback is shown only if it occurred or is open |
| `ReferencePill` | default, copyable | Mono font, copy button with "Copied" toast |
| `IdeaCard` | draft, in progress, action required, decided, awarded | Title, challenge, reference, status, last update, deadline, one primary action |
| `KpiTile` | number, number + delta | Includes the definition in a tooltip ("Cases submitted in period") |
| `DataTable` | default, sortable, selectable · mobile stacked-card mode | Sticky header. At most 6 columns on desktop. Row is a link to the case |
| `FilterBar` | chips + "Clear all" | Filters reflected in the URL |
| `Tabs` | — | Arrow-key navigation. Only tabs the role can see are rendered |
| `Dialog` / `SideSheet` | confirm, form | Focus trap. Esc closes unless there is unsaved input (then confirm). Side sheet on desktop, full screen on mobile |
| `Banner` | info, action required, warning, error, success, demo | Placed at the top of the content. Dismissible only if informational |
| `Toast` | success, error | Auto-dismiss after 6 s, announced by screen readers, never the only confirmation for a workflow action |
| `CompletenessMeter` *(INN-03)* | 0–100%, with section checklist | "4 of 6 sections complete". Lists weak sections as links |
| `FieldHelp` *(INN-03)* | collapsed, expanded | "What makes a good answer?" with a plain-language example. Short-answer prompt appears when text is under the threshold |
| `DeclarationPanel` | applicant (IP/confidentiality), reviewer (conflict/confidentiality) | Scrollable terms + required checkbox(es). Reviewer variant has a "I have a conflict" path |
| `ReceiptCard` | submission, resubmission | Reference, version, server time (CAT), challenge, form version, files list, "What happens next" |
| `VersionPicker` | — | "Version 2 (current) · submitted 19 Nov 2026" with previous versions listed. Previous versions render on a sunken surface with a "Previous version — read only" label |
| `DiffView` *(INN-01)* | field-by-field, attachments | Added (underline + "Added" label), removed (strikethrough + "Removed" label), unchanged sections collapsed |
| `ScoreInput` | 1–5 segmented control with anchors | Each value shows its anchor on selection. Reason field required per criterion |
| `ScorePanel` | reviewer-own, peer-hidden, panel comparison | Comparison: criterion rows × reviewer columns, weighted aggregate, spread (max − min) flagged when ≥ 2 |
| `FeedbackTaskBuilder` *(INN-02)* | — | Staff add 1–8 tasks: text (required, ≤ 300 chars) + optional linked criterion. Reorder and delete before sending |
| `FeedbackTaskResponse` *(INN-02)* | not answered, addressed, not addressed | Applicant picks a status and writes an explanation (required, ≤ 500 chars) |
| `TaskVerification` *(INN-02)* | pending, verified, not verified | Reviewer picks a result + note (required if "Not verified") |
| `RoadmapSummary` *(INN-02)* | applicant, reviewer, panel | "3 tasks · 3 addressed · 2 verified by both reviewers · 1 disputed" |
| `NotificationItem` | unread, read | Title, case reference, time, link. No proposal content |
| `ChatWidget` / `ChatThread` | open, busy (queue position), closed (hours), offline | §7 T15 |
| `AuditRow` | — | Time, actor (+role), action, target, case link, "View details" |
| `NextStepsPanel` *(INN-05)* | — | 3–4 pathway cards, a "Sample referral information" label, and the text "Listed for information; not an endorsement" |
| `ReadinessBadge` *(INN-04, optional)* | concept, prototype, validated, pilot · declared / confirmed | Built only if INN-04 is approved to start (D-29) |
| `DemoBadge`, `SampleLabel` | — | Purple. Used on every seeded sample content block |

---

## 6. Status and copy language

| Internal status | Applicant label | Staff label | Timeline stage |
|---|---|---|---|
| `draft` | Draft | — (not visible to staff) | — |
| `submitted` | Submitted | Awaiting screening | Submission |
| `in_evaluation` | Under review | In evaluation (n/2 scored) | Review |
| `action_required` (clarification) | Action required: answer a question | Waiting on applicant (clarification) | Feedback |
| `action_required` (revision) | Action required: revise your idea | Waiting on applicant (revision) | Feedback |
| `in_adjudication` | Under review | Ready for decision | Review |
| decision recorded, unpublished | Under review | Decision drafted (unpublished) | Review |
| `approved` (published) | Approved | Approved | Approval |
| `not_approved` (published) | Not approved | Not approved | Approval |
| `awarded` | Awarded | Awarded | Award |
| `closed` | Closed | Closed: {reason} | — |

**Copy rules**
- Buttons are verbs that describe the result: "Submit idea", "Send request", "Publish decision". Avoid "OK" and "Confirm".
- Deadlines always include a relative hint: "Respond by 21 Nov 2026, 16:00 CAT (in 3 days)".
- Error messages say what happened and how to fix it: "Add a problem statement to submit. Your draft is saved."
- Forbidden: "You don't have access to this page. If you think this is wrong, contact the portal administrator." It never confirms that the record exists.
- Sample content is always labelled "Sample — awaiting CEDA confirmation".
- Confidentiality line on applicant case pages: "Only you and CEDA staff assigned to this case can see your idea."

---

## 7. Template specifications

Each template lists: purpose · roles · routes · layout · regions · interactions · states · acceptance. **Shared states** come from the state kit and are assumed unless a template overrides them:
- **Loading:** a skeleton of the real layout. Text is announced as "Loading {page}".
- **Error:** the message, a "Try again" button and the support link. Form input is kept.
- **Forbidden (403):** the copy in §6, a "Go to my home" button, and the shell still visible.
- **Not found (404):** the same layout as forbidden, so staff can't use it to test whether a record exists.
- **Offline:** banner "You're offline. Changes are saved on this device and will sync when you reconnect" (forms only).

### T01 — Public home + challenge list
- **Roles:** everyone · **Routes:** `/`, `/challenges`
- **Layout:** intro band (title "Submit your innovation to CEDA", 1-line purpose, Register + Sign in buttons), then a list of challenge cards (title, short summary, audience, closing date with a countdown, status Open/Closing soon/Closed). Below that, "How it works" in 5 numbered steps matching the timeline stages.
- **Mobile:** single column; the intro band has no image.
- **Interactions:** a card opens T03. A closed challenge card is muted and labelled "Closed — not accepting submissions".
- **States:** empty: "No challenges are open right now. Check back soon or read the FAQs."
- **Accept:** only published challenges are listed; closing dates show in CAT; usable at 360 px without horizontal scroll.

### T02 — Auth card
- **Roles:** everyone · **Routes:** `/auth/sign-in`, `/auth/register`, `/auth/verify`, `/auth/forgot`, `/auth/reset`, `/auth/mfa`
- **Layout:** centred card (max 440 px) on the page surface; logo; title; form; secondary links.
- **Register:** full name, email, organisation (optional), password + rules shown in advance (min 12 characters), **privacy notice panel** (purpose, who can see your data, proposed retention, contact) + required consent checkbox.
- **Verify:** "Check your email" with a resend link (rate-limited: "You can resend in 60 s").
- **Forgot:** a neutral response every time: "If an account exists for that email, we've sent a reset link."
- **MFA:** 6-digit code field. Demo staff accounts skip this step and show a banner "MFA not required for demo accounts" (D-07).
- **States:** wrong credentials: "Email or password is incorrect" (never which one). Rate-limited: "Too many attempts. Try again in 5 minutes." Unverified sign-in: banner + resend.
- **Accept:** IAM-02/IAM-03 checks; every field has a label; error summary at the top links to the fields.

### T03 — Content page
- **Roles:** everyone · **Routes:** `/challenges/:slug`, `/help/faqs`, `/help/contacts`, `/help/support`, `/privacy`
- **Layout:** page title, a meta row (challenge: dates, audience, status), body content (headings, lists), a **Downloads** list (file name, type, size), and a sticky aside on desktop / bottom bar on mobile with the primary action ("Start an idea" / "Continue your draft").
- **Variants:** challenge brief (with "How your idea is assessed": criteria and weights summary, without anchors); FAQs (accordion, searchable); regulatory contacts (cards with authority, purpose, contact, **Sample** label); fault support (severity table, response/fix times, contact route, hours); privacy notice.
- **States:** an unpublished challenge renders 404. Closed challenge: primary action disabled with the reason.
- **Accept:** guidance is reachable in one click from T04 (HLP-01); sample content is labelled.

### T04 — Multi-section proposal form *(draft, submit, V2)*
- **Roles:** applicant (own only) · **Routes:** `/ideas/new?challenge=`, `/ideas/:id/edit`, `/ideas/:id/revise`
- **Layout desktop:** left **section stepper** (sections: About you · Idea overview · Innovation & feasibility · Impact · Attachments · Review & declare) with completion ticks; centre form (max 720 px); right aside with the **CompletenessMeter** (INN-03), deadline, "Need help?" (FAQ link + chat launcher). **Mobile:** the stepper becomes a "Section 2 of 6" header with a dropdown; the aside collapses into a "Progress & help" button.
- **Autosave:** "Saved 14:05" indicator in the header; saves on field blur and every 10 s while typing; local backup when offline; restore prompt ("We found unsaved changes from this device. Restore?").
- **Fields:** come from the challenge's form schema. Required fields are marked "Required". Character counters on long text. **FieldHelp** under each long-text question (INN-03).
- **Attachments:** `FileUpload` showing the required documents list ("Business plan (PDF) — required").
- **Review & declare step:** a read-only summary of every section with "Edit" links; a list of missing items (links); the **DeclarationPanel** (confidentiality/IP, placeholder wording — D-22); a **Submit idea** button.
- **Submit behaviour:** the button disables on click (idempotent). Server validation errors return to the review step with an error summary and links. Closed challenge: banner + draft kept.
- **V2 (revise) mode** *(INN-02)*:
  - A top banner shows the request message and deadline.
  - A **Roadmap panel** sits above the form: each task, with a `FeedbackTaskResponse`.
  - The form is pre-filled from the current version.
  - The Review step adds a required **"What changed?"** (change note) and a task-response check: "2 of 3 tasks answered". Submit stays disabled until all tasks are answered, and the message says why.
  - Button: "Submit Version 2".
- **States:** empty draft = blank form; error on save shows "Couldn't save. Retrying…" with manual retry; forbidden for other users.
- **Accept:** APP-01/02/03, APP-04, INN-02 applicant half, INN-03; keyboard-only completion is possible; 360 px works.

### T05 — Confirmation receipt
- **Roles:** applicant · **Routes:** `/ideas/:id/receipt?v=`
- **Layout:** success heading "Idea submitted" / "Version 2 submitted"; **ReceiptCard**: reference (copyable), version, submitted at (server time, CAT), challenge, form version, files list with sizes, a "Declaration accepted" line. Then "What happens next" (3 bullets with timeline stages), and buttons "View my idea" and "Print receipt" (browser print stylesheet).
- **Accept:** a retry of the same submission shows the same receipt (APP-03 idempotency). The page contains no other applicant's data.

### T06 — Role dashboard
- **Routes:** `/ideas` (applicant), `/staff` (staff)
- **Applicant "My ideas":** a "Start a new idea" button; an action-required banner if any idea needs a response; a grid of **IdeaCards**, one per idea (1 column mobile, 2 at md, 3 at xl), sorted by action needed, then most recent update. Each card: title, challenge, reference, status badge, mini timeline, "Updated 2 h ago", deadline and the primary action. *(Optional INN-04: ReadinessBadge.)*
- **Staff home:** KPI row (role-specific: e.g. reviewer "3 assigned · 1 overdue"; screening "5 awaiting screening"; admin "Submitted this week, In evaluation, Ready for decision, Overdue tasks"), "Your next tasks" list (max 5, linked), recent activity (the 10 latest events visible to the role).
- **Committee:** counts by stage only, plus the authorised case list (status only, D-08).
- **Live updates:** cards and KPIs change without refresh; changed items flash a 2-second highlight, and a screen-reader announcement reads "1 idea updated".
- **States:** applicant empty: "You haven't started an idea yet" + open challenges. Staff empty: "Nothing needs your attention right now."
- **Accept:** NTF-01; Applicant A sees two separate cards; numbers match T13.

### T07 — Work queue
- **Roles:** screening, reviewer, adjudicator, admin, committee · **Routes:** `/staff/queue/screening`, `/staff/reviews`, `/staff/queue/decision`, `/staff/cases`
- **Layout:** title + count; **FilterBar** (status, challenge, deadline, assigned to, search by reference); **DataTable**.
- **Columns by variant:**
  - Screening: reference, title, challenge, submitted, waiting (days), status.
  - Reviewer: reference, title, version, due, my status (**Not started · Declaration needed · In progress · Submitted**), with tabs grouped by my status.
  - Decision: reference, title, version, scores (2/2), aggregate, spread flag, roadmap summary.
  - Admin all: reference, title, stage, assigned reviewers, last update, overdue flag.
  - Committee: reference, title, stage, last update. No titles if D-08 says so.
- **Mobile:** rows become cards (reference + status on top, title, 2 metadata lines).
- **States:** empty per variant ("No cases are waiting for screening"); forbidden for roles without the queue.
- **Accept:** a reviewer sees only assigned cases (REV-01); rows update live; filters persist in the URL.

### T08 — Case workspace
- **Roles:** applicant (own) and all staff, with tabs gated by permission · **Routes:** `/ideas/:id` (applicant), `/staff/cases/:id` (staff)
- **Header:** title, reference pill, status badge, challenge, **StageTimeline**, the **single primary action** for this role and state, and an overflow menu (secondary actions). A confidentiality line appears for the applicant.
- **Tabs and visibility:**

| Tab | Content | Applicant | Screening | Reviewer (declared) | Adjudicator | Admin |
|---|---|---|---|---|---|---|
| Proposal | VersionPicker, submitted answers, files (download), **DiffView** when 2+ versions (INN-01) | ● own | ● | ● | ● | ● |
| Timeline | Every public event with date; staff also see internal events | ● public only | ● | ● | ● | ● |
| Feedback | Clarifications (question, required reply box for the applicant, reply), revision requests with the **roadmap task list** and statuses (INN-02), deadlines | ● | ● | ● | ● | ● |
| Evaluations | Reviewer: link to own scorecard (T09); panel view after own submission | — | — | ● | ● | ● |
| Decision | Applicant: published decision, reason, award, **NextStepsPanel** (INN-05). Staff: decision draft/publish state | ● published only | ◐ | — | ● | ● |
| Internal notes | Notes list + add note | — | ● | ● | ● | ● |
| Assignments | Reviewers, declaration status, due dates, revoke/reassign | — | ◐ view | — | ◐ view | ● |

- **Clarification reply (applicant):** a text area (required, 10–1,000 chars) and a "Send reply" button. An empty reply is blocked with a message. Once sent, it is read-only and labelled "Your reply · 15 Nov 2026, 10:12 CAT".
- **Roadmap view (Feedback tab):**
  - Each task shows the request text, then the applicant's status and explanation (after V2), then each reviewer's verification once submitted.
  - A **RoadmapSummary** chip appears at the top.
  - The applicant sees the verification results only after the decision is published (avoids early signals). **Decision needed from the team; default: hidden until publication.**
- **Mobile:** tabs become a horizontally scrollable tab bar with visible overflow arrows. The header compresses and the timeline shows the vertical variant inside a collapsible panel.
- **States:** forbidden for non-owners/unassigned users. A reviewer without a declaration is sent to the T09 declaration gate. An unpublished decision is never rendered for the applicant (it's not in the payload).
- **Accept:** APP-04, REV-04, DEC-01, NTF-01, N1, N3, N4; internal notes never appear in applicant markup.

### T09 — Scorecard *(declaration gate, scoring, verification, panel)*
- **Roles:** reviewer (own), adjudicator/admin (panel view) · **Routes:** `/staff/cases/:id/score?v=`, `/staff/cases/:id/panel`
- **Step 1, declaration gate** (first access per assignment): case reference and challenge only. **No title or content** until declared. A **DeclarationPanel** offers two choices:
  - "I have no conflict of interest and will keep this proposal confidential" → **Continue to proposal**
  - "I have a conflict" → reason field → **Declare conflict and withdraw** (confirm dialog: "You'll lose access to this case. An administrator will reassign it.")
- **Step 2, scoring layout:** desktop is split view, with the proposal (read-only, version labelled) on the left and the scorecard on the right (sticky). Mobile shows toggle tabs "Proposal | Scorecard".
- **Scorecard:** for each criterion: label, weight, guidance, **ScoreInput 1–5** with the anchor text shown for the selected value, and a required reason (≥ 20 chars). Then an overall comment, the live weighted score, "Save draft", and **Submit scorecard** (confirm: "You can't change scores after submitting").
- **Verification block** *(INN-02, V2 only)*: shown above the criteria. Each task shows the request, the applicant's status and explanation, and a **TaskVerification** control. Submitting the scorecard requires every task to be verified, and the counter reads "2 of 3 tasks verified".
- **Peer visibility:** before submitting, the panel area shows "Other reviewers' scores appear after you submit yours." After submitting, the **ScorePanel** comparison appears.
- **Panel view (adjudicator/admin):** criterion × reviewer matrix, reasons expandable, weighted aggregate, spread flag, missing-review warning ("1 of 2 reviews outstanding — decision not yet available"), RoadmapSummary, and a link to previous-version scorecards ("Version 1 scorecards (2) — read only").
- **States:** a submitted scorecard is read-only with a "Submitted 18 Nov, 11:40 CAT" stamp; the rubric version is shown in the footer ("Rubric v1").
- **Accept:** REV-03, D-19, D-20, INN-02 reviewer half, N10, N11; scores can't be submitted without reasons.

### T10 — Action dialog / side sheet
All workflow actions use one pattern: a title naming the action and case, a short consequence statement, fields, and a primary button that states the result. The audit note reads "This action is recorded in the audit log."

| Action | Fields | Primary button | Consequence copy |
|---|---|---|---|
| Record screening | Result (Eligible / Not eligible), reason (required) | Record result | "Eligible cases move to evaluation. Not eligible closes the case and notifies the applicant." |
| Assign reviewers | Multi-select reviewers (shows current load), due date | Assign 2 reviewers | "Reviewers must declare conflicts before they can open the proposal." |
| Request clarification | Question (required), deadline | Send question | "The applicant must reply in writing. No new version is created." |
| Request revision *(INN-02)* | Message, deadline, **FeedbackTaskBuilder** (1–8 tasks; zero allowed only as the fallback) | Send revision request | "The applicant will submit a new version. Current scores stay with Version {n}." |
| Record decision | Outcome (Approved / Not approved), reason, assessed version (preselected) | Save decision (not published) | "The applicant won't see this until you publish." |
| Publish decision | Read-only summary | Publish to applicant | "The applicant is notified now. This can't be unpublished." |
| Record award | Amount (BWP), description | Record award | "Award is recorded as a separate event from approval." Disabled with the reason if the case isn't approved |
| Close case | Reason (required) | Close case | "The case leaves active queues." |

- **Mobile:** full-screen sheet with a sticky footer button.
- **States:** a server error keeps the input and shows the message. An `INVALID_STATE` error ("This case has moved on — refresh to see the latest status") offers a refresh.
- **Accept:** every action produces a timeline entry and audit row; no action is available to a role without the permission.

### T11 — Notification centre + preferences
- **Routes:** bell popover (all shells) and `/notifications`
- **Popover:** the 10 latest, unread first; "Mark all as read"; "View all". The unread count badge reads "3 unread" (accessible name).
- **Page:** a filter (All / Unread); a list of NotificationItems grouped by day; on the right (desktop) or below (mobile), **Email alerts**: toggle "Email me when there's an update on my ideas (free)" with the explanation "Emails say an update is waiting; they never include your idea's content." Changing the toggle saves immediately and shows a toast.
- **States:** empty: "You're all caught up." If email isn't configured, an outbox banner reads "Email delivery is simulated in this demo" (Simulated class).
- **Accept:** NTF-01 live badge; NTF-02 opt-in/out.

### T12 — Admin configuration
- **Routes:** `/admin/challenges`, `/admin/challenges/:id`, `/admin/rubrics/:id`, `/admin/users`, `/admin/content`, `/admin/settings/roles`, `/admin/settings/chat`
- **Pattern:** a list (DataTable + "New" button) and an editor (form sections + sticky "Save draft" / "Publish" bar showing a version label "Draft of v2 — v1 is live").
- **Challenge editor:** details, dates (CAT), audience, form fields (label, help, required toggle, max length), required documents, template files, rubric selection.
- **Rubric editor:** criteria rows (label, weight, guidance, anchors 1/3/5), a weights total indicator ("Total 100% ✓"), and "Publish rubric v2" (published versions are read-only).
- **Users & roles:** invite (email + roles), a role chips list with grant/revoke. The admin's own row has the role controls disabled, with the reason "You can't change your own roles."
- **Roles (ARC-01):** a list of roles with a permission checklist and "Add role".
- **Content:** FAQs, contacts, referrals, support page, declaration text, each with a "Sample" toggle.
- **Chat settings:** working days, hours, demo override.
- **States:** publishing with weights ≠ 100 is blocked; a destructive action confirms and names the item.
- **Accept:** ADM-01/02, REV-02, IAM-01, ARC-01, HLP-01.

### T13 — Reports dashboard
- **Roles:** admin, adjudicator; committee if D-08 allows; support lead for the chat statistics tab · **Route:** `/reports`
- **Layout:** filter bar (challenge, period presets + custom range) and **Export CSV**; tabs **Participation · Outcomes · Timelines · Impact · Chat**.
  - **Participation:** KPI tiles (registered applicants, drafts, submitted, by challenge) and submissions over time (bar by week).
  - **Outcomes:** funnel by stage (horizontal bars) and outcome counts.
  - **Timelines:** median days in each stage (bar), with an overdue table.
  - **Impact:** share of ideas that reached a later stage; ideas resubmitted after feedback; roadmap tasks verified %.
  - **Chat:** volume, handled, missed, average wait.
- **Rules:** each chart has a title saying what it shows, a data table toggle ("Show as table") for accessibility, and the definition beneath it. Use the `dataviz` method at build time. No pie charts.
- **States:** empty period: "No activity in this period." Chart error: show the table, or the error card if both fail.
- **Accept:** RPT-01, CHT-03; numbers reconcile with seed + demo case and match T06.

### T14 — Audit log
- **Roles:** admin, auditor · **Route:** `/audit`
- **Layout:** filters (actor, case reference, action type, date range); a DataTable of AuditRows (newest first, paginated 50); a detail side sheet (full metadata as a key/value list, no proposal text).
- **Banner:** "Audit entries can't be edited or deleted."
- **States:** forbidden for other roles (N-tests); empty filter: "No entries match these filters."
- **Accept:** SEC-03; the demo case shows the full journey when filtered by `CEDA-2026-0009`.

### T15 — Chat
- **Applicant widget:** a launcher button "Chat with CEDA" (with label) on T03/T04/T06/T08. The panel is 380×560 on desktop and full screen on mobile. States:
  - **Open:** "A consultant will join shortly — you're number 2 in the queue."
  - **Active:** consultant name and online status, message list, input, send.
  - **Busy:** all consultants busy, with the option to wait or read the FAQs.
  - **Closed:** "Chat is open Monday–Friday, 09:00–16:00 (Gaborone time). It's now {day} {time}." with links to FAQs and fault support.
  - **Ended:** transcript stays visible to the applicant.
- **Consultant inbox** (`/support/inbox`): left column has a waiting queue (with wait time) and my active chats (unread dots); centre has the thread; right column has applicant name and the current page they opened chat from (**no proposal content**). An availability toggle (Available / Away) sits in the header. Several threads can be open as tabs.
- **Accept:** CHT-01/02; chats are private; the consultant sees no proposal data (N7).

---

## 8. Prototypes (clickable flows in `05 Prototypes`)

| ID | Flow | Frames (template / state) | Proves |
|---|---|---|---|
| **P1** | Applicant submits | T01 → T03 challenge → T02 sign in → T06 empty → T04 sections 1–6 (error summary → fixed) → declaration → T05 receipt → T06 with 2 cards | APP-01–03, receipt, multiple ideas |
| **P2** | Screening + clarification | T07 screening → T08 → T10 clarification → (applicant) T06 banner → T08 Feedback reply → (officer) T10 screening Eligible | REV-01, D-21 |
| **P3** | Reviewer declares + scores | T10 assign → T07 reviewer (Declaration needed) → T09 gate → T09 scoring → submit → panel revealed; alt path: declare conflict → access lost | REV-03, D-19 |
| **P4** | **Revision with roadmap** (primary differentiator) | T10 revision + task builder → T06 action banner → T08 Feedback tasks → T04 revise mode (task responses, change note, blocked submit → fixed) → T05 V2 receipt → T09 V2 verification block + DiffView → T09 panel roadmap summary | INN-02, APP-04, INN-01 |
| **P5** | Decide, publish, award | T07 decision → T09 panel → T10 record decision → T08 applicant (still Under review) → T10 publish → T08 applicant Approved + NextSteps → T10 award → T06 Awarded | DEC-01/02, INN-05 |
| **P6** | Oversight | T13 tabs + export → T14 filtered by case → detail sheet | RPT-01, SEC-03 |
| **P7** | Access denied | Applicant B → T08 403; Reviewer 3 → 403; reviewer pre-declaration → gate; consultant → 403 | SEC-02, N1–N11 |

Each prototype is built at mobile **and** desktop for P1, P4 and P5 (the demo-critical flows), and desktop only for the others.

---

## 9. Accessibility and responsive acceptance (design review checklist)

- [ ] Every template is drawn at 360 and 1280 px; no horizontal page scroll at 360 px.
- [ ] Contrast measured for every token pair in use (text ≥ 4.5:1, UI ≥ 3:1) and recorded.
- [ ] Focus order is annotated on T02, T04, T09 and T10. Focus is visible everywhere.
- [ ] Every icon has a text label. Status always uses icon + text, never colour alone.
- [ ] Every input has a visible label, help text where needed, and an error message pattern. Error summary at the top of long forms.
- [ ] Touch targets ≥ 44 px. Inputs use 16 px text.
- [ ] Live-updating regions have announcement copy specified (T06, T11, T15).
- [ ] Loading, empty, error, forbidden and offline states are drawn for every template.
- [ ] Charts have a table alternative (T13).
- [ ] Time is shown in CAT with the date written out; relative hints for deadlines.
- [ ] Sample and demo content is labelled.

---

## 10. Developer handoff

- **Variables → Tailwind:** Figma variables are exported to `tokens.json` and mapped to Tailwind theme keys with the same names (`brand-primary`, `status-action-required-bg`, …). A brand swap edits values only.
- **Components → React:** each Figma component maps one-to-one to a component in `src/components/` built on Radix primitives (Dialog, Tabs, Popover, Checkbox, RadioGroup, Select, Toast). Variants map to props of the same name.
- **Annotations:** every template frame carries notes for the route, the permission that shows each action, the RPC it calls (from blueprint §4.4) and its error codes.
- **Exports:** a PNG screenshot of every template frame (mobile + desktop) goes to `docs/design/screens/` for the proposal and for implementation from screenshots.
- **Copy deck:** all strings in `06 Handoff / Copy`, keyed by template and state, ready to become `src/copy/en.ts`.

**Design definition of done:** every template, all states and P1–P7 are complete. The §9 checklist passes. A developer has confirmed that each action maps to an RPC in the contract. The team has signed off in `00 Cover`.

---

## 11. Open design questions

| # | Question | Default used in this spec | Needed by |
|---|---|---|---|
| Q1 | CEDA brand: logo, colours, fonts (D-04) | Placeholder tokens §3 | 16 Nov |
| Q2 | Should applicants see reviewer verification of roadmap tasks, and when? | Hidden until the decision is published | Team review |
| Q3 | Is the spread flag threshold (≥ 2 points on a 1–5 scale) reasonable? | ≥ 2 | Team review |
| Q4 | Committee member list: show titles or reference only? (D-08) | Reference + stage only | 16 Nov |
| Q5 | Placeholder declaration wording for applicants and reviewers (D-22) | Generic placeholder, labelled Sample | 16 Nov |
| Q6 | Should the applicant bottom nav include Chat, or keep chat as a floating launcher only? | Both (bottom-nav item opens the widget) | Team review |

**Next step after approval:** the API/RPC contract document with the permission matrix, acceptance tests and the seed data file, then Phase 0. **No code until the team approves this spec.**
