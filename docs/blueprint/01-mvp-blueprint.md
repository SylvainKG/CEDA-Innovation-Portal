# CEDA Innovation Portal — Hackathon MVP Blueprint (v0.2)

**Status:** Draft for team review · 14 Nov 2026 · Planning only, no implementation is authorised yet
**Sources:** `requirements/Portal_Backlog.md` (10 Nov), *User requirements* (10 Nov), *User stories, tech stack and security design*, *Journey and data flow* (14 Nov), *What to adopt from each reference platform* (10 Nov), *Botswana Innovation Ecosystem research brief* (Nov 2026)
**Not yet read:** the whiteboard photos (the journey document is derived from them)
**Terminology:** this blueprint uses the backlog's terms, **challenge** and **case/proposal**. The reference analysis calls the same things "Programme" and "Idea".
**Deadline:** Upload by 12:00 CAT on 23 Nov 2026 (hard cut-off 17:00). Today is day 2 of 11.

This is a **demonstration prototype that uses fictional data**. It is not production-ready and makes no claim of legal compliance.

---

## 1. MVP scope

### 1.1 Goal

The goal is one convincing, working end-to-end path. A confidential proposal goes from **submit → screen → two independent evaluations → revision request → Version 2 → adjudication → published decision → award**. Every state change is a real database transaction with an audit entry, and access is enforced on the server, not only hidden in the UI.

### 1.2 Delivery classification

Legend: **Full** = working end to end with real state · **Simplified** = real but reduced in breadth · **Simulated** = visibly labelled stand-in · **Deferred** = not built, but named in the proposal.

| Backlog | Capability | Class | MVP treatment |
|---|---|---|---|
| FND-01 | Contracts, scaffold, staging | Full | Supabase project + Vercel preview/staging, migrations, fictional seed |
| UX-01 | Role navigation, responsive components | Full | One component kit and 15 templates. CEDA brand tokens are **placeholders until supplied**. **Low-bandwidth patterns:** text-first pages, compressed assets, local draft backup if the connection drops, upload progress + retry, warning before session expiry |
| IAM-01 | Staff/committee roles, invite, grant/revoke | Simplified | Admin invites by email and grants or revokes roles. Self-grant is refused. There is no two-admin approval |
| IAM-02 | Register, verify email, sign in, privacy consent | Full | Supabase Auth. Consent is stored with the notice version |
| IAM-03 | Change / recover password | Full | Supabase Auth's single-use expiring link, with a neutral "if an account exists" message |
| — | Staff MFA (security design) | Simplified | TOTP is available and enforced for real staff accounts. **Seeded judge accounts are exempt behind a flag** (see D-07) |
| ADM-01 | Publish challenge, form, documents | Simplified | The form is a fixed set of sections plus configurable field labels/required flags (JSON schema). There is no drag-and-drop builder |
| ADM-02 | Edit / unpublish / delete content | Simplified | Edit and unpublish challenges. Delete is only for unused drafts. Submitted cases keep the `challenge_version` they used |
| APP-01 | Discover challenge, save draft | Full | Autosave plus manual save. Resume own draft |
| APP-02 | Confidential attachments | Full | Private bucket, case-scoped path, type/size checks, 60 s signed URLs. **No malware scan** (deferred) |
| APP-03 | Submit and get reference | Full | Atomic RPC: case + locked V1 + reference `CEDA-2026-NNNN`. Idempotent by `client_request_id`. The confidentiality/IP declaration must be accepted on the final review step. The receipt shows reference, version, server timestamp in Gaborone time and form version. One account can hold several ideas, each its own case |
| SEC-01 | Audit events | Full | Written inside every workflow RPC. Insert-only; triggers block update/delete |
| REV-01 | Screening + assign ≥2 reviewers | Full | |
| REV-02 | Versioned rubric | Full | Criteria, weights, ranges. Scorecards keep `rubric_version_id` |
| REV-03 | Independent scoring + panel view | Full | **Conflict and confidentiality declaration before the proposal opens.** Declaring a conflict removes the assignment and is audited. 1–5 scale with defined anchors, rationale required, no N/A. Peer scores stay hidden until the reviewer submits their own. Panel shows individual scores, weighted aggregate and spread |
| REV-04 | Request clarification / revision | Full | Message + deadline. The applicant sees **Action required**. A **clarification** is answered with a text reply. A **revision** needs a new version and carries structured feedback tasks (see INN-02) |
| APP-04 | Resubmit V2 with history | Full | New immutable version with a required change note, same reference. Returns to the requesting stage. V1 scores are kept |
| DEC-01 | Record + publish decision | Full | Draft decision invisible to the applicant until `publish_decision` |
| DEC-02 | Award after approval | Full | A separate event. The DB refuses an award on a case that is not approved |
| NTF-01 | Timeline, live dashboards, in-app notifications | Full | Supabase Realtime on `notifications` and `case_events` |
| NTF-02 | Opt-in email alerts | Simplified | Opt-in toggle → `email_outbox` → Edge Function sends through SMTP. **If SMTP is not ready, the outbox viewer is shown as Simulated** |
| HLP-01 | FAQs + regulatory contacts | Simplified | Admin-editable content pages. Contacts are marked **"Sample — awaiting CEDA confirmation"** |
| CHT-01 | Applicant ↔ consultant live chat | Simplified | Realtime chat. One consultant can handle several sessions. Only registered users can chat |
| CHT-02 | Chat hours 09:00–16:00 Gaborone, working days | Full | Server-side check against `Africa/Gaborone` + a configurable working-day table. A demo override flag lets judges see both states |
| CHT-03 | Chat statistics | Simplified | Volume, handled, missed and average wait for a chosen period |
| RPT-01 | Participation, outcomes, time-in-stage | Simplified | One dashboard with challenge + period filters and a CSV export. Figures come from `case_events`. **Impact metrics:** share of ideas that reached a later stage, and ideas resubmitted after feedback |
| SEC-02 | Negative access tests, privacy, scan | Full | pgTAP + Playwright negative suite, `npm audit` record, and a data-handling note (not a compliance claim) |
| SEC-03 | Audit trail viewer | Full | Filter by actor, case, action and date. Admin/auditor only |
| OPS-01 | Hosting, backup/restore note | Simplified | Supabase Pro, chosen region, cost note, one recorded restore check |
| OPS-02 | Fault support page | Full | A static content page |
| ARC-01 | Extensibility | Simplified | New role and new criterion through admin settings, with no code change. The second seeded challenge uses a **different form and rubric**. OpenAPI from PostgREST plus a short scaling note |
| QA-01 | Browsers, devices, response time | Simplified | Chrome/Edge/Firefox + one mobile viewport. Small timed sample, with unrun checks labelled |
| INN-01 | Side-by-side version compare | Simplified (P2) | Field-level diff of V1 vs V2 plus an attachment list diff, shown in the reviewer's V2 view next to the roadmap tasks |
| INN-02 *(new)* | **Constructive Feedback Roadmap**, the **primary innovation differentiator** | Full, **built inside Slice 4** | A revision request carries structured feedback tasks. The applicant must mark each task *Addressed* or *Not addressed*, with an explanation, when submitting V2. Each assigned reviewer then **verifies** each task (*Verified* / *Not verified* + note) on the V2 scorecard. Adjudicators see the verification results. Fallback if Slice 4 runs late: a revision request with no tasks still works |
| INN-03 *(new)* | Smart Idea Development Assistant, **non-AI, lightweight** | Simplified (P2) | Completeness meter, plain-language help for each field, prompts for weak or short sections, all inside T04. Rule-based; no proposal data leaves the system |
| INN-04 *(new)* | Innovation Readiness Passport (light) | **Optional** (P2) | Readiness stage on each idea (Concept → Prototype → Validated → Pilot), declared by the applicant and confirmed by a reviewer. **Started only after the required workflow and the SEC-02 negative suite pass on staging** |
| INN-05 *(new)* | Opportunity Navigator as a "Next steps" panel | Simulated (P2) | **A small panel, not a module.** Shown on a published decision, listing CEDA/BIF/LEA/BDIH pathways from admin-editable content, labelled **"Sample referral information"**. Worded as factual, not as an endorsement |
| — | Development stage (milestones, mentoring, impact) | Deferred | Shown as "future" on the timeline legend only |
| — | Decision-pack PDF, XLSX export, team co-submitters, pitch/presentation stage, reopening locked scores, duplicate/similarity checks, SMS | Deferred | Named in the proposal as roadmap (from the reference analysis) |
| — | Challenge Bank (beyond our challenges), mentor matchmaking, market-validation toolkit, impact dashboard, internal CEDA track | Deferred | Named in the proposal as roadmap (from the ecosystem research) |
| — | Malware scanning, SSO, phone verification, multilingual UI, retention automation, unregistered-visitor chat | Deferred | Named in the proposal as production work |

