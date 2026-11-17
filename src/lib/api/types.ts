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
  /** The open clarification or revision request, if the case is waiting on the applicant. */
  open_feedback: { kind: FeedbackKind; due_at: string } | null
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
