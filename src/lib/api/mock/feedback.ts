import { fromRpcError, rpcError } from '../errors'
import type { FeedbackPort } from '../feedback'
import type { CaseStatus, CommandOutcome, FeedbackRequest, MyIdea, RoadmapTask } from '../types'
import { mockSession } from './session'
import { mockStaffInternals } from './staff'
import { mockOwnsCase } from './submission'

/**
 * MOCK feedback adapter (Slice 4): development and demo preview only. It mirrors the seed's open clarification on
 * CEDA-2026-0003 and follows the contract's rules (§4.4): who may ask, one open request at a time, the case goes
 * to "action required" and back to where it was, a clarification reply of 10–1,000 characters and no new
 * version, and reviewers' verifications hidden from the applicant until the decision is published.
 */

const DAY = 86_400_000
const CASE_3 = '30000000-0000-4000-8000-000000000003'

const state = {
  requests: new Map<string, FeedbackRequest[]>(),
  /** Where each case returns to after the request (contract: `return_stage`). */
  returnTo: new Map<string, CaseStatus>(),
  latencyMs: import.meta.env.MODE === 'test' ? 0 : 200,
}

function reset() {
  state.requests.clear()
  state.returnTo.clear()
  // seed.sql: 0003 clarification from screening, due 20 Nov 16:00 CAT.
  state.requests.set(CASE_3, [
    {
      feedback_request_id: '80000000-0000-4000-8000-000000000003',
      kind: 'clarification',
      status: 'open',
      message: 'Please confirm the district of your pilot farms (DEMO).',
      due_at: '2026-11-20T14:00:00Z',
      created_at: '2026-11-07T12:00:00Z',
      version_no: 1,
      answered_version_no: null,
      response_text: null,
      responded_at: null,
      tasks: [],
      summary: { tasks: 0, addressed: 0, verified: null, not_verified: null },
    },
  ])
  state.returnTo.set(CASE_3, 'submitted')
}
reset()

/** Test and demo helpers. Not part of the port; screens must never import these. */
export const mockFeedbackControls = { reset }

/** Mock-only bridge for the other mock adapters (My ideas' `open_feedback`). */
export const mockFeedbackInternals = {
  openFor(caseId: string): MyIdea['open_feedback'] {
    const r = (state.requests.get(caseId) ?? []).filter((x) => x.status !== 'answered').at(-1)
    return r ? { kind: r.kind, due_at: r.due_at, status: r.status === 'expired' ? 'expired' : 'open' } : null
  },
  requests: () => state.requests,
  returnTo: () => state.returnTo,
}

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, state.latencyMs))
const refused = (...args: Parameters<typeof rpcError>): CommandOutcome<never> => fromRpcError(rpcError(...args))

const ASK_ROLES = ['screening_officer', 'adjudicator'] as const
const READ_ALL = ['screening_officer', 'adjudicator', 'admin'] as const

