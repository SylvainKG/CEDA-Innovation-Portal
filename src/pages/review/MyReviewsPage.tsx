import { Link, useSearchParams } from 'react-router-dom'
import { DataTable, TonePill, type Column } from '@/components'
import { EmptyState, ErrorState, LoadingState } from '@/components/states/States'
import { isOverdue, MY_STATUS, MY_STATUS_ORDER } from '@/features/review/review-view'
import { useReviewQueue } from '@/features/review/queries'
import type { MyReviewStatus, ReviewQueueRow } from '@/lib/api/types'
import { formatDateCAT } from '@/lib/format'
import { cn } from '@/lib/cn'

const EMPTY: Record<MyReviewStatus, string> = {
  declaration_needed: 'No declarations needed. New assignments appear here first.',
  not_started: 'Nothing waiting to be started.',
  in_progress: 'No scorecards in progress.',
  submitted: 'You haven’t submitted any scorecards yet.',
}

/**
 * T07 "My reviews" (spec T07 reviewer variant, REV-01), built from the written spec (BCR-003; design review
 * pending). The reviewer's own active assignments from `my_review_queue()`, grouped by their status, with the
 * group in the address. Before declaring, only reference, title, challenge and organisation are shown: enough
 * to recognise a conflict (contract §4.3).
 */
export function MyReviewsPage() {
  const queue = useReviewQueue()
  const [params, setParams] = useSearchParams()

  if (queue.isPending) return <LoadingState what="your reviews" />
  if (queue.isError) return <ErrorState level="h1" message="We couldn't load your reviews." onRetry={() => void queue.refetch()} />

  const rows = queue.data
  const count = (s: MyReviewStatus) => rows.filter((r) => r.my_status === s).length
  const raw = params.get('status') as MyReviewStatus | null
  // Default to the first group with work in it, so the reviewer lands on what needs doing.
  const selected: MyReviewStatus = raw && MY_STATUS_ORDER.includes(raw) ? raw : (MY_STATUS_ORDER.find((s) => count(s) > 0) ?? 'declaration_needed')
  const shown = rows.filter((r) => r.my_status === selected)

  const columns: Column<ReviewQueueRow>[] = [
    {
      key: 'reference',
      header: 'Reference',
      primary: true,
      cell: (r) => (
        <Link to={`/staff/cases/${r.proposal_id}/score`} className="whitespace-nowrap font-mono">
          {r.reference}
        </Link>
      ),
    },
    { key: 'title', header: 'Title', cell: (r) => r.title },
    { key: 'challenge', header: 'Challenge', cell: (r) => r.challenge_title },
    { key: 'version', header: 'Version', cell: (r) => (r.version_no ? `V${r.version_no}` : '—') },
    {
      key: 'due',
      header: 'Due',
      cell: (r) =>
        r.due_at ? (
          <span className={cn(isOverdue(r.due_at, r.my_status) && 'font-semibold text-error')}>
            {formatDateCAT(r.due_at)}
            {isOverdue(r.due_at, r.my_status) ? ' · overdue' : ''}
          </span>
        ) : (
          '—'
        ),
    },
    { key: 'status', header: 'My status', cell: (r) => <TonePill tone={MY_STATUS[r.my_status].tone} label={MY_STATUS[r.my_status].label} /> },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">My reviews</h1>
        <p className="text-ink-muted" role="status">
          {rows.length === 0 ? 'No cases are assigned to you.' : `${rows.length} assigned ${rows.length === 1 ? 'case' : 'cases'}.`}
        </p>
      </div>
      <div role="group" aria-label="Show reviews by status" className="flex flex-wrap gap-2">
        {MY_STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={selected === s}
            onClick={() => setParams({ status: s }, { replace: true })}
            className={cn(
              'min-h-touch rounded-full border px-4 font-semibold',
              selected === s ? 'border-brand bg-brand-subtle text-ink' : 'border-line-input bg-surface-card text-ink-muted hover:text-ink',
            )}
          >
            {MY_STATUS[s].label} ({count(s)})
          </button>
        ))}
      </div>
      <DataTable
        caption={`My reviews: ${MY_STATUS[selected].label}`}
        columns={columns}
        rows={shown}
        getRowKey={(r) => r.assignment_id}
        empty={<EmptyState title={EMPTY[selected]} />}
      />
    </div>
  )
}
