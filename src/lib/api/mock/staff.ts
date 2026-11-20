import { fromRpcError, rpcError } from '../errors'
import type { StaffPort } from '../staff'
import type { CaseAssignment, CaseAward, CaseDecision, CaseEvent, CaseStatus, CommandOutcome, InternalNote, PublicStage, Role, StaffCase, StaffCaseRow } from '../types'
import { MOCK_CHALLENGE_FORMS, MOCK_SEEDED_IDEA, WATER_SMART_ID } from './fixtures'
import { mockSession } from './session'
import { mockMoveCase, mockSubmittedCases } from './submission'

/**
 * MOCK staff adapter (Slice 2): development and demo preview only. It mirrors the seed's 8 cases
 * (supabase/seed.sql, CEDA-2026-0001 … 0008) plus any idea submitted in this browser session, and follows the
 * contract's rules for who may read and screen (§2, §3, §4.2). It proves nothing about the server: access is
 * evidenced by Stacey's pgTAP suites and the N-tests.
 */

const PUBLIC_STAGE: Partial<Record<CaseStatus, PublicStage>> = {
  submitted: 'submission',
  in_evaluation: 'review',
  in_adjudication: 'review',
  action_required: 'feedback',
  approved: 'approval',
  not_approved: 'approval',
  awarded: 'award',
}

const PATHS: Partial<Record<CaseStatus, CaseStatus[]>> = {
  submitted: ['submitted'],
  in_evaluation: ['submitted', 'in_evaluation'],
  action_required: ['submitted', 'action_required'],
  in_adjudication: ['submitted', 'in_evaluation', 'in_adjudication'],
  not_approved: ['submitted', 'in_evaluation', 'in_adjudication', 'not_approved'],
  awarded: ['submitted', 'in_evaluation', 'in_adjudication', 'approved', 'awarded'],
  closed: ['submitted', 'closed'],
}

const DAY = 86_400_000
const REVIEWER_1 = { id: '00000000-0000-4000-8000-0000000000c1', name: 'Demo Reviewer 1' }
const REVIEWER_2 = { id: '00000000-0000-4000-8000-0000000000c2', name: 'Demo Reviewer 2' }
const REVIEWER_3 = { id: '00000000-0000-4000-8000-0000000000c3', name: 'Demo Reviewer 3' }
/** The seed's reviewer accounts (seed.sql demo_user). */
const REVIEWERS = [REVIEWER_1, REVIEWER_2, REVIEWER_3]

interface SeedCase {
  n: number
  id?: string
  title: string
  status: CaseStatus
  submitted: string
  reviewers?: { declared: boolean }
  closedReason?: string
}

/** The seed's cases, in reference order (seed.sql "Cases: CEDA-2026-0001 … 0008"). */
const SEED: SeedCase[] = [
  { n: 1, title: 'Solar-powered drip kits for smallholders', status: 'submitted', submitted: '2026-11-10T07:15:00Z' },
  { n: 2, title: 'Greywater reuse for market gardens', status: 'in_evaluation', submitted: '2026-11-02T08:30:00Z', reviewers: { declared: true } },
  { n: 3, title: 'Soil-moisture SMS alerts', status: 'action_required', submitted: '2026-11-05T12:00:00Z' },
  { n: 4, title: 'Fog-net water harvesting', status: 'in_adjudication', submitted: '2026-10-20T07:00:00Z', reviewers: { declared: true } },
  { n: 5, title: 'Cattle trough float valves', status: 'not_approved', submitted: '2026-10-12T09:00:00Z', reviewers: { declared: true } },
  { n: 6, title: 'Hydroponic fodder units', status: 'awarded', submitted: '2026-10-05T06:45:00Z', reviewers: { declared: true } },
  { n: 7, title: 'Imported irrigation resale', status: 'closed', submitted: '2026-10-25T11:20:00Z', closedReason: 'Ineligible: outside the challenge scope (DEMO)' },
  { n: 8, id: MOCK_SEEDED_IDEA.id, title: MOCK_SEEDED_IDEA.title, status: 'in_evaluation', submitted: '2026-11-08T07:40:00Z', reviewers: { declared: false } },
]