### 1.3 Decision register

| # | Decision | Status | Selected / default | Alternatives | Reason | Deadline / owner |
|---|---|---|---|---|---|---|
| D-01 | Stack | RECOMMENDED (team doc) | React 18 + TS + Vite + Tailwind + Radix; Supabase (Postgres, Auth, Storage, Realtime, Edge Fns); Vercel | Next.js + Prisma; Django | Team already ships it. RLS puts the rules next to the data | Confirm with all 4 members, 15 Nov |
| D-02 | API style | RECOMMENDED | **Reads** go through PostgREST with RLS. **All state changes** go through `SECURITY DEFINER` RPCs. Direct table writes are revoked | REST service layer | One transaction per transition, with audit included. Cannot be bypassed | 15 Nov, Track A |
| D-03 | Figma as UI source | CONFIRMED (brief) | Implement from Figma frames and component specs | — | — | Templates T01–T08 by 15 Nov |
| D-04 | Brand | OPEN | Neutral placeholder tokens, swapped when CEDA guidance arrives | — | Brand is worth 2 pts and is not yet supplied | Briefing / 16 Nov |
| D-05 | Award authority | OPEN | `award.record` permission granted to **Administrator** | Adjudicator | Separation of duties: the person who decides does not also pay | CEDA, 16 Nov |
| D-06 | Review quorum | OPEN | **2** submitted scorecards on the current version before adjudication | 3 | Matches the demo requirement | CEDA, 16 Nov |
| D-07 | Staff MFA vs judge access | RECOMMENDED | MFA enforced for staff except seeded `is_demo` accounts. The judge guide states this | Enforce for all, which blocks judges | **Contradiction:** the security design requires MFA, but judges need frictionless staff log-ins | 15 Nov |
| D-08 | External committee visibility | OPEN | Case status, stage and summary counts only. No proposal text, scores or notes | Full read | Least privilege | CEDA, 16 Nov |
| D-09 | Who can request revision | RECOMMENDED | Screening officer, assigned reviewer, adjudicator | Admin only | Matches the access table | — |
| D-10 | After V2 | RECOMMENDED | The case returns to the **requesting stage**. If that was evaluation, the same reviewers score V2 as new scorecards and V1 scorecards are kept | Skip re-scoring | Follows APP-04 and keeps V1 scores intact | — |
| D-11 | Transition to adjudication | RECOMMENDED | Automatic when quorum is met on the current version | Manual by admin | Fewer demo clicks, still a real transition with audit | — |
| D-12 | Reference format | RECOMMENDED | `CEDA-2026-NNNN` from a DB sequence | UUID-based | Readable for judges | — |
| D-13 | Chat audience | OPEN | Registered users only | Anonymous visitors | Simpler access control | CEDA, 16 Nov |
| D-14 | Region | OPEN | Lowest measured latency from Gaborone (EU vs Mumbai) | — | No African Supabase region | Latency test, 15 Nov |
| D-15 | Retention (proposal note) | OPEN | Propose 5 years after closure for applicant records. Demo data is wiped after judging | — | Proposal only; no automation | Kickoff |
| D-16 | Response-time targets | OPEN | Proposed p95: page ≤ 2 s, workflow action ≤ 1 s, file upload (5 MB) ≤ 5 s | — | Needed for QA-01 | Kickoff |
| D-17 | Demo credentials | RECOMMENDED | The seed reads `DEMO_PASSWORD` from env. No credentials in source. The judge guide lists the accounts | Hard-coded | REL-01 forbids credentials in source | — |
| D-18 | Compliance language | CONFIRMED (brief) | "Designed with reference to the Data Protection Act, 2024". Never "compliant" | — | Prototype with fictional data | — |
| D-19 | Reviewer declaration | **CONFIRMED** (14 Nov) | Conflict + confidentiality declaration before the proposal opens. Declaring a conflict removes the assignment, which the admin then reassigns | No declaration | Reference analysis (Agorize, HeroX, IdeaScale). Low cost, adds security evidence | — |
| D-20 | Score scale | **CONFIRMED** (14 Nov) | 1–5 with anchors (1 = not demonstrated, 3 = partly, 5 = fully with evidence). Rationale required. No N/A in the MVP | 0–10 (v0.1) | Reference analysis. Clearer for reviewers | Replaces v0.1's 0–10 |
| D-21 | Clarification vs revision | **CONFIRMED** (14 Nov) | Clarification: a **required** written reply, same version, no new version. Revision: always a new immutable version | Every response is a new version | Matches APP-04 ("respond or resubmit") | — |
| D-22 | Applicant declaration | RECOMMENDED | Confidentiality/IP declaration on the final submit step, stored with the version. The wording is a placeholder, not legal terms | — | Reference analysis. CEDA must supply the real terms | Real wording: CEDA |
| D-23 | Roles merged for the MVP | RECOMMENDED | Panel chair → adjudicator. Completeness + eligibility officers → screening officer. Team collaborator → deferred | Separate roles | Fewer accounts to demo. ARC-01 shows that roles can be added | — |
| D-24 | Primary innovation differentiator | **CONFIRMED** (14 Nov) | INN-02 Feedback Roadmap: tasks → applicant marks addressed + explanation → reviewer verifies. **Built inside Slice 4.** Other innovation items (INN-01, INN-03, INN-05, then optional INN-04) in Slice 7 | Version compare alone | Part of the core revision loop, visible in the demo, and answers the research's "no dead-end submissions" theme | — |
| D-25 | No external AI | **CONFIRMED** (security design + 14 Nov) | INN-03 assistant is rule-based and lightweight | AI assistant | No proposal data goes to outside AI services | — |
| D-27 | Schedule | **CONFIRMED** (14 Nov) | Deadline and slice priorities are unchanged. Optional features fit into existing slack or are cut; the schedule is never extended for them | — | The complete lifecycle comes first | — |
| D-28 | Screen inventory | **CONFIRMED** (14 Nov) | No new standalone screens. v0.2 features are placed inside templates T04–T10 | New screens | Keeps the 15-template set | — |
| D-29 | Readiness Passport | **CONFIRMED** (14 Nov) | Optional. Starts only after the required workflow and SEC-02 negative suite pass on staging | — | Protects the core lifecycle | — |
| D-30 | Opportunity Navigator | **CONFIRMED** (14 Nov) | Sample-information panel on the published decision only | Separate module | Scope control | — |
| D-26 | Research statistics | ASSUMED | Statistics in the research brief (GII rank, youth unemployment) are **not to be used** in the proposal until checked against the cited sources | — | The brief marks its own features as unvalidated hypotheses | Proposal lead, before DOC-01 draft |

