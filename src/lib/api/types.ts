/**
 * Shared API types.
 *
 * Only what the approved blueprint already fixes is defined here:
 *   - roles (blueprint §4.1 `roles`)
 *   - internal case statuses and public stages (blueprint §4.3 state machine)
 *   - error codes (blueprint §4.4), plus REQUEST_CONFLICT (BCR-001 B2, signed off, pending v0.4)
 *
 * Workflow operations (save_draft, submit_proposal, record_screening, …) are deliberately NOT declared yet:
 * their signatures belong to Stacey's API contract (docs/blueprint/03-api-contracts-and-permissions.md),
 * which does not exist yet. Add them here from that contract, never from guesses.
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
  /** BCR-001 B2 (signed off by Obvious, pending blueprint v0.4): same request key, different content. */
  | 'REQUEST_CONFLICT'

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
