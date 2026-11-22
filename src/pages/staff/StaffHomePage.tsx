import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/states/States'
import { ToolkitPreview } from '@/components/ToolkitPreview'
import { chatKeys } from '@/features/chat/queries'
import { oversightKeys } from '@/features/oversight/queries'
import { reviewKeys } from '@/features/review/queries'
import { staffKeys } from '@/features/staff/queries'
import { REVIEWER_HIGHLIGHTED, REVIEWER_TOOLS } from '@/features/toolkit-preview/catalogue'
import { toolkitPreviewEnabled } from '@/features/toolkit-preview/flag'
import { api } from '@/lib/api'
import type { Role } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { useSession } from '@/lib/session'
import { staffStatus } from '@/lib/status'
import { roleLabel } from '@/navigation/role-labels'
import { PageHeader } from '@/layouts/PageHeader'
import { CommitteeHome } from './CommitteeView'

const READ_ALL: readonly Role[] = ['screening_officer', 'adjudicator', 'admin']
const HANDLE: readonly Role[] = ['support_consultant', 'support_lead']
const DAY = 86_400_000
const WEEK = 7 * DAY

interface Tile {
  label: string
  value: number
  caption: string
  to?: string
}

interface Task {
  key: string
  title: string
  /** "CEDA-2026-0009 · Awaiting screening" */
  detail: string
  to: string
  /** Sort key: oldest or soonest first. */
  at: string
  /** Shown at the right: "Due today", "5 days", "3 h ago". */
  when: string
  /** Due today, overdue or long waiting: a red dot. */
  urgent: boolean
}

