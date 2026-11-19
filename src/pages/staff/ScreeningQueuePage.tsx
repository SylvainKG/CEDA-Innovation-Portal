import { Link } from 'react-router-dom'
import { DataTable, StatusBadge, type Column } from '@/components'
import { EmptyState, ErrorState, LoadingState } from '@/components/states/States'
import { daysWaiting } from '@/features/staff/case-view'
import { useStaffCases } from '@/features/staff/queries'
import type { StaffCaseRow } from '@/lib/api/types'
import { formatDateCAT } from '@/lib/format'

const SCREENING: readonly ['submitted'] = ['submitted']

/**
 * T07 screening queue (spec T07, REV-01), built from the written spec (BCR-003; design review pending).
 * Submitted cases, oldest first. Columns: reference, title, challenge, submitted, waiting, status.
 */
export function ScreeningQueuePage() {
  const cases = useStaffCases(SCREENING)

  if (cases.isPending) return <LoadingState what="the screening queue" />
  if (cases.isError) return <ErrorState level="h1" message="We couldn't load the screening queue." onRetry={() => void cases.refetch()} />

  const rows = cases.data
  const columns: Column<StaffCaseRow>[] = [
    {
      key: 'reference',
      header: 'Reference',
      primary: true,
      cell: (r) => (
        <Link to={`/staff/cases/${r.id}`} className="font-mono">
          {r.reference}
        </Link>
      ),
    },
    { key: 'title', header: 'Title', cell: (r) => r.title },
    { key: 'challenge', header: 'Challenge', cell: (r) => r.challenge.title },
    { key: 'submitted', header: 'Submitted', cell: (r) => formatDateCAT(r.submitted_at) },
    {
      key: 'waiting',
      header: 'Waiting',
      cell: (r) => {
        const d = daysWaiting(r.submitted_at)
        return `${d} ${d === 1 ? 'day' : 'days'}`
      },
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} audience="staff" /> },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">Screening queue</h1>
        <p className="text-ink-muted" role="status">
          {rows.length === 0 ? 'Nothing is waiting.' : `${rows.length} ${rows.length === 1 ? 'case is' : 'cases are'} waiting for screening, oldest first.`}
        </p>
      </div>
      <DataTable
        caption="Cases waiting for screening"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        empty={<EmptyState title="No cases are waiting for screening">New submissions appear here as soon as applicants submit them.</EmptyState>}
      />
    </div>
  )
}
