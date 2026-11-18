# API contracts and permission matrix

**Owner:** Stacey (author) · **Reviewer:** Obvious · **Status:** Draft for review · 16 Nov 2026 · **Updated:** 21 Nov 2026 (Slice 6)
**Implements:** blueprint v0.3 §4 (data model, state machine, RPC summary), D-02, D-07, D-12, D-17; BCR-001 B2, B4, B9, B10 (applied as recommended, pending sign-off)
**Code:** `supabase/migrations/`, `supabase/functions/`, `supabase/seed.sql`, tests in `supabase/tests/database/`

| Part | Status |
|---|---|
| Phase 0: schema, RLS, triggers, `has_permission()`, `health()`, `my_access()`, seed | **Passed** on the Supabase local stack in CI and on the PGlite stand-in (§9). Not yet on the hosted project |
| Slice 1: `save_draft`, `submit_proposal`, `get_submission_receipt`, attachments, `record_consent` | **Passed** on the Supabase local stack in CI and on the PGlite stand-in (§9). Not yet on the hosted project |
| `attachment-url` Edge Function | Implemented — not verified. Type-checks (`deno check`, CI); not yet deployed or run |
| Slice 2: `record_screening`, `assign_reviewers`, `revoke_assignment`, `grant_role`, `revoke_role`, `add_internal_note`, `list_case_status`, `case_stage_counts` | **Passed** on the Supabase local stack in CI and on the PGlite stand-in (§9). Not yet on the hosted project |
| Slice 3: `declare_assignment`, `save_scorecard`, `submit_scorecard`, `get_score_panel`, `my_review_queue`, `mark_notifications_read`, quorum, Realtime, rubric locks | **Passed** on the Supabase local stack in CI and on the PGlite stand-in (§9). Not yet on the hosted project |
| Slice 4: `request_feedback`, `respond_clarification`, `submit_revision`, `verify_feedback_task`, `get_roadmap`, outbox claim/record, `list_email_outbox` | **Passed** on the Supabase local stack in CI and on the PGlite stand-in (§9). Not yet on the hosted project |
| `email-relay` Edge Function | Implemented — not verified. Type-checks (`deno check`, CI); not yet deployed or run |
| Slice 5: `record_decision`, `publish_decision`, `record_award`, `close_case` | **Passed** on the Supabase local stack in CI and on the PGlite stand-in (§9). Not yet on the hosted project |
| Slice 6a: `get_programme_report`, `report_case_rows`, `query_audit`, chat (`chat_status`, `start_chat`, `send_chat_message`, `accept_chat`, `close_chat`, `my_chat_inbox`, `chat_statistics`) | **Passed** on the Supabase local stack in CI and on the PGlite stand-in (§9). Not yet on the hosted project |
| Slice 6b: content pages, chat hours and override, roles (ARC-01), rubric drafts and criteria, challenges and forms | **Passed** on the Supabase local stack in CI and on the PGlite stand-in (§9). Not yet on the hosted project |
| `invite-staff` Edge Function | Implemented — not verified. Type-checks (`deno check`, CI); not yet deployed or run |
| Scheduled maintenance: `run_maintenance`, `extend_feedback_deadline`, email-relay trigger, `pg_cron` schedules | **Passed** on the Supabase local stack in CI, schedules registered with pg_cron (§9). Relay call not yet run against a deployed function |
| Generated TypeScript types | Not run: needs `supabase gen types` against a running stack. §8 gives hand-written types until then |

---

## 1. How the frontend talks to the backend

- **Reads:** query tables with `supabase.from(...)`. RLS decides which rows come back. A row you may not see is simply absent, so never infer "doesn't exist" from an empty result.
- **Writes:** only `supabase.rpc(name, args)`. `anon` and `authenticated` have **no** INSERT, UPDATE or DELETE privilege on any table (D-02). Every RPC checks permission and current state, then writes the change, `case_events`, `audit_events` and `notifications`/`email_outbox` **in one transaction**.
- **Files:** upload directly to Storage, then call `register_attachment`. Download only through the `attachment-url` Edge Function (§5).
- **Arguments** are named (`p_…`), so order does not matter.

### 1.1 Errors

A refused RPC returns a PostgREST error. The **stable code is in `message`**:

```json
{ "code": "PT422", "message": "VALIDATION", "hint": "Some answers need attention. Your draft is saved.",
  "details": "{\"fields\":{\"summary\":\"Required\",\"doc:business_plan\":\"Attach this document\"}}" }
```

| `message` (stable code) | HTTP | Meaning | UI |
|---|---|---|---|
| `FORBIDDEN` | 403 | Not allowed, **or the record does not exist** (deliberately indistinguishable) | Forbidden state; never confirm the record exists |
| `VALIDATION` | 422 | Input rejected. `details` is a JSON string; `fields` maps field key → message. Document keys are `doc:<key>` | Error summary + field errors; input kept |
| `INVALID_STATE` | 409 | The case is not in the state this action needs | "This case has moved on — refresh to see the latest status" |
| `REQUEST_CONFLICT` | 409 | A request key was reused for different content (BCR-001 B2) | Generate a new key only if the user starts a **new** action |
| `CHALLENGE_CLOSED` | 409 | Challenge not accepting submissions | Banner; draft kept |
| `CASE_NOT_APPROVED` | 409 | Award attempted without an approved, published decision | Action disabled with reason |
| `IMMUTABLE` | 409 | Append-only record (should never reach the UI; a bug if it does) | Generic error |

- `hint` is plain-English text safe to show. It never contains proposal content.
- **Unknown outcome:** a timeout or lost reply on `submit_proposal` is *not* a failure. Keep the same `client_request_id`, show "Not confirmed yet — checking…", and call `get_submission_receipt(p_client_request_id => …)` or repeat the submit with the same key (design record §3).

### 1.2 Time and money

Timestamps are ISO 8601 in UTC. Receipts also carry `*_display` text in CAT (`"16 Nov 2026, 14:05 CAT"`). Money is integer minor units plus `currency` (`'BWP'`).

---

## 2. Roles and permissions

Roles and permissions are **data** (`roles`, `permissions`, `role_permissions`). New ones can be added without code changes (ARC-01). Every RPC calls `private.has_permission()`.

| Permission | applicant | screening_officer | reviewer | adjudicator | admin | support_consultant | support_lead | committee_member | auditor |
|---|---|---|---|---|---|---|---|---|---|
| `proposal.submit` | ● | | | | | | | | |
| `chat.start` | ● | | | | | | | | |
| `case.read_all` | | ● | | ● | ● | | | | |
| `case.read_status` | | | | | | | | ● | |
| `case.screen` | | ● | | | | | | | |
| `case.assign` | | | | | ● | | | | |
| `case.request_feedback` | | ● | ● (assigned) | ● | | | | | |
| `case.close` | | ● | | ● | | | | | |
| `case.note` | | ● | ● | ● | ● | | | | |
| `scorecard.submit` | | | ● | | | | | | |
| `scorecard.read_panel` | | | | ● | ● | | | | |
| `decision.record` / `decision.publish` | | | | ● | | | | | |
| `award.record` (D-05) | | | | | ● | | | | |
| `role.manage`, `config.manage` | | | | | ● | | | | |
| `report.read` | | | | ● | ● | | | | |
| `audit.read` | | | | | ● | | | | ● |
| `chat.handle` | | | | | | ● | ● | | |
| `chat.stats` | | | | | | | ● | | |

