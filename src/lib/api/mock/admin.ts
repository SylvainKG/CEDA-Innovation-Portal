import type { AdminPort } from '../admin'
import { fromRpcError, rpcError } from '../errors'
import { isActiveRole, type AdminUser, type CommandOutcome, type Role, type RoleOption } from '../types'
import { mockSession } from './session'

/**
 * MOCK admin adapter (T12 users and roles): development and demo preview only. Lists the demo accounts and follows
 * the contract's rules: only role.manage (admin) may grant, revoke or invite; nobody may change their own roles;
 * granting a held role is a no-op; revoking needs a reason. Changes here don't change what a demo persona can do.
 */

const ROLES: RoleOption[] = [
  { key: 'applicant', label: 'Applicant', requires_mfa: false },
  { key: 'screening_officer', label: 'Screening officer', requires_mfa: true },
  { key: 'reviewer', label: 'Reviewer', requires_mfa: true },
  { key: 'adjudicator', label: 'Adjudicator', requires_mfa: true },
  { key: 'admin', label: 'Administrator', requires_mfa: true },
  { key: 'support_consultant', label: 'Support consultant', requires_mfa: true },
  { key: 'support_lead', label: 'Support lead', requires_mfa: true },
  { key: 'committee_member', label: 'Committee member', requires_mfa: false },
  { key: 'auditor', label: 'Auditor', requires_mfa: true },
]

const u = (id: string, full_name: string, roles: string[], organisation: string | null = null): AdminUser => ({
  id,
  full_name,
  email: `${id.replace('demo-', '')}@demo.ceda-portal.test`,
  organisation,
  is_demo: true,
  roles,
})

// The adjudicator, support consultant/lead and committee demo accounts were absorbed into
// the Administrator (migration 017); the admin now performs decisions, support chat and
// committee oversight, so only the active roles keep demo accounts.
const seed = (): AdminUser[] => [
  u('demo-applicant-a', 'Demo Applicant A', ['applicant'], 'Lesedi Agro Demo'),
  u('demo-screening', 'Demo Screening Officer', ['screening_officer']),
  u('demo-reviewer-1', 'Demo Reviewer 1', ['reviewer']),
  u('demo-reviewer-2', 'Demo Reviewer 2', ['reviewer']),
  u('demo-admin', 'Demo Administrator', ['admin', 'auditor']),
  u('demo-auditor', 'Demo Auditor', ['auditor']),
]

const state = { users: seed(), latencyMs: import.meta.env.MODE === 'test' ? 0 : 200 }

/** Test and demo helpers. Not part of the port; screens must never import these. */
export const mockAdminControls = {
  reset() {
    state.users = seed()
  },
}

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, state.latencyMs))
const refused = (...args: Parameters<typeof rpcError>): CommandOutcome<never> => fromRpcError(rpcError(...args))

async function manager() {
  const user = await mockSession.getSession()
  return user?.roles.includes('admin') ? user : null
}

export const mockAdmin: AdminPort = {
  async listRoles() {
    await wait()
    // Absorbed roles (adjudicator, support consultant/lead, committee) are no longer offered.
    return ROLES.filter((r) => isActiveRole(r.key as Role)).map((r) => ({ ...r }))
  },

  async listUsers() {
    await wait()
    if (!(await manager())) return null
    return state.users.map((x) => ({ ...x, roles: [...x.roles] })).sort((a, b) => a.full_name.localeCompare(b.full_name))
  },

  async grantRole({ userId, roleKey }) {
    await wait()
    const me = await manager()
    if (!me) return refused('FORBIDDEN', "You don't have access to this action.")
    if (userId === me.id) return refused('FORBIDDEN', "You can't grant a role to yourself. Ask another administrator.")
    if (!ROLES.some((r) => r.key === roleKey)) return refused('VALIDATION', 'Choose a role.', { role_key: 'Unknown role' })
    const target = state.users.find((x) => x.id === userId)
    if (!target) return refused('VALIDATION', 'Choose a registered user.', { user_id: 'Unknown user' })
    if (target.roles.includes(roleKey)) return { kind: 'ok', data: { already: true } }
    target.roles.push(roleKey)
    return { kind: 'ok', data: { already: false } }
  },

  async revokeRole({ userId, roleKey, reason }) {
    await wait()
    const me = await manager()
    if (!me) return refused('FORBIDDEN', "You don't have access to this action.")
    if (userId === me.id) return refused('FORBIDDEN', "You can't change your own roles. Ask another administrator.")
    const why = reason.trim()
    if (!why || [...why].length > 500) return refused('VALIDATION', 'Give a reason (up to 500 characters).', { reason: 'Give a reason (up to 500 characters)' })
    const target = state.users.find((x) => x.id === userId)
    if (!target || !target.roles.includes(roleKey)) return refused('INVALID_STATE', 'This person does not hold that role.')
    target.roles = target.roles.filter((r) => r !== roleKey)
    return { kind: 'ok', data: { user_role_id: crypto.randomUUID() } }
  },

  async invite({ email, fullName, roleKey }) {
    await wait()
    if (!(await manager())) return refused('FORBIDDEN', "You don't have access to this action.")
    const e = email.trim().toLowerCase()
    const fields: Record<string, string> = {}
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) fields.email = 'Enter an email address like name@example.org'
    if (!fullName.trim()) fields.full_name = 'Enter their full name'
    if (!ROLES.some((r) => r.key === roleKey && r.key !== 'applicant')) fields.role_key = 'Choose a staff role'
    if (Object.keys(fields).length) return refused('VALIDATION', 'Some details need attention.', fields)
    let target = state.users.find((x) => x.email === e)
    const invited = !target
    if (!target) {
      target = { id: crypto.randomUUID(), full_name: fullName.trim(), email: e, organisation: null, is_demo: true, roles: [] }
      state.users.push(target)
    }
    const already = target.roles.includes(roleKey)
    if (!already) target.roles.push(roleKey)
    return { kind: 'ok', data: { user_id: target.id, invited, already_had_role: already } }
  },
}
