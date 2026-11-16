# Design record

**Owner:** Sylvain · **Status:** Draft skeleton · 15 Nov 2026 · Maintained under the evidence-led-system-builder skill
This file holds only what the blueprint does not: ownership, traceability, failure cuts, debt, risk and the release recommendation. Scope, the data model and the state machine stay in `docs/blueprint/01-mvp-blueprint.md` (§1, §4). Nothing here is implemented yet; every status is **Not run** unless a run record says otherwise.

---

## 1. Ownership of records

Who is the single authority for each record (evidence skill, principle 10). Everyone else only reads.

| Record | Authoritative owner | Who may change it | Restriction |
|---|---|---|---|
| `proposals.status`, `return_stage` | Workflow RPCs | Only the RPC for that transition (§4.3) | Conditional update `WHERE status = $expected`; zero rows → `INVALID_STATE` |
| Public stage shown to the applicant | Derived from `status` + `case_events` | Nobody (computed) | Never stored separately |
| `proposal_versions` | `submit_proposal`, `submit_revision` | Insert only | Append-only; trigger refuses update/delete |
| `scorecards`, `scorecard_items` | `save_scorecard`, `submit_scorecard` | The assigned, declared reviewer | Locked after submit |
| `task_verifications` | `verify_feedback_task` | The assigned, declared reviewer | Locked with the V2 scorecard |
| `feedback_tasks` text | `request_feedback` | Staff when creating the request | Immutable afterwards |
| `feedback_tasks` applicant status | `submit_revision` | The owning applicant | Locked with the version |
| `decisions` | `record_decision`, `publish_decision` | Adjudicator | Applicant reads only after `published_at` is set |
| `awards` | `record_award` | Administrator (D-05) | Only on an approved, published decision |
| `user_roles` | `grant_role`, `revoke_role` | Administrator | `granted_by ≠ user_id` |
| `audit_events`, `case_events` | Every workflow RPC | Insert only, inside the RPC | No update/delete for any role |
| `email_outbox.status` | Email relay Edge Function | The relay only | Single retry owner |

## 2. Traceability matrix

Backlog ID → capability → slice → RPC/mechanism → checks → demo step → evidence. The backlog file itself (`requirements/Portal_Backlog.md`) is **not in the repository yet**. Capabilities below come from blueprint §1.2; the exact requirement wording is added once the backlog is committed.

