import { fromRpcError, rpcError } from '../errors'
import type { ReviewPort } from '../review'
import type { CaseAssignment, CommandOutcome, MyReviewStatus, MyScorecard, ReviewQueueRow, RubricCriterion, ScoreItem, ScorecardResult, ScorePanel, StaffCase } from '../types'
import { round2, weightedScore as weighted } from '@/lib/scoring'
import { mockSession } from './session'
import { mockStaffInternals } from './staff'

/**
 * MOCK reviewer adapter (Slice 3): development and demo preview only. It mirrors the seed's Water-Smart rubric
 * and submitted scorecards (supabase/seed.sql) and follows the contract's rules (§4.3): declare before reading,
 * a conflict withdraws the reviewer, a reason of at least 20 characters per criterion, and the case moves to
 * adjudication when two active reviewers have submitted (D-11 quorum 2). It proves nothing about the server.
 */

const ANCHORS = { '1': 'Not demonstrated', '3': 'Partly demonstrated', '5': 'Fully demonstrated with evidence' }

/** Seed rubric "water-smart-2026" v1 (seed.sql rubric_criteria). */
export const MOCK_RUBRIC: RubricCriterion[] = [
  { id: '12000000-0000-4000-8000-000000000001', key: 'innovation', label: 'Innovation', weight: 30, guidance: 'How new is the idea for Botswana agriculture?', anchors: ANCHORS },
  { id: '12000000-0000-4000-8000-000000000002', key: 'market_potential', label: 'Market potential', weight: 25, guidance: 'Is there a clear customer and demand?', anchors: ANCHORS },
  { id: '12000000-0000-4000-8000-000000000003', key: 'feasibility', label: 'Feasibility', weight: 25, guidance: 'Can the team deliver it with the resources described?', anchors: ANCHORS },
  { id: '12000000-0000-4000-8000-000000000004', key: 'economic_impact', label: 'Economic impact', weight: 20, guidance: 'Jobs, income and water savings.', anchors: ANCHORS },
]

const QUORUM = 2
const DEMO_REASON = 'Fictional seeded reason for this score (DEMO).'

/** Applicant organisations of the seed's cases (seed.sql demo_user), by reference. */
const ORGANISATION: Record<string, string> = {
  'CEDA-2026-0001': 'Kalahari Drip Demo',
  'CEDA-2026-0002': 'Okavango Greens Demo',
  'CEDA-2026-0003': 'Tswana Herd Tech Demo',
  'CEDA-2026-0004': 'Kalahari Drip Demo',
  'CEDA-2026-0005': 'Okavango Greens Demo',
  'CEDA-2026-0006': 'Tswana Herd Tech Demo',
  'CEDA-2026-0007': 'Kalahari Drip Demo',
  'CEDA-2026-0008': 'Lesedi Agro Demo',
}

/** Seeded submitted scorecards: case number → scores of Reviewer 1 and Reviewer 2 (seed.sql demo_score). */
const SEED_SCORES: Record<number, [number[] | null, number[] | null]> = {
  2: [[4, 3, 4, 3], null],
  4: [[5, 4, 4, 4], [4, 4, 3, 4]],
  5: [[2, 3, 3, 2], [2, 2, 3, 2]],
  6: [[5, 5, 4, 4], [4, 5, 4, 5]],
}

const state = {
  scorecards: new Map<string, MyScorecard>(),
  latencyMs: import.meta.env.MODE === 'test' ? 0 : 200,
}

function reset() {
  state.scorecards.clear()
  for (const [n, pair] of Object.entries(SEED_SCORES)) {
    pair.forEach((scores, i) => {
      if (!scores) return
      const assignmentId = `40000000-0000-4000-8000-0000000${n}000${i + 1}`
      state.scorecards.set(assignmentId, {
        id: `50000000-0000-4000-8000-0000000${n}000${i + 1}`,
        status: 'submitted',
        overall_comment: '',
        submitted_at: '2026-11-06T09:00:00Z',
        items: MOCK_RUBRIC.map((c, k) => ({ criterion_id: c.id, score: scores[k]!, reason: DEMO_REASON })),
      })
    })
  }
}
reset()

