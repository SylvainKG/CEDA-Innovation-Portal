/**
 * Shared API types.
 *
 * Only what the approved blueprint already fixes is defined here:
 *   - roles (blueprint §4.1 `roles`)
 *   - internal case statuses and public stages (blueprint §4.3 state machine)
 *   - error codes (blueprint §4.4), plus REQUEST_CONFLICT (BCR-001 B2, signed off, pending v0.4)
 *
 * Workflow types come only from Stacey's API contract (docs/blueprint/03-api-contracts-and-permissions.md,
 * Draft for review, 16 Nov 2026, branch db/phase-0-foundation). Slice 1 is declared at the end of this file.
 * Later slices are added from the contract when their RPCs are implemented, never from guesses.
 */

export const ROLES = [
  'applicant',
  'screening_officer',
  'reviewer',
  'adjudicator',
  'admin',
  'support_consultant',
  'support_lead',
  'committee_member',
  'auditor',
] as const
export type Role = (typeof ROLES)[number]

export const STAFF_ROLES: readonly Role[] = ROLES.filter((r) => r !== 'applicant')

/** Internal case status (blueprint §4.3). */
export type CaseStatus =
  | 'draft'
  | 'submitted'
  | 'in_evaluation'
  | 'action_required'
  | 'in_adjudication'
  | 'approved'
  | 'not_approved'
  | 'awarded'
  | 'closed'

/** Kind of an open feedback request, needed to word the Action required status (spec §6). */
export type FeedbackKind = 'clarification' | 'revision'

/** The five applicant-visible stages (blueprint §4.3, spec §6). */
export type PublicStage = 'submission' | 'review' | 'feedback' | 'approval' | 'award'

/** Stable error codes returned by workflow RPCs (blueprint §4.4). */
export type ApiErrorCode =
  | 'FORBIDDEN'
  | 'INVALID_STATE'
  | 'VALIDATION'
  | 'CASE_NOT_APPROVED'
  | 'CHALLENGE_CLOSED'
  /** BCR-001 B2: the request key was already used for a different case (contract §4.1). */
  | 'REQUEST_CONFLICT'
  /** Append-only record (contract §1.1). Should never reach the UI; if it does, it is a definite refusal. */
  | 'IMMUTABLE'

/**
 * Outcome of a command as the client can observe it (evidence skill, principles 2 and 7).
 * A timeout or lost reply is `unknown`, never `failed`; the UI must keep the same request key and offer a status check.
 */
export type CommandOutcome<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'refused'; code: ApiErrorCode; message?: string; fields?: Record<string, string> }
  | { kind: 'unknown'; requestKey: string }

/** The signed-in person as the frontend sees them. Identity comes from the auth session, never from the client. */
export interface SessionUser {
  id: string
  displayName: string
  roles: Role[]
  isDemo: boolean
}

// ---------------------------------------------------------------------------------------------------
// Slice 1: draft, attachments, submit, receipt (contract §4, §4.1, §4.2, §5, §8).
// Field names stay snake_case, exactly as the RPCs return them, so the Supabase adapter needs no mapping.
// ---------------------------------------------------------------------------------------------------

/** Contract §4.2: `challenge_versions.form_schema`. */
export interface FormField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'email'
  required: boolean
  max_length?: number
  help?: string
  options?: string[]
}
export interface FormSection {
  key: string
  title: string
  fields: FormField[]
}
export interface FormSchema {
  sections: FormSection[]
}
/** Contract §4.2: `challenge_versions.required_docs`. */
export interface RequiredDoc {
  key: string
  label: string
  required: boolean
}

/**
 * A challenge with its current form (read from `challenges` + `challenge_versions`). RLS: published and closed
 * challenges for everyone; an applicant also reads the challenge their own case belongs to, even unpublished
 * (migration 011). Whether it accepts ideas depends on status AND dates: use `isChallengeOpen`.
 */
export interface ChallengeForm {
  challenge_id: string
  challenge_version_id: string
  title: string
  status: 'published' | 'closed' | 'unpublished'
  opens_at: string
  closes_at: string
  form_version: number
  form_schema: FormSchema
  required_docs: RequiredDoc[]
}

/** Form answers. `save_draft` keeps only keys the schema defines and refuses non-string values. */
export type DraftData = Record<string, string>

