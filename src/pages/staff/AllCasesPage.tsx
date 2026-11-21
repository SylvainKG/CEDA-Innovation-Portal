import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DataTable, StatusBadge, type Column } from '@/components'
import { QueueFilters } from '@/components/QueueFilters'
import { EmptyState, ErrorState, LoadingState } from '@/components/states/States'
import { useStaffCases } from '@/features/staff/queries'
import type { CaseStatus, StaffCaseRow } from '@/lib/api/types'
import { formatDateCAT } from '@/lib/format'
import { useSession } from '@/lib/session'
import { staffStatus } from '@/lib/status'
import { CommitteeCases } from './CommitteeView'

const ALL: readonly CaseStatus[] = []
/** Statuses an admin can filter by, in workflow order (drafts are never visible to staff). */
const FILTERABLE: readonly CaseStatus[] = [
  'submitted',
  'in_evaluation',
  'action_required',
  'in_adjudication',
  'approved',
  'not_approved',
  'awarded',
  'closed',
]

/**
 * T07 "All cases" for administrators (spec T07, admin variant), laid out to Sandra's 21 Nov frame ("ceda
 * administrator screening" in `Figma pdf/`) like the other work queues (#118): "WORK QUEUE" over the title, the
 * filter card (search, status, challenge) with removable chips, and every submitted case with its challenge, last
 * update, active reviewers and status. The status filter stays in the address so it survives reloads and can be
 * shared. Committee members get the status-only variant (D-08).
 */
export function AllCasesPage() {
  const { data: user } = useSession()
  if (user && !user.roles.includes('admin') && user.roles.includes('committee_member')) {
    return <CommitteeCases />
  }
  return <AdminCases />
}

function AdminCases() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('status')
  const status = raw && (FILTERABLE as readonly string[]).includes(raw) ? (raw as CaseStatus) : null
  const [q, setQ] = useState('')
  const [challenge, setChallenge] = useState('')
  const cases = useStaffCases(ALL)

  if (cases.isPending) return <LoadingState what="cases" />
  if (cases.isError) return <ErrorState level="h1" message="We couldn't load the cases." onRetry={() => void cases.refetch()} />

  const setStatus = (value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set('status', value)
    else next.delete('status')
    setParams(next, { replace: true })
  }
  const challenges = [...new Map(cases.data.map((c) => [c.challenge.id, c.challenge.title])).entries()].map(([value, label]) => ({ value, label }))
  const needle = q.trim().toLowerCase()
  const rows = [...cases.data]
    .filter((r) => (!status || r.status === status) && (!challenge || r.challenge.id === challenge) && (!needle || r.reference.toLowerCase().includes(needle) || r.title.toLowerCase().includes(needle)))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
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
    { key: 'updated', header: 'Last update', cell: (r) => formatDateCAT(r.updated_at) },
    { key: 'reviewers', header: 'Reviewers', cell: (r) => (r.active_reviewers === 0 ? 'None' : `${r.active_reviewers} assigned`) },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <span className="md:whitespace-nowrap">
          <StatusBadge status={r.status} audience="staff" />
        </span>
      ),
    },
  ]
  const onlyStatus = status && !challenge && !needle

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-text">Work queue</p>
        <h1 className="text-h1 font-semibold">All cases</h1>
        <p className="text-ink-muted">Filter cases and open a workspace to take action.</p>
        <p className="text-sm text-ink-muted" role="status">
          {onlyStatus
            ? `${rows.length} of ${cases.data.length} cases: ${staffStatus(status).label}`
            : rows.length === cases.data.length
              ? `${rows.length} cases, most recently updated first.`
              : `${rows.length} of ${cases.data.length} cases match.`}
        </p>
      </div>
      {cases.data.length ? (
        <QueueFilters
          search={q}
          onSearch={setQ}
          filters={[
            { key: 'status', label: 'Status', value: status ?? '', options: FILTERABLE.map((s) => ({ value: s, label: staffStatus(s).label })), onChange: setStatus },
            { key: 'challenge', label: 'Challenge', value: challenge, options: challenges, onChange: setChallenge },
          ]}
        />
      ) : null}
      <DataTable
        caption="All cases"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        empty={
          cases.data.length ? (
            <EmptyState title="No cases match these filters">Clear a filter to see more.</EmptyState>
          ) : (
            <EmptyState title="No cases yet">Cases appear here once applicants submit them.</EmptyState>
          )
        }
      />
    </div>
  )
}