/** Test and demo helpers. Not part of the port; screens must never import these. */
export const mockReviewControls = {
  reset,
  /** Record a submitted scorecard for any assignment (e.g. the other reviewer), without the case moving on. */
  submitAs(assignmentId: string, scores: number[]) {
    const a = [...mockStaffInternals.assignments().values()].flat().find((x) => x.id === assignmentId)
    if (a && a.declared_at === null) {
      a.declared_at = new Date().toISOString()
      a.has_conflict = false
    }
    state.scorecards.set(assignmentId, {
      id: crypto.randomUUID(),
      status: 'submitted',
      overall_comment: '',
      submitted_at: new Date().toISOString(),
      items: MOCK_RUBRIC.map((c, k) => ({ criterion_id: c.id, score: scores[k]!, reason: DEMO_REASON })),
    })
  },
}

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, state.latencyMs))
const refused = (...args: Parameters<typeof rpcError>): CommandOutcome<never> => fromRpcError(rpcError(...args))

async function me(): Promise<string | undefined> {
  const user = await mockSession.getSession()
  return user?.roles.includes('reviewer') ? mockStaffInternals.seedReviewerId(user.id) : undefined
}

function find(assignmentId: string): { a: CaseAssignment; c: StaffCase } | undefined {
  for (const c of mockStaffInternals.cases()) {
    const a = (mockStaffInternals.assignments().get(c.id) ?? []).find((x) => x.id === assignmentId)
    if (a) return { a, c }
  }
  return undefined
}

function statusOf(a: CaseAssignment): MyReviewStatus {
  if (a.declared_at === null) return 'declaration_needed'
  const card = state.scorecards.get(a.id)
  if (card?.status === 'submitted') return 'submitted'
  return card ? 'in_progress' : 'not_started'
}

function rowFor(a: CaseAssignment, c: StaffCase): ReviewQueueRow {
  return {
    assignment_id: a.id,
    proposal_id: c.id,
    reference: c.reference,
    title: c.title,
    challenge_title: c.challenge.title,
    applicant_organisation: c.version?.data.organisation?.trim() || ORGANISATION[c.reference] || null,
    version_no: c.version?.version_no ?? null,
    due_at: a.due_at,
    case_status: c.status,
    my_status: statusOf(a),
  }
}

/** Shared checks of save and submit (contract §4.3 order). */
async function scoringTarget(assignmentId: string): Promise<{ a: CaseAssignment; c: StaffCase } | CommandOutcome<never>> {
  const reviewer = await me()
  const hit = find(assignmentId)
  if (!reviewer || !hit || hit.a.reviewer_id !== reviewer || hit.a.revoked_at) return refused('FORBIDDEN', "You don't have access to this action.")
  if (hit.a.declared_at === null || hit.a.has_conflict) return refused('FORBIDDEN', 'Complete the declaration before scoring.')
  if (hit.c.status !== 'in_evaluation') return refused('INVALID_STATE', 'Scoring is closed for this case.')
  return hit
}

function checkItems(items: ScoreItem[]): CommandOutcome<never> | null {
  const fields: Record<string, string> = {}
  const seen = new Set<string>()
  for (const item of items) {
    const crit = MOCK_RUBRIC.find((c) => c.id === item.criterion_id)
    if (!crit) return refused('VALIDATION', 'A score refers to a criterion that is not in this rubric.')
    if (seen.has(crit.id)) return refused('VALIDATION', 'Each criterion can be scored once.')
    seen.add(crit.id)
    if (!Number.isInteger(item.score) || item.score < 1 || item.score > 5) fields[crit.key] = 'Choose a score from 1 to 5'
    else if (!item.reason.trim()) fields[crit.key] = 'Give a reason'
  }
  return Object.keys(fields).length ? refused('VALIDATION', 'Some scores need attention.', fields) : null
}

function write(assignmentId: string, items: ScoreItem[], overallComment: string): MyScorecard {
  const card = state.scorecards.get(assignmentId) ?? { id: crypto.randomUUID(), status: 'draft' as const, overall_comment: '', submitted_at: null, items: [] }
  card.items = items.map((i) => ({ ...i, reason: i.reason }))
  card.overall_comment = overallComment
  state.scorecards.set(assignmentId, card)
  return card
}