**MFA (D-07):** roles with `requires_mfa = true` (every staff role) grant nothing unless the session is `aal2`, **except** seeded accounts (`profiles.is_demo`) while `app_settings.demo_mfa_exempt = true`. Applicants and committee members do not need MFA. `my_access().mfa_required` tells the UI to show the MFA prompt.

**Open decisions:** D-05 (award authority), D-06 (quorum, stored as `app_settings.review_quorum`), D-08 (committee visibility) and D-13 (chat audience) are configured as their defaults. Changing them is a data change, not a code change.

---

## 3. Who can read what (RLS)

| Table | Applicant | Staff with `case.read_all` | Cleared reviewer¹ | Others |
|---|---|---|---|---|
| `proposals`, `proposal_versions`, `case_events`, `feedback_requests`, `feedback_tasks`, `awards` | Own cases | Submitted cases (never drafts) | Assigned cases | — |
| `proposal_drafts` | Own only | — | — | — |
| `attachments` | Own (draft and submitted) | Submitted files | Submitted files on assigned cases | — |
| `assignments` | — | All on readable cases | Own + co-reviewers' | Own assignment visible **before** declaring |
| `scorecards`, `scorecard_items` | — | Panel roles see all | Own; peers' **only after submitting own** on the same version (REV-03) | — |
| `challenges`, `challenge_versions` | Published and closed; **plus the challenge and version their own case belongs to, even after it is unpublished** (ADM-02; challenges since migration 011) | `config.manage` sees all | Published and closed | Published and closed (signed out too) |
| `task_verifications` | — (BCR-001 B6, Slice 4) | ● | Own | — |
| `internal_notes` | **Never** | With `case.note` | With `case.note` | — |
| `decisions` | Own, **only once published** (N4) | ● | — | — |
| `notifications` | Own | Own | Own | Own |
| `audit_events` | — | — | — | `audit.read` only |
| `challenges`, `challenge_versions`, `rubric_*`, `content_pages`, `service_calendar` | Published (also `anon`) | Published; all with `config.manage` | | |
| `email_outbox`, `app_settings` | No client access | | | |

¹ An active assignment with `declared_at` set and `has_conflict = false` (D-19, N10, N11).

---

## 4. Phase 0 and Slice 1 RPCs (implemented)

| RPC | Who | Arguments | Returns | Errors | Writes |
|---|---|---|---|---|---|
| `health()` | anon | — | `{ ok, migration_version, server_time }` | — | — |
| `my_access()` | signed in | — | `{ user_id, is_demo, roles[], permissions[], mfa_required }` | — | — |
| `record_consent` | signed in | `p_version text` | `{ consent_version, consent_at }` | `VALIDATION` (not the current privacy notice version) | profile, audit |
| `save_draft` | `proposal.submit` | `p_data jsonb`, `p_proposal_id uuid?`, `p_challenge_id uuid?` | `{ proposal_id, saved_at, title }` | `FORBIDDEN`, `VALIDATION`, `CHALLENGE_CLOSED` (new draft only), `INVALID_STATE` (not a draft) | draft; audit on **create only** (autosave is not audited) |
| `submit_proposal` | `proposal.submit` | `p_proposal_id uuid`, `p_client_request_id uuid`, `p_declaration_version text` | Receipt (§4.1) + `replayed: boolean` | `FORBIDDEN` (not yours), `VALIDATION` (fields, `doc:*`, `email` (not verified, migration 011), `consent`, `declaration`), `CHALLENGE_CLOSED`, `INVALID_STATE`, `REQUEST_CONFLICT` | V1, reference, file binding, case event, audit, notification (+ outbox if opted in) |
| `get_submission_receipt` | signed in | exactly one of `p_proposal_id` / `p_client_request_id`; `p_version_no int?` | Receipt + `found: true`, or `{ found: false }` | `VALIDATION` | — |
| `list_my_ideas` | signed in (own cases only) | none | `[{ id, reference (null for a draft), title, status, challenge { id, title, closes_at }, updated_at, open_feedback { kind, due_at, status: open \| expired } or null, stages [{ stage, at }] }]`, newest first; `[]` for someone with no ideas | — (signed out: no execute grant) | Read only. Never returns case-event reasons, actors or staff-only case fields. `open_feedback` is the latest request while the case is `action_required`, including an **expired** one (the deadline passed; staff may extend it). Migration 014, for T06 |
| `register_attachment` | `proposal.submit` | `p_proposal_id`, `p_storage_path`, `p_filename`, `p_doc_key?` | Attachment row (without `storage_path`) | `FORBIDDEN`, `INVALID_STATE`, `VALIDATION` (path, size > 10 MB, type, unknown `doc_key`, > 10 files) | attachment, audit |
| `remove_attachment` | `proposal.submit` | `p_attachment_id` | `{ id, removed: true }` | `FORBIDDEN`, `INVALID_STATE` (already submitted) | soft delete, audit |
| `authorize_attachment_download` | signed in | `p_attachment_id` | `{ storage_path, filename, mime, size_bytes, expires_in: 60 }` | `FORBIDDEN` | audit (successful authorisations only) |

`authorize_attachment_download` exists for the Edge Function. The browser should call `attachment-url`, not this RPC.

### 4.2 Slice 2 RPCs (REV-01, IAM-01, D-08)

| RPC | Permission | Arguments | Returns | Errors | Writes |
|---|---|---|---|---|---|
| `record_screening` | `case.screen` | `p_proposal_id`, `p_result` (`eligible` or `ineligible`), `p_reason` (1–1,000 chars) | `{ proposal_id, status, result }` | `FORBIDDEN`, `VALIDATION`, `INVALID_STATE` (not `submitted`) | `submitted` → `in_evaluation`, or → `closed` with `closed_reason = "Ineligible: <reason>"`; case event with reason; audit; applicant notified |
| `assign_reviewers` | `case.assign` | `p_proposal_id`, `p_reviewer_ids uuid[]` (1–10), `p_due_at?` (default now + 14 days, must be future) | `{ proposal_id, assigned: [{assignment_id, reviewer_id}], already_assigned: […], active_reviewers }` | `FORBIDDEN`, `VALIDATION` (not a reviewer, the applicant, yourself, declared a conflict on this case, bad due date), `INVALID_STATE` (not `in_evaluation`) | One assignment per new reviewer, audit, reviewer notified. Already-active reviewers are skipped (safe to retry). All reviewers are checked before anything is written |
| `revoke_assignment` | `case.assign` | `p_assignment_id`, `p_reason` (1–500) | `{ assignment_id, revoked: true }` | `FORBIDDEN`, `VALIDATION`, `INVALID_STATE` (already removed) | Revocation (scorecards are kept), audit, reviewer notified |
| `grant_role` | `role.manage` | `p_user_id`, `p_role_key`, `p_reason?` | `{ ok: true, already, user_role_id }` **or** `{ ok: false, code: "FORBIDDEN", message }` for a self-grant | `FORBIDDEN` (no permission), `VALIDATION` (unknown role or user) | Role, audit, user notified. **Self-grant (N8): not raised but returned**, so its `role.grant_refused` audit row is kept |
| `revoke_role` | `role.manage` | `p_user_id`, `p_role_key`, `p_reason` (1–500) | `{ ok: true, user_role_id }` or `{ ok: false, code: "FORBIDDEN", message }` for your own roles | `FORBIDDEN`, `VALIDATION`, `INVALID_STATE` (role not held) | Revocation (a revoked grant can never be reactivated; grant again instead), audit, user notified |
| `add_internal_note` | `case.note` and can read the case; never the applicant | `p_proposal_id`, `p_body` (1–4,000) | `{ id, created_at }` | `FORBIDDEN`, `VALIDATION` | Note; audit records that a note was added, **not its text** |
| `list_case_status` | `case.read_status` or `case.read_all` | `p_challenge_id?` | Rows `{ reference, challenge_title, public_stage, last_update }`, latest 500 | `FORBIDDEN` | — |
| `case_stage_counts` | `case.read_status`, `case.read_all` or `report.read` | `p_challenge_id?` | `{ "submission": n, "review": n, "feedback": n, "approval": n, "award": n, "closed": n }` | `FORBIDDEN` | — |

