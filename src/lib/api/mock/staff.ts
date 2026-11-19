import { fromRpcError, rpcError } from '../errors'
import type { StaffPort } from '../staff'
import type { CaseAssignment, CaseEvent, CaseStatus, CommandOutcome, PublicStage, Role, StaffCase, StaffCaseRow } from '../types'
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
  }
}

const state = {
  /** Seeded cases with any screening applied in this session. */
  seeded: new Map<string, StaffCase>(),
  latencyMs: import.meta.env.MODE === 'test' ? 0 : 200,
}

function resetSeeded() {
  state.seeded.clear()
  for (const c of SEED) {
    const built = seedCase(c)
    state.seeded.set(built.id, built)
  }
}
resetSeeded()

/** Test and demo helpers. Not part of the port; screens must never import these. */
export const mockStaffControls = {
  reset: resetSeeded,
}

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, state.latencyMs))
const refused = (...args: Parameters<typeof rpcError>): CommandOutcome<never> => fromRpcError(rpcError(...args))

const READ_ALL: Role[] = ['screening_officer', 'adjudicator', 'admin']

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
      version: { version_no: 1, submitted_at: s.submittedAt, data: s.data, declaration_version: s.declarationVersion },
      form_schema: form.form_schema,
      required_docs: form.required_docs,
      files: s.files,
      events: s.events,
      assignments: [],
    }
  })
  return [...state.seeded.values(), ...submitted]
}

function toRow(c: StaffCase): StaffCaseRow {
  return { id: c.id, reference: c.reference, title: c.title, status: c.status, challenge: c.challenge, submitted_at: c.submitted_at, updated_at: c.updated_at }
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
    const seeded = state.seeded.get(proposalId)
    if (seeded) {
      seeded.status = to
      seeded.events = [...seeded.events, event]
      seeded.updated_at = event.at
    } else {
      mockMoveCase(proposalId, event)
    }
    return { kind: 'ok', data: { proposal_id: proposalId, status: to, result } }
  },
}