export const mockReview: ReviewPort = {
  async myQueue() {
    await wait()
    const reviewer = await me()
    if (!reviewer) return []
    const rows: ReviewQueueRow[] = []
    for (const c of mockStaffInternals.cases())
      for (const a of mockStaffInternals.assignments().get(c.id) ?? []) if (a.reviewer_id === reviewer && !a.revoked_at) rows.push(rowFor(a, c))
    return rows.sort((x, y) => (x.due_at ?? '9').localeCompare(y.due_at ?? '9') || x.reference.localeCompare(y.reference))
  },

  async getWorkspace(assignmentId) {
    await wait()
    const reviewer = await me()
    const hit = find(assignmentId)
    if (!reviewer || !hit || hit.a.reviewer_id !== reviewer || hit.a.revoked_at) return null
    const row = rowFor(hit.a, hit.c)
    if (row.my_status === 'declaration_needed' || !hit.c.version) return { row, proposal: null, criteria: [], scorecard: null }
    const card = state.scorecards.get(assignmentId)
    return {
      row,
      proposal: { version_no: hit.c.version.version_no, data: hit.c.version.data, form_schema: hit.c.form_schema, files: hit.c.files },
      criteria: MOCK_RUBRIC,
      scorecard: card ? { ...card, items: card.items.map((i) => ({ ...i })) } : null,
    }
  },

  async declare({ assignmentId, hasConflict, confidentialityAccepted }) {
    await wait()
    const reviewer = await me()
    const hit = find(assignmentId)
    if (!reviewer || !hit || hit.a.reviewer_id !== reviewer) return refused('FORBIDDEN', "You don't have access to this action.")
    const { a, c } = hit
    if (a.declared_at !== null) {
      if (a.has_conflict === hasConflict) return { kind: 'ok', data: { assignment_id: a.id, has_conflict: hasConflict, revoked: a.revoked_at !== null, replayed: true } }
      return refused('INVALID_STATE', 'Your declaration for this case is already recorded.')
    }
    if (a.revoked_at) return refused('FORBIDDEN', "You don't have access to this action.")
    if (c.status !== 'in_evaluation') return refused('INVALID_STATE', 'This case is no longer being reviewed.')
    const now = new Date().toISOString()
    if (hasConflict) {
      a.declared_at = now
      a.has_conflict = true
      a.revoked_at = now
      return { kind: 'ok', data: { assignment_id: a.id, has_conflict: true, revoked: true, replayed: false } }
    }
    if (!confidentialityAccepted)
      return refused('VALIDATION', 'Accept the confidentiality declaration to open the case.', { confidentiality: 'Required' })
    a.declared_at = now
    a.has_conflict = false
    return { kind: 'ok', data: { assignment_id: a.id, has_conflict: false, revoked: false, replayed: false } }
  },

  async saveScorecard({ assignmentId, items, overallComment }) {
    await wait()
    const hit = await scoringTarget(assignmentId)
    if ('kind' in hit) return hit
    if (state.scorecards.get(assignmentId)?.status === 'submitted') return refused('INVALID_STATE', 'You have already submitted your scores for this version.')
    const bad = checkItems(items)
    if (bad) return bad
    const card = write(assignmentId, items, overallComment)
    const data: ScorecardResult = { scorecard_id: card.id, status: 'draft', saved_at: new Date().toISOString(), weighted_score: weighted(card.items, MOCK_RUBRIC) }
    return { kind: 'ok', data }
  },

  async submitScorecard({ assignmentId, items, overallComment }) {
    await wait()
    const existing = state.scorecards.get(assignmentId)
    const hitForReplay = find(assignmentId)
    if (existing?.status === 'submitted' && hitForReplay) {
      // A retry returns the recorded result and changes nothing.
      const submitted = (mockStaffInternals.assignments().get(hitForReplay.c.id) ?? []).filter((x) => !x.revoked_at && state.scorecards.get(x.id)?.status === 'submitted').length
      return {
        kind: 'ok',
        data: { scorecard_id: existing.id, status: 'submitted', submitted_at: existing.submitted_at ?? undefined, weighted_score: weighted(existing.items, MOCK_RUBRIC), submitted_count: submitted, quorum: QUORUM, quorum_reached: submitted >= QUORUM, replayed: true },
      }
    }
    const hit = await scoringTarget(assignmentId)
    if ('kind' in hit) return hit
    const bad = checkItems(items)
    if (bad) return bad
    const card = write(assignmentId, items, overallComment)
    const fields: Record<string, string> = {}
    for (const crit of MOCK_RUBRIC) {
      const item = card.items.find((i) => i.criterion_id === crit.id)
      if (!item) fields[crit.key] = 'Choose a score from 1 to 5'
      else if ([...item.reason.trim()].length < 20) fields[crit.key] = 'Give a reason of at least 20 characters'
    }
    if (Object.keys(fields).length) return refused('VALIDATION', 'Score every criterion and give a reason for each. Your scores are saved.', fields)

    card.status = 'submitted'
    card.submitted_at = new Date().toISOString()
    const active = (mockStaffInternals.assignments().get(hit.c.id) ?? []).filter((x) => !x.revoked_at)
    const submitted = active.filter((x) => state.scorecards.get(x.id)?.status === 'submitted').length
    const reached = submitted >= QUORUM
    if (reached && hit.c.status === 'in_evaluation') {
      mockStaffInternals.moveCase(hit.c.id, {
        from_status: 'in_evaluation',
        to_status: 'in_adjudication',
        public_stage: mockStaffInternals.publicStage('in_adjudication'),
        reason: null,
        at: card.submitted_at,
      })
    }
    return {
      kind: 'ok',
      data: { scorecard_id: card.id, status: 'submitted', submitted_at: card.submitted_at, weighted_score: weighted(card.items, MOCK_RUBRIC), submitted_count: submitted, quorum: QUORUM, quorum_reached: reached, replayed: false },
    }
  },

  async getPanel(proposalId) {
    await wait()
    const user = await mockSession.getSession()
    const c = mockStaffInternals.cases().find((x) => x.id === proposalId)
    if (!user || !c || !c.version) return null
    const assignments = mockStaffInternals.assignments().get(c.id) ?? []
    const reviewer = user.roles.includes('reviewer') ? mockStaffInternals.seedReviewerId(user.id) : undefined
    // scorecard.read_panel (adjudicator, admin), or a cleared reviewer after submitting their own (contract §4.3).
    const panelRole = user.roles.some((r) => r === 'adjudicator' || r === 'admin')
    const ownSubmitted = assignments.some((a) => a.reviewer_id === reviewer && !a.revoked_at && state.scorecards.get(a.id)?.status === 'submitted')
    if (!panelRole && !ownSubmitted) return null

    const cards = assignments
      .filter((a) => !a.revoked_at && state.scorecards.get(a.id)?.status === 'submitted')
      .map((a) => {
        const card = state.scorecards.get(a.id)!
        return {
          scorecard_id: card.id,
          assignment_id: a.id,
          reviewer_id: a.reviewer_id,
          reviewer_name: a.reviewer_name,
          submitted_at: card.submitted_at ?? '',
          overall_comment: card.overall_comment,
          weighted_score: weighted(card.items, MOCK_RUBRIC),
          items: card.items.map((i) => ({ ...i })),
        }
      })
    const summary = MOCK_RUBRIC.flatMap((crit) => {
      const scores = cards.flatMap((k) => k.items.filter((i) => i.criterion_id === crit.id).map((i) => i.score))
      if (scores.length === 0) return []
      const min = Math.min(...scores)
      const max = Math.max(...scores)
      const mean = round2(scores.reduce((a, b) => a + b, 0) / scores.length)
      return [{ criterion_id: crit.id, key: crit.key, mean, min, max, spread: max - min, flagged: max - min >= 2 }]
    })
    const ws = cards.map((k) => k.weighted_score).filter((x): x is number => x !== null)
    const aggregate: ScorePanel['aggregate'] = ws.length
      ? {
          mean_weighted: round2(ws.reduce((a, b) => a + b, 0) / ws.length),
          min_weighted: Math.min(...ws),
          max_weighted: Math.max(...ws),
          spread: round2(Math.max(...ws) - Math.min(...ws)),
          flagged: Math.max(...ws) - Math.min(...ws) >= 2,
        }
      : null
    return {
      proposal_id: c.id,
      reference: c.reference,
      version_id: `${c.id}-v${c.version.version_no}`,
      version_no: c.version.version_no,
      criteria: MOCK_RUBRIC.map((x) => ({ criterion_id: x.id, key: x.key, label: x.label, weight: x.weight, anchors: x.anchors })),
      scorecards: cards,
      criteria_summary: summary,
      aggregate,
      submitted_count: cards.length,
      quorum: QUORUM,
      spread_flag_threshold: 2,
    }
  },
}