**Frontend note for `grant_role` / `revoke_role`:** check `ok` in the result as well as catching errors.

**D-08 (committee):** the committee member reads no case tables at all. `list_case_status` gives reference, challenge and applicant-facing stage only: no titles, text, scores, notes or unpublished outcomes. If CEDA confirms titles may be shown (spec Q4), add a column; no access rule changes.

### 4.3 Slice 3 RPCs (REV-02, REV-03, NTF-01, D-11, D-19, D-20)

| RPC | Who | Arguments | Returns | Errors | Writes |
|---|---|---|---|---|---|
| `declare_assignment` | The assigned reviewer | `p_assignment_id`, `p_has_conflict`, `p_confidentiality_accepted` (required when no conflict) | `{ assignment_id, has_conflict, revoked, replayed }` | `FORBIDDEN`, `VALIDATION`, `INVALID_STATE` (already recorded with a different answer, or case no longer under review) | No conflict: opens the case and its files to the reviewer (N10). Conflict: assignment revoked, admins notified to reassign, the reviewer can never be reassigned to that case (N11). Audited. The same answer twice is safe |
| `save_scorecard` | Cleared reviewer, case `in_evaluation` | `p_assignment_id`, `p_items? [{criterion_id, score 1–5 or null, reason}]`, `p_overall_comment?` | `{ scorecard_id, status: "draft", saved_at, weighted_score (null until complete) }` | `FORBIDDEN` (not declared / not yours), `VALIDATION` (score outside 1–5 or not whole, criterion not in this rubric, duplicate), `INVALID_STATE` (already submitted, or scoring closed) | Draft for the case's **current version**; `p_items` replaces all items when given. Only the first save is audited |
| `submit_scorecard` | Same | Same as `save_scorecard` (saves, then submits) | `{ scorecard_id, status: "submitted", submitted_at, weighted_score, submitted_count, quorum, quorum_reached, replayed }` | As above, plus `VALIDATION` when a criterion has no score or a reason under 20 characters (`fields` keyed by criterion key) | Locks the scorecard; audit. **D-11:** when submitted scorecards on the current version from active reviewers reach `app_settings.review_quorum` (2), the case moves `in_evaluation` → `in_adjudication` in the same transaction and adjudicators are notified. A retry returns the recorded result (`replayed: true`) and changes nothing |
| `get_score_panel` | `scorecard.read_panel` (adjudicator, admin), or a cleared reviewer **after submitting their own** on that version | `p_proposal_id`, `p_version_id?` (default current) | `{ reference, version_no, criteria[], scorecards[{reviewer_name, weighted_score, overall_comment, items[]}], criteria_summary[{key, mean, min, max, spread, flagged}], aggregate{mean_weighted, min_weighted, max_weighted, spread, flagged}, submitted_count, quorum, spread_flag_threshold: 2 }` | `FORBIDDEN`, `VALIDATION` (version not on this case) | — |
| `my_review_queue` | `scorecard.submit` | — | Rows `{ assignment_id, proposal_id, reference, title, challenge_title, applicant_organisation, version_no, due_at, case_status, my_status }`; `my_status` is `declaration_needed`, `not_started`, `in_progress` or `submitted` | `FORBIDDEN` | — |
| `mark_notifications_read` | Signed in | `p_ids uuid[]?` (null = all) | `{ updated }` | — | Own rows only; other people's IDs are ignored |

- **Weighted score** = Σ(score × weight) ÷ Σ weights, on the 1–5 scale, two decimals.
- **Spread flag** (BCR-001 B7): a criterion is flagged when its scores differ by 2 or more; the aggregate is flagged when any criterion is flagged or the weighted scores differ by 2 or more.
- **Before declaring**, `my_review_queue` shows reference, title, challenge and applicant organisation: what a reviewer needs to recognise a conflict. Proposal text and files stay closed until the declaration.
- **Realtime (NTF-01):** subscribe to `postgres_changes` on `notifications` (filter `user_id=eq.<me>`) and `case_events` (filter `proposal_id=eq.<case>`). Supabase applies the same SELECT policies, so a subscriber only receives rows they may read. Neither table ever deletes rows.
- **Rubrics and challenge forms (REV-02, ADM-02):** a published rubric version, its criteria and a published challenge version are locked. A rubric is created as a draft, given criteria, then published; publishing is refused unless weights total 100. Scorecards keep `rubric_version_id`.

### 4.4 Slice 4 RPCs (REV-04, APP-04, INN-02, NTF-02)

