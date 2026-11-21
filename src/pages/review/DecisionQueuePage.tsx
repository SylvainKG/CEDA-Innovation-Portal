import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { DataTable, type Column } from '@/components'
import { EmptyState, ErrorState, LoadingState } from '@/components/states/States'
import { reviewKeys } from '@/features/review/queries'
import { useStaffCases } from '@/features/staff/queries'
import { api } from '@/lib/api'
import type { ScorePanel, StaffCaseRow } from '@/lib/api/types'
import { formatDateCAT } from '@/lib/format'

const READY: readonly ['in_adjudication'] = ['in_adjudication']

/**
 * T07 "Ready for decision" (spec T07 decision variant), built from the written spec (BCR-003; design review
 * pending). Cases in adjudication with their scores (n/quorum), weighted aggregate and spread flag, from each
 * case's `get_score_panel`. The roadmap summary arrives with Slice 4; recording a decision with Slice 5.
 */
export function DecisionQueuePage() {
  const cases = useStaffCases(READY)
  const panels = useQueries({
    queries: (cases.data ?? []).map((c) => ({
      queryKey: [...reviewKeys.all, 'panel', c.id],
      queryFn: () => api.review.getPanel(c.id),
    })),
  })

  if (cases.isPending) return <LoadingState what="cases ready for decision" />
  if (cases.isError) return <ErrorState level="h1" message="We couldn't load the cases." onRetry={() => void cases.refetch()} />

  const panelOf = (id: string): ScorePanel | null | undefined => panels[(cases.data ?? []).findIndex((c) => c.id === id)]?.data
  const rows = [...cases.data].sort((a, b) => a.updated_at.localeCompare(b.updated_at))
  const columns: Column<StaffCaseRow>[] = [
    {
      key: 'reference',
      header: 'Reference',
      primary: true,
      cell: (r) => (
        <Link to={`/staff/cases/${r.id}/panel`} className="whitespace-nowrap font-mono">
          {r.reference}
        </Link>
      ),
    },
    { key: 'title', header: 'Title', cell: (r) => r.title },
    { key: 'version', header: 'Version', cell: (r) => (panelOf(r.id) ? `V${panelOf(r.id)!.version_no}` : '—') },
    {
      key: 'scores',
      header: 'Scores',
      cell: (r) => {
        const p = panelOf(r.id)
        return p ? `${p.submitted_count}/${p.quorum}` : '…'
      },
    },
    {
      key: 'aggregate',
      header: 'Aggregate',
      cell: (r) => {
        const p = panelOf(r.id)
        if (!p) return '…'
        const flagged = Boolean(p.aggregate?.flagged) || p.criteria_summary.some((c) => c.flagged)
        return (
          <span className="whitespace-nowrap">
            {p.aggregate?.mean_weighted != null ? Number(p.aggregate.mean_weighted).toFixed(2) : '—'}
            {flagged ? <span className="ml-2 rounded-full bg-status-action-bg px-2 py-0.5 text-sm font-semibold text-status-action-fg">Spread</span> : null}
          </span>
        )
      },
    },
    { key: 'ready', header: 'Ready since', cell: (r) => formatDateCAT(r.updated_at) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">Ready for decision</h1>
        <p className="text-ink-muted" role="status">
          {rows.length === 0 ? 'Nothing is waiting for a decision.' : `${rows.length} ${rows.length === 1 ? 'case has' : 'cases have'} all reviews in, oldest first.`}
        </p>
      </div>
      <DataTable
        caption="Cases ready for decision"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        empty={<EmptyState title="No cases are ready for decision">Cases appear here when both reviewers have submitted their scores.</EmptyState>}
      />
    </div>
  )
}