const WATER_FORM = MOCK_CHALLENGE_FORMS.find((f) => f.challenge_id === WATER_SMART_ID)!

function seedEvents(c: SeedCase): CaseEvent[] {
  const path = PATHS[c.status] ?? ['submitted']
  let at = Date.parse(c.submitted)
  return path.map((to, i) => {
    if (i > 0) at += 2 * DAY
    return {
      from_status: i === 0 ? 'draft' : path[i - 1]!,
      to_status: to,
      public_stage: PUBLIC_STAGE[to] ?? null,
      reason: to === 'closed' ? (c.closedReason ?? null) : null,
      at: new Date(at).toISOString(),
    }
  })
}

function seedCase(c: SeedCase): StaffCase {
  const id = c.id ?? `30000000-0000-4000-8000-00000000000${c.n}`
  const events = seedEvents(c)
  const assignments: CaseAssignment[] = c.reviewers
    ? [REVIEWER_1, REVIEWER_2].map((r, i) => ({
        id: `40000000-0000-4000-8000-0000000${c.n}000${i + 1}`,
        reviewer_id: r.id,
        reviewer_name: r.name,
        assigned_at: new Date(Date.parse(c.submitted) + 2 * DAY).toISOString(),
        due_at: new Date(Date.parse(c.submitted) + 16 * DAY).toISOString(),
        declared_at: c.reviewers?.declared ? new Date(Date.parse(c.submitted) + 3 * DAY).toISOString() : null,
        has_conflict: c.reviewers?.declared ? false : null,
        revoked_at: null,
      }))
    : []
  return {
    id,
    reference: `CEDA-2026-000${c.n}`,
    title: c.title,
    status: c.status,
    challenge: { id: WATER_FORM.challenge_id, title: WATER_FORM.title },
    submitted_at: c.submitted,
    updated_at: events[events.length - 1]!.at,
    active_reviewers: assignments.length,
    version: {
      version_no: 1,
      submitted_at: c.submitted,
      declaration_version: 'sample-2026-11-v1',
      // The seed's fictional version data (seed.sql demo_case).
      data: {
        title: c.title,
        applicant_name: 'Fictional applicant (DEMO)',
        contact_email: 'demo@example.test',
        summary: `Fictional demo summary for ${c.title}.`,
        sector: 'Crops',
        problem: 'Fictional problem statement (DEMO).',
        solution: 'Fictional solution description (DEMO).',
        impact: 'Fictional impact statement (DEMO).',
      },
    },
    form_schema: WATER_FORM.form_schema,
    required_docs: WATER_FORM.required_docs,
    files: [],
    events,
    assignments,
    decisions: [],
    award: null,
  }
}

const state = {
  /** Seeded cases with any screening applied in this session. */
  seeded: new Map<string, StaffCase>(),
  /** Assignments per case (seeded and session cases alike), including removed ones. */
  assignments: new Map<string, CaseAssignment[]>(),
  /** Internal notes per case, newest first. */
  notes: new Map<string, InternalNote[]>(),
  /** Decisions per case (drafts, superseded and published). */
  decisions: new Map<string, CaseDecision[]>(),
  awards: new Map<string, CaseAward>(),
  latencyMs: import.meta.env.MODE === 'test' ? 0 : 200,
}

function resetSeeded() {
  state.seeded.clear()
  state.assignments.clear()
  state.notes.clear()
  state.decisions.clear()
  state.awards.clear()
  for (const c of SEED) {
    const built = seedCase(c)
    state.seeded.set(built.id, built)
    state.assignments.set(built.id, built.assignments)
  }
  // The seed's published decisions (0005 not approved, 0006 approved) and award (0006), seed.sql demo_decide.
  for (const [n, outcome] of [[5, 'not_approved'], [6, 'approved']] as const) {
    const c = SEED.find((x) => x.n === n)!
    const at = new Date(Date.parse(c.submitted) + 6 * DAY).toISOString()
    state.decisions.set(`30000000-0000-4000-8000-00000000000${n}`, [
      { id: `60000000-0000-4000-8000-00000000000${n}`, outcome, reason: 'Fictional decision reason (DEMO).', recorded_at: at, published_at: at, superseded_at: null, on_current_version: true },
    ])
  }
  state.awards.set('30000000-0000-4000-8000-000000000006', {
    id: '70000000-0000-4000-8000-000000000006',
    amount_minor: 25_000_000,
    currency: 'BWP',
    description: 'Fictional seed grant (DEMO).',
    recorded_at: '2026-10-15T08:00:00Z',
  })
}
resetSeeded()