| RPC | Who | Arguments | Returns | Errors | Writes |
|---|---|---|---|---|---|
| `request_feedback` | `case.request_feedback` and either `case.read_all` (screening officer, adjudicator) or an assigned, declared reviewer (D-09) | `p_proposal_id`, `p_kind` (`clarification` or `revision`), `p_message` (1–4,000), `p_due_at?` (default now + 7 days, future), `p_tasks text[]?` (revision only, up to 10, each 1–1,000) | `{ feedback_request_id, kind, status: "action_required", return_stage, due_at, tasks }` | `FORBIDDEN`, `VALIDATION` (`fields.task:<n>`), `INVALID_STATE` (not `submitted`/`in_evaluation`/`in_adjudication`, e.g. a request is already open) | Case → `action_required` with `return_stage` = where it was; request + tasks (task text is immutable); audit; applicant notified (+ email if opted in) |
| `respond_clarification` | The applicant | `p_feedback_request_id`, `p_text` (10–1,000) | `{ feedback_request_id, status: "answered", responded_at, case_status }` | `FORBIDDEN`, `VALIDATION`, `INVALID_STATE` (not an open clarification) | Reply stored on the request, **no new version** (D-21); case returns to `return_stage` (BCR-001 B1); requester notified |
| `submit_revision` | The applicant | `p_proposal_id`, `p_client_request_id`, `p_change_note` (1–2,000), `p_task_responses [{task_id, status: addressed/not_addressed, explanation 1–500}]`, `p_declaration_version` | Receipt for the new version (`version_no` 2, 3 …) + `replayed` | `FORBIDDEN`, `VALIDATION` (`change_note`, `task:<n>`, `declaration`, form fields), `INVALID_STATE` (no open revision), `REQUEST_CONFLICT` | New immutable version with the same reference. Content = the revision working copy (`save_draft`), or the current version if unedited. Files carry forward unless a new upload replaces the same document type. Task answers locked on the new version. Case returns to `return_stage` (D-10); assigned reviewers and the requester notified. **Idempotent by `p_client_request_id`** (BCR-001 B9); `get_submission_receipt(p_client_request_id => …)` finds it |
| `verify_feedback_task` | An assigned, declared reviewer, case `in_evaluation` | `p_task_id`, `p_assignment_id`, `p_result` (`verified`/`not_verified`), `p_note?` (required for `not_verified`, ≤ 1,000) | `{ task_id, result, verified_at }` | `FORBIDDEN`, `VALIDATION`, `INVALID_STATE` (task from an earlier version, scoring closed, or own scorecard already submitted) | One verification per task per reviewer, changeable until that reviewer submits their scorecard, then locked. Audited |
| `get_roadmap` | Anyone who can read the case | `p_proposal_id` | `[{ feedback_request_id, kind, status, message, due_at, version_no, answered_version_no, response_text, tasks[{position, text, applicant_status, applicant_explanation, verifications[] or null}], summary{tasks, addressed, verified, not_verified} }]` | `FORBIDDEN` | — |
| `list_email_outbox` | `config.manage` | `p_limit?` (≤ 200) | Rows `{ template, status, attempts, recipient, created_at, last_attempt_at, next_attempt_at, last_error }` | `FORBIDDEN` | — |
| `claim_outbox_batch`, `record_outbox_result` | **service role only** (the `email-relay` function) | — | — | — | Lease-based claim; outcome recording with backoff |

- **Revision mode:** while a revision request is open, `save_draft`, Storage uploads, `register_attachment` and `remove_attachment` work on the case exactly as for a draft (T04 V2 mode). During a clarification the form stays closed.
- **`submit_scorecard` on a revised version (INN-02):** also refuses with `VALIDATION` (`fields.task:<n>`) until the reviewer has verified every task answered in that version.
- **Who sees verifications (BCR-001 B6):** reviewers and staff at once; the applicant only after the decision is published. Before that, `get_roadmap` returns `verifications: null` and `verified`/`not_verified: null` for the applicant.
- **V1 scores are kept (APP-04):** scorecards are per version, so V1 scorecards stay under V1 and reviewers score V2 as new scorecards (D-10).
- **Email (NTF-02, BCR-001 B4):** an outbox row is written in the same transaction as the event, only for users with `alerts_opt_in`. The `email-relay` Edge Function is the single sender: it claims due rows with a 10-minute lease, sends through SMTP with a 15-second timeout and records `accepted` (handed to the SMTP server, not "delivered"), `rejected`, `retryable` or `unknown_outcome`. Retries back off exponentially (2^attempts minutes ± 20%) up to `app_settings.email_max_attempts` (5), then the row is `rejected` with the reason. Delivery is at least once. **If SMTP is not configured, nothing is sent and the admin viewer must label email as Simulated.** Emails carry the reference and a link only, never proposal content.
- **Expiry:** overdue requests are expired by the scheduled `run_maintenance` (§4.8); staff can extend the deadline.

### 4.5 Slice 5 RPCs (DEC-01, DEC-02, D-05)

| RPC | Who | Arguments | Returns | Errors | Writes |
|---|---|---|---|---|---|
| `record_decision` | `decision.record` (adjudicator) | `p_proposal_id`, `p_outcome` (`approved`/`not_approved`), `p_reason` (1–4,000) | `{ decision_id, outcome, published: false, supersedes, case_status }` | `FORBIDDEN`, `VALIDATION`, `INVALID_STATE` (not `in_adjudication`, or already published) | Unpublished decision on the current version. **The case stays `in_adjudication`; the applicant sees nothing and is not notified** (N4). Recording again before publication supersedes the earlier draft (kept, `superseded_at` set). Audited with the outcome |
| `publish_decision` | `decision.publish` (adjudicator) | `p_decision_id` | `{ decision_id, outcome, published_at, case_status }` | `FORBIDDEN`, `INVALID_STATE` (superseded, already published, recorded on an earlier version, or a concurrent publish won) | `in_adjudication` → `approved` / `not_approved`; decision locked; applicant notified (+ email without the outcome) |
| `record_award` | `award.record` (administrator, D-05) | `p_proposal_id`, `p_amount_minor` (thebe, 1 – 10,000,000,000), `p_description` (1–1,000) | `{ award_id, amount_minor, currency: "BWP", case_status: "awarded", replayed }` | `FORBIDDEN`, `CASE_NOT_APPROVED` (N5: no published approval), `VALIDATION`, `INVALID_STATE` (a different award already exists) | Award (append-only) linked to the published approval; `approved` → `awarded` as a **separate event** (DEC-02); applicant notified. The same award again returns `replayed: true` |
| `close_case` | `case.close` (screening officer, adjudicator) | `p_proposal_id`, `p_reason` (1–500) | `{ proposal_id, case_status: "closed", expired_requests }` | `FORBIDDEN`, `VALIDATION`, `INVALID_STATE` (approved, awarded, draft or already closed) | Closed with the reason (visible to the applicant); any open feedback request marked `expired`; applicant notified |

- **Who decides, who pays:** the adjudicator records and publishes; only the administrator records the award (D-05). The administrator cannot decide or publish.
- **Unpublished means invisible:** the applicant's `decisions` rows, case status, case history and notifications all stay as "Under review" until `publish_decision`.
- **Stale decisions:** if a revision was requested after a decision was drafted, the draft refers to the earlier version and cannot be published; record a new one.

### 4.6 Slice 6a RPCs: reports, audit, chat (RPT-01, SEC-03, CHT-01/02/03)

