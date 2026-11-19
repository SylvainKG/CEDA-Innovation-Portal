import type { CaseStatus, CommandOutcome, ScreeningOutcome, ScreeningResult, StaffCase, StaffCaseRow } from './types'

/**
 * Staff port, Slice 2 (REV-01). Screens depend on this interface only.
 *
 * | Method          | Contract                                                                          |
 * |-----------------|-----------------------------------------------------------------------------------|
 * | listCases       | read `proposals` + challenge (§3: staff with `case.read_all` see submitted cases) |
 * | getCase         | read `proposals`, current `proposal_versions`, submitted `attachments`,           |
 * |                 | `case_events`, `assignments` (§3); reviewer names from `profiles` where allowed   |
 * | recordScreening | RPC `record_screening` (§4.2, needs `case.screen`)                                |
 *
 * Reads return `null` / `[]` for anything the reader may not see (RLS): "not visible" and "does not exist"
 * look the same. `record_screening` has no request key: a repeat after a lost reply is refused with
 * `INVALID_STATE` (the case already moved on), so the screen re-reads the case instead of guessing.
 */
export interface StaffPort {
  listCases(filter?: { statuses?: CaseStatus[] }): Promise<StaffCaseRow[]>
  getCase(proposalId: string): Promise<StaffCase | null>
  recordScreening(input: { proposalId: string; result: ScreeningResult; reason: string }): Promise<CommandOutcome<ScreeningOutcome>>
}
