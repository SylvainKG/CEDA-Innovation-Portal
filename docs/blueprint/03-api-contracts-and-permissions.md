# API contracts and permission matrix

**Owner:** Stacey (author) · **Reviewer:** Obvious · **Status:** Draft for review · 16 Nov 2026 · **Updated:** 18 Nov 2026 (Slice 3)
**Implements:** blueprint v0.3 §4 (data model, state machine, RPC summary), D-02, D-07, D-12, D-17; BCR-001 B2, B4, B9, B10 (applied as recommended, pending sign-off)
**Code:** `supabase/migrations/`, `supabase/functions/`, `supabase/seed.sql`, tests in `supabase/tests/database/`

| Part | Status |
|---|---|
| Phase 0: schema, RLS, triggers, `has_permission()`, `health()`, `my_access()`, seed | Implemented — not verified on Supabase. Passed on the PGlite stand-in (§9) |
| Slice 1: `save_draft`, `submit_proposal`, `get_submission_receipt`, attachments, `record_consent` | Implemented — not verified on Supabase. Passed on the PGlite stand-in (§9) |
| `attachment-url` Edge Function | Implemented — not verified (not run anywhere yet) |
| Slice 2: `record_screening`, `assign_reviewers`, `revoke_assignment`, `grant_role`, `revoke_role`, `add_internal_note`, `list_case_status`, `case_stage_counts` | Implemented — not verified on Supabase. Passed on the PGlite stand-in (§9) |
| Slice 3: `declare_assignment`, `save_scorecard`, `submit_scorecard`, `get_score_panel`, `my_review_queue`, `mark_notifications_read`, quorum, Realtime, rubric locks | Implemented — not verified on Supabase. Passed on the PGlite stand-in (§9) |
| Slices 4–6 | Proposed signatures only (§7) |
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
| `submit_proposal` | `proposal.submit` | `p_proposal_id uuid`, `p_client_request_id uuid`, `p_declaration_version text` | Receipt (§4.1) + `replayed: boolean` | `FORBIDDEN` (not yours / email not verified), `VALIDATION` (fields, `doc:*`, `consent`, `declaration`), `CHALLENGE_CLOSED`, `INVALID_STATE`, `REQUEST_CONFLICT` | V1, reference, file binding, case event, audit, notification (+ outbox if opted in) |
| `get_submission_receipt` | signed in | exactly one of `p_proposal_id` / `p_client_request_id`; `p_version_no int?` | Receipt + `found: true`, or `{ found: false }` | `VALIDATION` | — |
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
| 4 | `request_feedback` | `p_proposal_id`, `p_kind`, `p_message`, `p_due_at`, `p_tasks text[]?` | |
| 4 | `respond_clarification` | `p_feedback_request_id`, `p_text` (10–1,000 chars) | |
| 4 | `submit_revision` | `p_proposal_id`, `p_client_request_id`, `p_change_note`, `p_task_responses [{task_id, status, explanation}]`, `p_declaration_version` | Idempotent (BCR-001 B9) |
| 4 | `verify_feedback_task` | `p_task_id`, `p_assignment_id`, `p_result`, `p_note` | |
| 5 | `record_decision`, `publish_decision`, `record_award`, `close_case` | | See §6 |
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
| `002_slice1_submit.test.sql`: draft, attachments, submit, idempotency, `REQUEST_CONFLICT`, receipt lookup, N1, N2, N3, N6, N7, N9, verification, consent, sign-up | Same | Passed, 56/56 |
| `003_slice2_screen_assign.test.sql`: screening both ways, assignment rules and retries, revocation, roles incl. N8 refused + audited, notes hidden from applicants, committee view (D-08), N3, N7, N10 | Same | Passed, 56/56 |
| Mutation checks (Slice 2): drop the self-grant constraint; let any signed-in user hold every permission | Same | Each caught (1 and 18 failures) |
| `004_slice3_evaluate.test.sql`: declaration gate (N10), conflict (N11), draft and submit rules, retry, peer isolation, quorum → adjudication, panel arithmetic and spread flag, queue, notifications, rubric and form locks, Realtime publication | Same | Passed, 61/61 |
| Mutation checks (Slice 3): quorum set out of reach; declaration no longer required to read the case | Same | Each caught (5 and 4 failures) |
| Realtime delivery to a second browser (live-update leak test) | Staging, two browser contexts | **Not run** (Sylvain, Playwright) |
| Mutation checks: open `can_read_case`, skip MFA, open peer view, drop version trigger | Same | Each caught (12, 1, 2 and 3 failures) |
| Same suites on the Supabase stack (`supabase db reset && supabase test db`) | Local Docker / CI stage 3 | **Not run.** No Docker on Stacey's machine; CI stage 3 not added yet |
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

## 11. Known gaps (debt)

| Gap | Consequence | Treatment | Reconsider when |
|---|---|---|---|
| File type is checked from the declared content type, not the file's bytes | A renamed file passes the type check | Download only, no inline preview; malware scan already deferred | Before real use |
| Removing a draft file soft-deletes the row; the Storage object stays | Orphan objects in the private bucket | Unreadable by anyone; cleanup job later | Storage size matters |
| `save_draft` autosave is last-write-wins across tabs | Two tabs can overwrite each other | BCR-001 B5 (deferred) | Co-submitters |