| RPC | Who | Arguments | Returns | Errors |
|---|---|---|---|---|
| `get_programme_report` | `report.read` (adjudicator, admin) | `p_challenge_id?`, `p_from?`, `p_to?` (period on the submission time) | `{ filters, generated_at, participation{submitted, distinct_applicants, drafts_started, by_challenge[]}, outcomes{by_current_stage{stage: n}, approved, not_approved, awarded, closed, award_total_minor, currency}, funnel[{stage, reached}], time_in_stage[{status, cases, median_days}], overdue{feedback_requests, reviews}, impact{reached_later_stage, reached_later_stage_share, resubmitted_after_feedback, roadmap_tasks_verified_share} }` | `FORBIDDEN`, `VALIDATION` (period ends before it starts) |
| `report_case_rows` | `report.read` | Same filters | One row per case for the CSV: `{ reference, challenge_title, public_stage, status, submitted_at, versions, last_update, days_in_current_stage, published_outcome, award_minor, currency }` (no proposal content) | `FORBIDDEN` |
| `query_audit` | `audit.read` (admin, auditor) | `p_reference?` (case-insensitive), `p_actor_id?`, `p_action?` (prefix, e.g. `case.`; wildcards matched literally), `p_from?`, `p_to?`, `p_limit?` (≤ 500, default 100), `p_before_id?` (keyset paging: pass the smallest `id` you have) | Rows `{ id, at, actor_id, actor_name, actor_role, action, target_type, target_id, reference, metadata }`, newest first | `FORBIDDEN` |
| `chat_status` | Anyone (also signed out) | — | `{ open, mode: calendar / demo_override_open / demo_override_closed, timezone, server_time_display, hours[] }` | — |
| `start_chat` | `chat.start` (applicants; D-13 registered users only) | `p_message` (1–2,000) | `{ session_id, status, queued_at }`; returns the open conversation if there is one | `FORBIDDEN`, `VALIDATION`, `INVALID_STATE` with `details.reason = "CHAT_CLOSED"` outside hours |
| `send_chat_message` | Conversation's applicant or consultant | `p_session_id`, `p_body` (1–2,000) | `{ message_id, session_id }` | `FORBIDDEN`, `VALIDATION`, `INVALID_STATE` (ended) |
| `accept_chat` | `chat.handle` | `p_session_id` | `{ session_id, status: "active", accepted_at }` | `FORBIDDEN`, `INVALID_STATE` (someone else took it, or it ended) |
| `close_chat` | Either participant | `p_session_id` | `{ session_id, status, replayed }` (closing a never-accepted chat records it as missed) | `FORBIDDEN` |
| `my_chat_inbox` | `chat.handle` | — | Waiting conversations plus own active ones (a consultant can hold several): `{ session_id, status, applicant_name, queued_at, waiting_seconds, last_message_at, last_message }` | `FORBIDDEN` |
| `chat_statistics` | `chat.stats` (support lead) | `p_from?`, `p_to?` | `{ volume, handled, missed, waiting_now, average_wait_seconds, by_day[{day, volume, missed}] }` | `FORBIDDEN` |

- **Hours (CHT-02):** open when the Gaborone local time is within `service_calendar` hours on a working day and the date is not in `service_closures`. `app_settings.chat_demo_override` (`"open"`, `"closed"` or `null`) lets judges see both states.
- **Missed chats:** a waiting conversation not accepted within 30 minutes, or still waiting when the service closes, becomes `missed`. There is no scheduler: this sweep runs whenever a chat is started, accepted, listed or counted.
- **Live chat:** subscribe to `postgres_changes` on `chat_messages` (filter `session_id=eq.<id>`) and `chat_sessions`. RLS limits events to the participants; a waiting conversation is visible to every consultant.
- **Reconciliation (RPT-01):** report and CSV are computed from the same case set; the seed gives 8 cases, 4 applicants, stages `{submission 1, review 3, feedback 1, approval 1, award 1, closed 1}` and an award total of 25,000,000 thebe (§9).

### 4.7 Slice 6b RPCs: admin settings (T12; ADM-01/02, HLP-01, CHT-02, ARC-01, IAM-01)

All need `config.manage` (administrator) unless stated. Every change is audited. Errors: `FORBIDDEN`, `VALIDATION` (`fields`), `INVALID_STATE`.

| RPC | Arguments | Notes |
|---|---|---|
| `save_content_page` | `p_slug`, `p_kind` (`faq`, `contact`, `referral`, `support`, `privacy`, `declaration`, `page`), `p_title`, `p_body_md`, `p_status?` (`draft`/`published`), `p_position?`, `p_is_sample?` (default true), `p_version?` | Create or update by slug. A page cannot change type. **Privacy notice and declaration need a version, and changed wording needs a new version** (consents and declarations are stored with it; new submissions then require the new version) |
| `set_service_hours` | `p_weekday` (1 = Monday … 7), `p_is_working`, `p_opens_at`, `p_closes_at` | Gaborone local time |
| `set_service_closure` | `p_day`, `p_reason?` | With a reason the day is closed; without one the closure is removed |
| `set_chat_override` | `p_mode` (`open`, `closed` or null) | Demo override for judges (CHT-02); returns the resulting `open` |
| `create_role` | `p_key`, `p_label`, `p_permissions text[]`, `p_requires_mfa?` (default true) | `role.manage`. **ARC-01:** a new role is data; grant it with `grant_role` and it works at once |
| `set_role_permissions` | `p_role_key`, `p_permissions text[]` | `role.manage`. Only for roles created this way; built-in roles keep their permissions (`INVALID_STATE`) so the access tests stay meaningful |
| `create_rubric` | `p_key`, `p_title` | Creates the rubric and an empty draft version 1 |
| `create_rubric_draft` | `p_rubric_id` | New draft version copying the latest criteria; returns the open draft if one exists (`existing: true`) |
| `save_rubric_criterion` / `remove_rubric_criterion` | `p_rubric_version_id`, `p_key`, `p_label`, `p_weight`, `p_anchors {"1","3","5" required}`, `p_guidance?`, `p_position?` | Draft versions only; returns `weights_total` for the "Total 100% ✓" indicator. **ARC-01:** a new criterion |
| `publish_rubric_version` | `p_rubric_version_id` | Weights must total 100; then locked |
| `create_challenge` / `update_challenge` | `p_slug` (create only), `p_title`, `p_summary`, `p_opens_at`, `p_closes_at`, `p_audience?` | Created as `draft`; closing after opening |
| `save_challenge_version` | `p_challenge_id`, `p_brief_md`, `p_form_schema`, `p_required_docs`, `p_rubric_version_id`, `p_template_files?` | Updates the unpublished version, or creates the next version if the latest is published (published versions never change). Form rules: at least one section; unique field keys; types `text`, `textarea`, `select` (with options), `email`; `max_length` 1–20,000; **a required `title` field**. Errors keyed `field:<key>`, `form_schema`, `required_docs` |
| `publish_challenge` | `p_challenge_id` | Publishes the draft form version (its rubric must be published) and opens the challenge. Existing ideas keep the version they started on (ADM-02) |
| `set_challenge_status` | `p_challenge_id`, `p_status` (`unpublished`/`closed`) | Unpublished or closed challenges take no new ideas; drafts are kept |
| `delete_challenge` | `p_challenge_id` | Only a never-published draft with no ideas (ADM-02); otherwise unpublish or close |

**`invite-staff` Edge Function (IAM-01):** `POST /functions/v1/invite-staff` with `{ email, full_name, role_key }` and the admin's token. It checks `role.manage` as the caller, sends a Supabase Auth invitation (or finds the existing account), grants the role through `grant_role` **as the caller** (same rules and audit, so a self-grant is refused), and removes the default applicant role from a newly invited account. Returns `{ user_id, invited, role_key, already_had_role }`, or `403 FORBIDDEN`, `422 VALIDATION` (`fields`), `503 UNAVAILABLE`. Needs `PORTAL_URL` (invitation link) and `APP_ORIGINS`.

### 4.8 Scheduled maintenance (REV-04, CHT-03, NTF-02)

