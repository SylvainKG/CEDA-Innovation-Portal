import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { DashboardCard, NotificationItem } from '@/components'
import { EmptyState, ErrorState, LoadingState } from '@/components/states/States'
import { chatKeys } from '@/features/chat/queries'
import { oversightKeys } from '@/features/oversight/queries'
import { reviewKeys } from '@/features/review/queries'
import { staffKeys } from '@/features/staff/queries'
import { api } from '@/lib/api'
import type { Role } from '@/lib/api/types'
import { formatDateCAT } from '@/lib/format'
import { useSession } from '@/lib/session'
import { CommitteeHome } from './CommitteeView'

const READ_ALL: readonly Role[] = ['screening_officer', 'adjudicator', 'admin']
const HANDLE: readonly Role[] = ['support_consultant', 'support_lead']
const WEEK = 7 * 86_400_000

interface Task {
  key: string
  label: string
  detail: string
  to: string
  /** Sort key: oldest or soonest first. */
  at: string
}

/**
 * T06 staff home (spec T06), Provisional UI built from the written spec (BCR-003; design review pending).
 * Per-role figures, "Your next tasks" (up to 5, linked) and recent activity (the reader's 10 latest
 * notifications). Everything comes from reads the person already has; nothing new on the server. The committee
 * overview (D-08, `list_case_status`) is not built yet.
 */
