# Screen status

**Maintained by:** Sandra · **Backup:** Obvious · **Last updated:** — · Vocabulary and the Ready-for-build rule: blueprint §8.5 (D-37).
**Claims:** write your name in *Designer* or *Developer* **before** editing a frame or a shared component (§9.2).

Design status values: Not started · In design · Provisional · In review · Approved · Implemented · Verified · Blocked.
All rows start as **Not started** until TASK-01 records what already exists.

| Template | Variant / role | Slice | Design-ready by | Mobile 360 | Desktop 1280 | Designer | Figma frame (link / node) | Last snapshot | Developer | Code status (PR) | Depends on (RPCs) | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Shells + state kit | Public, applicant, staff shells; loading/empty/error/forbidden/offline/unknown | 0 | 15 Nov | Not started | Not started | | | | Obvious | | — | Needed by every screen |
| T01 | Public home + challenge list | 1 | 15 Nov | Not started | Not started | | | | | | — | |
| T02 | Sign in · register (+ consent) · verify · forgot/reset · MFA | 1 | 15 Nov | Not started | Not started | | | | | | Auth | |
| T03 | Challenge brief | 1 | 15 Nov | Not started | Not started | | | | | | — | |
| T03 | FAQs · contacts · fault support · privacy | 6 | 18 Nov | Not started | Not started | | | | | | — | |
| T04 | Proposal form (draft, attachments, review & declare) | 1 | 15 Nov | Not started | Not started | | | | | | `save_draft`, `submit_proposal` | |
| T04 | V2 revise mode (task responses, change note) | 4 | 17 Nov | Not started | Not started | | | | | | `submit_revision` | INN-02 |
| T05 | Receipt (V1 and V2) | 1 | 15 Nov | Not started | Not started | | | | | | `submit_proposal` | |
| T06 | Applicant "My ideas" | 1 | 15 Nov | Not started | Not started | | | | | | — | Dashboard |
| T06 | Staff home (per role KPIs) | 2 | 16 Nov | Not started | Not started | | | | | | — | Dashboard |
| T06 | Committee overview | 6 | 18 Nov | Not started | Not started | | | | | | — | Dashboard |
| T07 | Screening queue | 2 | 16 Nov | Not started | Not started | | | | | | — | Dashboard |
| T07 | Reviewer assignments | 3 | 17 Nov | Not started | Not started | | | | | | — | Dashboard |
| T07 | Ready for decision | 5 | 18 Nov | Not started | Not started | | | | | | — | Dashboard |
| T07 | Admin all cases · committee list | 2 | 16 Nov | Not started | Not started | | | | | | — | Dashboard |
| T08 | Applicant case view (timeline, feedback, decision) | 2 | 16 Nov | Not started | Not started | | | | | | — | |
| T08 | Staff workspace (tabs, notes, assignments) | 2 | 16 Nov | Not started | Not started | | | | | | `record_screening`, `assign_reviewers` | |
| T08 | Feedback tab (clarification reply, roadmap tasks) | 4 | 17 Nov | Not started | Not started | | | | | | `request_feedback`, `respond_clarification` | INN-02 |
| T08 | Decision tab + award (applicant and staff) | 5 | 18 Nov | Not started | Not started | | | | | | `record_decision`, `publish_decision`, `record_award` | |
| T09 | Declaration gate | 3 | 17 Nov | Not started | Not started | | | | | | `declare_assignment` | |
| T09 | Scorecard (1–5 anchors) | 3 | 17 Nov | Not started | Not started | | | | | | `save/submit_scorecard` | |
| T09 | Panel comparison | 3 | 17 Nov | Not started | Not started | | | | | | — | |
| T09 | V2 task verification block | 4 | 17 Nov | Not started | Not started | | | | | | `verify_feedback_task` | INN-02 |
| T10 | Action dialogs (screening, assign, clarification, decision, publish, award, close) | 2 | 16 Nov | Not started | Not started | | | | | | Workflow RPCs | |
| T10 | Revision request with task builder | 4 | 17 Nov | Not started | Not started | | | | | | `request_feedback` | INN-02 |
| T11 | Notification popover + page + alert preferences | 3 | 17 Nov | Not started | Not started | | | | | | `mark_notifications_read` | |
| T12 | Users & roles | 2 | 16 Nov | Not started | Not started | | | | | | `grant_role`, `revoke_role` | |
| T12 | Challenge editor · rubric editor · roles · content · chat settings | 6 | 18 Nov | Not started | Not started | | | | | | Admin RPCs | ADM-01, ARC-01 |
| T13 | Reports (participation, outcomes, timelines, impact, chat) | 6 | 18 Nov | Not started | Not started | | | | | | Report views | Dashboard |
| T14 | Audit log + detail sheet | 6 | 18 Nov | Not started | Not started | | | | | | Audit query | Dashboard |
| T15 | Applicant chat widget (open, busy, closed, ended) | 6 | 18 Nov | Not started | Not started | | | | | | Chat | |
| T15 | Consultant inbox | 6 | 18 Nov | Not started | Not started | | | | | | Chat | Dashboard |
