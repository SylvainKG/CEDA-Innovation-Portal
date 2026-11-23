import { fromRpcError, rpcError } from '../errors'
import type { OversightPort } from '../oversight'
import type { AppNotification, AuditRow, CommandOutcome, ProgrammeReport, ReportCaseRow, ReportFilters, Role, StaffCase } from '../types'
import { mockSession } from './session'

/**
 * MOCK oversight adapter (Slice 6a): development and demo preview only. Notifications are seeded per demo persona;
 * the report and the audit log are derived from the shared mock case state, so their figures reconcile with the
 * seed (8 cases, 4 applicants, one award of BWP 250,000) and with screens that change cases in this session.
 * Access follows the contract: report.read (adjudicator, admin), audit.read (admin, auditor), own notifications only.
 * It proves nothing about the server; access is evidenced by the pgTAP suites and the N-tests.
 */

const DAY = 86_400_000
const REPORT_ROLES: readonly Role[] = ['adjudicator', 'admin']
const AUDIT_ROLES: readonly Role[] = ['admin', 'auditor']
const caseId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`

/** seed.sql: who owns each seeded case (applicants a1, a3, a4, a5). */
const SEED_OWNERS: Record<string, { id: string; name: string }> = {}
const A1 = { id: '00000000-0000-4000-8000-0000000000a1', name: 'Demo Applicant A' }
const A3 = { id: '00000000-0000-4000-8000-0000000000a3', name: 'Demo Applicant C' }
const A4 = { id: '00000000-0000-4000-8000-0000000000a4', name: 'Demo Applicant D' }
const A5 = { id: '00000000-0000-4000-8000-0000000000a5', name: 'Demo Applicant E' }
;[A3, A4, A5, A3, A4, A5, A3, A1].forEach((o, i) => (SEED_OWNERS[caseId(i + 1)] = o))

interface StoredNotification extends AppNotification {
  user_id: string
}

const state = {
  notifications: [] as StoredNotification[],
  /** profiles.alerts_opt_in per demo persona (default off). */
  alerts: new Map<string, boolean>(),
  latencyMs: import.meta.env.MODE === 'test' ? 0 : 200,
}

function seedNotifications(): StoredNotification[] {
  const n = (user_id: string, i: number, proposal: number | null, type: string, title: string, body: string, created_at: string, read: boolean): StoredNotification => ({
    id: `90000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    user_id,
    proposal_id: proposal ? caseId(proposal) : null,
    type,
    title,
    body,
    created_at,
    read_at: read ? created_at : null,
  })
  return [
    n('demo-applicant-a', 1, 8, 'proposal.submitted', 'Idea submitted', 'Your idea was received. Keep your reference for any questions.', '2026-11-08T07:40:00Z', true),
    n('demo-applicant-a', 2, 8, 'case.under_review', 'Your idea is under review', 'Your idea passed screening and is with the review panel.', '2026-11-10T09:00:00Z', false),
    n('demo-reviewer-1', 3, 2, 'assignment.created', 'New case to review', 'A case was assigned to you. Declare any conflict before you open it.', '2026-11-04T08:30:00Z', true),
    n('demo-reviewer-1', 4, 8, 'assignment.created', 'New case to review', 'A case was assigned to you. Declare any conflict before you open it.', '2026-11-10T09:05:00Z', false),
    n('demo-adjudicator', 5, 4, 'case.ready_for_decision', 'Case ready for decision', 'All reviewers have submitted their scorecards.', '2026-10-26T07:00:00Z', false),
    n('demo-admin', 6, null, 'role.granted', 'Your access changed', 'An administrator updated your roles.', '2026-11-01T06:00:00Z', true),
    // Sample notifications per user type (fictional; never proposal content), so every dashboard's bell panel and
    // the notifications page have something to show in the demo.
    n('demo-applicant-a', 7, 8, 'feedback.requested', 'Clarification requested', 'A CEDA officer asked a question about your idea. Reply from the idea page.', '2026-11-21T08:15:00Z', false),
    n('demo-applicant-a', 8, null, 'chat.reply', 'Reply from CEDA support', 'A consultant answered your question in the support chat.', '2026-11-20T13:30:00Z', false),
    n('demo-applicant-a', 9, null, 'challenge.published', 'New challenge open', 'A new innovation challenge is open for ideas.', '2026-11-15T07:00:00Z', true),
    n('demo-applicant-a', 10, null, 'draft.reminder', 'Finish your draft', 'You have a draft idea that has not been submitted yet.', '2026-11-12T06:30:00Z', true),
    n('demo-screening', 11, 1, 'proposal.submitted', 'New idea to screen', 'A new idea is waiting in the screening queue.', '2026-11-21T07:50:00Z', false),
    n('demo-screening', 12, 3, 'feedback.responded', 'Applicant replied', 'An applicant answered your clarification request.', '2026-11-20T10:05:00Z', false),
    n('demo-screening', 13, 1, 'case.overdue', 'Screening overdue', 'A case has waited more than five days for screening.', '2026-11-18T06:00:00Z', true),
    n('demo-reviewer-1', 14, 8, 'review.due_soon', 'Scorecard due in 2 days', 'Submit your scorecard before the due date.', '2026-11-21T06:00:00Z', false),
    n('demo-reviewer-1', 15, 2, 'case.revised', 'Revised version to review', 'The applicant submitted version 2. Score the new version.', '2026-11-16T09:20:00Z', true),
    n('demo-admin', 16, 4, 'case.ready_for_decision', 'Case ready for decision', 'All reviewers have submitted their scorecards.', '2026-11-21T09:10:00Z', false),
    n('demo-admin', 17, null, 'chat.waiting', 'Applicant waiting in chat', 'An applicant is waiting for a consultant in the support chat.', '2026-11-21T11:40:00Z', false),
    n('demo-admin', 18, 2, 'review.overdue', 'Review overdue', "A reviewer's scorecard is past its due date.", '2026-11-17T07:00:00Z', true),
    n('demo-admin', 19, null, 'staff.invited', 'Invitation accepted', 'A new staff member accepted their invitation.', '2026-11-19T12:00:00Z', true),
    n('demo-adjudicator', 20, 5, 'decision.published', 'Decision published', 'Your decision was published to the applicant.', '2026-11-14T10:00:00Z', true),
    n('demo-consultant', 21, null, 'chat.waiting', 'Applicant waiting in chat', 'An applicant is waiting for a consultant in the support chat.', '2026-11-21T11:40:00Z', false),
    n('demo-support-lead', 22, null, 'chat.waiting', 'Applicant waiting in chat', 'An applicant is waiting for a consultant in the support chat.', '2026-11-21T11:40:00Z', false),
    n('demo-support-lead', 23, null, 'chat.stats', 'Weekly chat summary ready', "Last week's support chat figures are ready on the support dashboard.", '2026-11-17T06:00:00Z', true),
    n('demo-committee', 24, null, 'report.updated', 'Programme summary updated', 'The status summary for the committee was updated.', '2026-11-20T06:00:00Z', false),
    n('demo-auditor', 25, null, 'audit.role_change', 'Role change recorded', 'A role change was recorded in the audit log.', '2026-11-19T12:05:00Z', false),
  ]
}

