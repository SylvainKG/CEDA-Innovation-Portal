import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, StatusBadge, type Column } from '@/components'
import { QueueFilters } from '@/components/QueueFilters'
import { EmptyState, ErrorState, LoadingState } from '@/components/states/States'
import { daysWaiting } from '@/features/staff/case-view'
import { useStaffCases } from '@/features/staff/queries'
import type { StaffCaseRow } from '@/lib/api/types'
import { formatDateCAT } from '@/lib/format'

const SCREENING: readonly ['submitted'] = ['submitted']

/**
 * T07 screening queue (spec T07, REV-01), laid out to Sandra's 21 Nov frame: "WORK QUEUE" over the title, a filter
 * card (search by reference or title, challenge) with removable chips, and the table: reference, idea, challenge,
 * submitted, waiting, status. Submitted cases, oldest first.
 */
export function ScreeningQueuePage() {
  const cases = useStaffCases(SCREENING)
  const [q, setQ] = useState('')
  const [challenge, setChallenge] = useState('')

  if (cases.isPending) return <LoadingState what="the screening queue" />
  if (cases.isError) return <ErrorState level="h1" message="We couldn't load the screening queue." onRetry={() => void cases.refetch()} />

  const challenges = [...new Map(cases.data.map((c) => [c.challenge.id, c.challenge.title])).entries()].map(([value, label]) => ({ value, label }))
  const needle = q.trim().toLowerCase()
  const rows = cases.data.filter((r) => (!challenge || r.challenge.id === challenge) && (!needle || r.reference.toLowerCase().includes(needle) || r.title.toLowerCase().includes(needle)))
  const columns: Column<StaffCaseRow>[] = [
    {
      key: 'reference',
      header: 'Reference',
      primary: true,
      cell: (r) => (
        <Link to={`/staff/cases/${r.id}`} className="inline-flex min-h-touch items-center whitespace-nowrap font-mono font-semibold">
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
        const d = daysWaiting(r.submitted_at)
        return `${d} ${d === 1 ? 'day' : 'days'}`
      },
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} audience="staff" /> },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-text">Work queue</p>
        <h1 className="text-h1 font-semibold">Screening queue</h1>
        <p className="text-ink-muted">Filter cases and open a workspace to take action.</p>
        <p className="text-sm text-ink-muted" role="status">
          {cases.data.length === 0
            ? 'Nothing is waiting.'
            : rows.length === cases.data.length
              ? `${rows.length} ${rows.length === 1 ? 'case is' : 'cases are'} waiting for screening, oldest first.`
              : `${rows.length} of ${cases.data.length} cases match.`}
        </p>
      </div>
      {cases.data.length ? (
        <QueueFilters search={q} onSearch={setQ} filters={[{ key: 'challenge', label: 'Challenge', value: challenge, options: challenges, onChange: setChallenge }]} />
      ) : null}
      <DataTable
        caption="Cases waiting for screening"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        empty={
          cases.data.length ? (
            <EmptyState title="No cases match these filters">Clear a filter to see more.</EmptyState>
          ) : (
            <EmptyState title="No cases are waiting for screening">New submissions appear here as soon as applicants submit them.</EmptyState>
          )
        }
      />
    </div>
  )
}