/** Good morning / afternoon / evening, by the hour in Botswana (CAT). */
function greeting(now: Date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Gaborone' }).format(now))
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

/** "just now", "5 min ago", "3 h ago", "2 days ago". */
function ago(iso: string, now: number): string {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`
  const d = Math.floor(s / 86_400)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

/** "Due today" / "3 days" / "2 days overdue" for a deadline. */
function dueText(iso: string, now: number): { text: string; urgent: boolean } {
  const days = Math.floor((Date.parse(iso) - now) / DAY)
  if (days < 0) return { text: `${-days} ${-days === 1 ? 'day' : 'days'} overdue`, urgent: true }
  if (days === 0) return { text: 'Due today', urgent: true }
  return { text: `${days} ${days === 1 ? 'day' : 'days'}`, urgent: false }
}

/**
 * T06 staff home (spec T06), laid out to Sandra's 21 Nov role dashboards (screening officer, reviewer, adjudicator,
 * administrator): "<ROLE> PORTAL", "Good afternoon, <name>", the role's figures, "Your next tasks" (up to five,
 * linked, a red dot when due) beside "Recent activity", and for administrators "Cases by stage".
 * Everything comes from reads the person already has. Figures the frames show that these reads can't give (a
 * screening officer's overdue count, drafted decisions) are replaced by the nearest real figure, never invented.
 */
export function StaffHomePage() {
  const { data: user } = useSession()
  const roles = user?.roles ?? []
  const has = (list: readonly Role[]) => roles.some((r) => list.includes(r))
  const readAll = has(READ_ALL)
  const reviewer = roles.includes('reviewer')
  const support = has(HANDLE)
  const admin = roles.includes('admin')

  const cases = useQuery({ queryKey: staffKeys.cases([]), queryFn: () => api.staff.listCases({ statuses: [] }), enabled: readAll })
  const queue = useQuery({ queryKey: reviewKeys.queue, queryFn: () => api.review.myQueue(), enabled: reviewer })
  const inbox = useQuery({ queryKey: chatKeys.inbox, queryFn: () => api.chat.inbox(), enabled: support, refetchInterval: 15_000 })
  const notes = useQuery({ queryKey: oversightKeys.notifications, queryFn: () => api.oversight.listNotifications() })
  const report = useQuery({ queryKey: oversightKeys.report({}), queryFn: () => api.oversight.getReport({}), enabled: admin })

  if (user && roles.length === 1 && roles[0] === 'committee_member') return <CommitteeHome />
  const pending = [readAll && cases, reviewer && queue, support && inbox, notes].filter((q) => q && q.isPending)
  if (!user || pending.length) return <LoadingState what="your home page" />
  const failed = [readAll && cases, reviewer && queue, support && inbox].find((q) => q && q.isError)
  if (failed) return <ErrorState level="h1" message="We couldn't load your home page." onRetry={() => void Promise.all([cases.refetch(), queue.refetch(), inbox.refetch(), notes.refetch()])} />

  const now = Date.now()
  const all = cases.data ?? []
  const count = (s: string) => all.filter((c) => c.status === s).length
  const awaitingScreening = all.filter((c) => c.status === 'submitted')
  const ready = all.filter((c) => c.status === 'in_adjudication')
  const myQueue = queue.data ?? []
  const mine = myQueue.filter((r) => r.my_status !== 'submitted' && r.case_status === 'in_evaluation')
  const overdue = mine.filter((r) => r.due_at && Date.parse(r.due_at) < now)
  const waiting = (inbox.data ?? []).filter((r) => r.status === 'queued')
  const main = roles.find((r) => r !== 'auditor') ?? roles[0]

  const tiles: Tile[] = []
  const tasks: Task[] = []
  const queueLink = has(['admin', 'screening_officer']) ? '/staff/queue/screening' : reviewer ? '/staff/reviews' : roles.includes('adjudicator') ? '/staff/queue/decision' : support ? '/support/inbox' : undefined

  if (admin) {
    tiles.push({ label: 'Submitted this week', value: all.filter((c) => now - Date.parse(c.submitted_at) < WEEK).length, caption: 'Open all cases', to: '/staff/cases' })
    tiles.push({ label: 'In evaluation', value: count('in_evaluation'), caption: 'With the review panel', to: '/staff/cases?status=in_evaluation' })
    tiles.push({ label: 'Ready for decision', value: ready.length, caption: 'Open queue', to: '/staff/queue/decision' })
    const r = report.data
    tiles.push({ label: 'Overdue tasks', value: r ? r.overdue.feedback_requests + r.overdue.reviews : 0, caption: r ? 'Reviews and responses past due' : 'Counting…', to: '/reports' })
  } else if (roles.includes('screening_officer')) {
    tiles.push({ label: 'Awaiting screening', value: awaitingScreening.length, caption: 'Open queue', to: '/staff/queue/screening' })
    tiles.push({ label: 'Waiting on applicant', value: count('action_required'), caption: 'Clarification or revision asked' })
    tiles.push({ label: 'In evaluation', value: count('in_evaluation'), caption: 'With the review panel' })
  } else if (roles.includes('adjudicator')) {
    tiles.push({ label: 'Ready for decision', value: ready.length, caption: 'Open queue', to: '/staff/queue/decision' })
    tiles.push({ label: 'In evaluation', value: count('in_evaluation'), caption: 'Coming to you next' })
    tiles.push({ label: 'Decided', value: count('approved') + count('not_approved') + count('awarded'), caption: 'Approved, not approved or awarded' })
  }
  if (reviewer) {
    tiles.push({ label: `Assigned · ${overdue.length} overdue`, value: mine.length, caption: 'Open queue', to: '/staff/reviews' })
    tiles.push({ label: 'Declaration needed', value: myQueue.filter((r) => r.my_status === 'declaration_needed').length, caption: 'Declare conflicts before reading' })
    tiles.push({ label: 'Scorecards submitted', value: myQueue.filter((r) => r.my_status === 'submitted').length, caption: 'Across your cases' })
  }
  if (support) tiles.push({ label: 'Chats waiting', value: waiting.length, caption: 'Open inbox', to: '/support/inbox' })

  if (has(['screening_officer', 'admin']))
    for (const c of awaitingScreening) {
      const age = Math.floor((now - Date.parse(c.submitted_at)) / DAY)
      tasks.push({ key: `s-${c.id}`, title: c.title, detail: `${c.reference} · ${staffStatus(c.status).label}`, to: `/staff/cases/${c.id}`, at: c.submitted_at, when: age === 0 ? 'Today' : `${age} days`, urgent: age >= 5 })
    }
  if (reviewer)
    for (const r of mine) {
      const due = r.due_at ? dueText(r.due_at, now) : { text: '', urgent: false }
      tasks.push({
        key: `r-${r.assignment_id}`,
        title: r.title,
        detail: `${r.reference} · ${r.my_status === 'declaration_needed' ? 'Declare conflicts' : r.my_status === 'in_progress' ? 'Scoring in progress' : 'To score'}`,
        to: `/staff/cases/${r.proposal_id}/score`,
        at: r.due_at ?? '9999',
        when: due.text,
        urgent: due.urgent,
      })
    }
  if (has(['adjudicator', 'admin']))
    for (const c of ready) tasks.push({ key: `d-${c.id}`, title: c.title, detail: `${c.reference} · Ready for decision`, to: `/staff/cases/${c.id}/panel`, at: c.updated_at, when: ago(c.updated_at, now), urgent: false })
  if (support)
    for (const w of waiting)
      tasks.push({ key: `c-${w.session_id}`, title: `Answer ${w.applicant_name ?? 'an applicant'}`, detail: 'Waiting in chat', to: '/support/inbox', at: w.queued_at, when: ago(w.queued_at, now), urgent: (w.waiting_seconds ?? 0) > 600 })

  const next = tasks.sort((a, b) => a.at.localeCompare(b.at)).slice(0, 5)
  const recent = (notes.data ?? []).slice(0, 10)
  const stages = [
    { label: 'Awaiting screening', n: count('submitted') },
    { label: 'In evaluation', n: count('in_evaluation') },
    { label: 'Waiting on applicant', n: count('action_required') },
    { label: 'Ready for decision', n: count('in_adjudication') },
  ]
  const maxStage = Math.max(1, ...stages.map((s) => s.n))
  const linkCls = 'inline-flex min-h-touch items-center text-sm font-semibold text-brand-text no-underline hover:underline'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={main ? `${roleLabel(main)} portal` : undefined}
        title={`${greeting()}, ${user.displayName}`}
        intro="Prioritise the work that needs your attention."
      />

      {tiles.length ? (
        <ul aria-label="Your figures" className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', tiles.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
          {tiles.map((t) => (
            <li key={t.label} className="relative flex flex-col gap-1 overflow-hidden rounded-md border border-line bg-surface-card p-4 shadow-1 transition-shadow hover:shadow-2">
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-orange),var(--ceda-maroon))]" />
              <span className="text-sm text-ink-muted">{t.label}</span>
              <span className="text-[2rem] font-semibold leading-tight">{t.value}</span>
              {t.to ? (
                <Link to={t.to} className={cn(linkCls, 'self-start')}>
                  {t.caption}
                  <span className="sr-only">: {t.label}</span>
                </Link>
              ) : (
                <span className="text-sm text-brand-text">{t.caption}</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section aria-labelledby="home-next" className="flex flex-col overflow-hidden rounded-md border border-line bg-surface-card shadow-1 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line bg-[var(--ceda-surface-warm)] p-4">
            <div>
              <h2 id="home-next" className="text-h3 font-semibold">
                Your next tasks
              </h2>
              <p className="text-sm text-ink-muted">Up to five highest-priority items</p>
            </div>
            {queueLink ? (
              <Link to={queueLink} className={linkCls}>
                View queue
              </Link>
            ) : null}
          </div>
          {next.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Nothing needs your attention right now." />
            </div>
          ) : (
            <ol aria-labelledby="home-next" className="flex flex-col">
              {next.map((t) => (
                <li key={t.key} className="border-b border-line last:border-b-0">
                  <Link to={t.to} className="flex min-h-touch items-center gap-3 px-4 py-3 text-ink no-underline hover:bg-surface-sunken">
                    <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', t.urgent ? 'bg-error' : 'bg-brand')} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold">{t.title}</span>
                      <span className="truncate text-sm text-ink-muted">{t.detail}</span>
                    </span>
                    {t.when ? <span className={cn('shrink-0 text-sm', t.urgent ? 'font-semibold text-error' : 'text-ink-muted')}>{t.when}</span> : null}
                    <ArrowRight aria-hidden className="h-4 w-4 shrink-0" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
          {tasks.length > 5 ? <p className="border-t border-line p-4 text-sm text-ink-muted">{tasks.length - 5} more in your queues.</p> : null}
        </section>

        <section aria-labelledby="home-recent" className="flex flex-col overflow-hidden rounded-md border border-line bg-surface-card shadow-1">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line bg-[var(--ceda-surface-warm)] p-4">
            <div>
              <h2 id="home-recent" className="text-h3 font-semibold">
                Recent activity
              </h2>
              <p className="text-sm text-ink-muted">Your latest 10 updates</p>
            </div>
            <Link to="/notifications" className={linkCls}>
              All notifications
            </Link>
          </div>
          {notes.isError ? <p className="p-4 text-ink-muted">We couldn&apos;t load recent activity.</p> : null}
          {recent.length === 0 && !notes.isError ? <p className="p-4 text-ink-muted">No recent activity.</p> : null}
          <ul className="flex flex-col gap-3 p-4">
            {recent.map((n) => (
              <li key={n.id} className="flex items-start gap-3">
                <span aria-hidden className={cn('mt-3 h-2 w-2 shrink-0 rounded-full', n.read_at ? 'bg-line-input' : 'bg-brand')} />
                <span className="flex min-w-0 flex-col">
                  {n.proposal_id ? (
                    <Link to={`/staff/cases/${n.proposal_id}`} className="inline-flex min-h-touch items-center font-semibold text-ink no-underline hover:underline">
                      {n.title}
                    </Link>
                  ) : (
                    <span className="font-semibold">{n.title}</span>
                  )}
                  <span className="text-sm text-ink-muted">{ago(n.created_at, now)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {admin ? (
        <section aria-labelledby="home-stages" className="flex flex-col overflow-hidden rounded-md border border-line bg-surface-card shadow-1">
          <div className="border-b border-line bg-[var(--ceda-surface-warm)] p-4">
            <h2 id="home-stages" className="text-h3 font-semibold">
              Cases by stage
            </h2>
            <p className="text-sm text-ink-muted">Current active caseload</p>
          </div>
          <ul className="flex flex-col gap-3 p-4">
            {stages.map((s) => (
              <li key={s.label} className="grid grid-cols-[9rem_1fr_2rem] items-center gap-3 text-sm md:grid-cols-[12rem_1fr_2rem]">
                <span>{s.label}</span>
                <span aria-hidden className="h-2 rounded-full bg-surface-sunken">
                  <span className="block h-2 rounded-full bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-orange))]" style={{ width: `${(s.n / maxStage) * 100}%` }} />
                </span>
                <span className="text-right font-semibold tabular-nums">{s.n}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {reviewer && toolkitPreviewEnabled() ? (
        <ToolkitPreview
          eyebrow="Coming soon"
          title="Reviewer Intelligence Toolkit"
          workflow="Tools to read evidence against each criterion and give clearer, more consistent feedback."
          tools={REVIEWER_TOOLS}
          highlighted={REVIEWER_HIGHLIGHTED}
        />
      ) : null}
    </div>
  )
}