function reset() {
  state.notifications = seedNotifications()
  state.alerts.clear()
}
reset()

/** Test and demo helpers. Not part of the port; screens must never import these. */
export const mockOversightControls = {
  reset,
  /** Add a notification for a demo persona (tests of the live badge). */
  notify(userId: string, n: Omit<AppNotification, 'id' | 'created_at' | 'read_at'>) {
    state.notifications.push({ ...n, id: crypto.randomUUID(), user_id: userId, created_at: new Date().toISOString(), read_at: null })
  },
}

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, state.latencyMs))
const refused = (...args: Parameters<typeof rpcError>): CommandOutcome<never> => fromRpcError(rpcError(...args))

async function can(roles: readonly Role[]) {
  const user = await mockSession.getSession()
  return Boolean(user?.roles.some((r) => roles.includes(r)))
}

/** The cases a report covers: submitted (never drafts), filtered by challenge and submission time (CAT days). */
async function reportCases(f: ReportFilters): Promise<StaffCase[]> {
  const { mockStaffInternals } = await import('./staff')
  const from = f.from ? Date.parse(`${f.from}T00:00:00+02:00`) : null
  const to = f.to ? Date.parse(`${f.to}T00:00:00+02:00`) + DAY : null
  return mockStaffInternals.cases().filter((c) => {
    const at = Date.parse(c.submitted_at)
    return (!f.challengeId || c.challenge.id === f.challengeId) && (from === null || at >= from) && (to === null || at < to)
  })
}

function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = (s.length - 1) / 2
  return Math.round(((s[Math.floor(m)]! + s[Math.ceil(m)]!) / 2) * 10) / 10
}

