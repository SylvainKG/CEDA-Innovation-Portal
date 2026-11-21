import type { CommitteePort } from '../committee'
import type { CaseStatusRow, Role } from '../types'
import { mockSession } from './session'

/** MOCK committee adapter (D-08): status only, derived from the shared mock case state. */
const STATUS: readonly Role[] = ['committee_member', 'screening_officer', 'adjudicator', 'admin']
const COUNTS: readonly Role[] = [...STATUS]

async function allowed(roles: readonly Role[]) {
  const user = await mockSession.getSession()
  return Boolean(user?.roles.some((r) => roles.includes(r)))
}

async function rows(challengeId?: string): Promise<CaseStatusRow[]> {
  const { mockStaffInternals } = await import('./staff')
  return mockStaffInternals
    .cases()
    .filter((c) => !challengeId || c.challenge.id === challengeId)
    .map((c) => ({ reference: c.reference, challenge_title: c.challenge.title, public_stage: mockStaffInternals.publicStage(c.status) ?? c.status, last_update: c.updated_at }))
    .sort((a, b) => b.last_update.localeCompare(a.last_update))
}

export const mockCommittee: CommitteePort = {
  async listStatus(challengeId) {
    if (!(await allowed(STATUS))) return null
    return rows(challengeId)
  },
  async stageCounts(challengeId) {
    if (!(await allowed(COUNTS))) return null
    const out: Record<string, number> = {}
    for (const r of await rows(challengeId)) out[r.public_stage] = (out[r.public_stage] ?? 0) + 1
    return out
  },
}
