# Staging design review: freeze-day checklist

**For:** Sandra · **When:** 22 Nov 2026, before UI merges stop at 16:00 CAT · **Site:** staging, `https://main.d270qrk6a7zs47.amplifyapp.com`
**Accounts:** the demo accounts in `docs/submission/judge-guide.md` (all `@demo.ceda-portal.test`). Passwords come from the judge guide, never from this file (D-17).

## How to use it

1. Check each screen at **1280 px**, then at **360 px** (Chrome DevTools, Ctrl+Shift+M).
2. Run the **common checks** on every screen, then that screen's own checks.
3. Write the result in `screen-status.md` (*Notes*):
   - **Matches (Sandra, 22 Nov)** — the screen meets its checks. Move the Desktop/Mobile status to **Approved**.
   - **Difference logged (Sandra, 22 Nov)** — add a row to `handoff-notes.md` saying what differs and whether it's a fix before freeze or accepted for the MVP.
   - Not reached — leave it **Provisional**. That's acceptable and honest.
4. Order: work top to bottom. Part A is the demo path judges will see; Part B is everything else.

## Common checks (every screen)

- [ ] Text is never smaller than 14 px; inputs are 16 px (F1).
- [ ] Primary buttons have a dark label on orange; orange text uses `#B65C0E` (F2).
- [ ] Status badges show an icon **and** text, in the F4 tones; no indigo or slate left.
- [ ] Input borders are visible (`#8A8580`); errors show a red border **and** a message.
- [ ] Tab key shows a visible focus ring on every control.
- [ ] DEMO pill in the header; only fictional names and `@demo.ceda-portal.test` emails.
- [ ] 360 px: no sideways scrolling, nothing overlapping, buttons at least 44 px tall.
- [ ] Loading shows a skeleton, not a spinner; errors offer "Try again".

## Part A: demo path