---

## 2. Screen templates and role-to-screen map

### 2.1 Reusable Figma templates (15)

Every template ships with **loading, empty, error and forbidden (403)** variants, plus 404. These come from one shared state kit.

| ID | Template | Used for |
|---|---|---|
| T01 | Public home + challenge list | Landing page, open challenges, sign-in CTA |
| T02 | Auth card | Sign in, register (+ privacy consent), verify email, forgot/reset password, MFA prompt |
| T03 | Content page | Challenge brief + downloads, FAQs, regulatory contacts, fault support, privacy notice |
| T04 | Multi-section proposal form | Draft/edit, attachments, autosave indicator, completeness meter + field help (INN-03), guidance link, chat launcher, final review step with declaration. Reused for V2, with the roadmap checklist and change note |
| T05 | Confirmation receipt | Reference, version, server time (Gaborone), form version. Also used for the resubmission receipt |
| T06 | Role dashboard (cards + KPIs + recent activity) | Applicant "My ideas" (one card per idea, readiness badge only if optional INN-04 is built), staff home, committee overview |
| T07 | Work queue (filterable table) | Screening queue, reviewer assignments (not started / in progress / submitted), adjudication queue, committee case list, admin case list |
| T08 | Case workspace (header + tabs) | Tabs: Proposal (version picker + V1/V2 compare) · Timeline · Feedback (clarifications, roadmap) · Evaluations · Decision (+ next steps) · Internal notes · Assignments. Tabs appear only when the role has the permission |
| T09 | Scorecard | Declaration gate before access, rubric scoring form with 1–5 anchors (reviewer), panel comparison with weighted aggregate and spread (adjudicator/admin) |
| T10 | Action dialog / side sheet | Screening result, assign reviewers, request clarification/revision (with feedback tasks), record/publish decision, record award, close case. All require confirmation and a reason |
| T11 | Notification centre + preferences | Bell drawer, full list, email alert opt-in/out |
| T12 | Admin config (list + editor) | Challenges/forms, rubrics/criteria, users & roles, FAQ/contacts, chat hours |
| T13 | Reports dashboard | Participation, outcomes, time-in-stage, challenge/period filters, CSV export, chat statistics |
| T14 | Audit log | Filter by actor, case, action and date. Read-only detail drawer |
| T15 | Chat | Applicant widget (open/busy/closed states) and consultant multi-session inbox |

