# CEDA Innovation Portal — Hackathon MVP Blueprint (v0.3)

**Status:** Draft for team review · 14 Nov 2026 · Planning only, no implementation is authorised yet
**Sources:** `requirements/Portal_Backlog.md` (10 Nov), *User requirements* (10 Nov), *User stories, tech stack and security design*, *Journey and data flow* (14 Nov), *What to adopt from each reference platform* (10 Nov), *Botswana Innovation Ecosystem research brief* (Nov 2026)
**Not yet read:** the whiteboard photos (the journey document is derived from them)
**Terminology:** this blueprint uses the backlog's terms, **challenge** and **case/proposal**. The reference analysis calls the same things "Programme" and "Idea".
**Team:** Sandra (UI/UX & Figma; unavailable from 21 Nov 2026, duties handed to ABM), Obvious (frontend), Stacey (backend & database), Sylvain (integration, testing & documentation), ABM (frontend, joined 21 Nov 2026; acting UI/UX & Figma lead from 21 Nov evening); see §7.
**Design source of truth:** the shared CEDA Figma project for visual design; this blueprint for functional behaviour (§8.1).
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
| D-01 | Stack | **CONFIRMED** (BCR-001 Part C, 22 Nov) | React 18 + TS + Vite + Tailwind + Radix; Supabase (Postgres, Auth, Storage, Realtime, Edge Fns). **Hosting: AWS Amplify instead of Vercel** (D-44, `docs/process/hosting-aws-amplify.md`). As built on `main`: React 18.3, TypeScript 5.8, Vite 6, Tailwind 3.4, Radix, supabase-js 2.119 | Next.js + Prisma; Django | Team already ships it. RLS puts the rules next to the data | Closed 22 Nov: matches `package.json`; staging is served by Amplify against the hosted Supabase project (#61) |
| D-02 | API style | **CONFIRMED** (BCR-001 Part C, 22 Nov) | **Reads** go through PostgREST with RLS. **All state changes** go through `SECURITY DEFINER` RPCs. Direct table writes are revoked | REST service layer | One transaction per transition, with audit included. Cannot be bypassed | Closed 22 Nov (Stacey): on hosted, 0 insert/update/delete/truncate grants to `anon` or `authenticated` on the 33 `public` tables, RLS on all 33; pinned by `010_security_privileges` (pgTAP, `main` and hosted); contract §1 |
| D-03 | Figma as UI source | CONFIRMED (brief; refined 14 Nov) | The shared CEDA Figma project is the source of truth for **visual** design; this blueprint is the source of truth for **functional** behaviour (D-32) | — | — | Inventory by 15 Nov (Sandra) |
| D-04 | Brand | OPEN | Neutral placeholder tokens, swapped when CEDA guidance arrives | — | Brand is worth 2 pts and is not yet supplied | Briefing / 16 Nov |
| D-05 | Award authority | OPEN | `award.record` permission granted to **Administrator** | Adjudicator | Separation of duties: the person who decides does not also pay | CEDA, 16 Nov |
| D-06 | Review quorum | OPEN | **2** submitted scorecards on the current version before adjudication | 3 | Matches the demo requirement | CEDA, 16 Nov |
| D-07 | Staff MFA vs judge access | **CONFIRMED** (BCR-001 Part C, 22 Nov) | MFA enforced for staff except seeded `is_demo` accounts, behind the `app_settings.demo_mfa_exempt` flag, which **must be off for any real use**. The judge guide states this | Enforce for all, which blocks judges | **Contradiction:** the security design requires MFA, but judges need frictionless staff log-ins | Closed 22 Nov: on hosted, all 7 staff roles have `requires_mfa`, the flag is on and all 13 accounts are seeded demo accounts; rule tested in `001_foundation` (pgTAP); judge guide and data-handling note state it; debt entry in `docs/design/design.md`. **Still to do:** list the flag in the release notes (BCR-001 Part C) |
| D-08 | External committee visibility | OPEN | Case status, stage and summary counts only. No proposal text, scores or notes | Full read | Least privilege | CEDA, 16 Nov |
| D-09 | Who can request revision | RECOMMENDED | Screening officer, assigned reviewer, adjudicator | Admin only | Matches the access table | — |
| D-10 | After V2 | RECOMMENDED | The case returns to the **requesting stage**. If that was evaluation, the same reviewers score V2 as new scorecards and V1 scorecards are kept | Skip re-scoring | Follows APP-04 and keeps V1 scores intact | — |
| D-11 | Transition to adjudication | RECOMMENDED | Automatic when quorum is met on the current version | Manual by admin | Fewer demo clicks, still a real transition with audit | — |
| D-12 | Reference format | RECOMMENDED | `CEDA-2026-NNNN` from a DB sequence | UUID-based | Readable for judges | — |
| D-13 | Chat audience | OPEN | Registered users only | Anonymous visitors | Simpler access control | CEDA, 16 Nov |
| D-14 | Region | **CONFIRMED** (BCR-001 Part C, 22 Nov) | **EU Central (Frankfurt), chosen; latency acceptable.** From Gaborone on mobile data: p50 263 ms, p95 315 ms (n = 30, 17 Nov). The Mumbai comparison is **Not run** | Mumbai (not measured) | No African Supabase region. The project already existed in EU Central, and ~0.3 s per round trip fits the D-16 workflow target | Closed 22 Nov: `artifacts/phase-00/region-latency.md` |
| D-15 | Retention (proposal note) | OPEN | Propose 5 years after closure for applicant records. Demo data is wiped after judging | — | Proposal only; no automation | Kickoff |
| D-16 | Response-time targets | **CONFIRMED** as targets (BCR-001 Part C, 22 Nov); measurement **Not run** | p95 targets: page ≤ 2 s, workflow action ≤ 1 s, file upload (5 MB) ≤ 5 s. Stated as *Proposed* in public docs until QA-01 measures them | — | Needed for QA-01 | Closed 22 Nov: values agreed. The QA-01 timed sample (claim C-18) has not run, so no document may say the targets are met |
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
| D-31 | Named ownership | **CONFIRMED** (14 Nov); ABM added 21 Nov; **Sandra's duties handed to ABM 21 Nov (team lead)** | Sandra UI/UX & Figma · Obvious frontend · Stacey backend & database · Sylvain integration, testing & documentation · ABM frontend (from 21 Nov: applicant screens to the approved frames, issue #100). **From 21 Nov evening, Sandra is unavailable and ABM is acting UI/UX & Figma lead:** the design decisions, the staging review of each screen against its frame, marking screens Approved, the final snapshots and design reconciliation, and the design owner's sign-off on change requests. ABM's design approvals count from the `ABM-IX` account only. Obvious stays primary UI backup. If Sandra returns, she resumes her role and reviews what was approved for her. Primary responsibility, not exclusive permission (§7) | Track letters A–D (v0.2) | Clear accountability for a team of five | ABM's first tasks: issue #100 |
| D-32 | Source-of-truth split | **CONFIRMED** (14 Nov) | Figma = visual design; blueprint + API contracts = functional behaviour; `02-figma-ui-ux-spec.md` = behavioural detail, with its placeholder tokens used only where Figma has none; CEDA brand guidance overrides both (§8.1) | Spec-only design | Preserves the existing Figma direction without losing approved behaviour | — |
| D-33 | Figma vs blueprint conflicts | **CONFIRMED** (14 Nov) | Logged in `handoff-notes.md`, resolved by the team; functionality follows the blueprint until resolved | Silent alignment | No silent functional change | — |
| D-34 | Shared Figma access | **CONFIRMED** requirement; setup OPEN | Team-controlled Figma project; ≥ 2 editors (Sandra, Obvious); ≥ 2 team-level owners; Stacey and Sylvain view/Dev Mode | Personal drafts | No single-account dependency | Sandra, 15 Nov (ABM for Sandra from 21 Nov) |
| D-35 | Figma MCP connection | **CONFIRMED: manual fallback** (BCR-001 Part C, 22 Nov) | **Manual exports** (§9.1). The official MCP server connected (16 Nov), but Sandra's Starter plan allows about 20 read calls a month and the canvas tools can't read the Figma Make file, so design reached the repo as exports: `Figma pdf/` (#110) and the dated snapshots (#101, #104) | Official Figma MCP server as the main route | Plan limits and the Make file type, both verified at setup | Closed 22 Nov: connection record in `docs/design/figma-handoff/screen-inventory.md` (PR #4). Owner ABM for Sandra (D-31) |
| D-36 | Handoff artefacts in the repo | **CONFIRMED** (14 Nov) | `docs/design/figma-handoff/` with inventory, status, tokens, components, navigation, notes and dated snapshots; capture on approval and daily 17:00 CAT; size budget ≤ 300 KB per snapshot, ≤ 25 MB total (proposed) | Live Figma only | Development never depends entirely on live Figma access | Sandra (ABM for Sandra from 21 Nov) |
| D-37 | Screen status and Ready for build | **CONFIRMED** (14 Nov) | Status vocabulary §8.5. A screen is buildable when at least Provisional with the slice's states, exported to the repo, and its RPCs are in the approved contract. Provisional builds are labelled | Wait for the full Figma file | Parallel development without design drift | — |
| D-38 | Branches, reviews, takeover | **CONFIRMED** (14 Nov); review-rule setup OPEN | One branch per task, PRs only, required reviewers per area (§7.3), takeover procedure §9.2, claims in `screen-status.md` | Direct pushes | No overwritten work | Sylvain, once GitHub usernames are known |
| D-39 | Existing Figma designs are read-only until approved | **CONFIRMED** (14 Nov) | No modification of existing Figma designs until Sandra has reviewed the inventory and the team has approved the proposed changes | — | Protects existing work | — |
| D-40 | Credentials | **CONFIRMED** (14 Nov) | Figma tokens, passwords and keys never in the repo, docs, evidence or chat logs; MCP tokens stay in each person's local configuration | — | Security | — |
| D-41 | Figma AI features | **RECOMMENDED** | Optional and never on the critical path; used only with fictional data, never with proposal content | Rely on AI credits | Credits can run out; D-25 forbids sending proposal data to external AI | — |
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

**Owners** (see §7): **Stacey** backend/database · **Obvious** frontend · **Sandra** UI/UX and Figma · **Sylvain** integration, testing and documentation. The named owner is the primary owner; anyone may contribute through an agreed task and a pull request.

Each slice is vertical: Figma screens *Ready for build* (§8.5) → migration → RPC + RLS → pgTAP → UI → Playwright → artifact in `artifacts/phase-NN/`. Contracts are agreed before parallel work. There is one migration sequence (owned by Stacey). The frontend uses mocks until the RPC lands. **Design-ready dates are the day before the slice starts**, so developers never wait for the whole Figma file.

### Phase 0 — Foundation (14–15 Nov) · exit artifact `phase-00`
- [x] **All:** close D-01, D-02, D-07, D-14, D-16, D-35. Record them in the decision register *(Sylvain records)*. Closed 22 Nov 2026 under BCR-001 Part C and recorded in §1.3, each with its evidence. Open follow-ups: the D-07 flag in the release notes; the D-14 Mumbai comparison and the D-16 measurement stay Not run
- [ ] **Sylvain:** repo rules (dated ≥ 13 Nov), protected `main`, review rules (D-38), CI: lint, type-check, Vitest, pgTAP, secret scan, `npm audit`
- [ ] **Stacey + Sylvain:** Supabase project (Pro from judging), Vercel staging, `.env.example`, health check
- [ ] **Stacey:** Migration 001: all core tables, RLS default-deny, audit/immutability triggers, `has_permission()`
- [ ] **Stacey:** Seed script (fictional, `DEMO_PASSWORD` from env), one user per role
- [ ] **Stacey (author) + Obvious (review):** API contract doc (RPC signatures, error codes) + generated TS types
- [ ] **Sandra:** Figma MCP connection verified (D-35); shared team project and access confirmed (D-34); **inventory, T01–T15 mapping, gap list and prioritised design backlog** (§8.2) *(by 15 Nov 18:00)*
- [ ] **Sandra:** `docs/design/figma-handoff/` scaffolded with the first snapshot of existing approved screens (§8.6) *(by 15 Nov 18:00)*
- [ ] **Obvious:** tokens from Figma → Tailwind theme; shell + navigation skeleton; state kit components
- [ ] **All:** every member runs the same commit locally, with results recorded

### Slice 1 — Submit (15–16 Nov) · IAM-02/03, ADM-01, APP-01/02/03, SEC-01 · `phase-01`
- [ ] **Sandra:** T01–T05 and applicant T06 *Ready for build* by 15 Nov
- [ ] **Stacey:** `save_draft`, `submit_proposal` (idempotent, declaration), storage policies, signed URLs, reference sequence, pgTAP
- [ ] **Obvious:** T01–T05, applicant dashboard with multiple idea cards (T06), autosave + local backup, upload progress/retry, session-expiry warning, receipt details
- [ ] **Sylvain:** Playwright N1, N2, N9 + immutability test; evidence `phase-01`
- **Exit:** a verified applicant submits on staging and gets a reference; Applicant B cannot read it.

### Slice 2 — Screen & assign (16–17 Nov) · REV-01, IAM-01 · `phase-02`
- [ ] **Sandra:** T07, T08 (staff tabs), T10, T12 users & roles *Ready for build* by 16 Nov
- [ ] **Stacey:** `record_screening`, `assign_reviewers`, `grant/revoke_role`, `case_events`, pgTAP
- [ ] **Obvious:** T07 queue, T08 workspace (role tab gating), T10 dialogs, T12 users & roles
- [ ] **Sylvain:** N3, N7, N8; evidence `phase-02`

### Slice 3 — Evaluate (17–18 Nov) · REV-02, REV-03, NTF-01 · `phase-03`
- [ ] **Sandra:** T09 (gate, scorecard, panel), T11 *Ready for build* by 17 Nov
- [ ] **Stacey:** rubric versioning (1–5 anchors), `declare_assignment` + declaration-gated RLS, `save/submit_scorecard`, peer-visibility RLS, quorum trigger, Realtime publication, pgTAP
- [ ] **Obvious:** T09 declaration gate + scorecard + panel (spread), T11 notifications, live dashboard updates
- [ ] **Sylvain:** N10, N11, peer-score isolation test, live-update leak test (second account gets no events); evidence `phase-03`

### Slice 4 — Revise (18–19 Nov) · REV-04, APP-04, NTF-02 · `phase-04`
Slice 4 is where the core revision loop and INN-02 (the primary innovation differentiator) are built together. Build order inside the slice: (1) the plain revision loop working end to end, then (2) the roadmap tasks layered on top.
- [ ] **Sandra:** T04 V2 mode, T08 Feedback tab, T10 task builder, T09 verification block *Ready for build* by 17 Nov (needed early because INN-02 is the demo's differentiator)
- [ ] **Stacey:** `request_feedback` (clarification/revision + `feedback_tasks`), `respond_clarification` (required text), `submit_revision` (V2 + change note + required task responses + return stage), `verify_feedback_task`, `email_outbox` + Edge Function sender with retry, pgTAP
- [ ] **Obvious:** T10 request dialog with a task builder; T08 Feedback tab (clarification reply, task list); T04 V2 mode with a task response panel and change note; T09 verification block; version picker; alert preferences
- [ ] **Sylvain:** V1 scores preserved after V2; old reviews tied to old version; clarification reply creates no new version and an empty reply is refused; V2 refused while any task lacks status/explanation; applicant cannot edit tasks or verifications; unassigned reviewer cannot verify; evidence `phase-04`

### Slice 5 — Decide & award (19 Nov) · DEC-01, DEC-02 · `phase-05`
- [ ] **Sandra:** decision/award panels and the complete timeline *Ready for build* by 18 Nov
- [ ] **Stacey:** `record_decision`, `publish_decision`, `record_award`, `close_case`, pgTAP
- [ ] **Obvious:** decision/award panels, five-stage timeline complete
- [ ] **Sylvain:** N4, N5, N6. **Full main journey passes on staging**; evidence `phase-05`

### Slice 6 — Report & oversight (19–21 Nov, parallel from 17 Nov) · `phase-06`
- [ ] **Sandra:** T13, T14, T15, T03 variants *Ready for build* by 18 Nov
- [ ] **Stacey:** report views/RPCs, audit query RPC, chat tables/policies/hours check and statistics query, ARC-01: add role + criterion via settings, second challenge with its own form/rubric
- [ ] **Obvious:** RPT-01 reports + CSV + impact metrics (T13) · SEC-03 audit viewer (T14) · CHT-01/02/03 chat + hours + stats (T15) · HLP-01, OPS-02 content pages (T03/T12)
- [ ] **Sylvain:** reconcile report counts with seed data; OpenAPI export and scaling note (ARC-01); evidence `phase-06`

### Slice 7 — Innovation extras (inside the existing 20–21 Nov window, **only once Slices 1–5 pass on staging**) · `phase-07`
In this order, stopping wherever time runs out. The schedule is never extended for these (D-27). **Owner: Obvious**, with Stacey for any RPC and Sandra for any visual detail:
- [ ] INN-01 V1/V2 field and attachment diff in T08, next to the roadmap tasks
- [ ] INN-03 completeness meter + field help in T04 (rule-based, no AI)
- [ ] INN-05 Next steps sample panel in the T08 Decision tab
- [ ] INN-04 *(optional)* readiness stage: **only after the SEC-02 negative suite passes on staging**

### Phase 7 — Harden & package (21–23 Nov) · SEC-02, QA-01, OPS-01, DOC-01/02, REL-01, DEM-01, SUB-01 · **coordinator: Sylvain**
- [ ] **Sylvain + Stacey:** full negative suite on the hosted build. Dependency scan recorded. Data-handling note
- [ ] **Sylvain + Obvious:** browser/device/keyboard test log, timed key tasks, unrun checks labelled
- [ ] **Stacey + Sylvain:** restore drill recorded. Hosting/region/cost note
- [ ] **Sandra:** final approved snapshot set and design reconciliation (every implemented screen matches its approved snapshot, or the difference is logged)
- [ ] **Sylvain (all contribute):** proposal (≤ 10 pages), role manual + judge guide, README verified from a clean checkout
- [ ] **Sylvain:** demo video (main + negative journey), source package (no credentials, licence list, ≤ 150 MB)
- [ ] **Code freeze 22 Nov 18:00. Upload by 12:00 CAT 23 Nov**

---

## 6. Blockers and open items

1. CEDA brand guidance (D-04). If the existing Figma project already carries CEDA branding, Sandra's inventory records it and it replaces the placeholder tokens.
2. Answers from the 16 Nov clarification: award authority, quorum, committee visibility, chat audience, regulatory contacts (D-05, D-06, D-08, D-13).
3. Team confirmation of the stack (D-01). Ownership is now assigned (D-31).
4. MFA vs judge access (D-07) needs team sign-off, because it departs from the security design.
5. CEDA wording for the applicant confidentiality/IP declaration (D-22). Placeholder text is used until then.
6. Research statistics must be checked against their sources before the proposal uses them (D-26).
7. **Figma MCP connection, seat type and rate limits not yet verified** (D-35). The existing Figma file has **not yet been inventoried**; this blueprint has no knowledge of its frames, so the T01–T15 mapping is pending Sandra's inventory.
8. GitHub usernames for Sandra, Stacey and Obvious are needed to set up review rules (D-38).

**Schedule impact of v0.2 and v0.3:** none. The deadline, slice dates and code freeze are unchanged (D-27). The v0.3 additions are process and ownership; their only new work is Sandra's inventory and handoff artefacts, which run in Phase 0 alongside the existing tasks. If anything slips, cut in this order: INN-04, INN-05, INN-03, INN-01. INN-02 falls back to a revision request with no tasks before the lifecycle is ever put at risk.

**Next deliverable (on approval):** Sandra's Figma inventory and design backlog (§8.2), then the full RPC/API contracts with the permission matrix, acceptance tests and the seed data file. No code until implementation is explicitly authorised.

---

## 7. Team and ownership

### 7.1 Named owners

| Person | Role | Primary responsibilities |
|---|---|---|
| **Sandra** | UI/UX & Figma Integration Lead (**unavailable from 21 Nov; duties handed to ABM**, D-31) | Connect the team's AI coding assistant to the shared Figma project through the official Figma MCP server; inventory existing designs; map frames to T01–T15; identify completed, incomplete and missing screens; preserve the existing visual direction, branding and components; design missing dashboards and interfaces within MVP scope; own design tokens, typography, spacing, components and responsive rules; maintain the screen inventory and handoff docs; export approved snapshots and assets to the repo; coordinate UI changes with developers to prevent design drift |
| **Obvious** | Frontend & UI Implementation Lead | Implement approved Figma designs in React and TypeScript; maintain reusable components and navigation; implement responsive layouts and every interface state; integrate screens with approved backend operations; **primary UI backup when Sandra cannot access Figma** |
| **Stacey** | Backend & Database Lead | Supabase schema, authentication and role-based permissions; guarded workflow operations (screening, evaluation, feedback, resubmission, adjudication, award); database integrity, access controls and backend tests (pgTAP); coordinating API contracts with the frontend |
| **Sylvain** | Integration, Testing & Documentation Lead | Integration across frontend, backend and Figma specs; the traceability matrix and this implementation checklist; end-to-end demo scenarios; testing coordination, documentation and evidence; demo readiness, deployment preparation and submission documents; handovers; UI help when required |
| **ABM** (from 21 Nov) | Frontend Developer; **acting UI/UX & Figma Lead** from 21 Nov evening (D-31) | **Acting for Sandra:** answer the open design decisions; review each finished screen on staging against its frame and mark it Approved in `screen-status.md`, or log the difference; keep the handoff docs and final snapshots; sign change requests as design owner. **As before:** implement screens to the approved Figma frames (first: sign in, create account, applicant case view, the five-step stepper; issue #100); use the shared components in `src/components/` and route any change to them through Obvious's review; keep each screen's unit tests in step with its wording; check each screen at 360 and 1280 px, keyboard only |

From 21 Nov evening the matrix shows ABM in Sandra's former design column (D-31); Sandra's column is empty while she is unavailable.

These assignments define **primary responsibility, not exclusive permission**. Anyone may take an outstanding task once it is agreed in the checklist and delivered through a pull request.

### 7.2 Developer responsibility matrix

Key: **P** primary owner · **B** backup owner · **R** required reviewer · **C** contributes.

| Area | Sandra | Obvious | Stacey | Sylvain | ABM |
|---|---|---|---|---|---|
| Figma inventory, frame mapping, design backlog | — | C | — | R (scope check) | P |
| Missing screens and dashboards in Figma | — | B | — | R (scope check) | P |
| Design tokens, components, responsive rules (Figma) | — | B | — | — | P |
| Handoff artefacts `docs/design/figma-handoff/` | — | B | — | R | P |
| React shell, navigation, shared components `src/components/` | — | P | — | B | C, R (visual) |
| Screen implementation and UI states | — | P | — | C | C, R (visual QA) |
| Frontend integration with RPCs `src/lib/api/` | — | P | R | C | C |
| Supabase schema, migrations, RLS, RPCs, Edge Functions | — | — | P | B | — |
| API contracts and permission matrix | — | R | P | C | — |
| Backend tests (pgTAP) | — | — | P | C | — |
| End-to-end and negative tests (Playwright) | — | C | C | P | C |
| Traceability matrix, implementation checklist, decision register entries | C | C | C | P | — |
| Evidence artifacts `artifacts/phase-NN/` | C | C | C | P | — |
| Deployment preparation (Vercel, Supabase environments) | — | C | P (Supabase) | P (release) | — |
| README, user manual, judge guide, technical proposal | C | C | C | P | — |
| Demo script and video | C | C | C | P | — |

### 7.3 Parallel development rules

- **Work starts per screen, not per file.** A screen enters implementation when it is *Ready for build* (§8.5). The rest of the Figma file does not need to be finished.
- **Stable contracts first.** The frontend builds against the approved API contract and generated types, using mocks until the RPC lands. A contract change needs Stacey and Obvious to agree, and Sylvain records it.
- **Provisional is visible.** A screen built from a *Provisional* design carries a `provisional` label in `screen-status.md` and a code comment linking to it, and must be revisited when the design is approved.
- **Dependencies are tracked** in the checklist (§5) and `screen-status.md`: each screen lists its RPCs and its design status.
- **One branch per task.** Naming: `ui/<template>-<topic>`, `db/<topic>`, `test/<topic>`, `docs/<topic>`. Small pull requests; nothing pushed directly to `main`.
- **One migration sequence** (Stacey). Others propose schema changes through Stacey rather than adding migrations in parallel.
- **New members start on contained screens.** ABM (from 21 Nov) builds whole screens in `src/pages/` against approved frames; changes to shared components go through Obvious (below).
- **Shared code has a reviewer.** Changes to `src/components/` need Obvious's review; `supabase/migrations/` needs Stacey's; `docs/design/figma-handoff/` needs Sandra's; `docs/blueprint/` needs Sylvain's plus one other member (D-38).

---

## 8. Figma integration and UI/UX design process

### 8.1 Source-of-truth split

| Subject | Source of truth | Notes |
|---|---|---|
| Visual design: layout, colour, typography, spacing, components, imagery, responsive behaviour | **The shared CEDA Figma project** | Approved frames only. Provisional frames are guidance |
| Functional behaviour: what each screen does, which role sees what, workflow states, rules, actions, error codes | **This blueprint** + the API contracts | Includes §2 role-to-screen map and §4 state machine |
| Behavioural detail per template: states, permissions per tab, action dialogs, status wording, accessibility checklist | `02-figma-ui-ux-spec.md` | Its **placeholder tokens apply only where Figma has no existing token**. Where Figma defines a token or component, Figma wins |
| CEDA brand guidance | CEDA, when received (D-04) | Overrides both placeholder tokens and Figma visuals; Sandra updates Figma first |

**Conflicts:** when Figma and the blueprint disagree, the discrepancy goes into `handoff-notes.md` (screen, frame link, what differs, proposed resolution). Functionality follows the blueprint until the team decides. Nobody silently changes functionality to match a design, or a design to match code (D-33).

### 8.2 Figma integration strategy (Sandra, Phase 0)

1. **Connect:** establish the official Figma MCP connection for the team's AI coding assistant (D-35). Record which connection mode works with the team's Figma plan and seats.
2. **Inspect:** list the design files, pages and frames available in the shared project.
3. **Catalogue:** record every existing screen and component in `screen-inventory.md`: file URL, page, frame name and node ID, description.
4. **Map:** map each frame to its T01–T15 template and role variant (§2). Frames that map to no template are listed as *unmapped* and reviewed for scope; they are not built by default.
5. **Gap analysis:** list missing screens, interactions, role variants and responsive states (360 px and 1280 px) per template.
6. **Backlog:** create a prioritised design backlog in `screen-status.md`, ordered by the slice dates in §5.
7. **Extend the design system:** add only the tokens and components the missing dashboards need, reusing existing ones first.
8. **Handoff:** prepare implementation-ready assets and specifications (§8.6).

**Read-only first (D-39):** steps 1–6 only read Figma. **No existing Figma design is modified until Sandra has reviewed the inventory and the team has approved the proposed changes.**

### 8.3 Shared Figma access

- The design file lives in a **team-controlled Figma team/project**, not only in Sandra's personal drafts (D-34). If it is currently in personal drafts, Sandra moves it to the team project after the inventory, with the team's agreement.
- **At least two editors:** Sandra (primary) and Obvious (backup). Stacey and Sylvain have view or Dev Mode access.
- Team-level ownership is held by at least two members, so no single account loss blocks access.
- Each person connects the MCP server with **their own** Figma login. Access tokens stay in each person's local tool configuration and **never enter the repository**, chat logs or evidence (D-40).
- `screen-inventory.md` records the file URLs, frame identifiers, required permissions per person and the MCP connection instructions (without credentials).

### 8.4 UI/UX design process

| Step | Who | Output |
|---|---|---|
| 1 Inventory and map | ABM (for Sandra, D-31) | `screen-inventory.md` |
| 2 Gap list and backlog | ABM, scope check by Sylvain | `screen-status.md` (prioritised by slice date) |
| 3 Design missing screens/states | ABM (Obvious as backup) | Frames marked *Provisional* |
| 4 Design review | ABM + Obvious (buildability) + Sylvain (blueprint conformance) | Frames marked *Approved*, or changes requested |
| 5 Snapshot and handoff | ABM | Approved snapshot + spec in `figma-handoff/` via pull request |
| 6 Implementation | Obvious (or assigned developer) | Pull request referencing the snapshot version |
| 7 Visual QA | ABM | Implementation matches the snapshot, or the difference is logged |
| 8 Reconcile | ABM | Any change made during implementation is reflected back in Figma |

### 8.5 Screen inventory and status tracking

**Status vocabulary** (used in `screen-status.md` for each template × role variant × breakpoint):

| Status | Meaning |
|---|---|
| Not started | No frame exists |
| In design | Frame being drawn; claimed by a named designer |
| Provisional | Drawn but not reviewed; may be built with a `provisional` label |
| In review | Awaiting the step 4 design review |
| **Approved** | Reviewed; snapshot exported; becomes the visual source of truth |
| Implemented | Built in code (link to PR) |
| Verified | Visual QA passed and acceptance checks have evidence |
| Blocked | Cannot proceed; blocker and date recorded |

**Ready for build (D-37):** a screen may enter implementation when (a) its design is at least *Provisional* with the states needed for the current slice, (b) its approved snapshot or provisional export is in the repo, and (c) the RPCs it calls are in the approved API contract.

**`screen-status.md` columns:** Template · Variant/role · Breakpoint · Figma frame (URL + node ID) · Design status · Designer · Last snapshot date · Developer · Code status (PR) · Depends on (RPCs) · Notes/discrepancies.

### 8.6 Design-to-code handoff

```text
docs/design/figma-handoff/
├── screen-inventory.md        # files, pages, frames, node IDs, template mapping, access and MCP instructions (no credentials)
├── screen-status.md           # status table (§8.5), claims, owners, blockers
├── design-tokens.md           # colour, type, spacing, radius, elevation, breakpoints; Figma variable names → code token names
├── component-specifications.md# each component: variants, states, props, usage, Figma link
├── navigation-map.md          # shells, nav items per role, routes per template
├── handoff-notes.md           # per handoff: what changed, discrepancies with the blueprint, open questions
└── snapshots/
    └── T08-case-workspace__reviewer__desktop__2026-11-17.png
```

- **Cadence:** a snapshot is exported **whenever a screen is approved**, plus a **daily capture at 17:00 CAT** of every screen changed that day (Sandra; Obvious as backup).
- **Versioning:** the snapshot file name carries the date; `screen-status.md` records which snapshot is current. Older snapshots are kept until the screen is *Verified*.
- **Size:** compressed PNG or WebP, one per template × variant × breakpoint, aimed at **≤ 300 KB each and ≤ 25 MB in total** (proposed), to stay well inside the 150 MB submission limit. No raw `.fig` files and no large exports in git.
- **Tokens in code:** design tokens are exported once to `tokens.json` → Tailwind theme, so implementation never depends on live Figma access for colours, type or spacing.
- **Updates go through pull requests** reviewed by Sandra (or Obvious as backup).
- **No credentials** in any handoff file (D-40).

---

## 9. Continuity: Figma access fallback and developer takeover

### 9.1 Credit, quota and access fallback procedure

Principle: **the remaining development work must never depend entirely on live Figma access.** The repo handoff artefacts (§8.6) are always enough to continue building.

| Situation | Immediate action | Continue with | Owner |
|---|---|---|---|
| **Figma AI credits exhausted** | Stop using Figma AI features; design continues manually | Manual design with existing components; AI features are optional and never on the critical path (D-41) | Sandra |
| **Figma MCP rate limit reached** | Pause MCP reads; batch the remaining reads into one session later | Latest snapshots, `design-tokens.md`, `component-specifications.md` | Sandra / current developer |
| **Figma or MCP service temporarily unavailable** | Log the outage time in `handoff-notes.md` | Repo handoff artefacts; reconcile once service returns | Whoever is affected |
| **Figma permission restriction** (seat, file access) | Ask a team-level owner to restore access; use the second editor | Second editor (Obvious) or view-only exports | Sandra → Obvious |
| **Sandra absent or delayed** | Start the takeover procedure (§9.2) for screens due within 24 h | Approved snapshots + tokens + components | Sylvain assigns; Obvious is first backup |
| **Another developer must continue UI work** | Claim the screen in `screen-status.md` | Takeover procedure (§9.2) | The developer taking over |

**Preventive measures:** daily 17:00 CAT snapshot; tokens exported to code in Phase 0; two editors and two team-level owners; MCP use limited to reads that change a decision (no repeated full-file scans); a screen is not marked *Approved* until its snapshot is in the repo.

### 9.2 Safe developer takeover procedure

1. **Record** the current design status and the blocker in `screen-status.md` (status *Blocked*, date, reason).
2. **Assign** the outstanding screen to an available developer. Sylvain assigns; Obvious is the default backup.
3. **Review** the latest approved (or provisional) snapshot in `figma-handoff/snapshots/`.
4. **Reuse** existing design tokens and components; do not add new ones without noting them in `handoff-notes.md`.
5. **Continue** implementation without redesigning approved interfaces. Missing details follow `02-figma-ui-ux-spec.md` and existing patterns, and are labelled *Provisional*.
6. **Branch:** a separate Git branch for the assigned work (`ui/<template>-<topic>`).
7. **Pull request** for every change; no direct pushes.
8. **Review** is required before merging changes to shared UI components (Obvious, or Sandra for visual changes).
9. **Update** `screen-status.md` and `handoff-notes.md`, recording who took over and what was assumed.
10. **Reconcile** with Figma when access returns: Sandra (or the backup editor) updates the frames to match approved implementation decisions, or logs the remaining differences.

**Avoiding conflicting edits:**
- **One claimant per Figma frame and per shared component at a time.** Claim it in `screen-status.md` before editing.
- In Figma, work in a page or frame copy named `WIP — <name> — <date>` and merge into the main frame only after review.
- Never overwrite another person's frame, branch or pull request. Ask the claimant or Sylvain first.

---

## 10. Documentation and evidence requirements

| Document | Location | Owner | Maintained under | Updated when |
|---|---|---|---|---|
| MVP blueprint + decision register | `docs/blueprint/01-mvp-blueprint.md` | Sylvain (team approves decisions) | project-blueprint-builder | A decision, scope, ownership or plan changes |
| UI/UX behavioural specification | `docs/blueprint/02-figma-ui-ux-spec.md` | Sandra + Sylvain | project-blueprint-builder | Template behaviour or states change |
| API contracts + permission matrix | `docs/blueprint/03-api-contracts-and-permissions.md` (next) | Stacey | blueprint (authoring), evidence-led (kept in sync with code) | An RPC, error code, permission or RLS rule changes |
| Figma handoff set | `docs/design/figma-handoff/` | Sandra | project-blueprint-builder | A screen is approved; daily 17:00 CAT; on takeover |
| Design record (failure cuts, traceability, debt, risk, release recommendation) | `docs/design/design.md` | Sylvain | evidence-led-system-builder | Architecture, risk or verification status changes |
| ADRs | `docs/adr/ADR-NNN-*.md` | Author of the decision | evidence-led-system-builder | A significant technical choice is made |
| Test plan, claim register | `docs/testing/` | Sylvain (Stacey for pgTAP) | evidence-led-system-builder | Checks are added or run |
| Evidence | `artifacts/phase-NN/` | Sylvain | evidence-led-system-builder | Every recorded run |
| README, runbook, CHANGELOG | repo root, `docs/runbook.md` | Sylvain | evidence-led-system-builder | Setup, configuration or a merged change |
| Proposal and manual inputs | `docs/submission/evidence-log.md` | Sylvain | evidence-led-system-builder | A claim becomes evidenced |

**Rules:**
- Documentation stays aligned with the actual implementation; a pull request that changes behaviour updates its documents.
- Nothing is called implemented or tested without evidence. Use the status words Passed, Failed, Not run, Proposed, Implemented — not verified, Simulated, Deferred.
- No credentials, tokens or personal data in any document.
- The AI coding assistant's product name is never written in any repository file, commit message, branch name or pull request (standing project-owner instruction).

**Skills split:** **project-blueprint-builder** manages scope and requirements, Figma screen mapping, user journeys and feature specifications, task ownership and development decisions. **evidence-led-system-builder** manages implementation quality, tests and verification, security and permission enforcement, evidence collection and technical documentation updates. Both share the same authorisation boundary.

---

## 11. Risks and mitigations

| # | Risk | Likelihood / impact | Mitigation | Owner |
|---|---|---|---|---|
| R-01 | Figma file is only reachable through one personal account | Medium / High | Team-owned project, two editors, two team-level owners (D-34) | Sandra |
| R-02 | Figma MCP unavailable, rate-limited or not supported by the team's seat type | Medium / Medium | Verify in Phase 0 (D-35); repo handoff artefacts; batch reads (§9.1) | Sandra |
| R-03 | Figma AI credits run out | Medium / Low | AI features off the critical path (D-41) | Sandra |
| R-04 | Sandra unavailable near a slice's design-ready date | Medium / High | Daily snapshots, Obvious as backup, takeover procedure (§9.2) | Sylvain |
| R-05 | Existing Figma designs conflict with blueprint functionality | Medium / Medium | Source-of-truth split and discrepancy log (§8.1, D-33) | Sandra + Sylvain |
| R-06 | Design drift between Figma and code | High / Medium | Snapshot-referenced PRs, visual QA, reconcile step (§8.4) | Sandra + Obvious |
| R-07 | Two people edit the same frame or shared component | Medium / Medium | Claims in `screen-status.md`, WIP copies, required reviews (§9.2) | Sylvain |
| R-08 | Frontend blocked waiting for the backend | Medium / High | Contracts first, generated types, mocks (§7.3) | Stacey + Obvious |
| R-09 | Existing Figma designs cover screens outside the MVP scope | Medium / Low | Unmapped frames are listed and not built by default (§8.2) | Sandra + Sylvain |
| R-10 | Credentials leak into the repo | Low / High | Secret scanning in CI, no-credentials rule (D-40) | Sylvain |
| R-11 | Confidential content entered into an external AI feature | Low / High | Designs use fictional data only; no proposal data to external AI (D-25, D-41) | All |
| R-12 | Large binary exports push the source package over 150 MB | Low / Medium | Snapshot size budget, no `.fig` in git (§8.6) | Sandra + Sylvain |

---

## 12. Change log

### 22 Nov 2026 · Phase 0 decisions closed (D-01, D-02, D-07, D-14, D-16, D-35)

The six Phase 0 decisions in BCR-001 Part C move to CONFIRMED with the results agreed there. Obvious signed on 16 Nov, Stacey on 18 Nov, and Sylvain and ABM (for Sandra, D-31) in BCR-001 on 22 Nov. Each register row was checked against the build on 22 Nov:
- D-01: the stack on `main`, with Amplify hosting (D-44);
- D-02: no browser write grants on the hosted database;
- D-07: the `demo_mfa_exempt` flag on hosted;
- D-14: the latency record;
- D-16: values agreed, not yet measured;
- D-35: the manual fallback recorded in the screen inventory.

Nothing in scope or schedule changes.

### 21 Nov 2026 · Sandra's duties handed to ABM

Sandra is unavailable and her design tasks were not moving two days before the code freeze. The team lead handed her duties to ABM as acting UI/UX & Figma lead (D-31, §7.1, §7.2, §8.4; owners of D-34–D-36). Nothing in scope or schedule changes. The tracker moves Sandra's open tasks to ABM; her finished work stays credited to her.

### v0.2 → v0.3 change summary · 14 Nov 2026

**Why:** formalise the four-person team, make the shared Figma project the visual source of truth, and add a continuity plan so UI work never depends entirely on live Figma access. **All v0.2 scope, requirements, priorities, workflows and constraints are unchanged.** Deadline and code freeze unchanged.

| Area | v0.2 | v0.3 |
|---|---|---|
| Team | Tracks A–D, no names | Named owners and a responsibility matrix (§7, D-31) |
| Design source of truth | Figma spec doc with placeholder tokens | Figma = visual, blueprint = functional, spec = behavioural detail; conflicts logged (§8.1, D-32, D-33) |
| Figma integration | Not covered | MCP connection, read-only inventory and T01–T15 mapping first (§8.2, D-35, D-39) |
| Access | Not covered | Team-owned project, two editors, two owners, no credentials in repo (§8.3, D-34, D-40) |
| Design process | Not covered | 8-step process, status vocabulary, Ready-for-build rule (§8.4–8.5, D-37) |
| Handoff | Screenshots mentioned in the spec | `docs/design/figma-handoff/` set, snapshot cadence and size budget (§8.6, D-36) |
| Continuity | Not covered | Credit/quota/access fallback table and 10-step takeover procedure (§9, D-41) |
| Parallel development | Contracts + mocks | Plus per-screen readiness, provisional labels, branch naming, required reviewers (§7.3, D-38) |
| Checklist | Tasks per track | Tasks per named owner, with design-ready dates the day before each slice (§5) |
| Documentation | Doc set implied | Owners per document and the skills split (§10) |
| Risks | Blockers list only | Risk register R-01 to R-12 (§11); blockers 7–8 added (§6) |
| Section numbering | §1–§7 | §1–§6 unchanged; new §7–§11; change log moves to §12 |

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