const share = (n: number, of: number) => (of === 0 ? null : Math.round((n / of) * 100) / 100)
const LATER = ['review', 'feedback', 'approval', 'award']
const TERMINAL = ['approved', 'not_approved', 'awarded', 'closed']

function lastUpdate(c: StaffCase) {
  return c.events.reduce((m, e) => (e.at > m ? e.at : m), c.submitted_at)
}

function validPeriod(f: ReportFilters) {
  return !(f.from && f.to && f.from > f.to)
}

export const mockOversight: OversightPort = {
  async listNotifications() {
    await wait()
    const user = await mockSession.getSession()
    if (!user) return []
    return state.notifications
      .filter((n) => n.user_id === user.id)
      .map((n): AppNotification => ({ id: n.id, proposal_id: n.proposal_id, type: n.type, title: n.title, body: n.body, created_at: n.created_at, read_at: n.read_at }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  async markRead(ids) {
    await wait()
    const user = await mockSession.getSession()
    if (!user) return refused('FORBIDDEN', 'Sign in first.')
    const now = new Date().toISOString()
    let updated = 0
    for (const n of state.notifications)
      if (n.user_id === user.id && !n.read_at && (ids === null || ids.includes(n.id))) {
        n.read_at = now
        updated++
      }
    return { kind: 'ok', data: { updated } }
  },

  async getReport(filters) {
    await wait()
    if (!(await can(REPORT_ROLES))) return null
    if (!validPeriod(filters)) throw rpcError('VALIDATION', 'The period must end after it starts.', { to: 'Must be after the start' })
    const rc = await reportCases(filters)
    const { mockFeedbackInternals } = await import('./feedback')
    const now = Date.now()
    const count = (p: (c: StaffCase) => boolean) => rc.filter(p).length
    const byChallenge = new Map<string, { challenge_id: string; title: string; submitted: number }>()
    for (const c of rc) {
      const b = byChallenge.get(c.challenge.id) ?? { challenge_id: c.challenge.id, title: c.challenge.title, submitted: 0 }
      b.submitted++
      byChallenge.set(c.challenge.id, b)
    }
    const byStage: Record<string, number> = {}
    const days = new Map<string, number[]>()
    for (const c of rc) {
      const stage = c.events.at(-1)?.public_stage ?? c.status
      byStage[stage] = (byStage[stage] ?? 0) + 1
      const ev = [...c.events].sort((a, b) => a.at.localeCompare(b.at))
      ev.forEach((e, i) => {
        if (TERMINAL.includes(e.to_status)) return
        const end = i + 1 < ev.length ? Date.parse(ev[i + 1]!.at) : now
        days.set(e.to_status, [...(days.get(e.to_status) ?? []), (end - Date.parse(e.at)) / DAY])
      })
    }
    const reachedLater = count((c) => c.events.some((e) => e.public_stage !== null && LATER.includes(e.public_stage)))
    const checks = rc.flatMap((c) => (mockFeedbackInternals.requests().get(c.id) ?? []).flatMap((r) => r.tasks.flatMap((t) => t.verifications ?? [])))
    const report: ProgrammeReport = {
      generated_at: new Date().toISOString(),
      participation: {
        submitted: rc.length,
        distinct_applicants: new Set(rc.map((c) => SEED_OWNERS[c.id]?.id ?? 'session-applicant')).size,
        drafts_started: rc.length,
        by_challenge: [...byChallenge.values()].sort((a, b) => b.submitted - a.submitted),
      },
      outcomes: {
        by_current_stage: byStage,
        approved: count((c) => c.status === 'approved' || c.status === 'awarded'),
        not_approved: count(
          (c) => c.status === 'not_approved' || (c.status === 'closed' && c.decisions.some((d) => d.published_at && !d.superseded_at && d.outcome === 'not_approved')),
        ),
        awarded: count((c) => c.status === 'awarded'),
        closed: count((c) => c.status === 'closed'),
        award_total_minor: rc.reduce((s, c) => s + (c.award?.amount_minor ?? 0), 0),
        currency: 'BWP',
      },
      funnel: ['submission', 'review', 'feedback', 'approval', 'award'].map((stage) => ({ stage, reached: count((c) => c.events.some((e) => e.public_stage === stage)) })),
      time_in_stage: [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([status, xs]) => ({ status, cases: xs.length, median_days: median(xs) })),
      overdue: {
        feedback_requests: rc.reduce((s, c) => s + (mockFeedbackInternals.requests().get(c.id) ?? []).filter((r) => r.status === 'open' && Date.parse(r.due_at) < now).length, 0),
        reviews: 0,
      },
      impact: {
        reached_later_stage: reachedLater,
        reached_later_stage_share: share(reachedLater, rc.length),
        resubmitted_after_feedback: count((c) => (c.version?.version_no ?? 1) >= 2),
        roadmap_tasks_verified_share: share(checks.filter((v) => v.result === 'verified').length, checks.length),
      },
    }
    return report
  },

  async reportRows(filters) {
    await wait()
    if (!(await can(REPORT_ROLES))) return null
    if (!validPeriod(filters)) throw rpcError('VALIDATION', 'The period must end after it starts.', { to: 'Must be after the start' })
    const rc = await reportCases(filters)
    return rc
      .map((c): ReportCaseRow => {
        const last = lastUpdate(c)
        const published = c.decisions.find((d) => d.published_at && !d.superseded_at)
        return {
          reference: c.reference,
          challenge_title: c.challenge.title,
          public_stage: c.events.at(-1)?.public_stage ?? c.status,
          status: c.status,
          submitted_at: c.submitted_at,
          versions: c.version?.version_no ?? 1,
          last_update: last,
          days_in_current_stage: Math.round(((Date.now() - Date.parse(last)) / DAY) * 10) / 10,
          published_outcome: published?.outcome ?? null,
          award_minor: c.award?.amount_minor ?? null,
          currency: 'BWP',
        }
      })
      .sort((a, b) => a.reference.localeCompare(b.reference))
  },

  async queryAudit(q) {
    await wait()
    if (!(await can(AUDIT_ROLES))) return null
    const { mockStaffInternals } = await import('./staff')
    const rows: Omit<AuditRow, 'id'>[] = []
    for (const c of mockStaffInternals.cases()) {
      const owner = SEED_OWNERS[c.id] ?? { id: 'session-applicant', name: 'Demo Applicant A' }
      const ev = [...c.events].sort((a, b) => a.at.localeCompare(b.at))
      for (const e of ev) {
        const submitted = e.to_status === 'submitted' && (e.from_status === null || e.from_status === 'draft')
        rows.push({
          at: e.at,
          actor_id: submitted ? owner.id : null,
          actor_name: submitted ? owner.name : null,
          actor_role: submitted ? 'applicant' : null,
          action: submitted ? 'proposal.submitted' : 'case.status_changed',
          target_type: 'proposal',
          target_id: c.id,
          reference: c.reference,
          metadata: submitted ? { reference: c.reference, version_no: 1 } : { from_status: e.from_status, to_status: e.to_status, ...(e.reason ? { reason: e.reason } : {}) },
        })
      }
      for (const d of c.decisions.filter((x) => x.published_at))
        rows.push({
          at: d.published_at!,
          actor_id: null,
          actor_name: 'Demo Adjudicator',
          actor_role: 'adjudicator',
          action: 'decision.published',
          target_type: 'decision',
          target_id: d.id,
          reference: c.reference,
          metadata: { outcome: d.outcome },
        })
      if (c.award)
        rows.push({
          at: c.award.recorded_at,
          actor_id: null,
          actor_name: 'Demo Adjudicator',
          actor_role: 'adjudicator',
          action: 'award.recorded',
          target_type: 'award',
          target_id: c.id,
          reference: c.reference,
          metadata: { amount_minor: c.award.amount_minor, currency: 'BWP' },
        })
    }
    const all = rows.sort((a, b) => a.at.localeCompare(b.at)).map((r, i) => ({ id: i + 1, ...r }))
    const ref = q.reference?.trim().toUpperCase()
    const action = q.action?.trim()
    const limit = Math.max(1, Math.min(q.limit ?? 100, 500))
    return all
      .filter(
        (r) =>
          (!ref || r.reference === ref) &&
          (!action || r.action.startsWith(action)) &&
          (!q.from || r.at >= q.from) &&
          (!q.to || r.at < q.to) &&
          (q.beforeId === undefined || r.id < q.beforeId),
      )
      .sort((a, b) => b.id - a.id)
      .slice(0, limit)
  },

  async alertPreference() {
    await wait()
    const user = await mockSession.getSession()
    return user ? (state.alerts.get(user.id) ?? false) : null
  },

  async setAlertPreference(optIn) {
    await wait()
    const user = await mockSession.getSession()
    if (!user) return refused('FORBIDDEN', 'Sign in first.')
    state.alerts.set(user.id, optIn)
    return { kind: 'ok', data: { alerts_opt_in: optIn } }
  },
}
