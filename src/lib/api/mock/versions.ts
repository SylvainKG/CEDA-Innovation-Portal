import type { Role, StaffCase, VersionFile, VersionSnapshot } from '../types'
import type { VersionsPort } from '../versions'
import { mockSession } from './session'

/**
 * MOCK versions adapter (INN-01): development and demo preview only. Earlier versions come from the staff mock's
 * history (kept when a revision is submitted on a seeded case). Access follows `can_read_case`: staff who read all
 * cases, a reviewer with a declared assignment, or the owner.
 */
const READ_ALL: readonly Role[] = ['screening_officer', 'adjudicator', 'admin']

const files = (list: StaffCase['files']): VersionFile[] => list.map((f) => ({ doc_key: f.doc_key, filename: f.filename, size_bytes: f.size_bytes, sha256: f.id }))

export const mockVersions: VersionsPort = {
  async listVersions(proposalId) {
    const user = await mockSession.getSession()
    if (!user) return null
    const { mockStaffInternals } = await import('./staff')
    const { mockFeedbackInternals } = await import('./feedback')
    const { mockOwnsCase } = await import('./submission')
    const c = mockStaffInternals.cases().find((x) => x.id === proposalId)
    if (!c || !c.version) return null
    const seedId = mockStaffInternals.seedReviewerId(user.id)
    const declared = c.assignments.some((a) => a.reviewer_id === seedId && !a.revoked_at && a.declared_at)
    const ok = user.roles.some((r) => READ_ALL.includes(r)) || (user.roles.includes('reviewer') && declared) || (user.roles.includes('applicant') && mockOwnsCase(user.id, proposalId))
    if (!ok) return null
    const note = (v: number) => mockFeedbackInternals.changeNotes().get(`${proposalId}:${v}`) ?? null
    const earlier = mockStaffInternals.history(proposalId).map(
      (h): VersionSnapshot => ({ version_no: h.version.version_no, submitted_at: h.version.submitted_at, change_note: note(h.version.version_no), data: { ...h.version.data }, files: files(h.files) }),
    )
    return [...earlier, { version_no: c.version.version_no, submitted_at: c.version.submitted_at, change_note: note(c.version.version_no), data: { ...c.version.data }, files: files(c.files) }]
  },
}