/** Contract §8. */
export interface SaveDraftResult {
  proposal_id: string
  saved_at: string
  title: string
}

/** Attachment row as returned by `register_attachment` (never includes `storage_path`). */
export interface AttachmentInfo {
  id: string
  filename: string
  size_bytes: number
  mime: string
  doc_key: string | null
}

/** The applicant's own working draft (read from `proposal_drafts` + `attachments`; RLS: own only). */
export interface DraftView {
  proposal_id: string
  challenge_id: string
  title: string
  data: DraftData
  files: AttachmentInfo[]
  saved_at: string
}

/** Contract §4.1 and §8. */
export interface SubmissionReceipt {
  proposal_id: string
  reference: string
  status: CaseStatus
  version_no: number
  submitted_at: string
  submitted_at_display: string
  timezone: 'Africa/Gaborone'
  challenge: { id: string; title: string }
  form_version: number
  declaration_version: string
  declaration_accepted_at: string
  files: AttachmentInfo[]
  replayed?: boolean
}

/** `get_submission_receipt`: a receipt, or `{ found: false }` (also for a case you may not see). */
export type ReceiptLookup = (SubmissionReceipt & { found: true }) | { found: false }

/** Current declaration text and version (read from `content_pages`, kind `declaration`). */
export interface DeclarationText {
  version: string
  title: string
  body_md: string
  is_sample: boolean
}

/** A challenge as listed publicly (read from `challenges`; RLS: published and closed, also `anon`). */
export interface ChallengeSummary {
  id: string
  slug: string
  title: string
  summary: string
  audience: string
  status: 'published' | 'closed' | 'unpublished'
  opens_at: string
  closes_at: string
}

/**
 * One of the applicant's own ideas, for "My ideas" (T06). Read from `proposals` (own, including drafts) with
 * its challenge, its open `feedback_requests` row (if any) and the `public_stage` of its `case_events`.
 */
export interface MyIdea {
  id: string
  /** Null while the idea is a draft. */
  reference: string | null
  title: string
  status: CaseStatus
  challenge: { id: string; title: string; closes_at: string }
  updated_at: string
  /**
   * The latest clarification or revision request while the case is waiting on the applicant
   * (`list_my_ideas()`, migration 014). `expired`: the deadline passed; the case stays `action_required` until
   * staff extend the deadline or close the case, and the applicant has nothing to answer meanwhile.
   */
  open_feedback: { kind: FeedbackKind; due_at: string; status: 'open' | 'expired' } | null
  /** Public stages reached, oldest first, with the time of the first event in each (`case_events`). */
  stages: { stage: PublicStage; at: string }[]
}

/**
 * A challenge brief (T03): the challenge, its current published version's brief and templates, and the rubric
 * criteria summary (labels, weights and guidance; never the scoring anchors). Read from `challenges`,
 * `challenge_versions` and `rubric_criteria` (§3: published rows, also `anon`).
 */
export interface ChallengeBrief {
  challenge: ChallengeSummary
  brief_md: string
  /** `challenge_versions.template_files`. No download route is in the contract yet (asked of Stacey). */
  templates: { name: string; path: string }[]
  criteria: { key: string; label: string; weight: number; guidance: string }[]
}

// ---------------------------------------------------------------------------------------------------
// T02 authentication (Supabase Auth, IAM-02/IAM-03). Refusal reasons are what the screen may say: never
// which of email or password was wrong, and never whether an account exists.
// ---------------------------------------------------------------------------------------------------

export type AuthRefusal =
  /** Email or password is incorrect (never which one). */
  | 'invalid_credentials'
  /** The account exists but the email address is not verified yet. */
  | 'email_not_confirmed'
  | 'rate_limited'
  /** The server's password rules refused the password. */
  | 'weak_password'
  /** The reset link expired or was already used (no recovery session). */
  | 'invalid_link'
  /** The server could not be reached or answered unexpectedly. */
  | 'unavailable'

export type AuthOutcome<T = null> = { kind: 'ok'; data: T } | { kind: 'refused'; reason: AuthRefusal }

export interface RegisterInput {
  fullName: string
  email: string
  organisation?: string
  password: string
  /** Version of the privacy notice the person accepted (stored by the server only if it is the current one). */
  consentVersion: string
}

