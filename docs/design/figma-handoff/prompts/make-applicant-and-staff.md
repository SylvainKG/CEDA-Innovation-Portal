# Figma Make prompts: fix the applicant journey and build the Slice 2 staff screens

**For:** Sandra (UI/UX & Figma Integration Lead) · **Backup:** Obvious · **Written:** 16 Nov 2026
**Covers (`screen-status.md`):** foundations, shells + state kit, T01, T02, T03 challenge brief, T04, T05, T06 applicant (Slice 1, overdue) · T06 staff homes, T07 screening + admin list, T08 staff workspace, T10 action dialogs, T12 users & roles (Slice 2, due 16 Nov)
**Decisions this follows:** design location = Figma Make (16 Nov) · brand = existing Make colours, approved 16 Nov (handoff-notes #1) · contrast fix F2 (`design-tokens.md`) · everything functional follows the blueprint until the team decides otherwise (D-33)

---

## Before you start (5 minutes)

1. **Work on a copy, never the original (D-39).** In Figma, open the Make file, use **Duplicate**, and rename the copy **`CEDA Portal — MVP Working (Sandra)`**. This copy plays the role of the `MVP — Working (Sandra)` page from TASK-02. The original stays untouched until the team approves.
2. Record the copy's link in `screen-inventory.md` → *Files and access*.
3. Paste the prompts below **one at a time, in order**, into the copy's Make chat. After each one, run its **Check** list in the preview before moving on. If Make breaks something, ask it to revert the last change rather than patching on top.
4. Don't use real names, emails or proposals. Every prompt already carries the fictional seed data from blueprint §3.1.
5. Make AI uses Figma AI credits. If they run out, stop and continue the remaining items manually (§9.1, D-41).

---

## Prompt 1 — Foundations (type, colour, focus, tokens)

```text
Refactor the styling of this app without changing any screen's layout or content yet.

1. Brand colours are approved and must stay exactly as they are: orange #F58220, orange-dark #D96508, orange-pale #FFF3E9, gold #F9C51C, gold-pale #FFF9DC, red #E53935, red-pale #FFF0EF, ink #333333, muted #727272, line #E6E3DF, background #F7F7F5. Do not introduce any other brand colour.

2. Fix contrast using existing colours only:
   - Primary buttons keep the #F58220 fill but use dark label text #1F1F1F (not white).
   - Any orange TEXT (links, table actions, "View all", active tab labels, active sidebar label) uses #B65C0E.
   - Replace text colours #888, #999 and #AAA with #727272 everywhere.

3. Replace the type scale. Keep the Inter font and add a system-ui fallback. Use only these sizes:
   display 64/1.07 800 (public hero only), h1 26/32 700, h2 20/28 600, h3 17/24 600, body 16/24 400, body-strong 16/24 600, small 14/20 400, button 15 600.
   Inputs, selects and textareas must be 16px. Table cells 14px; table headers 14px 600 (no uppercase). Status badges 14px. Nothing smaller than 14px anywhere.

4. Radius: 4px for inputs, badges and small controls; 8px for cards, panels, dialogs; 999px for pills. Replace all other radius values.

5. Spacing: use a 4px scale only (4, 8, 12, 16, 24, 32, 48, 64).

6. Focus: every button, link, input, tab, select and nav item shows a visible 2px focus ring with 2px offset on keyboard focus (:focus-visible). Remove any "outline: 0" that leaves a control without a visible focus state.

7. Touch targets: buttons, nav items and icon buttons are at least 44x44px.

8. Move every colour, size, radius and spacing value into CSS custom properties at the top of index.css, named like the project tokens: --brand-primary, --brand-primary-on (#1F1F1F), --brand-primary-text (#B65C0E), --brand-primary-subtle, --brand-accent, --surface-page, --surface-card, --surface-sunken (#FAF9F7), --text-primary, --text-secondary, --border-default, --feedback-error, --feedback-success (#3F7650), --type-h1 ... --type-small, --radius-sm, --radius-md, --radius-pill, --space-1 ... --space-8.

9. Status badges: pill with an icon AND text, never colour alone. Define these statuses and keep them visually distinct:
   Draft (grey #F3F2EF / #5F5F5F, pencil icon)
   Submitted (#FFF3E9 / #B65C0E, send icon)
   Under review (#F3F2EF / #333333 with an orange #F58220 dot, search icon)
   Action required (#FFF9DC / #7E6500, alert-circle icon)
   Approved (#EDF7F0 / #3F7650, check-circle icon)
   Not approved / Closed (#F3F2EF / #333333, x-circle icon)
   Awarded (#FFF9DC / #7E6500, award icon).

Don't change any screen layout or wording in this step.
```

**Check:** no text below 14 px; inputs 16 px; primary button label is dark; Tab key shows a ring on every control; badges show icon + text.

---

## Prompt 2 — Shells, DEMO label and state kit

```text
Update the shells and add a shared state kit. Use the tokens from the previous step.

Shells:
1. Every signed-in and public page shows a small "DEMO" badge in the top bar with the text "Demo environment — fictional data". Use the existing gold-pale/gold-text badge style.
2. Add a "Skip to content" link as the first focusable element.
3. Add a footer to every page with links: Privacy · Fault support · FAQs · Contacts.
4. Applicant shell (applicant role only) replaces the sidebar:
   - Desktop: top bar with logo · My ideas · Challenges · Help · notifications bell · account menu, plus a floating "Chat with CEDA" button bottom-right.
   - Mobile (<768px): top bar with logo, bell, account; bottom navigation with My ideas · Challenges · Help · Chat.
5. Staff shell (all other roles) keeps the existing left sidebar (240px) and top bar. The top bar search placeholder becomes "Search by reference (CEDA-2026-…)". Sidebar collapses into a drawer below 768px.
6. Every icon-only button gets an accessible name (menu, close, bell, "•••" → "More actions").

State kit — build these as reusable components and add a hidden "States" page reachable from the account menu ("View design states") so reviewers can see each one:
- Loading: skeleton of the page layout, text "Loading {page}" for screen readers. No spinners.
- Empty: icon, one-line message, one action.
- Error: message, "Try again" button, support link. Form input is kept.
- Forbidden (403): "You don't have access to this page. If you think this is wrong, contact the portal administrator." with "Go to my home". Shell stays visible. It must never confirm that a record exists.
- Not found (404): same layout and wording style as Forbidden.
- Offline banner (forms only): "You're offline. Changes are saved on this device and will sync when you reconnect."
- Unknown outcome (submit/publish/award): "Not confirmed yet — checking…" with the action disabled and a "Check status" link.
- Session expiry warning: dialog "Your session ends in 2 minutes" with "Stay signed in".
- Success toast: auto-dismiss after 6 seconds, never the only confirmation for a workflow action.
```

**Check:** applicant at 360 px has bottom nav; staff at 360 px has a drawer; every state is visible on the States page.

---

## Prompt 3 — Applicant journey: public home, auth, challenge brief

```text
Fix the public and sign-in screens. Use fictional seed data only. Terminology: applicants see "idea" and "challenge" (not "application" or "programme"). Dates read "21 Nov 2026, 16:00 CAT".

1. Public home (keep the existing hero and visual style):
   - Replace the "Opportunity areas" section with an "Open challenges" list of cards: title, one-line summary, audience, closing date with countdown, status (Open / Closing soon / Closed).
     Card 1: "Water-Smart Agriculture Challenge 2026" — Open, closes 30 Nov 2026, 16:00 CAT (in 14 days).
     Card 2: "Youth Digital Services Challenge 2026" — Closed, muted, labelled "Closed — not accepting submissions".
   - Change "From submission to decision" to 5 steps that match the applicant timeline: Submission · Review · Feedback · Approval · Award.
   - Nav: Challenges · How it works · FAQs, with "Sign in" and "Register" buttons. Clicking them goes to the auth screens, not straight to a dashboard.
   - Empty variant (on the States page): "No challenges are open right now. Check back soon or read the FAQs."

2. Auth card screens (centred card, max 440px, logo, title, form, secondary links):
   - Sign in: email, password, "Forgot password?", "Register". Error: "Email or password is incorrect". Rate limit: "Too many attempts. Try again in 5 minutes." Unverified: banner + "Resend email".
   - Register: full name, email, organisation (optional), password with rules shown before typing ("At least 12 characters"), a privacy notice panel (purpose, who can see your data, proposed retention, contact) and a required consent checkbox. Labels above fields, "Required" written in text.
   - Verify email: "Check your email" + "Resend" with "You can resend in 60 s".
   - Forgot password: always shows "If an account exists for that email, we've sent a reset link."
   - Reset password, and MFA (6-digit code) for staff. Demo staff accounts show a banner "MFA not required for demo accounts".
   - Every form has an error summary at the top that links to the fields.
   - After sign-in, a small demo role picker (Applicant A, Screening officer, Reviewer 1, Adjudicator, Administrator) chooses which portal opens.

3. Challenge brief page (opened from a challenge card):
   - Title, meta row (dates, audience, status), brief sections, "How your idea is assessed" listing Innovation 30%, Market potential 25%, Feasibility 25%, Economic impact 20%, and a Downloads list (file name, type, size), e.g. "Concept note template.docx · DOCX · 48 KB".
   - Sticky aside on desktop / bottom bar on mobile with "Start an idea".
   - Closed challenge: action disabled with the reason.
```

**Check:** Sign in no longer skips auth; register shows privacy panel + consent; challenge card opens the brief.

---

## Prompt 4 — Applicant journey: form, receipt, My ideas, case view

```text
Fix the applicant screens. Applicant persona: "Demo Applicant A" from "Lesedi Agro Demo". Demo case reference CEDA-2026-0009; earlier idea CEDA-2026-0004.

1. Proposal form (keep the stepper and help aside):
   - Sections: About you · Idea overview · Innovation & feasibility · Impact · Attachments · Review & declare.
   - Header shows "Saved 14:05" autosave status, plus an offline variant and a restore prompt: "We found unsaved changes from this device. Restore?"
   - Right aside: completeness meter "4 of 6 sections complete" with links to weak sections, deadline, "Need help?" with FAQ link and chat launcher.
   - Under each long-text question a collapsible "What makes a good answer?" help with a plain-language example.
   - Required fields say "Required" in text (not only *). Character counters on long text.
   - Attachments: required list ("Business plan (PDF) — required"), accepted types "PDF, DOCX, XLSX, PNG, JPG up to 10 MB each". File states: uploading with %, uploaded, failed + "Retry", rejected ("This file type isn't accepted"). Remove buttons are labelled.
   - Review & declare: read-only summary with "Edit" links, a "Missing items" list, and the confidentiality/IP declaration panel (placeholder wording labelled "Sample — awaiting CEDA confirmation") with a required checkbox, then "Submit idea".
   - Error variant: submitting with a missing field shows an error summary at the top: "Add a problem statement to submit. Your draft is saved." with links.
   - Closed-challenge variant: banner, draft kept.
   - Mobile: stepper becomes "Section 2 of 6" with a dropdown; aside becomes a "Progress & help" button.

2. Receipt (replace the success page):
   - Heading "Idea submitted". Receipt card: reference CEDA-2026-0009 with copy button, Version 1, submitted at "16 Nov 2026, 14:07 CAT (server time)", challenge, form version "v1", files list with sizes, "Declaration accepted".
   - "What happens next" with 3 bullets matching Review → Feedback → Approval.
   - Buttons "View my idea" and "Print receipt".
   - Unknown-outcome variant: "Not confirmed yet — checking…".

3. My ideas (applicant home):
   - "Start a new idea" button; action-required banner if any idea needs a response.
   - Replace the table and KPI tiles with idea cards (1 column mobile, 2 at 768px, 3 at 1280px), sorted by action needed. Each card: title, challenge, reference, status badge, 5-stage mini timeline (Submission · Review · Feedback · Approval · Award), "Updated 2 h ago", deadline if any, and ONE primary action ("Continue draft", "Respond by 21 Nov", "View idea").
     Card A: "Solar-powered drip irrigation for smallholders" — CEDA-2026-0009 — Submitted.
     Card B: "Borehole water-level SMS alerts" — CEDA-2026-0004 — Under review.
   - Empty state: "You haven't started an idea yet" + open challenges.
   - Remove the "Coming next / Beyond selection" card.

4. Applicant case view:
   - Header: title, reference pill, status badge, challenge, 5-stage timeline, one primary action, and the line "Only you and CEDA staff assigned to this case can see your idea."
   - Tabs: Proposal (version picker "Version 1 (current) · submitted 16 Nov 2026"), Timeline, Feedback, Decision (only when published).
   - Remove the applicant contact panel from this view.
   - Feedback tab, clarification variant: question from CEDA, deadline "Respond by 21 Nov 2026, 16:00 CAT (in 5 days)", required reply box (10–1,000 characters), "Send reply"; once sent it shows "Your reply · 17 Nov 2026, 10:12 CAT", read-only.
   - Mobile: tabs scroll horizontally with visible arrows; timeline vertical inside a collapsible panel.
```

**Check:** two idea cards; receipt shows version, CAT time, form version and files; error summary appears on a failed submit.

---

## Prompt 5 — Staff screens (Slice 2): homes, queues, case workspace

```text
Build the Slice 2 staff screens in the staff shell. Rename the "Evaluator" role to "Reviewer" everywhere. Add a "Screening officer" role to the demo role picker. Staff labels follow this table: Submitted → "Awaiting screening"; Under review → "In evaluation (1/2 scored)"; Action required → "Waiting on applicant (clarification)". Reference format CEDA-2026-NNNN. Seed: 8 cases across stages, including CEDA-2026-0009 (Submitted) and CEDA-2026-0004 (In evaluation).

1. Staff homes (one per role, same layout): KPI tiles row, "Your next tasks" list (max 5, linked), "Recent activity" (10 latest events).
   - Screening officer KPIs: "5 awaiting screening", "2 waiting on applicant", "1 overdue".
   - Reviewer: "3 assigned · 1 overdue", "1 declaration needed".
   - Adjudicator: "2 ready for decision".
   - Administrator: "Submitted this week", "In evaluation", "Ready for decision", "Overdue tasks". Replace the donut chart with horizontal bars.
   - Empty: "Nothing needs your attention right now."

2. Work queues (one table component, filter bar with status, challenge, deadline, assigned to and reference search; filters shown as removable chips with "Clear all"):
   - Screening queue (new, sidebar item "Screening queue"): reference, title, challenge, submitted, waiting (days), status. Empty: "No cases are waiting for screening."
   - Admin "All cases": reference, title, stage, assigned reviewers, last update, overdue flag.
   - Max 6 columns on desktop; on mobile each row becomes a card (reference + status on top, title, two metadata lines). Clicking a row opens the staff case workspace.

3. Staff case workspace (new; reuse the applicant case header):
   - Header: title, reference pill, staff status badge, challenge, timeline, ONE primary action for the role and state (screening officer: "Record screening"; admin: "Assign reviewers"), and a "More actions" menu (Request clarification, Close case).
   - Tabs, shown only when the role has access: Proposal · Timeline (public + internal events) · Feedback · Evaluations · Decision · Internal notes · Assignments.
   - Internal notes: list + "Add note", labelled "Never visible to the applicant".
   - Assignments: reviewers, declaration status ("Declared — no conflict" / "Declaration needed"), due date, "Revoke"/"Reassign" (admin only).
   - Forbidden variant for an unassigned user uses the 403 state.
```

**Check:** screening officer sees the screening queue and "Record screening"; admin sees "All cases" and "Assign reviewers"; tables become cards at 360 px.

---

## Prompt 6 — Staff screens (Slice 2): action dialogs and users & roles

```text
Add the workflow action pattern and the users & roles screen.

1. One side-sheet pattern for every workflow action (full-screen on mobile with a sticky footer button). Each has: a title naming the action and case ("Record screening — CEDA-2026-0009"), a short consequence statement, the fields, a primary button that states the result, a Cancel button, and the line "This action is recorded in the audit log." Required fields block submit with inline errors. Server-error variant keeps the input. Stale-state variant: "This case has moved on — refresh to see the latest status" with "Refresh".
   - Record screening: Result (Eligible / Not eligible), reason (required). Button "Record result". Copy: "Eligible cases move to evaluation. Not eligible closes the case and notifies the applicant."
   - Assign reviewers: multi-select reviewers showing current load (reuse the existing reviewer workload rows: "Reviewer 1 — 2 assigned", "Reviewer 2 — 1 assigned", "Reviewer 3 — 0 assigned"), due date. Button "Assign 2 reviewers". Copy: "Reviewers must declare conflicts before they can open the proposal."
   - Request clarification: question (required), deadline. Button "Send question". Copy: "The applicant must reply in writing. No new version is created."
   - Close case: reason (required). Button "Close case". Copy: "The case leaves active queues."
   - Record decision: Outcome (Approved / Not approved), reason, assessed version preselected. Button "Save decision (not published)". Copy: "The applicant won't see this until you publish."
   - Publish decision: read-only summary. Button "Publish to applicant". Copy: "The applicant is notified now. This can't be unpublished."
   - Record award: amount (BWP), description. Button "Record award". Disabled with the reason "Only approved, published cases can be awarded" when not allowed.
   After a successful action: a success toast AND the timeline shows the new event.

2. Users & roles (admin settings → "Users & roles"):
   - Table: name, email, roles (as chips), status, last activity, actions. Use demo accounts only, e.g. "Demo Applicant A — applicant.a@demo.ceda-portal.test", "Screening Officer — screening@demo.ceda-portal.test", "Reviewer 1", "Reviewer 2", "Reviewer 3", "Adjudicator", "Administrator — admin@demo.ceda-portal.test".
   - "Invite user" opens a side sheet: email + role checkboxes. Button "Send invite".
   - Each role chip has a "Revoke" control; "Grant role" adds one. Both confirm in a side sheet with a reason.
   - The signed-in admin's own row has role controls disabled with the visible reason "You can't change your own roles."
   - Remove the drag-to-reorder "Evaluation stages" tab, or make it a read-only list titled "Case stages (fixed for this MVP)".
```

**Check:** every action has consequence copy and an audit line; admin can't edit own roles; award is disabled on a non-approved case.

---

## After the prompts: snapshots and handoff (each day by 17:00 CAT)

The Figma MCP can't screenshot Make files, so capture snapshots from the preview:

1. Open the copy's preview (or **Publish** it and open the link). Use the browser's device toolbar at **360 px** and **1280 px** widths.
2. Capture each screen and state, compress to **≤ 300 KB** (PNG or WebP), and name it per `snapshots/README.md`, e.g. `T04-proposal-form__applicant-review__mobile__2026-11-16.png`.
3. Add them to `docs/design/figma-handoff/snapshots/`, and update `screen-status.md` (status **Provisional**, snapshot date, designer = Sandra) and `handoff-notes.md` (handoff log).
4. Push on a `design/slice-1` or `design/slice-2` branch and open a pull request into `docs/figma-inventory` for Obvious (buildability) and Sylvain (blueprint conformance). Nothing is *Approved* until that review.
5. Open questions still waiting on the team (do not decide them in Make): handoff-notes #2 stages, #3–#4 adjudication and decision flow (Slices 3–5), #5 scoring, #7 terminology. Prompts 3–6 already follow the blueprint defaults.
