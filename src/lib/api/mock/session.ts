import type { SessionPort } from '../session'
import type { AuthChange, AuthOutcome, PrivacyNotice, Role, SessionUser } from '../types'

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

/**
 * The seed's demo sign-in emails (blueprint §3.1), so the sign-in screen can be tried in mock mode.
 * The adjudicator, consultant and committee accounts were absorbed into the Administrator
 * (migration 017): the admin account now performs decisions, support chat and committee oversight.
 */
const DEMO_EMAILS: Record<string, Role> = {
  'applicant.a@demo.ceda-portal.test': 'applicant',
  'screening@demo.ceda-portal.test': 'screening_officer',
  'reviewer.1@demo.ceda-portal.test': 'reviewer',
  'admin@demo.ceda-portal.test': 'admin',
}
/** Mock only: this address behaves like an account whose email is not verified yet. */
export const MOCK_UNVERIFIED_EMAIL = 'unverified@demo.ceda-portal.test'
/** Mock only: this password is refused, to preview the wrong-credentials state. */
export const MOCK_WRONG_PASSWORD = 'wrong-password'

export const MOCK_PRIVACY_NOTICE: PrivacyNotice = {
  version: 'sample-2026-11-v1',
  title: 'Privacy notice',
  body_md:
    '**Sample — awaiting CEDA confirmation.**\n\nThis demonstration portal stores the details you enter so that CEDA staff can assess your idea. ' +
    'It is designed with reference to the Data Protection Act, 2024. All data in this demo is fictional and is deleted after judging.',
  is_sample: true,
}

const listeners = new Set<(change: AuthChange) => void>()
const ok = <T,>(data: T): AuthOutcome<T> => ({ kind: 'ok', data })

function readStoredRole(): Role | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value && value in DEMO_USERS ? (value as Role) : null
  } catch {
    return null
  }
}

function storeRole(role: Role | null) {
  try {
    if (role) window.localStorage.setItem(STORAGE_KEY, role)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode); the session then lasts for this page only.
  }
}

/**
 * Mock sign-in is NOT authentication: any password except MOCK_WRONG_PASSWORD signs a demo email in as its
 * persona. It exists so the T02 screens and their states can be built and tested without a backend.
 */
export const mockSession: SessionPort = {
  async getSession() {
    const role = readStoredRole()
    return role ? DEMO_USERS[role] : null
  },
  async signIn({ email, password }) {
    const address = email.trim().toLowerCase()
    if (address === MOCK_UNVERIFIED_EMAIL && password !== MOCK_WRONG_PASSWORD) return { kind: 'refused', reason: 'email_not_confirmed' }
    const role = DEMO_EMAILS[address]
    if (!role || password === MOCK_WRONG_PASSWORD) return { kind: 'refused', reason: 'invalid_credentials' }
    storeRole(role)
    return ok(DEMO_USERS[role])
  },
  async register() {
    // Nothing is created: the mock has no accounts. The screen then says "check your email", as for real.
    return ok(null)
  },
  async resendVerification() {
    return ok(null)
  },
  async requestPasswordReset() {
    return ok(null)
  },
  async updatePassword(password) {
    return password.length < 10 ? { kind: 'refused', reason: 'weak_password' } : ok(null)
  },
  async signOut() {
    storeRole(null)
    for (const listener of listeners) listener('signed_out')
  },
  async getPrivacyNotice() {
    return MOCK_PRIVACY_NOTICE
  },
  onChange(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  async switchDemoRole(role) {
    storeRole(role)
    return role ? DEMO_USERS[role] : null
  },
}

export const MOCK_ROLE_OPTIONS = Object.keys(DEMO_USERS) as Role[]

/** Which mock persona a session user is (by id), for the development-only switcher. */
export function mockRoleOf(userId: string | undefined): Role | undefined {
  return MOCK_ROLE_OPTIONS.find((role) => DEMO_USERS[role].id === userId)
}