/** Current privacy notice (read from `content_pages`, kind `privacy`). */
export interface PrivacyNotice {
  version: string
  title: string
  body_md: string
  is_sample: boolean
}

/** What changed in the auth session, so cached data for the previous person can be dropped. */
export type AuthChange = 'signed_in' | 'signed_out' | 'user_updated' | 'password_recovery'

// ---------------------------------------------------------------------------------------------------
// Help and information pages (T03 content variants, HLP-01): read from `content_pages` (§3: published rows,
// also `anon`). The privacy notice and declaration have their own reads (session and submission ports).
// ---------------------------------------------------------------------------------------------------

export type ContentKind = 'faq' | 'contact' | 'referral' | 'support'

export interface ContentPage {
  slug: string
  kind: ContentKind
  title: string
  body_md: string
  /** Sample wording awaiting CEDA's confirmation; the page labels it. */
  is_sample: boolean
}

// ---------------------------------------------------------------------------------------------------
// Slice 2 staff reads and screening (contract §3, §4.2; REV-01). Staff with `case.read_all` read submitted
// cases directly (never drafts); `record_screening` needs `case.screen`.
// ---------------------------------------------------------------------------------------------------

/** One row of a staff work queue (T07). */
export interface StaffCaseRow {
  id: string
  reference: string
  title: string
  status: CaseStatus
  challenge: { id: string; title: string }
  submitted_at: string
  updated_at: string
  /** Active reviewer assignments on the case (0 when the reader may not see assignments). */
  active_reviewers: number
}

/** A row of `case_events` (append-only). Staff see the reason; applicants only the public stage. */
export interface CaseEvent {
  from_status: CaseStatus | null
  to_status: CaseStatus
  public_stage: PublicStage | null
  reason: string | null
  at: string
}

/** A reviewer assignment as staff see it (no scores here). */
export interface CaseAssignment {
  id: string
  reviewer_id: string
  /** From `profiles` where the reader may see it (admins); otherwise null and the UI says "Reviewer". */
  reviewer_name: string | null
  assigned_at: string
  due_at: string | null
  declared_at: string | null
  has_conflict: boolean | null
  revoked_at: string | null
}

/** The staff case workspace (T08): the case, its current submitted version and what happened to it. */
export interface StaffCase extends StaffCaseRow {
  version: { version_no: number; submitted_at: string; data: DraftData; declaration_version: string } | null
  form_schema: FormSchema
  required_docs: RequiredDoc[]
  files: AttachmentInfo[]
  events: CaseEvent[]
  assignments: CaseAssignment[]
  /** Newest first: the active decision (draft or published) and any superseded drafts. Staff with case.read_all. */
  decisions: CaseDecision[]
  award: CaseAward | null
}

export type ScreeningResult = 'eligible' | 'ineligible'

/** `record_screening` (contract §4.2). */
export interface ScreeningOutcome {
  proposal_id: string
  status: CaseStatus
  result: ScreeningResult
}

/** A person who can be assigned to review (holds the reviewer role), with their current load (T10). */
export interface ReviewerOption {
  id: string
  name: string
  /** Active (not removed) assignments across all cases. */
  active_assignments: number
}

/** `assign_reviewers` (contract §4.2). Already-active reviewers are skipped, so a retry is safe. */
export interface AssignReviewersResult {
  proposal_id: string
  assigned: { assignment_id: string; reviewer_id: string }[]
  already_assigned: { assignment_id: string; reviewer_id: string }[]
  active_reviewers: number
}

/** An internal staff note on a case (contract §3, §4.2). Never readable by the applicant. */
export interface InternalNote {
  id: string
  author_id: string
  /** From `profiles` where the reader may see it (admins); otherwise null. */
  author_name: string | null
  /** Written by the person reading. */
  mine: boolean
  body: string
  created_at: string
}

// ---------------------------------------------------------------------------------------------------
// Slice 3 reviewer side (contract §4.3; REV-02, REV-03, D-11, D-19, D-20).
// ---------------------------------------------------------------------------------------------------

export type MyReviewStatus = 'declaration_needed' | 'not_started' | 'in_progress' | 'submitted'