### 2.2 Role-to-screen map

Key: **●** full use · **◐** restricted or read-only · **—** no access (server returns 403 / no rows).

| Template | Applicant | Screening officer | Reviewer | Adjudicator | Administrator | Support consultant | Committee member (reuse) | Auditor (reuse) |
|---|---|---|---|---|---|---|---|---|
| T01 Home | ● | ● | ● | ● | ● | ● | ● | ● |
| T02 Auth | ● | ● (+MFA) | ● (+MFA) | ● (+MFA) | ● (+MFA) | ● (+MFA) | ● | ● |
| T03 Content | ● | ● | ● | ● | ● (edit via T12) | ● | ● | ● |
| T04 Proposal form | ● own draft / revision | — | — | — | — | — | — | — |
| T05 Receipt | ● own | — | — | — | — | — | — | — |
| T06 Dashboard | ● My ideas | ● | ● | ● | ● | ● support home | ◐ counts only | ◐ |
| T07 Queue | — | ● all submitted | ◐ assigned only | ◐ ready for decision | ● all | — | ◐ authorised, status only | — |
| T08 Case workspace | ◐ own: proposal, timeline, feedback, published decision/award | ● proposal, screening, notes, feedback | ◐ assigned: proposal, own evaluation, notes, feedback | ◐ assigned: all tabs | ● all tabs (read-only on scores) | — | ◐ status/timeline only (D-08) | — |
| T09 Scorecard | — | — | ● own; peers only after own submit | ◐ panel view | ◐ panel view | — | — | — |
| T10 Actions | ◐ submit / resubmit only | screen, request revision, close | request revision | request revision, decide, publish, close | assign reviewers, record award (D-05) | — | — | — |
| T11 Notifications | ● | ● | ● | ● | ● | ● | ● | — |
| T12 Admin config | — | — | — | — | ● | — | — | — |
| T13 Reports | — | — | — | ● (programme) | ● | ◐ chat stats (support lead) | ◐ if confirmed | — |
| T14 Audit log | — | — | — | — | ● | — | — | ● |
| T15 Chat | ● own sessions | — | — | — | — | ● assigned sessions | — | — |

---

## 3. Complete demo journey

### 3.1 Seeded demo accounts (all fictional, labelled "DEMO" in the header)

| Account | Role | Purpose |
|---|---|---|
| `applicant.a@demo.ceda-portal.test` — *Demo Applicant A (Lesedi Agro Demo)* | Applicant | Main journey |
| `applicant.b@demo.ceda-portal.test` — *Demo Applicant B* | Applicant | Negative access test |
| `screening@demo…` | Screening officer | |
| `reviewer.1@demo…`, `reviewer.2@demo…` | Reviewer | Assigned |
| `reviewer.3@demo…` | Reviewer | **Unassigned**, negative test |
| `adjudicator@demo…` | Adjudicator | |
| `admin@demo…` | Administrator + auditor | |
| `consultant@demo…` | Support consultant + support lead | |
| `committee.ext@demo…` | External committee member | Restricted view |

**Seeded content:** 1 open challenge (*"Water-Smart Agriculture Challenge 2026"*, fictional) with rubric v1. The rubric has four criteria scored 1–5 with anchors: Innovation 30%, Market potential 25%, Feasibility 25%, Economic impact 20%. There is also 1 closed challenge with a **different form and rubric** (for the "closed challenge" negative test and ARC-01). Applicant A already owns **one earlier idea** (submitted, under review), so the dashboard shows separate idea cards. There are **8 background cases** across all stages, owned by other fictional applicants, so reports and queues are not empty. There are also 5 FAQs, 4 regulatory contacts and 4 referral pathways, all marked "Sample", plus 6 seeded chat sessions for statistics.

### 3.2 Main journey (target 8–10 minutes on video)