| Backlog | Capability (blueprint §1.2) | Class | Slice | RPC / mechanism | Checks (see `docs/testing/test-plan.md`) | Demo step | Evidence | Status |
|---|---|---|---|---|---|---|---|---|
| FND-01 | Contracts, scaffold, staging | Full | P0 | CI, migrations, seed, `health()` | CI green on `main`; same-commit check ×4 | — | phase-00 | Not run |
| UX-01 | Role navigation, responsive components, low-bandwidth | Full | S1+ | Shells, state kit | QA-01 viewports; offline draft backup; upload retry; session-expiry warning | 2 | phase-01, P7 | Not run |
| IAM-01 | Staff roles, invite, grant/revoke | Simplified | S2 | `grant_role`, `revoke_role` | pgTAP self-grant refused + audited; **N8** | — | phase-02 | Not run |
| IAM-02 | Register, verify, sign in, consent | Full | S1 | Supabase Auth; `profiles.consent_*` | Unverified account cannot submit; consent version stored | 0 | phase-01 | Not run |
| IAM-03 | Change / recover password | Full | S1 | Supabase Auth | Neutral "if an account exists" message; single-use link | — | phase-01 | Not run |
| — (security design) | Staff MFA | Simplified | S1 | Supabase Auth TOTP; `DEMO_MFA_EXEMPT` flag | Real staff account prompted; demo account exempt and labelled (D-07) | — | phase-01 | Not run |
| ADM-01 | Publish challenge, form, documents | Simplified | S1 (seed), S6 (editor) | Admin RPCs; `challenge_versions` | Published version immutable; applicants see published version only | 1 | phase-06 | Not run |
| ADM-02 | Edit / unpublish / delete | Simplified | S6 | Admin RPCs | Submitted case keeps its `challenge_version`; delete only unused drafts | — | phase-06 | Not run |
| APP-01 | Discover challenge, save draft | Full | S1 | `save_draft` | Draft keeps every field after leave/resume | 2 | phase-01 | Not run |
| APP-02 | Confidential attachments | Full | S1 | Storage policies, `get_attachment_url` | Type/size refused; **N2**; 60 s expiry | 2 | phase-01 | Not run |
| APP-03 | Submit and get reference | Full | S1 | `submit_proposal` | Missing field refused, draft kept; reference + locked V1; retry returns same reference; **N9** | 3, 4 | phase-01 | Not run |
| SEC-01 | Audit events | Full | S1+ | Inside every RPC; insert-only triggers | Each RPC writes one audit row; **N6** | 17 | every phase | Not run |
| REV-01 | Screening + assign ≥ 2 reviewers | Full | S2 | `record_screening`, `assign_reviewers` | Eligible → in evaluation; reviewers notified; **N3** | 5, 6 | phase-02 | Not run |
| REV-02 | Versioned rubric | Full | S3 | `rubric_versions`, `rubric_criteria` | Weights sum to 100; scorecard keeps `rubric_version_id` | 1 | phase-03 | Not run |
| REV-03 | Independent scoring + panel | Full | S3 | `declare_assignment`, `save/submit_scorecard`, quorum trigger | Gate before content; **N10**, **N11**; peer isolation; reason required; auto-adjudication on quorum | 7, 8, 11 | phase-03 | Not run |
| REV-04 | Clarification / revision request | Full | S4 | `request_feedback`, `respond_clarification` | Empty reply refused; reply creates no version; applicant sees Action required | 5, 9 | phase-04 | Not run |
| APP-04 | Resubmit V2 with history | Full | S4 | `submit_revision` | Change note required; same reference; V1 readable; V1 scores kept; returns to `return_stage` | 10, 11 | phase-04 | Not run |
| INN-02 | Constructive Feedback Roadmap | Full (S4) | S4 | `request_feedback(tasks[])`, `submit_revision(task_responses[])`, `verify_feedback_task` | V2 refused while a task lacks status/explanation; applicant cannot edit tasks or verifications; unassigned reviewer cannot verify; panel shows summary | 9–12 | phase-04 | Not run |
| DEC-01 | Record + publish decision | Full | S5 | `record_decision`, `publish_decision` | Unpublished decision absent from applicant payload (**N4**); concurrent publish → one event | 12, 13 | phase-05 | Not run |
| DEC-02 | Award after approval | Full | S5 | `record_award` | Separate Awarded event; **N5** | 14 | phase-05 | Not run |
| NTF-01 | Timeline, live dashboards, notifications | Full | S3 | Realtime on `notifications`, `case_events`; `mark_notifications_read` | Live update without refresh; second account receives no events (leak test) | 5, 15 | phase-03 | Not run |
| NTF-02 | Opt-in email alerts | Simplified | S4 | `email_outbox` + relay Edge Function | Outbox row written in the same transaction; opt-out writes none; Simulated label if SMTP missing | 9 | phase-04 | Not run |
| HLP-01 | FAQs + regulatory contacts | Simplified | S6 | `content_pages` | Sample labels shown; reachable in one click from T04 | 2 | phase-06 | Not run |
| CHT-01 | Applicant ↔ consultant chat | Simplified | S6 | Chat tables + RLS | Sessions private; **N7** | 16 | phase-06 | Not run |
| CHT-02 | Chat hours | Full | S6 | Server-side hours check, `service_calendar` | Open and closed states via demo override | 16 | phase-06 | Not run |
| CHT-03 | Chat statistics | Simplified | S6 | Stats query | Figures reconcile with 6 seeded sessions | 17 | phase-06 | Not run |
| RPT-01 | Participation, outcomes, time-in-stage | Simplified | S6 | Report views/RPCs from `case_events` | Counts reconcile with seed + demo case; CSV matches screen | 17 | phase-06 | Not run |
| SEC-02 | Negative tests, privacy, scan | Full | P7 | pgTAP + Playwright suite; `npm audit` | N1–N11 on the hosted build; audit report; data-handling note | N1–N11 | P7 | Not run |
| SEC-03 | Audit viewer | Full | S6 | Audit query RPC | Filter by case `CEDA-2026-0009` shows full journey; non-admin forbidden | 17 | phase-06 | Not run |
| OPS-01 | Hosting, backup/restore | Simplified | P7 | Supabase Pro | Restore drill recorded; region/cost note | — | P7 | Not run |
| OPS-02 | Fault support page | Full | S6 | `content_pages` | Page renders for all roles | — | phase-06 | Not run |
| ARC-01 | Extensibility | Simplified | S6 | Admin role/criterion settings | New role + criterion without code change; second challenge with its own form/rubric; OpenAPI export | — | phase-06 | Not run |
| QA-01 | Browsers, devices, response time | Simplified | P7 | Playwright matrix; timed sample | Chrome/Edge/Firefox + mobile; p95 with sample size (D-16 targets) | — | P7 | Not run |
| INN-01 | V1/V2 compare | Simplified (P2) | S7 | Read-only diff | Field and attachment diff shown | 11 | phase-07 | Not run |
| INN-03 | Smart Idea Development Assistant (rule-based) | Simplified (P2) | S7 | Client-side rules | No network call carries proposal data | 2 | phase-07 | Not run |
| INN-05 | Next steps panel | Simulated (P2) | S7 | `content_pages` | Sample label + "not an endorsement" | 13 | phase-07 | Not run |
| INN-04 | Readiness Passport (optional) | Optional (P2) | S7 | `set_readiness`, `confirm_readiness` | Only started after SEC-02 passes on staging (D-29) | 11 | phase-07 | Not run |
| DOC-01/02, REL-01, DEM-01, SUB-01, OPS-03, DEF-01 | Proposal, manuals, release, demo, submission, operations | — | P7 | — | Backlog wording needed | — | P7 | Not run |

