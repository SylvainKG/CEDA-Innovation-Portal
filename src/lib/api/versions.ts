import type { VersionSnapshot } from './types'

/**
 * Versions port, INN-01 version compare.
 *
 * | Method        | Contract                                                                                    |
 * |---------------|---------------------------------------------------------------------------------------------|
 * | listVersions  | read `proposal_versions` (version_no, submitted_at, change_note, data) and the `attachments` |
 * |               | filed with each version; RLS `can_read_case` (staff with case.read_all, declared reviewers,  |
 * |               | the owner). Oldest first.                                                                   |
 *
 * Returns `null` when the case is not visible to the reader.
 */
export interface VersionsPort {
  listVersions(proposalId: string): Promise<VersionSnapshot[] | null>
}