export function StaffHomePage() {
  const { data: user } = useSession()
  const roles = user?.roles ?? []
  const has = (list: readonly Role[]) => roles.some((r) => list.includes(r))
  const readAll = has(READ_ALL)
  const reviewer = roles.includes('reviewer')
  const support = has(HANDLE)

  const cases = useQuery({ queryKey: staffKeys.cases([]), queryFn: () => api.staff.listCases({ statuses: [] }), enabled: readAll })
  const queue = useQuery({ queryKey: reviewKeys.queue, queryFn: () => api.review.myQueue(), enabled: reviewer })
  const inbox = useQuery({ queryKey: chatKeys.inbox, queryFn: () => api.chat.inbox(), enabled: support, refetchInterval: 15_000 })
  const notes = useQuery({ queryKey: oversightKeys.notifications, queryFn: () => api.oversight.listNotifications() })

  if (user && roles.length === 1 && roles[0] === 'committee_member') return <CommitteeHome />
  const pending = [readAll && cases, reviewer && queue, support && inbox, notes].filter((q) => q && q.isPending)
  if (!user || pending.length) return <LoadingState what="your home page" />
  const failed = [readAll && cases, reviewer && queue, support && inbox].find((q) => q && q.isError)
  if (failed) return <ErrorState level="h1" message="We couldn't load your home page." onRetry={() => void Promise.all([cases.refetch(), queue.refetch(), inbox.refetch(), notes.refetch()])} />

  const now = Date.now()
  const all = cases.data ?? []
  const awaitingScreening = all.filter((c) => c.status === 'submitted')
  const ready = all.filter((c) => c.status === 'in_adjudication')
  const mine = (queue.data ?? []).filter((r) => r.my_status !== 'submitted' && r.case_status === 'in_evaluation')
  const overdue = mine.filter((r) => r.due_at && Date.parse(r.due_at) < now)
  const waiting = (inbox.data ?? []).filter((r) => r.status === 'queued')

  const tiles: { label: string; value: number; definition: string; to: string }[] = []
  const tasks: Task[] = []
  if (has(['screening_officer', 'admin'])) {
    tiles.push({ label: 'Awaiting screening', value: awaitingScreening.length, definition: 'Submitted ideas not yet screened.', to: '/staff/queue/screening' })
    for (const c of awaitingScreening) tasks.push({ key: `s-${c.id}`, label: `Screen ${c.reference}`, detail: c.title, to: `/staff/cases/${c.id}`, at: c.submitted_at })
  }
  if (reviewer) {
    tiles.push({ label: 'Reviews to do', value: mine.length, definition: `${overdue.length} overdue. Assigned to you and not yet submitted.`, to: '/staff/reviews' })
    for (const r of mine)
      tasks.push({
        key: `r-${r.assignment_id}`,
        label: r.my_status === 'declaration_needed' ? `Declare conflicts for ${r.reference}` : `Score ${r.reference}`,
        detail: r.due_at ? `Due ${formatDateCAT(r.due_at)}${Date.parse(r.due_at) < now ? ' (overdue)' : ''}` : r.title,
        to: `/staff/cases/${r.proposal_id}/score`,
        at: r.due_at ?? '9999',
      })
  }
  if (has(['adjudicator', 'admin'])) {
    tiles.push({ label: 'Ready for decision', value: ready.length, definition: 'All reviewers have submitted their scorecards.', to: '/staff/queue/decision' })
    for (const c of ready) tasks.push({ key: `d-${c.id}`, label: `Decide ${c.reference}`, detail: c.title, to: `/staff/cases/${c.id}/panel`, at: c.updated_at })
  }
  if (roles.includes('admin')) {
    tiles.push({ label: 'Submitted this week', value: all.filter((c) => now - Date.parse(c.submitted_at) < WEEK).length, definition: 'Ideas submitted in the last 7 days.', to: '/staff/cases' })
    tiles.push({ label: 'In evaluation', value: all.filter((c) => c.status === 'in_evaluation').length, definition: 'Cases with the review panel.', to: '/staff/cases?status=in_evaluation' })
  }
  if (support) {
    tiles.push({ label: 'Chats waiting', value: waiting.length, definition: 'Applicants waiting for a consultant now.', to: '/support/inbox' })
    for (const w of waiting) tasks.push({ key: `c-${w.session_id}`, label: `Answer ${w.applicant_name ?? 'an applicant'}`, detail: 'Waiting in chat', to: '/support/inbox', at: w.queued_at })
  }
  if (roles.includes('auditor') && !roles.includes('admin')) tiles.push({ label: 'Audit log', value: 0, definition: 'Read every recorded action.', to: '/audit' })

  const next = tasks.sort((a, b) => a.at.localeCompare(b.at)).slice(0, 5)
  const recent = (notes.data ?? []).slice(0, 10)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1 font-semibold">Welcome, {user.displayName}</h1>
      {tiles.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {tiles.map((t) => (
            <DashboardCard key={t.label} label={t.label} value={t.label === 'Audit log' ? 'Open' : t.value} definition={t.definition} to={t.to} />
          ))}
        </div>
      ) : null}

      <section aria-labelledby="home-next" className="flex flex-col gap-2">
        <h2 id="home-next" className="text-h2 font-semibold">
          Your next tasks
        </h2>
        {next.length === 0 ? (
          <EmptyState title="Nothing needs your attention right now." />
        ) : (
          <ol aria-labelledby="home-next" className="flex flex-col gap-2">
            {next.map((t) => (
              <li key={t.key}>
                <Link to={t.to} className="flex min-h-touch flex-col rounded-md bg-surface-card p-3 text-ink no-underline shadow-1 hover:bg-surface-sunken">
                  <span className="font-semibold">{t.label}</span>
                  <span className="text-sm text-ink-muted">{t.detail}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
        {tasks.length > 5 ? <p className="text-sm text-ink-muted">{tasks.length - 5} more in your queues.</p> : null}
      </section>

      <section aria-labelledby="home-recent" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="home-recent" className="text-h2 font-semibold">
            Recent activity
          </h2>
          <Link to="/notifications">All notifications</Link>
        </div>
        {notes.isError ? <p className="text-ink-muted">We couldn&apos;t load recent activity.</p> : null}
        {recent.length === 0 && !notes.isError ? <p className="text-ink-muted">No recent activity.</p> : null}
        <ul className="flex flex-col gap-1">
          {recent.map((n) => (
            <li key={n.id}>
              <NotificationItem title={n.title} body={n.body} createdAt={n.created_at} unread={!n.read_at} to={n.proposal_id ? `/staff/cases/${n.proposal_id}` : undefined} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