| # | Actor | Action | Expected result | Evidence |
|---|---|---|---|---|
| 0 | New visitor *(optional)* | Register, see privacy notice, verify email | Unverified account cannot submit; consent recorded | IAM-02 |
| 1 | Admin | Open challenge in T12 and show rubric v1 | Challenge is live; applicants see the published version | ADM-01, REV-02 |
| 2 | Applicant A | Open challenge, download template, start draft, upload PDF, leave and resume | Draft keeps every field. Completeness meter and field help guide weak sections (INN-03, if built). Chat launcher and FAQ link are visible from the form | APP-01/02, HLP-01, CHT-02, INN-03 |
| 3 | Applicant A | Submit with a mandatory field missing → fix → accept declaration → submit | Server rejects with field errors and the draft is preserved. Then **reference `CEDA-2026-0009`**, V1 locked, and a receipt with server time and form version. The dashboard now shows **two idea cards** | APP-03 |
| 4 | Applicant A | Double-click submit / retry | Same reference returned, no duplicate case | APP-03 idempotency |
| 5 | Screening officer | Queue → case → ask a **clarification** ("confirm pilot site") → applicant replies in text → record **Eligible** + reason | Reply stored on the same version. Case → *Under review*. Applicant dashboard updates live without refresh | REV-01, REV-04, NTF-01 |
| 6 | Admin | Assign Reviewer 1 and Reviewer 2 | Both get a notification. Reviewer 3 still sees nothing | REV-01 |
| 7 | Reviewer 1 | Open the case → **declaration gate** → declare no conflict → score V1 (1–5 + rationale), submit | Proposal opens only after the declaration. Scorecard locked. Reviewer 1 can now see the peer panel (still empty) | REV-03, D-19 |
| 8 | Reviewer 2 | After declaring, before scoring, try to view peer scores | Only own (empty) scorecard is visible | REV-03 isolation |
| 9 | Reviewer 2 | Score V1, then **request revision** with a deadline and 3 feedback tasks | Case → *Action required*. Applicant sees the task list and is notified (in-app + email/outbox) | REV-04, NTF-02, INN-02 |
| 10 | Applicant A | Work through the roadmap: edit, mark each task addressed (or not) with an explanation, write the change note, submit **Version 2** | Submission is blocked until every task has a status and an explanation. Same reference; V2 locked; V1 still readable. Case returns to *Evaluation* | APP-04, INN-02 |
| 11 | Reviewer 1 & 2 | Open V2: **verify each roadmap task** (Verified / Not verified + note), view the V1/V2 compare, score V2 | V1 scorecards still shown under V1. Quorum on V2 → *Adjudication* automatically. *(Optional INN-04: reviewer confirms readiness stage)* | APP-04, INN-02, D-10/11, INN-01 |
| 12 | Adjudicator | Panel view: both V2 scorecards + weighted aggregate + spread + **roadmap verification summary**. Record **Approved** + reason (unpublished) | Applicant still sees *Under adjudication*, with no outcome | DEC-01, INN-02 |
| 13 | Adjudicator | Publish decision | Applicant timeline → *Approved*, with notification and a **Next steps** sample panel (INN-05, if built) | DEC-01, NTF-01, INN-05 |
| 14 | Admin | Record award (amount in BWP minor units + description) | Separate *Awarded* event. Timeline shows Approval and Award as two stages | DEC-02 |
| 15 | Applicant A | Dashboard and notifications | Five-stage timeline complete, unread badges shown, internal notes never visible | NTF-01 |
| 16 | Applicant A ↔ Consultant | Open chat; consultant answers while holding a second session | Private sessions. Outside-hours message shown via the demo override | CHT-01/02 |
| 17 | Admin | Reports filtered by challenge + period, including impact metrics, export CSV. Audit log filtered by case `CEDA-2026-0009` | Counts reconcile with the seed + new case. Full journey in the audit trail | RPT-01, SEC-03 |

### 3.3 Negative journey (must be shown on video and covered by automated tests)

| # | Attempt | Expected |
|---|---|---|
| N1 | Applicant B opens `/cases/<A's id>` and calls the REST endpoint directly | 403 page / zero rows |
| N2 | Applicant B requests A's attachment signed URL | Refused. An expired 60 s link also fails |
| N3 | Reviewer 3 (unassigned) opens the case | Zero rows, no file link |
| N4 | Applicant A queries the decision before it is published | Nothing returned |
| N5 | Admin tries to award a case that is *not approved* | RPC raises `CASE_NOT_APPROVED` |
| N6 | Any role tries to update V1 or delete an audit row | Trigger refuses |
| N7 | Support consultant calls the proposals/scores endpoints | Zero rows |
| N8 | Admin tries to grant a role to themself | Refused + audited |
| N9 | Submit to the closed challenge | Refused. Draft preserved |
| N10 | Assigned reviewer requests the proposal or files before declaring | Zero rows / no file link until the declaration is recorded |
| N11 | Reviewer declares a conflict, then reopens the case | Assignment revoked, zero rows, audit entry written |

---

## 4. Minimum data model (logical, not final DDL)

Conventions: UUID PKs, `created_at timestamptz` in UTC (rendered in Africa/Gaborone), RLS on every table. **Append-only** tables have no UPDATE/DELETE grants, and triggers enforce this. Confidential tables use soft delete (`deleted_at`) because Realtime delete events bypass RLS.

### 4.1 Core entities

