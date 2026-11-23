import type { ConfigAdminPort } from '../config-admin'
import { fromRpcError, rpcError } from '../errors'
import { isActiveRole, type AdminRole, type CommandOutcome, type PermissionOption, type Role } from '../types'
import { mockContentInternals } from './content'
import { mockSession } from './session'

/**
 * MOCK config admin (T12 roles and content): development and demo preview only. Roles and permissions mirror the
 * seed (migration 001); content edits change the same pages the public help pages show. Rules follow migration
 * 008: admin only; built-in roles keep their permissions; permissions come from the list; privacy and declaration
 * wording needs a version, and a new one when it changes. New roles don't change what a demo persona can do.
 */
const PERMISSIONS: PermissionOption[] = [
  ['proposal.submit', 'Create drafts and submit own proposals'],
  ['case.read_all', 'Read every submitted case (not drafts)'],
  ['case.read_status', 'Read case reference, stage and counts only (D-08)'],
  ['case.screen', 'Record a screening result'],
  ['case.assign', 'Assign and revoke reviewers'],
  ['case.request_feedback', 'Request a clarification or revision'],
  ['case.close', 'Close a case with a reason'],
  ['case.note', 'Write and read internal notes'],
  ['scorecard.submit', 'Score assigned cases'],
  ['scorecard.read_panel', 'Read every scorecard on a case (panel view)'],
  ['decision.record', 'Record a decision'],
  ['decision.publish', 'Publish a recorded decision'],
  ['award.record', 'Record an award (D-05)'],
  ['role.manage', 'Grant and revoke roles'],
  ['config.manage', 'Manage challenges, forms, rubrics and content'],
  ['audit.read', 'Read the audit trail'],
  ['report.read', 'Read programme reports'],
  ['chat.start', 'Start a support chat'],
  ['chat.handle', 'Handle support chat sessions'],
  ['chat.stats', 'Read chat statistics'],
].map(([key, description]) => ({ key: key!, description: description! }))

const r = (key: string, label: string, requires_mfa: boolean, permissions: string[]): AdminRole => ({ key, label, is_system: true, requires_mfa, permissions: permissions.sort() })
const seedRoles = (): AdminRole[] => [
  r('applicant', 'Applicant', false, ['proposal.submit', 'chat.start']),
  r('screening_officer', 'Screening officer', true, ['case.read_all', 'case.screen', 'case.request_feedback', 'case.close', 'case.note']),
  r('reviewer', 'Reviewer', true, ['scorecard.submit', 'case.request_feedback', 'case.note']),
  r('adjudicator', 'Adjudicator', true, ['case.read_all', 'case.request_feedback', 'case.close', 'case.note', 'scorecard.read_panel', 'decision.record', 'decision.publish', 'report.read']),
  // Administrator absorbed the adjudicator, support consultant/lead and committee roles (migration 017).
  r('admin', 'Administrator', true, [
    'case.read_all',
    'case.assign',
    'case.note',
    'case.request_feedback',
    'case.close',
    'scorecard.read_panel',
    'decision.record',
    'decision.publish',
    'award.record',
    'role.manage',
    'config.manage',
    'report.read',
    'audit.read',
    'chat.handle',
    'chat.stats',
  ]),
  r('support_consultant', 'Support consultant', true, ['chat.handle']),
  r('support_lead', 'Support lead', true, ['chat.handle', 'chat.stats']),
  r('committee_member', 'Committee member', false, ['case.read_status']),
  r('auditor', 'Auditor', true, ['audit.read']),
]

const state = { roles: seedRoles() }
export const mockConfigAdminControls = {
  reset() {
    state.roles = seedRoles()
    mockContentInternals.reset()
  },
}

const refused = (...args: Parameters<typeof rpcError>): CommandOutcome<never> => fromRpcError(rpcError(...args))
const admin = async () => Boolean((await mockSession.getSession())?.roles.includes('admin'))
const NO = () => refused('FORBIDDEN', "You don't have access to this action.")

