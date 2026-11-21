import type { CaseStatusRow } from './types'

/**
 * Committee port, D-08 (status only; least privilege).
 *
 * | Method       | Contract                                                                          |
 * |--------------|-----------------------------------------------------------------------------------|
 * | listStatus   | RPC `list_case_status(p_challenge_id)` (case.read_status or case.read_all)        |
 * | stageCounts  | RPC `case_stage_counts(p_challenge_id)` (also report.read)                        |
 *
 * Both return `null` when the person may not read them. Neither carries proposal text, scores or notes.
 */
export interface CommitteePort {
  listStatus(challengeId?: string): Promise<CaseStatusRow[] | null>
  stageCounts(challengeId?: string): Promise<Record<string, number> | null>
}