| Entity | Key fields | Rules |
|---|---|---|
| **profiles** (users) | `id` = auth.users.id, `full_name`, `email`, `organisation`, `phone?`, `is_demo`, `consent_version`, `consent_at`, `alerts_opt_in` | Own row read/update. Admin reads all |
| **roles** | `key` (applicant, screening_officer, reviewer, adjudicator, admin, support_consultant, support_lead, committee_member, auditor), `label`, `is_system` | New roles can be added through config (ARC-01) |
| **role_permissions** | `role_key`, `permission` (e.g. `case.screen`, `case.assign`, `scorecard.submit`, `decision.publish`, `award.record`, `audit.read`, `report.read`, `chat.handle`) | Every RPC checks `has_permission()` |
| **user_roles** | `user_id`, `role_key`, `granted_by`, `revoked_at` | `granted_by ≠ user_id`. Audited |
| **challenges** | `id`, `slug`, `title`, `status` (draft/published/unpublished/closed), `opens_at`, `closes_at`, `audience` | |
| **challenge_versions** | `challenge_id`, `version_no`, `brief_md`, `form_schema jsonb`, `required_docs jsonb`, `template_files jsonb`, `rubric_version_id`, `published_at` | Immutable once published |
| **rubric_versions** / **rubric_criteria** | version: `rubric_id`, `version_no`, `published_at`. criterion: `key`, `label`, `weight`, `min` (1), `max` (5), `anchors jsonb`, `guidance` | Weights sum to 100. Immutable once published |
| **proposals** (cases) | `id`, `reference` (unique, nullable until submit), `applicant_id`, `challenge_version_id`, `status`, `return_stage?`, `current_version_id`, `draft_data jsonb`, `submitted_at`, `client_request_id` (unique), `readiness_stage` (concept/prototype/validated/pilot), `readiness_confirmed_by?` | Status changes only through RPC. Many proposals per applicant |
| **proposal_versions** | `proposal_id`, `version_no`, `data jsonb`, `submitted_at`, `responds_to_feedback_id?`, `change_note` (required from V2), `declaration_version`, `declaration_accepted_at` | **Append-only**. Unique (`proposal_id`, `version_no`) |
| **attachments** | `proposal_id`, `version_id?` (null while draft), `storage_path`, `filename`, `mime`, `size_bytes`, `sha256`, `uploaded_by` | Bound to a version on submit. Max 10 MB; PDF/DOCX/XLSX/PNG/JPG |
| **assignments** | `proposal_id`, `reviewer_id`, `assigned_by`, `due_at`, `declared_at?`, `has_conflict bool`, `confidentiality_accepted_at?`, `revoked_at`, `revoke_reason` | Unique active (`proposal_id`, `reviewer_id`). RLS grants proposal/file read **only when `declared_at` is set and there is no conflict** |
| **scorecards** | `assignment_id`, `version_id`, `rubric_version_id`, `status` (draft/submitted), `overall_comment`, `submitted_at` | Unique (`assignment_id`, `version_id`). Locked after submit |
| **scorecard_items** | `scorecard_id`, `criterion_id`, `score`, `reason` | Score within the criterion range. Reason is required |
| **feedback_requests** | `proposal_id`, `version_id`, `requested_by`, `from_stage`, `kind` (clarification/revision), `message`, `due_at`, `status` (open/answered/expired), `response_text?`, `responded_at?`, `answered_version_id?` | Visible to the applicant. Clarification → `response_text`. Revision → `answered_version_id` |
| **feedback_tasks** *(INN-02)* | `feedback_request_id`, `position`, `text`, `criterion_id?`, `applicant_status` (addressed/not_addressed), `applicant_explanation`, `addressed_in_version_id` | Tasks are written by staff when the request is created and are then immutable. The applicant status and explanation are set only through `submit_revision`, are required for every task, and are locked with the version |
| **task_verifications** *(INN-02)* | `feedback_task_id`, `assignment_id`, `version_id`, `result` (verified/not_verified), `note`, `verified_at` | One per task per assigned reviewer. Written through `verify_feedback_task`. Locked when the reviewer submits their V2 scorecard |
| **internal_notes** | `proposal_id`, `author_id`, `body` | Never readable by the applicant |
| **decisions** | `proposal_id`, `version_id`, `outcome` (approved/not_approved), `reason`, `recorded_by`, `published_at?` | Applicant reads only when `published_at` is not null. One active decision per case |
| **awards** | `proposal_id`, `decision_id`, `amount_minor int`, `currency` ('BWP'), `description`, `recorded_by` | Insert only if the decision is approved and published |
| **case_events** (status history) | `proposal_id`, `from_status`, `to_status`, `public_stage`, `actor_id`, `at` | Append-only. Feeds the timeline, Realtime and reports |
| **notifications** | `user_id`, `proposal_id?`, `type`, `title`, `body` (no proposal content), `read_at` | Own rows only. Realtime channel |
| **email_outbox** | `user_id`, `template`, `payload`, `status` (pending/sent/failed), `attempts`, `last_error` | Retry does not change case state |
| **audit_events** | `actor_id`, `actor_role`, `action`, `target_type`, `target_id`, `proposal_id?`, `metadata jsonb` (no passwords or proposal text), `at` | **Insert-only for everyone**, written inside RPCs |

### 4.2 Supporting entities (needed for P1 rubric items)

`content_pages` (FAQ, contacts, referral pathways, support, privacy, declaration text; `is_sample` flag) · `chat_sessions` (`applicant_id`, `consultant_id?`, `status` queued/active/closed/missed, `queued_at`, `accepted_at`, `closed_at`) · `chat_messages` · `service_calendar` (working days, hours, `demo_override`).

### 4.3 Case state machine