/** Test and demo helpers. Not part of the port; screens must never import these. */
export const mockStaffControls = {
  reset: resetSeeded,
}

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, state.latencyMs))
const refused = (...args: Parameters<typeof rpcError>): CommandOutcome<never> => fromRpcError(rpcError(...args))

const READ_ALL: Role[] = ['screening_officer', 'adjudicator', 'admin']
/** case.note (contract §2). Reviewers hold it too but reach only assigned cases, which this mock does not model yet. */
const NOTE: Role[] = ['screening_officer', 'adjudicator', 'admin']

async function roles(): Promise<Role[]> {
  return (await mockSession.getSession())?.roles ?? []
}

/** Every case this browser session knows: the seed's, then ideas submitted here. */
function allCases(): StaffCase[] {
  const submitted = mockSubmittedCases().map((s): StaffCase => {
    const form = MOCK_CHALLENGE_FORMS.find((f) => f.challenge_id === s.challengeId) ?? WATER_FORM
    return {
      id: s.id,
      reference: s.reference,
      title: s.title,
      status: s.status,
      challenge: { id: form.challenge_id, title: form.title },
      submitted_at: s.submittedAt,
      updated_at: s.updatedAt,
      version: { version_no: s.versionNo, submitted_at: s.versionAt, data: s.data, declaration_version: s.declarationVersion },
      form_schema: form.form_schema,
      required_docs: form.required_docs,
      files: s.files,
      events: s.events,
      assignments: [],
      active_reviewers: 0,
      decisions: [],
      award: null,
    }
  })
  return [...state.seeded.values(), ...submitted].map((c) => {
    const assignments = state.assignments.get(c.id) ?? []
    return {
      ...c,
      assignments,
      active_reviewers: assignments.filter((a) => !a.revoked_at).length,
      decisions: [...(state.decisions.get(c.id) ?? [])].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at)),
      award: state.awards.get(c.id) ?? null,
    }
  })
}

/** Move a case on (seeded here, or submitted in this session in the submission mock). */
function moveCase(proposalId: string, event: CaseEvent) {
  const seeded = state.seeded.get(proposalId)
  if (seeded) {
    seeded.status = event.to_status
    seeded.events = [...seeded.events, event]
    seeded.updated_at = event.at
  } else {
    mockMoveCase(proposalId, event)
  }
}

/** The mock persona id for the seed's Demo Reviewer 1 (mock/session.ts), and the seed accounts it stands for. */
const PERSONA_TO_SEED: Record<string, string> = { 'demo-reviewer-1': REVIEWER_1.id }

/**
 * Mock-only bridge for the mock reviewer adapter, which shares this in-memory state (so an admin's assignment
 * shows in the reviewer's queue, and a submitted scorecard can move the case on). Not part of any port.
 */
export const mockStaffInternals = {
  cases: () => allCases(),
  assignments: () => state.assignments,
  moveCase,
  /** The seed reviewer account a mock persona acts as, if any. */
  seedReviewerId: (personaId: string | undefined) => (personaId ? PERSONA_TO_SEED[personaId] : undefined),
  publicStage: (status: CaseStatus) => PUBLIC_STAGE[status] ?? null,
  /** A new submitted version on a seeded case (V2 revision). Session cases keep theirs in the submission mock. */
  setSeededVersion(caseId: string, version: NonNullable<StaffCase['version']>): boolean {
    const c = state.seeded.get(caseId)
    if (!c) return false
    c.version = version
    return true
  },
}

function toRow(c: StaffCase): StaffCaseRow {
  return {
    id: c.id,
    reference: c.reference,
    title: c.title,
    status: c.status,
    challenge: c.challenge,
    submitted_at: c.submitted_at,
    updated_at: c.updated_at,
    active_reviewers: c.active_reviewers,
  }
}

