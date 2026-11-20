# Screen status

**Maintained by:** Sandra · **Backup:** Obvious · **Last updated:** 16 Nov 2026 (TASK-01 first pass) · Vocabulary and the Ready-for-build rule: blueprint §8.5 (D-37).
**Claims:** write your name in *Designer* or *Developer* **before** editing a frame or a shared component (§9.2).

Design status values: Not started · In design · Provisional · In review · Approved · Implemented · Verified · Blocked.

**How to read this pass:**
- The only design source is the Figma Make prototype (see `screen-inventory.md`). Its views are responsive, so **Mobile 360** and **Desktop 1280** share one status. Neither breakpoint has been checked at exactly 360 or 1280 px.
- **Provisional** = something exists but has not been reviewed and has gaps (listed in Notes). Nothing is *Approved*.
- **Ready for build (D-37) is not met by any row yet:** no snapshot is exported to `snapshots/`, and the API contract (`03-api-contracts-and-permissions.md`) is not written.
- **Every row with a Provisional status is also blocked by the type-scale and contrast fixes** in `design-tokens.md`.

| Template | Variant / role | Slice | Design-ready by | Mobile 360 | Desktop 1280 | Designer | Figma frame (link / node) | Last snapshot | Developer | Code status (PR) | Depends on (RPCs) | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Shells + state kit | Public, applicant, staff shells; loading/empty/error/forbidden/offline/unknown | 0 | 15 Nov | Provisional (shells) · Not started (states) | Provisional (shells) · Not started (states) | | Make: `PublicHome` header, `AppShell` | — | Obvious | | — | **Overdue.** No DEMO badge, skip link, footer links or applicant bottom nav. No state kit at all |
| T01 | Public home + challenge list | 1 | 15 Nov | Provisional | Provisional | | Make: `PublicHome` | — | Obvious | **Built from spec — design review pending** (BCR-003): `ui/t04-t05-submit-screens` | — | **Overdue.** Strong visual direction. Add challenge cards (closing date in CAT, Open/Closing soon/Closed), empty state, and align "How it works" to the 5 stages |
| T02 | Sign in · register (+ consent) · verify · forgot/reset · MFA | 1 | 15 Nov | Not started | Not started | | — | — | Obvious | **Built from spec — design review pending** (BCR-003): `ui/t02-auth` (sign in, register, verify, forgot, reset; MFA with the staff slice) | Auth | **Overdue. Missing.** "Log in" jumps straight to a dashboard |
| T03 | Challenge brief | 1 | 15 Nov | Not started | Not started | | — | — | Obvious | **Built from spec — design review pending** (BCR-003): `ui/t04-t05-submit-screens` | — | **Overdue. Missing** |
| T03 | FAQs · contacts · fault support · privacy | 6 | 18 Nov | Not started | Not started | | — | — | Obvious | **Built from spec — design review pending** (BCR-003): `ui/help-pages` (support page shows the server's text only; no severity table until CEDA supplies the times) | — | Footer links exist but go nowhere |
| T04 | Proposal form (draft, attachments, review & declare) | 1 | 15 Nov | Provisional | Provisional | | Make: `ApplicationForm`, `UploadSection`, `ReviewSummary` | — | Obvious | **Built from spec — design review pending** (BCR-003): `ui/t04-t05-submit-screens` · **Deferred:** INN-03 collapsible "What makes a good answer?" with examples: the form schema has no example text yet (Sandra, #38 item 5) | `save_draft`, `submit_proposal` | **Overdue. Closest to ready.** Add: error summary + field errors, "Saved 14:05" autosave, offline/restore prompt, upload states (progress, failed + retry, rejected), "Required" text markers, closed-challenge banner. Fix upload rules (handoff-notes #8) |
| T04 | V2 revise mode (task responses, change note) | 4 | 17 Nov | Not started | Not started | | — | — | | | `submit_revision` | INN-02. "Revise application" reopens a blank V1 form |
| T05 | Receipt (V1 and V2) | 1 | 15 Nov | Provisional | Provisional | | Make: `SuccessState` | — | Obvious | **Built from spec — design review pending** (BCR-003): `ui/t04-t05-submit-screens` | `submit_proposal` | **Overdue.** Add version, server time (CAT), form version, files list, "Declaration accepted", print. Reference format `CEDA-2026-NNNN` |
| T06 | Applicant "My ideas" | 1 | 15 Nov | Provisional | Provisional | | Make: `ApplicantView` | — | Obvious | **Built from spec — design review pending** (BCR-003): `ui/t04-t05-submit-screens` | — | **Overdue.** Replace table with IdeaCards (one per idea, one primary action each); 5-stage mini timeline; empty state |
| T06 | Staff home (per role KPIs) | 2 | 16 Nov | Provisional | Provisional | | Make: `EvaluatorView`, `AdjudicatorView`, `AdminView` | — | | | — | Due today. Screening officer and support homes missing. Remove donut chart (spec: no pie charts). Add "Your next tasks" and recent activity |
| T06 | Committee overview | 6 | 18 Nov | Not started | Not started | | — | — | | | — | Missing |
| T07 | Screening queue | 2 | 16 Nov | Not started | Not started | | — | — | Obvious | **Built from spec — design review pending** (BCR-003): `ui/t07-t08-screening` | — | Due today. Missing. Can reuse `ApplicationTable` + `TableTools` |
| T07 | Reviewer assignments | 3 | 17 Nov | Provisional | Provisional | | Make: `EvaluatorView` table | — | | | — | Add status tabs: Not started · Declaration needed · In progress · Submitted; version and due columns |
| T07 | Ready for decision | 5 | 18 Nov | Provisional | Provisional | | Make: `AdjudicatorView` table | — | | | — | Add scores (2/2), weighted aggregate, spread flag, roadmap summary. Depends on handoff-notes #2–#3 |
| T07 | Admin all cases · committee list | 2 | 16 Nov | Provisional (admin) · Not started (committee) | Provisional (admin) · Not started (committee) | | Make: `AdminView` applications | — | Obvious | **Admin list built from spec — design review pending** (BCR-003): `ui/t10-assign-reviewers`; committee list not built (D-08 reads `list_case_status`) | — | Due today. Add stage, assigned reviewers, overdue flag; "View" must open T08. Mobile stacked cards |
| T08 | Applicant case view (timeline, feedback, decision) | 2 | 16 Nov | Provisional | Provisional | | Make: `ApplicationDetail` | — | | | — | Due today. Align tabs to Proposal · Timeline · Feedback · Decision; confidentiality line; 5-stage timeline; remove applicant email/phone panel from staff-style aside |
| T08 | Staff workspace (tabs, notes, assignments) | 2 | 16 Nov | Not started | Not started | | — | — | Obvious | **Built from spec — design review pending** (BCR-003): `ui/t07-t08-screening` (Proposal, Timeline, Reviewers and Internal notes tabs, `ui/t08-internal-notes`; evaluations, feedback and decision tabs come with their slices. Tabs wrap on phones instead of a scrolling bar with arrows) | `record_screening`, `assign_reviewers` | Due today. **Missing.** Reuse `ApplicationDetail` header + tabs, add role-gated tabs |
| T08 | Feedback tab (clarification reply, roadmap tasks) | 4 | 17 Nov | Provisional | Provisional | | Make: `Feedback` | — | | | `request_feedback`, `respond_clarification` | INN-02. Free text only. Needs clarification reply box, task list with statuses, deadline in CAT |
| T08 | Decision tab + award (applicant and staff) | 5 | 18 Nov | Not started | Not started | | — | — | | | `record_decision`, `publish_decision`, `record_award` | Missing |
| T09 | Declaration gate | 3 | 17 Nov | Not started | Not started | | — | — | | | `declare_assignment` | Missing. `EvaluationReview` opens content with no gate |
| T09 | Scorecard (1–5 anchors) | 3 | 17 Nov | Provisional | Provisional | | Make: `EvaluationReview` | — | | | `save/submit_scorecard` | Add anchors per value, required reason (≥ 20 chars), weights + live weighted score, rubric version footer, peer-hidden message. Depends on handoff-notes #5 |
| T09 | Panel comparison | 3 | 17 Nov | Provisional (conflicts) | Provisional (conflicts) | | Make: `Comparison` | — | | | — | Concept differs from blueprint (handoff-notes #3). Needs criterion × reviewer matrix + spread |
| T09 | V2 task verification block | 4 | 17 Nov | Not started | Not started | | — | — | | | `verify_feedback_task` | INN-02. Missing |
| T10 | Action dialogs (screening, assign, clarification, decision, publish, award, close) | 2 | 16 Nov | Provisional (confirm only) | Provisional (confirm only) | | Make: `Modal`; decision panel in `Comparison` | — | Obvious | **Record screening, Assign reviewers and Remove reviewer built from spec — design review pending** (BCR-003): `ui/t07-t08-screening`, `ui/t10-assign-reviewers`; other actions with their slices | Workflow RPCs | Due today. Only a generic confirm exists. Build one SideSheet pattern for all actions |
| T10 | Revision request with task builder | 4 | 17 Nov | Not started | Not started | | — | — | | | `request_feedback` | INN-02. Missing |
| T11 | Notification popover + page + alert preferences | 3 | 17 Nov | Provisional (popover) | Provisional (popover) | | Make: `NotificationPopover` | — | | | `mark_notifications_read` | Add "Mark all as read", page, email opt-in, empty state |
| T12 | Users & roles | 2 | 16 Nov | Provisional | Provisional | | Make: `ProgrammeSetup` → Users | — | | | `grant_role`, `revoke_role` | Due today. Add invite, role chips with grant/revoke, own row locked with reason |
| T12 | Challenge editor · rubric editor · roles · content · chat settings | 6 | 18 Nov | Provisional (challenge, rubric) · Not started (others) | Provisional (challenge, rubric) · Not started (others) | | Make: `ProgrammeSetup` → Programme, Scoring rubric | — | | | Admin RPCs | ADM-01, ARC-01. Rubric needs anchors and "Total 100% ✓". Stage editor is unmapped (scope) |
| T13 | Reports (participation, outcomes, timelines, impact, chat) | 6 | 18 Nov | Provisional | Provisional | | Make: `Reports` | — | | | Report views | Add the 5 tabs, CSV export, "Show as table", definitions |
| T14 | Audit log + detail sheet | 6 | 18 Nov | Provisional | Provisional | | Make: `AuditLog` | — | | | Audit query | Add actor/case/action/date filters, detail side sheet, "can't be edited" banner |
| T15 | Applicant chat widget (open, busy, closed, ended) | 6 | 18 Nov | Not started | Not started | | — | — | | | Chat | Missing |
| T15 | Consultant inbox | 6 | 18 Nov | Not started | Not started | | — | — | | | Chat | Missing |

## Design backlog (priority order)

Slice dates win (TASK-02 §2). Items 1–3 are overdue.

1. **Foundations** (blocks everything): accessible type scale, primary colour contrast, full status token set, radius scale, focus states. `design-tokens.md`.
2. **Shells + state kit**: DEMO badge, applicant top bar + bottom nav, footer, skip link; loading, empty, error, forbidden, not found, offline, unknown outcome.
3. **Slice 1 applicant journey**: T02 auth set → T04 states and fixes → T05 receipt fields → T06 IdeaCards → T01 challenge list → T03 challenge brief.
4. **Slice 2 (due today)**: T07 screening queue + admin list → T08 staff workspace → T10 action SideSheet → T12 users & roles → T06 staff homes.
5. **Slices 3–4 (due 17 Nov)**: T09 declaration gate → T09 scorecard + panel → T07 reviewer tabs → T11 → **INN-02**: T10 task builder, T04 revise mode, T08 feedback tasks, T09 verification block.
6. **Slices 5–6 (due 18 Nov)**: T08 decision + award → T07 ready for decision → T13 → T14 → T15 → T03 help pages → T06 committee → T12 editors.

**Missing or incomplete dashboards** (TASK-01 step D3): T06 screening, support and committee homes (missing) · T06 applicant, reviewer, adjudicator, admin (incomplete) · T07 screening queue (missing) · T07 reviewer, decision, admin (incomplete) · T07 committee list (missing) · T13 (incomplete) · T14 (incomplete) · T15 consultant inbox (missing).