| Internal status | Applicant sees (public stage) | Entered by RPC |
|---|---|---|
| `draft` | Draft | `save_draft` |
| `submitted` | **Submission** — Submitted | `submit_proposal` |
| `in_evaluation` | **Review** — Under review | `record_screening(eligible)` |
| `action_required` (+`return_stage`) | **Feedback** — Action required | `request_revision` |
| `in_adjudication` | **Review** — Under adjudication | auto on quorum (D-11) or `return_stage` |
| `approved` / `not_approved` | **Approval** — shown only after publish | `record_decision` → `publish_decision` |
| `awarded` | **Award** — Awarded | `record_award` |
| `closed` (+reason) | Closed | `record_screening(ineligible)`, `close_case`, or after `not_approved` |

`submit_revision` moves `action_required` → `return_stage` (submitted / in_evaluation / in_adjudication).

### 4.4 Workflow RPC contract summary (full contracts follow in the next deliverable)

`save_draft` · `submit_proposal(client_request_id, declaration)` · `get_attachment_url` · `record_screening` · `assign_reviewers` · `declare_assignment(has_conflict)` · `save_scorecard` / `submit_scorecard` · `request_feedback(kind, tasks[])` · `respond_clarification(text)` (non-empty) · `submit_revision(change_note, task_responses[])` · `verify_feedback_task` · `set_readiness` / `confirm_readiness` *(optional)* · `record_decision` · `publish_decision` · `record_award` · `close_case` · `grant_role` / `revoke_role` · `mark_notifications_read`. Each RPC checks the permission and current status, writes `case_events` + `audit_events` + `notifications` in one transaction, and returns a typed result or a coded error (`FORBIDDEN`, `INVALID_STATE`, `VALIDATION`, `CASE_NOT_APPROVED`, `CHALLENGE_CLOSED`).

---

## 5. Phased implementation checklist

Tracks: **A** DB/RPC/RLS/Edge · **B** UI/Figma/components · **C** security tests/QA · **D** docs/demo/ops. Each slice is vertical: migration → RPC + RLS → pgTAP → UI → Playwright → artifact in `artifacts/phase-NN/`. Contracts are agreed before parallel work, there is one migration sequence, and the frontend uses mocks until the RPC lands.

### Phase 0 — Foundation (14–15 Nov) · exit artifact `phase-00`
- [ ] Close D-01, D-02, D-07, D-14, D-16. Record them in the decision register
- [ ] Repo (dated ≥ 13 Nov), protected `main`, CI: lint, type-check, Vitest, pgTAP, secret scan, `npm audit`
- [ ] Supabase project (Pro from judging), Vercel staging, `.env.example`, health check
- [ ] Migration 001: all core tables, RLS default-deny, audit/immutability triggers, `has_permission()`
- [ ] Seed script (fictional, `DEMO_PASSWORD` from env), one user per role
- [ ] API contract doc (RPC signatures, error codes) + generated TS types
- [ ] Figma: tokens, component kit, state kit, templates T01–T08
- [ ] Every member runs the same commit locally, with results recorded

### Slice 1 — Submit (15–16 Nov) · IAM-02/03, ADM-01, APP-01/02/03, SEC-01 · `phase-01`
- [ ] A: `save_draft`, `submit_proposal` (idempotent, declaration), storage policies, signed URLs, reference sequence
- [ ] B: T01–T05, applicant dashboard with multiple idea cards (T06), autosave + local backup, upload progress/retry, session-expiry warning, receipt details
- [ ] C: N1, N2, N9 + immutability test
- **Exit:** a verified applicant submits on staging and gets a reference; Applicant B cannot read it.

### Slice 2 — Screen & assign (16–17 Nov) · REV-01, IAM-01 · `phase-02`
- [ ] A: `record_screening`, `assign_reviewers`, `grant/revoke_role`, `case_events`
- [ ] B: T07 queue, T08 workspace (role tab gating), T10 dialogs, T12 users & roles
- [ ] C: N3, N7, N8

### Slice 3 — Evaluate (17–18 Nov) · REV-02, REV-03, NTF-01 · `phase-03`
- [ ] A: rubric versioning (1–5 anchors), `declare_assignment` + declaration-gated RLS, `save/submit_scorecard`, peer-visibility RLS, quorum trigger, Realtime publication
- [ ] B: T09 declaration gate + scorecard + panel (spread), T11 notifications, live dashboard updates
- [ ] C: N10, N11, peer-score isolation test, live-update leak test (second account gets no events)

### Slice 4 — Revise (18–19 Nov) · REV-04, APP-04, NTF-02 · `phase-04`
Slice 4 is where the core revision loop and INN-02 (the primary innovation differentiator) are built together. Build order inside the slice: (1) the plain revision loop working end to end, then (2) the roadmap tasks layered on top.
- [ ] A: `request_feedback` (clarification/revision + `feedback_tasks`), `respond_clarification` (required text), `submit_revision` (V2 + change note + required task responses + return stage), `verify_feedback_task`, `email_outbox` + Edge Function sender with retry
- [ ] B: T10 request dialog with a task builder; T08 Feedback tab (clarification reply, task list); T04 V2 mode with a task response panel and change note; T09 verification block; version picker; alert preferences
- [ ] C: V1 scores preserved after V2; old reviews tied to old version; clarification reply creates no new version and an empty reply is refused; V2 refused while any task lacks status/explanation; applicant cannot edit tasks or verifications; unassigned reviewer cannot verify

### Slice 5 — Decide & award (19 Nov) · DEC-01, DEC-02 · `phase-05`
- [ ] A: `record_decision`, `publish_decision`, `record_award`, `close_case`
- [ ] B: decision/award panels, five-stage timeline complete
- [ ] C: N4, N5, N6. **Full main journey passes on staging**

