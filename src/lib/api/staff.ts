import type {
  AssignReviewersResult,
  CaseStatus,
  CommandOutcome,
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
}