| Function | Who | What it does |
|---|---|---|
| `run_maintenance()` | **service role only** (the scheduler, or an operator) | Marks open feedback requests past `due_at` as `expired` (audited as a `system` action; the requester is notified), and sweeps waiting chats to `missed`. Returns `{ ran_at, expired_requests, missed_chats }`. Safe to run repeatedly |
| `extend_feedback_deadline` | Staff who may request feedback on the case (D-09) | `p_feedback_request_id`, `p_due_at` (future). Reopens an `open` or `expired` request with a new deadline while the case is still `action_required`; the applicant is notified (+ email if opted in). Errors: `FORBIDDEN`, `VALIDATION`, `INVALID_STATE` (answered, or the case moved on) |
| `private.trigger_email_relay()` | scheduler only | Calls the `email-relay` Edge Function through `pg_net` when outbox rows are due. Returns `requested`, `nothing_due`, `not_configured` (Vault secrets missing) or `not_available` (no Vault/pg_net) |

- **After expiry** the applicant can no longer reply or submit a revision until staff extend the deadline or close the case. The case status does not change by itself.
- **Schedules** (created by migration 009 only where `pg_cron` and `pg_net` exist): `ceda-maintenance` every 10 minutes, `ceda-email-relay` every 2 minutes.
- **Relay configuration, once per environment** (SQL editor; values never committed):
  `select vault.create_secret('https://<ref>.supabase.co/functions/v1/email-relay', 'email_relay_url');`
  `select vault.create_secret('<RELAY_SECRET>', 'email_relay_secret');`
  `select vault.create_secret('<anon key>', 'email_relay_anon_key');`

**Reviewer picker (T10 assign dialog):** the admin reads `profiles` and `user_roles` directly (RLS allows `role.manage`); filter `user_roles.role_key = 'reviewer'` and `revoked_at is null`.

### 4.1 `submit_proposal` rules (APP-03)

1. **Idempotent by `p_client_request_id`.** Generate the key once, when the user first presses **Submit idea**, and keep it (in local storage too) until a receipt arrives. Same key + same case returns the original receipt with `replayed: true`. Same key + another case returns `REQUEST_CONFLICT`. Concurrent calls are serialised on the case row.
2. Checks in this order: permission → key → ownership → still a draft → email verified → consent recorded → challenge open → declaration version current → form fields and required documents.
3. A refusal changes nothing: the draft, files and reference sequence are untouched.
4. Success: reference `CEDA-<year>-NNNN` (year in Gaborone time, D-12), immutable V1 from the form-schema fields only, draft files bound to V1, working draft cleared.

Receipt:

```json
{ "proposal_id": "…", "reference": "CEDA-2026-0009", "status": "submitted", "version_no": 1,
  "submitted_at": "2026-11-16T12:05:00Z", "submitted_at_display": "16 Nov 2026, 14:05 CAT", "timezone": "Africa/Gaborone",
  "challenge": { "id": "…", "title": "Water-Smart Agriculture Challenge 2026" }, "form_version": 1,
  "declaration_version": "sample-2026-11-v1", "declaration_accepted_at": "…",
  "files": [{ "id": "…", "filename": "business-plan.pdf", "size_bytes": 2048, "mime": "application/pdf", "doc_key": "business_plan" }],
  "replayed": false }
```

### 4.2 Form data

`challenge_versions.form_schema` is `{ sections: [{ key, title, fields: [{ key, label, type, required, max_length, help, options }] }] }`. Types are `text`, `textarea`, `select` (value must be in `options`) and `email`. `required_docs` is `[{ key, label, required }]`. `save_draft` keeps only keys the schema defines and refuses non-string values. The field with key `title` becomes the case title on cards.

---

## 5. Files (APP-02)

**Upload:**
1. Path `proposal-files/<proposal_id>/<random uuid>.<ext>` where ext is `pdf|docx|xlsx|png|jpg|jpeg`. The user's file name is **never** in the path.
2. `supabase.storage.from('proposal-files').upload(path, file, { upsert: false, contentType })`. The bucket enforces 10 MB and the type list. The insert policy allows only the case's applicant, only while the case is a draft.
3. `register_attachment(...)`. Size and type are taken from what Storage recorded, not from the client. Registering the same path twice returns the same row.

**Download:** `POST /functions/v1/attachment-url` with body `{ "attachment_id": "…" }` and the user's bearer token returns `{ url, expires_in: 60, filename }`. It answers `403 { code: "FORBIDDEN" }` when access is refused **or** the file does not exist. Nobody, including the owner, can read or sign objects directly: the bucket has no SELECT policy.

**Challenge templates (T03):** templates are public documents with no applicant data, in the **public** bucket `challenge-files` (10 MB; PDF, DOCX, XLSX; upload needs `config.manage`). `challenge_versions.template_files` is `[{ name, path }]`, where `path` is the object path in that bucket. The browser downloads one directly: `supabase.storage.from('challenge-files').getPublicUrl(path)`, which is `<SUPABASE_URL>/storage/v1/object/public/challenge-files/<path>`. No Edge Function is involved; `attachment-url` stays for private proposal files. Demo: a fictional one-page sample (marked DEMO) is uploaded on the hosted project at the seeded path `water-smart-agriculture-2026/proposal-template.docx` (18 Nov, by the demo admin); its public URL answers 200. An applicant's upload to this bucket is refused by RLS (checked the same day).

**Environment:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase. `APP_ORIGINS` (new, comma-separated allowed browser origins) must be set as an Edge Function secret.

---

## 6. State machine (blueprint §4.3) as implemented

- Status changes only inside RPCs, using a conditional update (`… WHERE status = expected`). If the state has moved on, the RPC raises `INVALID_STATE` and writes nothing.
- `public_stage` on `case_events` comes from the status: submitted → submission; in_evaluation, in_adjudication → review; action_required → feedback; approved, not_approved → approval; awarded → award.
- **Planned for Slice 5:** `record_decision` writes an unpublished decision and leaves the case `in_adjudication`. Only `publish_decision` moves it to `approved`/`not_approved`. This guarantees the applicant cannot infer an outcome from the status (spec §6: "decision recorded, unpublished" shows *Under review*).
- **Planned for Slice 4 (BCR-001 B1):** `respond_clarification` moves `action_required` → `return_stage`, as `submit_revision` does.

---

## 7. Proposed signatures for later slices (not implemented)

| Slice | RPC | Arguments | Notes |
|---|---|---|---|
| 2 (next) | `invite_staff` (Edge Function) | email, role | IAM-01 "admin invites by email": needs the Auth admin API, so it runs as an Edge Function. Not built yet |
| 6 | report and audit query RPCs, chat RPCs, admin config RPCs | | |

---

## 8. TypeScript types (hand-written until generation runs)

```ts
export interface SubmissionReceipt {
  proposal_id: string
  reference: string
  status: CaseStatus
  version_no: number
  submitted_at: string            // ISO, UTC
  submitted_at_display: string    // "16 Nov 2026, 14:05 CAT"
  timezone: 'Africa/Gaborone'
  challenge: { id: string; title: string }
  form_version: number
  declaration_version: string
  declaration_accepted_at: string
  files: { id: string; filename: string; size_bytes: number; mime: string; doc_key: string | null }[]
  replayed?: boolean
  found?: boolean
}
export interface SaveDraftResult { proposal_id: string; saved_at: string; title: string }
export interface MyAccess { user_id: string; is_demo: boolean; roles: Role[]; permissions: string[]; mfa_required: boolean }
export interface RpcErrorBody { code: string; message: ApiErrorCode | 'IMMUTABLE'; hint: string; details: string }
```