### Slice 6 — Report & oversight (19–21 Nov, parallel from 17 Nov) · `phase-06`
- [ ] RPT-01 reports + CSV + impact metrics (T13) · SEC-03 audit viewer (T14)
- [ ] CHT-01/02/03 chat + hours + stats (T15) · HLP-01, OPS-02 content pages (T03/T12)
- [ ] ARC-01: add role + criterion via settings, second challenge with its own form/rubric, OpenAPI export, scaling note

### Slice 7 — Innovation extras (inside the existing 20–21 Nov window, **only once Slices 1–5 pass on staging**) · `phase-07`
In this order, stopping wherever time runs out. The schedule is never extended for these (D-27):
- [ ] INN-01 V1/V2 field and attachment diff in T08, next to the roadmap tasks
- [ ] INN-03 completeness meter + field help in T04 (rule-based, no AI)
- [ ] INN-05 Next steps sample panel in the T08 Decision tab
- [ ] INN-04 *(optional)* readiness stage: **only after the SEC-02 negative suite passes on staging**

### Phase 7 — Harden & package (21–23 Nov) · SEC-02, QA-01, OPS-01, DOC-01/02, REL-01, DEM-01, SUB-01
- [ ] Full negative suite on the hosted build. Dependency scan recorded. Data-handling note
- [ ] Browser/device/keyboard test log, timed key tasks, unrun checks labelled
- [ ] Restore drill recorded. Hosting/region/cost note
- [ ] Proposal (≤ 10 pages), role manual + judge guide, README verified from a clean checkout
- [ ] Demo video (main + negative journey), source package (no credentials, licence list, ≤ 150 MB)
- [ ] **Code freeze 22 Nov 18:00. Upload by 12:00 CAT 23 Nov**

---

## 6. Blockers and open items

1. CEDA brand guidance (D-04). Building on placeholder tokens costs nothing to swap later, but the 2 pts depend on it.
2. Answers from the 16 Nov clarification: award authority, quorum, committee visibility, chat audience, regulatory contacts (D-05, D-06, D-08, D-13).
3. Team confirmation of the stack and of track ownership (D-01).
4. MFA vs judge access (D-07) needs team sign-off, because it departs from the security design.
5. CEDA wording for the applicant confidentiality/IP declaration (D-22). Placeholder text is used until then.
6. Research statistics must be checked against their sources before the proposal uses them (D-26).

**Schedule impact of v0.2:** none. The deadline and slice dates are unchanged (D-27). The required v0.2 additions (declarations, clarification reply, change note, receipt, seed changes, INN-02) fit inside their existing slices. Slice 7 is optional work inside the existing window. If anything slips, cut in this order: INN-04, INN-05, INN-03, INN-01. INN-02 falls back to a revision request with no tasks before the lifecycle is ever put at risk.

**Next deliverable (on approval):** Figma template specs (T01–T15), full RPC/API contracts with the permission matrix, acceptance tests, and the seed data file. No code until implementation is explicitly authorised.

---

## 7. Change log

### v0.1 → v0.2 change summary · 14 Nov 2026

**Why:** folds in the reference-platform analysis and the Botswana ecosystem research, approved with conditions on 14 Nov. **No schedule change** (D-27) and **no new screens** (D-28).

| Area | Change |
|---|---|
| **Decisions** | Added D-19 to D-30. D-19, D-20, D-21, D-24, D-25 and D-27 to D-30 confirmed on 14 Nov |
| **Figma templates** (all existing) | **T04** declaration step, V2 task-response panel + change note, completeness meter/help (INN-03) · **T05** fuller receipt · **T06** several idea cards per applicant · **T07** reviewer status groups · **T08** Feedback tab (clarification reply, task list), V1/V2 compare (INN-01), Next steps panel (INN-05) · **T09** declaration gate, 1–5 anchors, task verification block, roadmap summary in the panel · **T10** clarification/revision dialog with a task builder |
| **Database entities** | **New:** `feedback_tasks`, `task_verifications`. **Changed:** `assignments` (declaration fields + RLS gate), `rubric_criteria` (1–5, `anchors`), `proposal_versions` (`change_note`, declaration), `feedback_requests` (`response_text`, `responded_at`), `proposals` (optional `readiness_*`), `content_pages` (referrals, declaration text) |
| **Workflow functions** | **New:** `declare_assignment`, `respond_clarification`, `verify_feedback_task`, optional `set_readiness`/`confirm_readiness`. **Changed:** `submit_proposal` (declaration), `request_revision` → `request_feedback(kind, tasks[])`, `submit_revision` (change note + required task responses) |
| **Slices** | **S1** declaration, receipt, multiple ideas, low-bandwidth UX · **S3** declaration gate, 1–5 rubric, N10/N11 · **S4** clarification vs revision + **INN-02 built here** · **S6** impact metrics, second challenge/rubric · **S7 (new, optional, same window)** INN-01, INN-03, INN-05, then INN-04 only after SEC-02 passes |
| **Seed / demo** | Second proposal for Applicant A, second challenge with its own form and rubric, 1–5 anchors, sample referral pathways. Demo steps 3, 5, 7, 9–13 updated; negative tests N10/N11 added |
| **Deferred** | Decision-pack PDF, XLSX, co-submitters, pitch stage, score reopening, duplicate detection, SMS, Challenge Bank, matchmaking, validation toolkit, impact dashboard, internal track |

**v0.1 · 14 Nov 2026** — First blueprint: MVP scope, role-to-screen map, demo journey, data model, phased checklist.