export const mockFeedback: FeedbackPort = {
  async getRoadmap(proposalId) {
    await wait()
    const user = await mockSession.getSession()
    if (!user) return null
    const c = mockStaffInternals.cases().find((x) => x.id === proposalId)
    if (!c) return null
    const staff = user.roles.some((r) => (READ_ALL as readonly string[]).includes(r))
    const owner = user.roles.includes('applicant') && mockOwnsCase(user.id, proposalId)
    if (!staff && !owner) return null
    // BCR-001 B6: the applicant sees verifications only once the decision is published.
    const published = c.decisions.some((d) => d.published_at && !d.superseded_at)
    const showChecks = staff || published
    return (state.requests.get(proposalId) ?? [])
      .map((r) => ({
        ...r,
        tasks: r.tasks.map((t): RoadmapTask => ({ ...t, verifications: showChecks ? (t.verifications ?? []) : null })),
        summary: { ...r.summary, verified: showChecks ? r.summary.verified : null, not_verified: showChecks ? r.summary.not_verified : null },
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  async requestFeedback({ proposalId, kind, message, dueAt, tasks }) {
    await wait()
    const user = await mockSession.getSession()
    if (!user || !user.roles.some((r) => (ASK_ROLES as readonly string[]).includes(r))) return refused('FORBIDDEN', "You don't have access to this action.")
    const c = mockStaffInternals.cases().find((x) => x.id === proposalId)
    if (!c) return refused('FORBIDDEN', "You don't have access to this action.")
    if (kind !== 'clarification' && kind !== 'revision') return refused('VALIDATION', 'Choose clarification or revision.', { kind: 'Required' })
    const text = message.trim()
    if (text.length < 1 || [...text].length > 4000) return refused('VALIDATION', 'Write a message (up to 4,000 characters).', { message: 'Required' })
    const due = dueAt ?? new Date(Date.now() + 7 * DAY).toISOString()
    if (Date.parse(due) <= Date.now()) return refused('VALIDATION', 'The deadline must be in the future.', { due_at: 'Must be in the future' })
    const list = (tasks ?? []).map((t) => t.trim())
    if (kind === 'clarification' && list.length) return refused('VALIDATION', 'A clarification is a single question without tasks.', { tasks: 'Not allowed' })
    if (list.length > 10) return refused('VALIDATION', 'Use up to 10 tasks.', { tasks: 'Too many' })
    const taskErrors: Record<string, string> = {}
    list.forEach((t, i) => {
      if (t.length < 1 || [...t].length > 1000) taskErrors[`task:${i + 1}`] = 'Write the task (up to 1,000 characters)'
    })
    if (Object.keys(taskErrors).length) return refused('VALIDATION', 'Some tasks need attention.', taskErrors)
    if (!['submitted', 'in_evaluation', 'in_adjudication'].includes(c.status))
      return refused('INVALID_STATE', 'Feedback can be requested only while the case is being reviewed and no request is open.')

    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const request: FeedbackRequest = {
      feedback_request_id: id,
      kind,
      status: 'open',
      message: text,
      due_at: due,
      created_at: now,
      version_no: c.version?.version_no ?? 1,
      answered_version_no: null,
      response_text: null,
      responded_at: null,
      tasks: list.map((t, i) => ({ task_id: crypto.randomUUID(), position: i + 1, text: t, applicant_status: null, applicant_explanation: null, verifications: [] })),
      summary: { tasks: list.length, addressed: 0, verified: 0, not_verified: 0 },
    }
    state.requests.set(proposalId, [...(state.requests.get(proposalId) ?? []), request])
    state.returnTo.set(proposalId, c.status)
    mockStaffInternals.moveCase(proposalId, { from_status: c.status, to_status: 'action_required', public_stage: 'feedback', reason: null, at: now })
    return { kind: 'ok', data: { feedback_request_id: id, kind, status: 'action_required' as CaseStatus, return_stage: c.status, due_at: due } }
  },

  async respondClarification({ feedbackRequestId, text }) {
    await wait()
    const user = await mockSession.getSession()
    const entry = [...state.requests.entries()].find(([, list]) => list.some((r) => r.feedback_request_id === feedbackRequestId))
    if (!user || !entry || !user.roles.includes('applicant') || !mockOwnsCase(user.id, entry[0])) return refused('FORBIDDEN', "You don't have access to this page.")
    const [caseId, list] = entry
    const r = list.find((x) => x.feedback_request_id === feedbackRequestId)!
    if (r.kind !== 'clarification' || r.status !== 'open') return refused('INVALID_STATE', 'This question has already been answered.')
    const reply = text.trim()
    const n = [...reply].length
    if (n < 10 || n > 1000) return refused('VALIDATION', 'Write a reply of 10 to 1,000 characters.', { response: 'Write a reply of 10 to 1,000 characters' })
    const now = new Date().toISOString()
    r.status = 'answered'
    r.response_text = reply
    r.responded_at = now
    // No new version (D-21); the case returns to where it was (BCR-001 B1).
    const back = state.returnTo.get(caseId) ?? 'submitted'
    mockStaffInternals.moveCase(caseId, { from_status: 'action_required', to_status: back, public_stage: mockStaffInternals.publicStage(back), reason: null, at: now })
    return { kind: 'ok', data: { feedback_request_id: r.feedback_request_id, status: 'answered' as const, responded_at: now, case_status: back } }
  },
}
