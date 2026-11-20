import type {
  AssignReviewersResult,
  CaseStatus,
  DecisionOutcome,
  CommandOutcome,
  InternalNote,
  ReviewerOption,
  ScreeningOutcome,
  ScreeningResult,
  StaffCase,
  StaffCaseRow,
} from './types'

/**
 * Staff port, Slice 2 (REV-01, IAM-01). Screens depend on this interface only.
 *
 * | Method           | Contract                                                                          |
 * |------------------|-----------------------------------------------------------------------------------|
 * | listCases        | read `proposals` + challenge + active `assignments` (§3: `case.read_all` sees     |
 * |                  | submitted cases, never drafts)                                                    |
 * | getCase          | read `proposals`, current `proposal_versions`, submitted `attachments`,           |
 * |                  | `case_events`, `assignments` (§3); reviewer names from `profiles` where allowed   |
 * | recordScreening  | RPC `record_screening` (§4.2, `case.screen`)                                      |
 * | listReviewers    | read active `user_roles` with role `reviewer` + `profiles` (admins: `role.manage`) |
 * |                  | and active `assignments` for each reviewer's load                                 |
 * | assignReviewers  | RPC `assign_reviewers` (§4.2, `case.assign`)                                      |
 * | revokeAssignment | RPC `revoke_assignment` (§4.2, `case.assign`)                                     |
 * | listNotes        | read `internal_notes` (§3, `case.note`; never the applicant)                    |
 * | addNote          | RPC `add_internal_note` (§4.2, `case.note`)                                     |
 * | recordDecision   | RPC `record_decision` (§4.5, adjudicator). Unpublished; supersedes an earlier draft |
 * | publishDecision  | RPC `publish_decision` (§4.5, adjudicator). Notifies the applicant; cannot be undone  |
 * | recordAward      | RPC `record_award` (§4.5, admin, D-05). The same award again is replayed          |
 * | closeCase        | RPC `close_case` (§4.5, screening officer or adjudicator)                       |
 *
 * Reads return `null` / `[]` for anything the reader may not see (RLS). None of these commands carries a
 * request key: `record_screening` and `revoke_assignment` refuse a repeat with `INVALID_STATE`, and
 * `assign_reviewers` skips reviewers already assigned, so after a lost reply the screen re-reads the case.
 */
export interface StaffPort {
  listCases(filter?: { statuses?: CaseStatus[] }): Promise<StaffCaseRow[]>
  getCase(proposalId: string): Promise<StaffCase | null>
  recordScreening(input: { proposalId: string; result: ScreeningResult; reason: string }): Promise<CommandOutcome<ScreeningOutcome>>
  listReviewers(): Promise<ReviewerOption[]>
  assignReviewers(input: { proposalId: string; reviewerIds: string[]; dueAt?: string }): Promise<CommandOutcome<AssignReviewersResult>>
  revokeAssignment(input: { assignmentId: string; reason: string }): Promise<CommandOutcome<{ assignment_id: string; revoked: true }>>
  listNotes(proposalId: string): Promise<InternalNote[]>
  addNote(input: { proposalId: string; body: string }): Promise<CommandOutcome<{ id: string; created_at: string }>>
  recordDecision(input: { proposalId: string; outcome: DecisionOutcome; reason: string }): Promise<CommandOutcome<{ decision_id: string; outcome: DecisionOutcome; published: false; case_status: CaseStatus }>>
  publishDecision(input: { decisionId: string }): Promise<CommandOutcome<{ decision_id: string; outcome: DecisionOutcome; published_at: string; case_status: CaseStatus }>>
  recordAward(input: { proposalId: string; amountMinor: number; description: string }): Promise<CommandOutcome<{ award_id: string; amount_minor: number; currency: 'BWP'; case_status: CaseStatus; replayed: boolean }>>
  closeCase(input: { proposalId: string; reason: string }): Promise<CommandOutcome<{ proposal_id: string; case_status: CaseStatus }>>
}
