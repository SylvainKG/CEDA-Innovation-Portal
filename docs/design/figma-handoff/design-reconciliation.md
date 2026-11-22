# Design reconciliation and final snapshot set (P7-04)

**Owner:** ABM for Sandra (acting UI/UX lead, D-31) · **Date:** 22 Nov 2026 · **Checked on:** `main` at `cbb1df3`, mock mode, 1280 px (V2 screens also at 360 px)
**Implements:** blueprint §5 Phase 7 ("final approved snapshot set and design reconciliation: every implemented screen matches its approved snapshot, or the difference is logged") and §8.4 steps 5, 7 and 8.

## Result

- **Snapshot set complete.** Every screen in the route map has a current snapshot in [`snapshots/`](snapshots/): 28 Figma frames and 19 build captures (47 files, 2.1 MB; the largest is 169 KB). See the snapshot log in [`snapshots/README.md`](snapshots/README.md).
- **Every implemented screen matches its snapshot, or the difference is logged** in [`handoff-notes.md`](handoff-notes.md) (#2–#40). The table below lists each screen with its result.
- **Two fixes are open before freeze** (UI merges stop 16:00 CAT): #142 links the admin settings pages from the navigation (#40), and #143 makes the status badges name an open revision (#39). Neither is in this PR.
- **Not reconciled back into Figma (§8.4 step 8).** The frames live in Sandra's Figma file and were not redrawn before the freeze. Until they are, the differences listed here are the record, and the build plus these snapshots are the reference. When Sandra is back, she updates the frames to match the decisions below or keeps them logged.

## Two kinds of snapshot

| Kind | Files | Source | Use |
|---|---|---|---|
| **Figma frame** | dated `2026-11-21` (28) | Sandra's 21 Nov frames: the PDFs in `Figma pdf/`, rendered at 100 dpi, cropped and saved as 128-colour PNGs | The design reference the screen was built to |
| **Build capture** | dated `2026-11-22` (19) | The app on `main` `cbb1df3` in mock mode, 1280 px wide, full page, demo data only, the development role switcher hidden | The approved state of a screen that has no frame. Each was approved in the 22 Nov staging review |

## Screen by screen

"Review" is the 22 Nov staging design review ([`staging-review-checklist.md`](staging-review-checklist.md)), plus the V2 screens checked later the same day in mock mode.

| Screen | Snapshot | Kind | Review (22 Nov) | Differences logged |
|---|---|---|---|---|
| Shared shell, applicant and staff | every signed-in frame | Frame | Matches (A1) | #19 Sign out in the avatar menu · #35 Peolwane brand and footer · #36 staff header and navigation · **#40 admin settings not in the navigation (fix)** |
| T01 Home | `T01-home__public__desktop__2026-11-22.png` | Build | Approved (A2) | Hero photo waits for its file and licence (`screen-status.md`) |
| T02 Sign in | `T02-sign-in__default__desktop__2026-11-21.png`, `T02-sign-in__error-and-demo-picker__desktop__2026-11-21.png` | Frame | Matches (B1) | #16, #21 · #34 fixed |
| T02 Create account | `T02-register__error__desktop__2026-11-21.png` | Frame | Matches (B1) | #22 |
| T02 Verify, forgot, reset, MFA | `T02-forgot-password__public__desktop__2026-11-22.png` | Build | Approved (B1) | No frame |
| T03 Challenge brief | `T03-challenge-brief__public__desktop__2026-11-22.png` | Build | Approved (A3) | No Downloads until a real file exists |
| T03 FAQs, contacts, support, privacy | `T03-help-faqs__public__desktop__2026-11-22.png` | Build | Approved (B2) | — |
| T04 Proposal form | `T04-proposal-form__applicant__desktop__2026-11-22.png` | Build | Approved (A4) | #8, #9 · #34 fixed · INN-03 examples deferred |
| T04 Revise, version 2 | `T04-revise-v2__roadmap-and-form__desktop__2026-11-21.png`, `T04-revise-v2__review-changes__desktop__2026-11-21.png` | Frame | **Matches (A11)**, checked 22 Nov | #18, #20 · #37 no Save draft |
| T05 Receipt, V1 and V2 | `T05-receipt__version-2__desktop__2026-11-21.png` | Frame | Matches V1; **V2 matches (A12)**, checked 22 Nov | #27 |
| T06 My ideas | `T06-my-ideas__applicant__desktop__2026-11-21.png` | Frame | Matches, now including the action-needed state (A10) | #17, #20 |
| T06 Staff homes | `T06-staff-home__screening-officer…`, `…__reviewer…`, `…__adjudicator…`, `…__admin…` (`2026-11-21`); `…__support…` (`2026-11-22`) | Frame; build for support | Matches (B3) | #36 adjudicator figures, recent activity |
| T06 Committee overview | `T06-staff-home__committee__desktop__2026-11-22.png` | Build | Approved (B3) | D-08 least-privilege view |
| T07 Screening queue | `T07-screening-queue__screening-officer__desktop__2026-11-22.png` | Build | Approved (A5) | — |
| T07 My reviews | `T07-my-reviews__reviewer__desktop__2026-11-22.png` | Build | Approved (B4) | — |
| T07 Ready for decision | `T07-ready-for-decision__adjudicator__desktop__2026-11-21.png` | Frame | Matches (A14) | #28 |
| T07 All cases, admin and committee | `T07-all-cases__admin__desktop__2026-11-21.png`; `T07-all-cases__committee__desktop__2026-11-22.png` | Frame; build for committee | Matches (B4) | #31 |
| T08 Applicant case view | `T08-applicant-case__proposal-tab__desktop__2026-11-21.png` | Frame | Matches | #23 |
| T08 Staff case | `T08-staff-case__screening-proposal-tab__desktop__2026-11-21.png`; `T08-staff-case__admin-proposal-tab__desktop__2026-11-22.png` | Frame; build for admin | Matches (B5) | **#39 badge says "clarification" for a revision (fix)** |
| T08 Feedback tab | none | — | Matches for the applicant's task list (A10); staff tab not captured | — |
| T08 Decision tab and award | none | — | Record decision matches (A15); publish and award not exercised | — |
| T09 Declaration gate | `T09-declaration-gate__reviewer__desktop__2026-11-21.png` | Frame | Approved, difference accepted (A7) | #24, #32 |
| T09 Scorecard | `T09-scorecard__reviewer__desktop__2026-11-21.png` | Frame | Approved, difference accepted (A8) | #24, #33 |
| T09 Panel | `T09-panel__adjudicator__desktop__2026-11-21.png` | Frame | Matches (A14) | #25 |
| T09 V2 task verification | none (needs a version 2 in the session) | — | **Matches the checklist (A13)**, checked 22 Nov | #38 counter wording |
| T10 Record screening | `T10-record-screening__side-sheet__desktop__2026-11-21.png` | Frame | Matches (A5) | — |
| T10 Record decision | `T10-record-decision__side-sheet__desktop__2026-11-21.png` | Frame | Matches (A15) | #26 |
| T10 Assign reviewers, revision request | none | — | Matches (A6, A9) | #12 |
| T11 Notifications | `T11-notifications__applicant__desktop__2026-11-22.png` | Build | Approved (B6) | Popover not built; the bell opens the page |
| T12 Users and roles | `T12-users-roles__admin__desktop__2026-11-21.png`, `T12-users-roles__invite-sheet__desktop__2026-11-21.png` | Frame | Matches (B7) | #29 · **#40 not in the navigation (fix)** |
| T12 Challenges, roles, content, chat settings | `T12-challenges__admin…`, `T12-roles__admin…`, `T12-content__admin…`, `T12-chat-settings__admin…` (`2026-11-22`) | Build | Approved (B7); rubric editor not opened | **#40** |
| T13 Reports | `T13-reports__participation…`, `…__outcomes…`, `…__timelines…`, `…__impact…`, `…__chat…`, `…__admin-participation…` (`2026-11-21`) | Frame | Matches (A16) | #30 |
| T14 Audit log | `T14-audit-log__admin__desktop__2026-11-22.png` | Build | Approved (A18); detail sheet not opened | — |
| T15 Chat | `T15-chat__applicant__desktop__2026-11-22.png` | Build | Renders cleanly (A17); hours and waiting not exercised | Built as a page, not a floating widget |
| T15 Consultant inbox | `T15-consultant-inbox__consultant__desktop__2026-11-22.png` | Build | Renders cleanly (A17); Accept not exercised | — |

## What's left

| Item | Owner | When |
|---|---|---|
| #40: Users & roles and the other settings pages in the admin navigation | ABM (UI), PR #142 | Review and merge before 16:00 CAT |
| #39: status badges name an open revision | ABM (UI), PR #143 | Review and merge before 16:00 CAT |
| Redraw the frames to the decisions in #16–#38, or keep them logged (§8.4 step 8) | Sandra (ABM as backup) | After judging, when Sandra is back |
| Snapshots of the dialogs with no frame (assign reviewers, revision request, publish, award), the T08 Feedback and Decision tabs and the V2 verification block | ABM | After judging; each needs case state set up in the session |
| Mobile 360 snapshots | ABM | After judging. The 360 px checks are recorded in `staging-review-checklist.md`; only desktop is captured |
| Tick the Phase 7 line in the blueprint (§5) | Sylvain (blueprint owner) | When this PR merges |