| # | Screen | Route | Account | Look for | Result |
|---|---|---|---|---|---|
| A1 | Shared shell (#109) | any signed-in page | applicant.a, then screening | Logo, DEMO pill, text links (active one orange and underlined), round bell, avatar menu with Sign out (#19), "Chat with CEDA" button (applicant only; above the bottom nav on phones), footer | Matches (ABM for Sandra, 22 Nov) |
| A2 | T01 Home | `/` | signed out | Hero, challenge cards with Open/Closing soon/Closed pills, five steps "From submission to award" | Matches (ABM for Sandra, 22 Nov) |
| A3 | T03 Challenge brief | `/challenges/…` (open challenge) | signed out | Criteria and weights, Downloads only if a real file exists, "Start an idea" (sticky aside on desktop, bar at the end on phones) | Matches (ABM for Sandra, 22 Nov); no Downloads (no real file) |
| A4 | T04 Proposal form | `/ideas/new` | applicant.a | Six sections, "Saved hh:mm", "Progress & help" button on phones, upload says "Uploading…" (no fake %), error summary on a failed submit, declaration on the last step | Matches (ABM for Sandra, 22 Nov); REQUIRED tag fixed to 12 px (handoff #34) |
| A5 | T07 Screening queue → T10 Record screening | `/staff/queue/screening` | screening | Table becomes cards at 360 px; side sheet shows consequence text and the audit line | Matches (ABM for Sandra, 22 Nov) |
| A6 | T10 Assign reviewers | from the staff case | admin | Reviewer load ("n active reviews"), "Reviewers must declare conflicts…" | Matches (ABM for Sandra, 22 Nov) |
| A7 | T09 Declaration gate | `/staff/reviews` → open a case | reviewer.1 | Gate before any proposal content; "I have a conflict" path asks for a reason and confirms withdrawal | Difference logged, accepted for the MVP: no reason asked on the conflict path (handoff #32) |
| A8 | T09 Scorecard | `/staff/cases/:id/score` | reviewer.1 | 4 criteria with weights, 1–5 with the anchor shown, reason ≥ 20 characters, live weighted score, confirm before submit, "Rubric v1" footer; on phones "Proposal \| Scorecard" toggle | Difference logged, accepted for the MVP: no "Rubric v1" footer (handoff #33) |
| A9 | T10 Request revision (task builder) | staff case → More actions | reviewer.2 | Message, deadline in CAT, tasks added/reordered/removed, consequence "Current scores stay with Version 1" | Matches (ABM for Sandra, 22 Nov) |
| A10 | T06 My ideas + T08 Feedback tab | `/ideas`, `/ideas/:id` | applicant.a | Action banner, "Respond by …" on the card, task list with a roadmap summary chip, five-step stepper with Feedback | Matches (ABM for Sandra, 22 Nov) for My ideas and the stepper; action-needed state matches (V2 check, 22 Nov) |
| A11 | T04 Revise mode (V2) | `/ideas/:id/revise` | applicant.a | Roadmap answers (Addressed / Not addressed + explanation), "What changed?", declaration checkbox (#18), submit blocked with a reason until all tasks are answered | Matches, differences logged (V2 check, 22 Nov): no Save draft (handoff #37) |
| A12 | T05 Receipt V2 | `/ideas/:id/receipt` | applicant.a | Same reference, Version 2, server time in CAT, files, printed copy shows the DEMO line | V1 matches; V2 matches (V2 check, 22 Nov) |
| A13 | T09 V2 verification | score page for V2 | reviewer.1 | Verified / Not verified per task, note required when Not verified, "n of m tasks verified" blocks submit | Matches, difference logged (V2 check, 22 Nov): counter wording (handoff #38) |
| A14 | T09 Panel + T07 Decision queue | `/staff/queue/decision`, `/staff/cases/:id/panel` | adjudicator | Criterion × reviewer matrix, spread flag with icon + text, weighted aggregate, roadmap summary, "1 of 2 reviews outstanding" state | Matches (ABM for Sandra, 22 Nov); roadmap summary absent (handoff #25) |
| A15 | T10 Decision, Publish, Award + T08 Decision tab | staff case; `/ideas/:id` | adjudicator, admin, applicant.a | Decision saved unpublished, separate Publish and Award; applicant sees nothing until published, then Approved, then Awarded (solid gold badge) | Record decision matches; publish and award not exercised (they change the demo data) |
| A16 | T13 Reports | `/reports` | admin | Tabs, bars only (no pie/donut), "Show as table", CSV export, definitions under numbers | Matches (ABM for Sandra, 22 Nov) |
| A17 | T15 Chat + consultant inbox | `/support/chat`, `/support/inbox` | applicant.a, consultant | Open/closed hours message, waiting time, Accept, thread readable at 360 px | Pages render cleanly at both widths; hours, waiting and Accept not exercised |
| A18 | T14 Audit log | `/audit` | admin | Filters (case, action, date), detail sheet, "can't be edited" message | Matches (ABM for Sandra, 22 Nov); detail sheet not opened |

**Result of the 22 Nov review (ABM for Sandra, D-31).** Checked on `main` at 692e3e8, in mock mode, at 360 and 1280 px, with each role from the development role switcher, so no test writes touched the staging demo data. Common checks: no sideways scroll at 360 px on any page; every button, link, select and tab at least 44 px; inputs 16 px; no white text on orange; DEMO pill on every page; dialogs return focus to the control that opened them. One failure: the shared REQUIRED tag was 11 px (F1 allows 12 px uppercase), fixed in `ui/required-tag-12px`. A spot check on staging itself follows once someone signs in there.

**V2 check (ABM for Sandra, 22 Nov, P7-04).** A11–A13 were checked in mock mode on `main` at `cbb1df3`, at 1280 and 360 px, in one browser session (mock data resets on reload): the adjudicator sent a revision request with two tasks on CEDA-2026-0008, the applicant answered both and submitted Version 2, and reviewer 1 declared and checked both tasks. Revise, the V2 receipt and the verification block meet their checks; no sideways scroll at 360 px, text 12 px or larger, targets 44 px apart from inline error-summary links. Found on the way: the staff badge says "Waiting on applicant (clarification)" for an open revision (handoff #39), and the admin settings pages, Users & roles included, have no link in the navigation; the review opened them by address (handoff #40). Both are fixes for Obvious or ABM; neither changes a result above.

## Part B: everything else (if time allows)

| # | Screen | Route | Account | Result |
|---|---|---|---|---|
| B1 | T02 Sign in, Create account, Verify, Forgot, Reset | `/auth/*` | signed out | Matches (ABM for Sandra, 22 Nov); REQUIRED tag fix (handoff #34) |
| B2 | T03 FAQs, contacts, support, privacy | `/help/*`, `/privacy` | signed out | Matches (ABM for Sandra, 22 Nov) |
| B3 | T06 staff homes (reviewer, adjudicator, admin, support, committee) | `/staff` | each role | Matches (ABM for Sandra, 22 Nov) |
| B4 | T07 My reviews tabs, All cases | `/staff/reviews`, `/staff/cases` | reviewer.1, admin | Matches (ABM for Sandra, 22 Nov) |
| B5 | T08 staff tabs: Timeline, Internal notes, Assignments | `/staff/cases/:id` | admin | Matches (ABM for Sandra, 22 Nov) |
| B6 | T11 Notifications page + email switch | `/notifications` | applicant.a | Matches (ABM for Sandra, 22 Nov) |
| B7 | T12 Users & roles (own row locked), challenges, rubric, roles, content, chat settings | `/admin/*` | admin | Matches (ABM for Sandra, 22 Nov); rubric editor not opened |
| B8 | 403 / 404 states | another applicant's idea; `/staff` as applicant | applicant.b | Matches (ABM for Sandra, 22 Nov) |

## After the check

- Update `screen-status.md` and `handoff-notes.md` on one branch (`design/staging-review`), open the pull request before **16:00**, and tag Obvious and Sylvain.
- Anything marked **fix before freeze** goes to Obvious straight away, smallest first.
