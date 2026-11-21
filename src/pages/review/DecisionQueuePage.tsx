import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { DataTable, StatusBadge, type Column } from '@/components'
import { QueueFilters } from '@/components/QueueFilters'
import { EmptyState, ErrorState, LoadingState } from '@/components/states/States'
import { reviewKeys } from '@/features/review/queries'
import { daysWaiting } from '@/features/staff/case-view'
import { useStaffCases } from '@/features/staff/queries'
import { api } from '@/lib/api'
import type { ScorePanel, StaffCaseRow } from '@/lib/api/types'
import { formatDateCAT } from '@/lib/format'

const READY: readonly ['in_adjudication'] = ['in_adjudication']

/**
 * T07 "Ready for decision" (spec T07 decision variant), laid out to Sandra's 21 Nov adjudicator work-queue frame
 * ("ceda adjudicator work cases" in `Figma pdf/`), the same way as the screening queue (#118): "WORK QUEUE" over
 * the title, the filter card (search by reference or title, challenge) with removable chips, and the table:
 * reference, idea, challenge, submitted, waiting, the panel average and reviews in from each case's
 * `get_score_panel` (with the spread flag), and status. Cases in adjudication, oldest first.
 */
export function DecisionQueuePage() {
  const cases = useStaffCases(READY)
  const [q, setQ] = useState('')
  const [challenge, setChallenge] = useState('')
  const panels = useQueries({
    queries: (cases.data ?? []).map((c) => ({
      queryKey: [...reviewKeys.all, 'panel', c.id],
      queryFn: () => api.review.getPanel(c.id),
    })),
  })

  if (cases.isPending) return <LoadingState what="cases ready for decision" />
  if (cases.isError) return <ErrorState level="h1" message="We couldn't load the cases." onRetry={() => void cases.refetch()} />

  const panelOf = (id: string): ScorePanel | null | undefined => panels[(cases.data ?? []).findIndex((c) => c.id === id)]?.data
  const challenges = [...new Map(cases.data.map((c) => [c.challenge.id, c.challenge.title])).entries()].map(([value, label]) => ({ value, label }))
  const needle = q.trim().toLowerCase()
  const all = [...cases.data].sort((a, b) => a.updated_at.localeCompare(b.updated_at))
  const rows = all.filter((r) => (!challenge || r.challenge.id === challenge) && (!needle || r.reference.toLowerCase().includes(needle) || r.title.toLowerCase().includes(needle)))
  const columns: Column<StaffCaseRow>[] = [
    {
      key: 'reference',
      header: 'Reference',
      primary: true,
      cell: (r) => (
        <Link to={`/staff/cases/${r.id}/panel`} className="inline-flex min-h-touch items-center whitespace-nowrap font-mono font-semibold">
          {r.reference}
        </Link>
      ),
    },
    { key: 'title', header: 'Idea', cell: (r) => r.title },
    { key: 'challenge', header: 'Challenge', cell: (r) => r.challenge.title },
    { key: 'submitted', header: 'Submitted', cell: (r) => formatDateCAT(r.submitted_at) },
    {
      key: 'waiting',
      header: 'Waiting',
      cell: (r) => {
        // Waiting for a decision since the case reached adjudication (its last change).
        const d = daysWaiting(r.updated_at)
        return `${d} ${d === 1 ? 'day' : 'days'}`
      },
    },
    {
      key: 'aggregate',
      header: 'Panel average',
      cell: (r) => {
        const p = panelOf(r.id)
        if (!p) return '…'
        const flagged = Boolean(p.aggregate?.flagged) || p.criteria_summary.some((c) => c.flagged)
        return (
          <span className="flex flex-col">
            <span className="whitespace-nowrap">
              <span className="font-semibold">{p.aggregate?.mean_weighted != null ? Number(p.aggregate.mean_weighted).toFixed(2) : '—'}</span>
              {flagged ? <span className="ml-2 rounded-full bg-status-action-bg px-2 py-0.5 text-sm font-semibold text-status-action-fg">Spread</span> : null}
            </span>
            <span className="whitespace-nowrap text-sm text-ink-muted">
              <span>{`${p.submitted_count}/${p.quorum}`}</span> reviews
            </span>
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <span className="whitespace-nowrap">
          <StatusBadge status={r.status} audience="staff" />
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-text">Work queue</p>
        <h1 className="text-h1 font-semibold">Ready for decision</h1>
        <p className="text-ink-muted">Filter cases and open the score panel to decide.</p>
        <p className="text-sm text-ink-muted" role="status">
          {all.length === 0
            ? 'Nothing is waiting for a decision.'
            : rows.length === all.length
              ? `${rows.length} ${rows.length === 1 ? 'case has' : 'cases have'} all reviews in, oldest first.`
              : `${rows.length} of ${all.length} cases match.`}
        </p>
      </div>
      {all.length ? (
        <QueueFilters search={q} onSearch={setQ} filters={[{ key: 'challenge', label: 'Challenge', value: challenge, options: challenges, onChange: setChallenge }]} />
      ) : null}
      <DataTable
        caption="Cases ready for decision"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        empty={
          all.length ? (
            <EmptyState title="No cases match these filters">Clear a filter to see more.</EmptyState>
          ) : (
            <EmptyState title="No cases are ready for decision">Cases appear here when both reviewers have submitted their scores.</EmptyState>
          )
        }
      />
    </div>
  )
}