## 3. Failure cuts

For each important write: what survives, who recovers, what the user sees (evidence skill, Phase 3).

| Operation | Cut | Surviving state | Recovery owner | User message |
|---|---|---|---|---|
| `submit_proposal` | Before commit (network drop, validation refusal) | Server draft + local backup; no reference | Applicant retries with the **same** `client_request_id` | "Not sent. Your draft is saved." or field errors |
| `submit_proposal` | After commit, before reply (timeout) | Case + V1 + reference exist | Client status check with the same key returns the reference | "Not confirmed yet — checking…", then the receipt. Never "Failed" |
| `submit_revision` | After commit, before reply | V2 exists, status = `return_stage` | Same as above (same key) | Same as above |
| `publish_decision` | Two concurrent calls | One publication; the second gets `INVALID_STATE` | — | "This case has moved on — refresh to see the latest status" |
| `record_award` | Called on a not-approved case | Nothing changes | — | `CASE_NOT_APPROVED`, action disabled with reason |
| Email relay | Provider call times out | Outbox row `unknown_outcome` (if BCR-001 B4 is approved), attempt count saved | Relay reconciles, then retries up to the agreed maximum | Case state unaffected; email may arrive twice (at-least-once). Notification text never contains proposal content |
| Any workflow RPC | Permission or state check fails | Nothing written (no partial audit, event or notification) | — | Coded error (`FORBIDDEN`, `INVALID_STATE`, `VALIDATION`, …) |

## 4. Technical debt register

| Item | Evidence | Consequence | Treatment | Reconsider when |
|---|---|---|---|---|
| No malware scan on uploads | Blueprint §1.2 APP-02 (Deferred) | A malicious file could reach a reviewer | Download only, no inline preview, type/size checks | Any real (non-fictional) use |
| MFA exempt for demo staff accounts | D-07 | Demo staff accounts are weaker than real ones | Flag `DEMO_MFA_EXEMPT`; judge guide states it; off for real staff | Before any non-demo deployment |
| Circuit breakers, load shedding, dead-letter queue | Evidence skill, "Reliability application" | Persistent provider failure only retried to the attempt limit | Bounded retries + visible pending age | Real traffic or a second provider |
| Generic command receipts (if BCR-001 B3 = defer) | BCR-001 | Non-transition commands can't be safely retried | Conditional status updates | A non-transition command needs retry |
| No optimistic version on drafts (if BCR-001 B5 = defer) | BCR-001 | Two tabs autosaving: last write wins | Single-owner drafts; local backup | Co-submitters (deferred) are added |

## 5. Residual risk register

Project risks are in blueprint §11 (R-01 to R-12). Technical residual risks are added here as implementation reveals them.

| Item | Evidence | Consequence | Treatment | Reconsider when |
|---|---|---|---|---|
| | | | | |

## 6. Release recommendation

**Not yet issued.** It will be written for the tagged release commit and read: "Suitable for hackathon judging with fictional data, build `<commit>`. Not for real proposals. No legal-compliance claim (D-18)", followed by the restrictions enforced in configuration and the list of checks with their status.