---

## 9. Verification so far

| Check | Where | Result |
|---|---|---|
| Migrations 001–002 + seed apply in order | PGlite 0.5.16 (Postgres 18.6), `tools/pglite-db-tests` | Passed |
| `001_foundation.test.sql`: RLS on every table, no write grants, append-only (N6), MFA rule (D-07), seed shape (B10), N3, N4, N5, N7, N10 and peer isolation at the data layer | Same | Passed, 39/39 |
| `002_slice1_submit.test.sql`: draft, attachments, submit, idempotency, `REQUEST_CONFLICT`, receipt lookup, N1, N2, N3, N6, N7, N9, verification, consent, sign-up, unpublished-challenge visibility | Same | Passed, 59/59 on the PGlite stand-in with migration 011 (unverified email → `VALIDATION` with `fields.email`; unpublished challenge readable by its applicant only). also Passed on the Supabase local stack in CI (run 44085524538, commit `ebc076d`). **Applied to the hosted project** on 17 Nov 2026 (`supabase db push`, 11 migrations); every suite on hosted afterwards: **Passed, 460/460**; 13 users and 8 cases unchanged, reference sequence restored to 8 |
| `003_slice2_screen_assign.test.sql`: screening both ways, assignment rules and retries, revocation, roles incl. N8 refused + audited, notes hidden from applicants, committee view (D-08), N3, N7, N10 | Same | Passed, 56/56 |
| Mutation checks (Slice 2): drop the self-grant constraint; let any signed-in user hold every permission | Same | Each caught (1 and 18 failures) |
| `004_slice3_evaluate.test.sql`: declaration gate (N10), conflict (N11), draft and submit rules, retry, peer isolation, quorum → adjudication, panel arithmetic and spread flag, queue, notifications, rubric and form locks, Realtime publication | Same | Passed, 61/61 |
| Mutation checks (Slice 3): quorum set out of reach; declaration no longer required to read the case | Same | Each caught (5 and 4 failures) |
| Realtime delivery to a second browser (live-update leak test) | Staging, two browser contexts | **Not run** (Sylvain, Playwright) |
| `005_slice4_revise.test.sql`: clarification loop (B1, D-21), revision with 3 tasks, revision-mode editing and upload, every `submit_revision` refusal, V2 + same reference + V1 kept, B9 retry and conflict, D-10 return, task and verification locks, verification gate on the V2 scorecard, B6 hiding, roadmap summary, quorum on V2, outbox claim/lease/settle/give-up | PGlite stand-in | Passed, 72/72 |
| Mutation checks (Slice 4): drop the verification lock; keep the form editable after V2 | Same | Each caught (3 and 2 failures) |
| `email-relay` against a real SMTP server | Staging | **Not run**: SMTP not configured; email is Simulated until it is |
| `006_slice5_decide_award.test.sql`: role separation (D-05), unpublished decisions invisible to the applicant (N4), supersede history, N5 before approval and on not-approved, publish once, stale-version refusal, award + retry + two timeline stages, closure rules and request expiry, N6 on decisions, awards and history | PGlite stand-in | Passed, 45/45 |
| Mutation checks (Slice 5): applicant can read unpublished decisions; award without approval | Same | Each caught (2 and 2 failures) |
| `007_slice6_reports_audit_chat.test.sql`: report access, every report figure reconciled with the seed, period and challenge filters, CSV rows match, audit filters and paging, literal wildcards, Gaborone hours incl. UTC conversion, weekend and holiday, override both ways, chat isolation, multi-session consultant, closing, statistics against the seed | PGlite stand-in | Passed, 45/45 |
| Mutation checks (Slice 6a): audit query open to anyone; chat always open | Same | Each caught (6 and 1 failures) |
| `008_slice6_admin_settings.test.sql`: admin-only access, FAQ draft/publish visibility, declaration version rule, hours/closures/override, new role granted and withdrawn (ARC-01), built-in roles protected, rubric v2 with a new criterion and the 100% rule (ARC-01), form-schema validation, challenge publish, new form version while an idea keeps version 1 (ADM-02), unpublish, delete rules, audit | PGlite stand-in | Passed, 52/52 |
| Mutation checks (Slice 6b): built-in roles editable; declaration wording changed without a new version | Same | Each caught (1 and 6 failures) |
| `invite-staff` against Supabase Auth | Staging | **Not run** |
| `009_scheduled_jobs.test.sql`: maintenance service-role only, expiry once with notice and system audit, case unchanged, replies refused after expiry, who may extend, extension and late reply, answered requests locked, relay trigger without Vault, schedules registered where pg_cron exists | PGlite stand-in | Passed, 20/20 |
| Mutation checks (scheduled jobs): maintenance callable from browsers; expiry ignoring the deadline | Same | Each caught (3 and 3 failures) |
| `pg_cron` schedules and the `pg_net` relay call | Supabase | **Not run** |
| `011_my_ideas.test.sql`: `list_my_ideas` signed out refused, own cases only (Applicant A sees only 0008), exact field set, stages, a new draft listed, open and **expired** requests, staff get none | PGlite stand-in (migration 014) | Passed, 14/14. Mutation: dropping the own-cases filter fails 6 assertions |
| `010_security_privileges.test.sql`: exact allow-lists of functions callable signed out (2) and signed in (61 with `list_my_ideas`), service-role-only relay and maintenance, private helpers limited to those policies use, every `SECURITY DEFINER` pins `search_path`, new functions start closed, no views in `public`, no table writes for browsers, private proposal bucket with no direct read/update/delete | PGlite stand-in | Passed, 11/11 |
| Mutation checks (security): a new RPC granted to signed-out users; a `SECURITY DEFINER` function without `search_path` | Same | Each caught (1 and 1 failures) |
| Mutation checks: open `can_read_case`, skip MFA, open peer view, drop version trigger | Same | Each caught (12, 1, 2 and 3 failures) |
| Same suites on the Supabase stack: `supabase start` (migrations 001–010 + seed) then `supabase test db` | Supabase local stack (Postgres 17.6.1.139, Auth, Storage, pg_cron) in GitHub Actions, workflow `Database`, run 43907353789, commit `cc7c6bb` (branch `db/security-checks`), 16 Nov 2026 16:25–16:27 UTC | **Passed.** Every pgTAP file; also green on `test/ci-db-stage-3` (`6e5e8c5`, run 43905831617) and `db/scheduled-jobs` (`21715bc`, run 43907257484) |
| Edge Functions type-check (`deno check`, attachment-url, email-relay, invite-staff) | Same run | **Passed** |
| **Hosted project** `hncwpxyuolfxafbemapb` (EU Central): migrations 001–010 + seed applied with `supabase db push --include-seed` (001 had been applied earlier by name; its history entry was repaired to `20261116100000` first) | Hosted Supabase, 17 Nov 2026 | **Passed:** 10 migrations recorded; `health()` ok; 13 demo accounts and profiles; 8 cases, reference sequence at 8 (next is CEDA-2026-0009); 2 challenges; 16 published pages; 6 chat sessions; 2 buckets; 64 public functions; pg_cron jobs `ceda-maintenance` and `ceda-email-relay` registered |
| Supabase advisors on the hosted project | Same | Security: 61 signed-in and 2 signed-out SECURITY DEFINER RPCs (**by design**, D-02; pinned by `010_security_privileges`); `app_settings`/`email_outbox` have no policies (**intentional**, no client access); **leaked-password protection disabled (to enable in Auth settings)**. Performance (INFO): 34 unindexed foreign keys, 15 unused indexes on a fresh database, one table with two permissive SELECT policies: recorded as debt (§11) |
| Every pgTAP suite **on the hosted project** (each file in its own rolled-back transaction; the reference sequence recorded and restored to 8) | Hosted, 17 Nov 2026 10:15 UTC, from `db/security-checks` | **Passed, 457/457.** Afterwards: 13 users, 8 cases, settings unchanged, no test objects left |
| Demo passwords set on the 13 `@demo.ceda-portal.test` accounts (bcrypt; value only in the local `.env`) and sign-in through the Auth API | Hosted | **Passed:** applicant.a (applicant, 2 permissions) and admin (admin + auditor, 9 permissions) sign in; a wrong password is refused with `invalid_credentials` |
| Latency to the hosted REST API (`rpc/health`, 30 sequential requests from Stacey's machine) | Hosted, 17 Nov 2026 10:16 UTC | p50 263 ms, p95 315 ms (record: `artifacts/phase-00/region-latency.md`) |
| Edge Functions `attachment-url`, `email-relay`, `invite-staff` deployed (`supabase functions deploy --use-api`); secrets `PORTAL_URL`, `APP_ORIGINS` (Amplify staging + localhost), `RELAY_SECRET`; Vault entries `email_relay_url`, `email_relay_secret`, `email_relay_anon_key` | Hosted, 17 Nov 2026 | **Passed (refusal paths):** no sign-in → 401; malformed id → 422 `VALIDATION`; applicant asking for an unknown file → 403 `FORBIDDEN`; applicant calling `invite-staff` → 403 `FORBIDDEN`; relay with a wrong secret → 403; relay with the right secret → 200 `skipped: SMTP not configured` (email **Simulated**); `private.trigger_email_relay()` returns `nothing_due` |
| Successful download link, successful staff invitation, real email delivery | Hosted | **Not run** (needs an uploaded file from the frontend, an approved test invitation, and SMTP) |
| First Supabase-stack runs found two seed problems the stand-in accepted (temporary-schema helpers; top-level calls prepared before the functions existed) | Runs 43899239039, 43902689794 | **Fixed** in `095f2ad` and `6e5e8c5` |
| Storage upload policy with real `storage-api`; `attachment-url` Edge Function; 60 s expiry | Supabase local or staging | **Not run** |
| Seeded accounts sign in after `scripts/set-demo-passwords.mjs` | Supabase local or staging | **Not run** |

---

## 10. Changes from the blueprint's logical model (for review)

| Change | Why |
|---|---|
| `proposal_drafts` table instead of `proposals.draft_data` | Staff who can read a case must not see the applicant's unsubmitted edits (e.g. a V2 in progress) |
| `permissions` catalogue table; `roles.requires_mfa` | Foreign keys on permission names; D-07 enforced in `has_permission()` |
| `app_settings` (`demo_mfa_exempt`, `chat_demo_override`, `review_quorum`), `service_closures` | Open decisions stay configurable; holiday closures for CHT-02 |
| `email_outbox.status` uses `pending · accepted · rejected · retryable · unknown_outcome` | BCR-001 B4 |
| `proposal_versions.client_request_id` | BCR-001 B9 |
| `REQUEST_CONFLICT` error | BCR-001 B2 |
| Seed: 7 background cases + Applicant A's earlier idea (8 in total) | BCR-001 B10, so the demo case is `CEDA-2026-0009` |
| `decisions.superseded_at`; one active decision per case | "One active decision per case" without deleting history |
| Unpublished decision keeps status `in_adjudication` | §6 |
| `user_roles` and `assignments` are revoke-only (update triggers); revoked rows never reactivate | IAM-01 audit trail stays truthful |
| `revoke_assignment`, `add_internal_note`, `list_case_status`, `case_stage_counts` added | T10 reassign, T08 Notes tab, T06/T07 committee views (D-08) |
| `scorecard_items.score` nullable and `reason` may be empty **in drafts**; completeness (all scored, reasons ≥ 20 characters, spec T09) is enforced on submit | Reviewers can save partial work without losing it |
| Quorum check runs inside `submit_scorecard` rather than as a separate trigger | Same transaction and audit row as the submission; same effect as D-11 |
| `get_score_panel`, `my_review_queue` added | T09 panel, T07 reviewer queue |
| `request_revision` is `request_feedback(kind, …)` | BCR-001 A3 |
| `get_roadmap`, `list_email_outbox`, `claim_outbox_batch`, `record_outbox_result` added | T08 Feedback tab, T09 roadmap summary, NTF-02 relay and Simulated viewer |
| Revision files carry forward as new attachment rows on the new version (same storage object) | Each version lists exactly its own files; earlier versions stay intact |
| Admin settings are RPCs over the existing tables; no separate settings tables | T12 editors; every change audited |
| Migration 010 hardens function privileges: global default (new functions start closed), `my_access` signed-in only, `private` helpers granted only where policies need them | Privilege review (SEC-02): schema-level default privileges cannot revoke PostgreSQL's built-in PUBLIC execute |
| **Adding an RPC now requires** an explicit `grant execute … to authenticated` **and** adding it to the allow-list in `010_security_privileges.test.sql` | A function cannot become callable by accident |

## 11. Known gaps (debt)

| Gap | Consequence | Treatment | Reconsider when |
|---|---|---|---|
| File type is checked from the declared content type, not the file's bytes | A renamed file passes the type check | Download only, no inline preview; malware scan already deferred | Before real use |
| Removing a draft file soft-deletes the row; the Storage object stays | Orphan objects in the private bucket | Unreadable by anyone; cleanup job later | Storage size matters |
| Foreign keys without covering indexes (34, mostly actor/`*_by` columns) and one table with two permissive policies | Slower joins and policy checks at real volumes; negligible with demo data | Add indexes on the hot paths (`proposals.challenge_version_id`, `scorecards.version_id`, `notifications.proposal_id`) when real data arrives | Load beyond the demo |
| `save_draft` autosave is last-write-wins across tabs | Two tabs can overwrite each other | BCR-001 B5 (deferred) | Co-submitters |
| The first `save_draft` (no `proposal_id` yet) has no request key (BCR-001 B3: keys on submit and revision only) | A lost reply on the very first autosave, retried blindly, could create a second empty draft | Frontend never retries the first save automatically; it shows "Not saved yet" and retries only with the returned `proposal_id` (PR #16/#18). An extra empty draft is harmless: never submitted, visible only to its owner | Drafts become visible to staff, or duplicates are seen in practice |