function checkPermissions(list: string[]) {
  const bad = list.find((p) => !PERMISSIONS.some((x) => x.key === p))
  return bad ? refused('VALIDATION', 'Choose permissions from the list.', { permissions: `Unknown permission: ${bad}` }) : null
}

export const mockConfigAdmin: ConfigAdminPort = {
  async roleSetup() {
    // Absorbed roles stay in state for history but are not shown in the roles editor (migration 017).
    const roles = structuredClone(state.roles).filter((role) => isActiveRole(role.key as Role))
    return { roles, permissions: PERMISSIONS.map((p) => ({ ...p })) }
  },

  async createRole({ key, label, permissions, requiresMfa }) {
    if (!(await admin())) return NO()
    if (!/^[a-z][a-z0-9_]{1,40}$/.test(key)) return refused('VALIDATION', 'Use lowercase letters, numbers and underscores for the role key.', { key: 'Lowercase letters, numbers and underscores' })
    if (state.roles.some((x) => x.key === key)) return refused('VALIDATION', 'A role with this key already exists.', { key: 'Already exists' })
    if (!label.trim() || [...label.trim()].length > 80) return refused('VALIDATION', 'Give the role a name (up to 80 characters).', { label: 'Give the role a name (up to 80 characters)' })
    const bad = checkPermissions(permissions)
    if (bad) return bad
    state.roles.push({ key, label: label.trim(), is_system: false, requires_mfa: requiresMfa, permissions: [...new Set(permissions)].sort() })
    return { kind: 'ok', data: { key } }
  },

  async setRolePermissions(key, permissions) {
    if (!(await admin())) return NO()
    const role = state.roles.find((x) => x.key === key)
    if (!role) return refused('VALIDATION', 'Choose a role.', { role_key: 'Unknown role' })
    if (role.is_system) return refused('INVALID_STATE', 'Built-in roles keep their permissions. Create a new role instead.')
    const bad = checkPermissions(permissions)
    if (bad) return bad
    role.permissions = [...new Set(permissions)].sort()
    return { kind: 'ok', data: { key } }
  },

  async listContent() {
    if (!(await admin())) return []
    return structuredClone(mockContentInternals.pages()).sort((a, b) => a.kind.localeCompare(b.kind) || a.position - b.position)
  },

  async saveContent(i) {
    if (!(await admin())) return NO()
    if (!/^[a-z0-9][a-z0-9-]{1,80}$/.test(i.slug)) return refused('VALIDATION', 'Use lowercase letters, numbers and hyphens for the address.', { slug: 'Lowercase letters, numbers and hyphens' })
    if (!i.title.trim() || [...i.title.trim()].length > 200) return refused('VALIDATION', 'Give a title (up to 200 characters).', { title: 'Give a title (up to 200 characters)' })
    if (i.bodyMd.length > 20000) return refused('VALIDATION', 'The text is too long.', { body_md: 'Up to 20,000 characters' })
    const pages = mockContentInternals.pages()
    const old = pages.find((p) => p.slug === i.slug)
    if (old && old.kind !== i.kind) return refused('VALIDATION', 'A page cannot change type.', { kind: 'Cannot change' })
    const version = i.version?.trim() || null
    if (i.kind === 'privacy' || i.kind === 'declaration') {
      if (!version) return refused('VALIDATION', 'Give this wording a version.', { version: 'Required' })
      if (old && old.body_md !== i.bodyMd && old.version === version)
        return refused('VALIDATION', 'Changed wording needs a new version, so earlier consents stay traceable.', { version: 'Use a new version' })
    }
    const next = { slug: i.slug, kind: i.kind, title: i.title.trim(), body_md: i.bodyMd, version, position: i.position, is_sample: i.isSample, status: i.status }
    if (old) Object.assign(old, next)
    else pages.push(next)
    return { kind: 'ok', data: { slug: i.slug, status: i.status } }
  },
}
