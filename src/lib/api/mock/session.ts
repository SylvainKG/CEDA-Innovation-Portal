import type { SessionPort } from '../session'
import type { Role, SessionUser } from '../types'

/**
 * MOCK session adapter: development only. It lets the team preview each role's shell and navigation
 * before Supabase Auth exists. It is not authentication and grants no access to anything:
 * every permission is enforced by the server (RLS + RPC checks) once the backend lands.
 *
 * Personas are the fictional demo accounts from blueprint §3.1.
 */
const DEMO_USERS: Record<Role, SessionUser> = {
  applicant: { id: 'demo-applicant-a', displayName: 'Demo Applicant A', roles: ['applicant'], isDemo: true },
  screening_officer: { id: 'demo-screening', displayName: 'Demo Screening Officer', roles: ['screening_officer'], isDemo: true },
  reviewer: { id: 'demo-reviewer-1', displayName: 'Demo Reviewer 1', roles: ['reviewer'], isDemo: true },
  adjudicator: { id: 'demo-adjudicator', displayName: 'Demo Adjudicator', roles: ['adjudicator'], isDemo: true },
  admin: { id: 'demo-admin', displayName: 'Demo Administrator', roles: ['admin', 'auditor'], isDemo: true },
  support_consultant: { id: 'demo-consultant', displayName: 'Demo Consultant', roles: ['support_consultant'], isDemo: true },
  support_lead: { id: 'demo-support-lead', displayName: 'Demo Consultant (lead)', roles: ['support_consultant', 'support_lead'], isDemo: true },
  committee_member: { id: 'demo-committee', displayName: 'Demo Committee (External)', roles: ['committee_member'], isDemo: true },
  auditor: { id: 'demo-auditor', displayName: 'Demo Auditor', roles: ['auditor'], isDemo: true },
}

const STORAGE_KEY = 'ceda.mock.role'

function readStoredRole(): Role | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value && value in DEMO_USERS ? (value as Role) : null
  } catch {
    return null
  }
}

export const mockSession: SessionPort = {
  async getSession() {
    const role = readStoredRole()
    return role ? DEMO_USERS[role] : null
  },
  async switchDemoRole(role) {
    try {
      if (role) window.localStorage.setItem(STORAGE_KEY, role)
      else window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage can be unavailable (private mode); the session then lasts for this page only.
    }
    return role ? DEMO_USERS[role] : null
  },
}

export const MOCK_ROLE_OPTIONS = Object.keys(DEMO_USERS) as Role[]

/** Which mock persona a session user is (by id), for the development-only switcher. */
export function mockRoleOf(userId: string | undefined): Role | undefined {
  return MOCK_ROLE_OPTIONS.find((role) => DEMO_USERS[role].id === userId)
}