export const mockStaff: StaffPort = {
  async listCases(filter) {
    await wait()
    if (!(await roles()).some((r) => READ_ALL.includes(r))) return []
    return allCases()
      .filter((c) => !filter?.statuses?.length || filter.statuses.includes(c.status))
      .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
      .map(toRow)
  },

  async getCase(proposalId) {
    await wait()
    if (!(await roles()).some((r) => READ_ALL.includes(r))) return null
    const found = allCases().find((c) => c.id === proposalId)
    if (!found) return null
    // Reviewer names come from profiles, which only admins may read (contract §3).
    const admin = (await roles()).includes('admin')
    return { ...found, assignments: found.assignments.map((a) => ({ ...a, reviewer_name: admin ? a.reviewer_name : null })) }
  },

  async recordScreening({ proposalId, result, reason }) {
    await wait()
    // Contract §4.2 order: permission → result → reason → can read the case → still submitted.
    if (!(await roles()).includes('screening_officer')) return refused('FORBIDDEN', "You don't have access to this action.")
    if (result !== 'eligible' && result !== 'ineligible') return refused('VALIDATION', 'Choose Eligible or Ineligible.', { result: 'Required' })
    const text = reason.trim()
    if (text.length < 1 || [...text].length > 1000) return refused('VALIDATION', 'Give a reason (up to 1,000 characters).', { reason: 'Required' })
    const c = allCases().find((x) => x.id === proposalId)
    if (!c) return refused('FORBIDDEN', "You don't have access to this action.")
    if (c.status !== 'submitted') return refused('INVALID_STATE', 'This case has already been screened.')

    const to: CaseStatus = result === 'eligible' ? 'in_evaluation' : 'closed'
    const event: CaseEvent = { from_status: 'submitted', to_status: to, public_stage: PUBLIC_STAGE[to] ?? null, reason: text, at: new Date().toISOString() }
    moveCase(proposalId, event)
    return { kind: 'ok', data: { proposal_id: proposalId, status: to, result } }
  },

  async listReviewers() {
    await wait()
    // Reading other people's roles and names needs role.manage (admins), as on the server.
    if (!(await roles()).includes('admin')) return []
    const active = [...state.assignments.values()].flat().filter((a) => !a.revoked_at)
    return REVIEWERS.map((r) => ({ id: r.id, name: r.name, active_assignments: active.filter((a) => a.reviewer_id === r.id).length }))
  },

  async assignReviewers({ proposalId, reviewerIds, dueAt }) {
    await wait()
    // Contract §4.2 order: permission → count → due date → can read the case → in evaluation → each reviewer.
    if (!(await roles()).includes('admin')) return refused('FORBIDDEN', "You don't have access to this action.")
    const ids = [...new Set(reviewerIds)]
    if (ids.length < 1 || ids.length > 10) return refused('VALIDATION', 'Choose between 1 and 10 reviewers.', { reviewers: 'Choose between 1 and 10 reviewers' })
    const due = dueAt ?? new Date(Date.now() + 14 * DAY).toISOString()
    if (Date.parse(due) <= Date.now()) return refused('VALIDATION', 'The due date must be in the future.', { due_at: 'Must be in the future' })
    const c = allCases().find((x) => x.id === proposalId)
    if (!c) return refused('FORBIDDEN', "You don't have access to this action.")
    if (c.status !== 'in_evaluation') return refused('INVALID_STATE', 'Reviewers can be assigned once the case has passed screening.')
    const list = state.assignments.get(proposalId) ?? []
    for (const id of ids) {
      if (!REVIEWERS.some((r) => r.id === id)) return refused('VALIDATION', 'Everyone you assign must hold the reviewer role.', { reviewers: 'Not a reviewer' })
      if (list.some((a) => a.reviewer_id === id && a.has_conflict)) return refused('VALIDATION', 'This reviewer declared a conflict of interest on this case.', { reviewers: 'Declared a conflict' })
    }
    const now = new Date().toISOString()
    const assigned: { assignment_id: string; reviewer_id: string }[] = []
    const already: { assignment_id: string; reviewer_id: string }[] = []
    for (const id of ids) {
      const existing = list.find((a) => a.reviewer_id === id && !a.revoked_at)
      if (existing) {
        already.push({ assignment_id: existing.id, reviewer_id: id })
        continue
      }
      const a: CaseAssignment = {
        id: crypto.randomUUID(),
        reviewer_id: id,
        reviewer_name: REVIEWERS.find((r) => r.id === id)?.name ?? null,
        assigned_at: now,
        due_at: due,
        declared_at: null,
        has_conflict: null,
        revoked_at: null,
      }
      list.push(a)
      assigned.push({ assignment_id: a.id, reviewer_id: id })
    }
    state.assignments.set(proposalId, list)
    return { kind: 'ok', data: { proposal_id: proposalId, assigned, already_assigned: already, active_reviewers: list.filter((a) => !a.revoked_at).length } }
  },

  async revokeAssignment({ assignmentId, reason }) {
    await wait()
    if (!(await roles()).includes('admin')) return refused('FORBIDDEN', "You don't have access to this action.")
    const text = reason.trim()
    if (text.length < 1 || [...text].length > 500) return refused('VALIDATION', 'Give a reason (up to 500 characters).', { reason: 'Required' })
    const a = [...state.assignments.values()].flat().find((x) => x.id === assignmentId)
    if (!a) return refused('FORBIDDEN', "You don't have access to this action.")
    if (a.revoked_at) return refused('INVALID_STATE', 'This assignment was already removed.')
    a.revoked_at = new Date().toISOString()
    return { kind: 'ok', data: { assignment_id: assignmentId, revoked: true as const } }
  },

  async listNotes(proposalId) {
    await wait()
    const r = await roles()
    if (!r.some((x) => NOTE.includes(x)) || !allCases().some((c) => c.id === proposalId)) return []
    const me = (await mockSession.getSession())?.id
    const admin = r.includes('admin')
    return (state.notes.get(proposalId) ?? []).map((n) => ({ ...n, mine: n.author_id === me, author_name: admin || n.author_id === me ? n.author_name : null }))
  },

  async addNote({ proposalId, body }) {
    await wait()
    const user = await mockSession.getSession()
    if (!user || !user.roles.some((x) => NOTE.includes(x)) || !allCases().some((c) => c.id === proposalId))
      return refused('FORBIDDEN', "You don't have access to this action.")
    const text = body.trim()
    if (text.length < 1 || [...text].length > 4000) return refused('VALIDATION', 'Write a note (up to 4,000 characters).', { body: 'Required' })
    const note: InternalNote = { id: crypto.randomUUID(), author_id: user.id, author_name: user.displayName, mine: true, body: text, created_at: new Date().toISOString() }
    state.notes.set(proposalId, [note, ...(state.notes.get(proposalId) ?? [])])
    return { kind: 'ok', data: { id: note.id, created_at: note.created_at } }
  },

  async recordDecision({ proposalId, outcome, reason }) {
    await wait()
    // Contract §4.5 order: permission → can read → outcome → in adjudication → not already published → reason.
    if (!(await roles()).includes('adjudicator')) return refused('FORBIDDEN', "You don't have access to this action.")
    const c = allCases().find((x) => x.id === proposalId)
    if (!c) return refused('FORBIDDEN', "You don't have access to this action.")
    if (outcome !== 'approved' && outcome !== 'not_approved') return refused('VALIDATION', 'Choose Approved or Not approved.', { outcome: 'Required' })
    if (c.status !== 'in_adjudication') return refused('INVALID_STATE', 'A decision can be recorded only when the case is ready for decision.')
    const list = state.decisions.get(proposalId) ?? []
    if (list.some((d) => d.published_at)) return refused('INVALID_STATE', 'The decision has already been published.')
    const text = reason.trim()
    if (text.length < 1 || [...text].length > 4000) return refused('VALIDATION', 'Give a reason (up to 4,000 characters).', { reason: 'Required' })
    const now = new Date().toISOString()
    for (const d of list) if (!d.superseded_at) d.superseded_at = now
    const decision: CaseDecision = { id: crypto.randomUUID(), outcome, reason: text, recorded_at: now, published_at: null, superseded_at: null, on_current_version: true }
    state.decisions.set(proposalId, [...list, decision])
    return { kind: 'ok', data: { decision_id: decision.id, outcome, published: false as const, case_status: c.status } }
  },

  async publishDecision({ decisionId }) {
    await wait()
    if (!(await roles()).includes('adjudicator')) return refused('FORBIDDEN', "You don't have access to this action.")
    const entry = [...state.decisions.entries()].find(([, list]) => list.some((d) => d.id === decisionId))
    if (!entry) return refused('FORBIDDEN', "You don't have access to this action.")
    const [caseId, list] = entry
    const d = list.find((x) => x.id === decisionId)!
    if (d.published_at || d.superseded_at) return refused('INVALID_STATE', 'This decision has already been published or replaced.')
    if (!d.on_current_version) return refused('INVALID_STATE', 'This decision was recorded on an earlier version. Record a new one.')
    d.published_at = new Date().toISOString()
    moveCase(caseId, { from_status: 'in_adjudication', to_status: d.outcome, public_stage: 'approval', reason: null, at: d.published_at })
    return { kind: 'ok', data: { decision_id: d.id, outcome: d.outcome, published_at: d.published_at, case_status: d.outcome as CaseStatus } }
  },

  async recordAward({ proposalId, amountMinor, description }) {
    await wait()
    if (!(await roles()).includes('admin')) return refused('FORBIDDEN', "You don't have access to this action.")
    const c = allCases().find((x) => x.id === proposalId)
    if (!c) return refused('FORBIDDEN', "You don't have access to this action.")
    const existing = state.awards.get(proposalId)
    if (existing) {
      if (existing.amount_minor === amountMinor && existing.description === description.trim())
        return { kind: 'ok', data: { award_id: existing.id, amount_minor: existing.amount_minor, currency: 'BWP' as const, case_status: 'awarded' as CaseStatus, replayed: true } }
      return refused('INVALID_STATE', 'An award has already been recorded for this case.')
    }
    const approved = (state.decisions.get(proposalId) ?? []).some((d) => d.published_at && d.outcome === 'approved')
    if (!approved || c.status !== 'approved') return refused('CASE_NOT_APPROVED', 'An award can be recorded only after an approval is published.')
    if (!Number.isInteger(amountMinor) || amountMinor < 1 || amountMinor > 10_000_000_000)
      return refused('VALIDATION', 'Enter an amount between BWP 0.01 and BWP 100,000,000.', { amount: 'Out of range' })
    const text = description.trim()
    if (text.length < 1 || [...text].length > 1000) return refused('VALIDATION', 'Describe the award (up to 1,000 characters).', { description: 'Required' })
    const award: CaseAward = { id: crypto.randomUUID(), amount_minor: amountMinor, currency: 'BWP', description: text, recorded_at: new Date().toISOString() }
    state.awards.set(proposalId, award)
    moveCase(proposalId, { from_status: 'approved', to_status: 'awarded', public_stage: 'award', reason: null, at: award.recorded_at })
    return { kind: 'ok', data: { award_id: award.id, amount_minor: amountMinor, currency: 'BWP' as const, case_status: 'awarded' as CaseStatus, replayed: false } }
  },

  async closeCase({ proposalId, reason }) {
    await wait()
    const r = await roles()
    if (!r.some((x) => x === 'screening_officer' || x === 'adjudicator')) return refused('FORBIDDEN', "You don't have access to this action.")
    const c = allCases().find((x) => x.id === proposalId)
    if (!c) return refused('FORBIDDEN', "You don't have access to this action.")
    const text = reason.trim()
    if (text.length < 1 || [...text].length > 500) return refused('VALIDATION', 'Give a reason (up to 500 characters).', { reason: 'Required' })
    if (['approved', 'awarded', 'draft', 'closed'].includes(c.status)) return refused('INVALID_STATE', 'This case cannot be closed now.')
    moveCase(proposalId, { from_status: c.status, to_status: 'closed', public_stage: null, reason: text, at: new Date().toISOString() })
    return { kind: 'ok', data: { proposal_id: proposalId, case_status: 'closed' as CaseStatus } }
  },
}