/** A row of `my_review_queue()`: enough to recognise a conflict before declaring, no proposal text. */
export interface ReviewQueueRow {
  assignment_id: string
  proposal_id: string
  reference: string
  title: string
  challenge_title: string
  applicant_organisation: string | null
  version_no: number | null
  due_at: string | null
  case_status: CaseStatus
  my_status: MyReviewStatus
}

/** A published rubric criterion (D-20: scores 1–5; anchor text for some values). */
export interface RubricCriterion {
  id: string
  key: string
  label: string
  weight: number
  guidance: string
  /** Anchor text by score, e.g. { "1": "Not demonstrated", "5": "Fully demonstrated with evidence" }. */
  anchors: Record<string, string>
}

export interface ScoreItem {
  criterion_id: string
  score: number
  reason: string
}

/** The reviewer's own scorecard on the case's current version. */
export interface MyScorecard {
  id: string
  status: 'draft' | 'submitted'
  overall_comment: string
  submitted_at: string | null
  items: ScoreItem[]
}

/** Everything the scoring screen needs. The proposal is present only once the reviewer has declared. */
export interface ReviewWorkspace {
  row: ReviewQueueRow
  proposal: { version_no: number; data: DraftData; form_schema: FormSchema; files: AttachmentInfo[] } | null
  criteria: RubricCriterion[]
  scorecard: MyScorecard | null
}

export interface DeclareResult {
  assignment_id: string
  has_conflict: boolean
  revoked: boolean
  replayed: boolean
}

export interface ScorecardResult {
  scorecard_id: string
  status: 'draft' | 'submitted'
  weighted_score: number | null
  saved_at?: string
  submitted_at?: string
  submitted_count?: number
  quorum?: number
  quorum_reached?: boolean
  replayed?: boolean
}

/** `get_score_panel` (contract §4.3): every submitted scorecard on a version, side by side. */
export interface ScorePanel {
  proposal_id: string
  reference: string
  version_id: string
  version_no: number
  criteria: { criterion_id: string; key: string; label: string; weight: number; anchors: Record<string, string> }[]
  scorecards: {
    scorecard_id: string
    assignment_id: string
    reviewer_id: string
    reviewer_name: string | null
    submitted_at: string
    overall_comment: string
    weighted_score: number | null
    items: { criterion_id: string; score: number; reason: string }[]
  }[]
  /** Per criterion; `flagged` when its scores differ by `spread_flag_threshold` or more (BCR-001 B7). */
  criteria_summary: { criterion_id: string; key: string; mean: number; min: number; max: number; spread: number; flagged: boolean }[]
  aggregate: { mean_weighted: number | null; min_weighted: number | null; max_weighted: number | null; spread: number | null; flagged: boolean } | null
  submitted_count: number
  quorum: number
  spread_flag_threshold: number
}

// ---------------------------------------------------------------------------------------------------
// Slice 5: decision, award, closure (contract §4.5; DEC-01, DEC-02, D-05, N4, N5).
// ---------------------------------------------------------------------------------------------------

export type DecisionOutcome = 'approved' | 'not_approved'

/** A recorded decision. Unpublished ones are staff-only; superseded drafts are kept for the record. */
export interface CaseDecision {
  id: string
  outcome: DecisionOutcome
  reason: string
  recorded_at: string
  published_at: string | null
  superseded_at: string | null
  /** Recorded on the case's current version (a draft on an earlier version cannot be published). */
  on_current_version: boolean
}

/** The award (append-only), in thebe: BWP 1.00 = 100. */
export interface CaseAward {
  id: string
  amount_minor: number
  currency: 'BWP'
  description: string
  recorded_at: string
}

/**
 * The applicant's own submitted case (T08 applicant view). Only what the applicant may see: public stages,
 * the closure reason (promised by the contract), and a decision only once published (N4).
 */
export interface MyCase {
  id: string
  reference: string
  title: string
  status: CaseStatus
  challenge: { id: string; title: string }
  submitted_at: string
  version: { version_no: number; data: DraftData; form_schema: FormSchema; files: AttachmentInfo[] } | null
  /** Public stages reached, oldest first, with the time of the first event in each. */
  stages: { stage: PublicStage; at: string }[]
  closed_reason: string | null
  decision: { outcome: DecisionOutcome; reason: string; published_at: string } | null
  award: { amount_minor: number; description: string; recorded_at: string } | null
}
