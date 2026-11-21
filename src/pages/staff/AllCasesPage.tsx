import { Link, useSearchParams } from 'react-router-dom'
import { DataTable, StatusBadge, type Column } from '@/components'
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
 * T07 "All cases" for administrators (spec T07, admin variant), built from the written spec (BCR-003; design
 * review pending). Every submitted case with its status, active reviewers and last update; a status filter kept
 * in the address so it survives reloads and can be shared. Committee members get the status-only variant (D-08).
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
  const cases = useStaffCases(ALL)

  if (cases.isPending) return <LoadingState what="cases" />
  if (cases.isError) return <ErrorState level="h1" message="We couldn't load the cases." onRetry={() => void cases.refetch()} />

  const rows = [...cases.data].filter((r) => !status || r.status === status).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  const columns: Column<StaffCaseRow>[] = [
    {
      key: 'reference',
      header: 'Reference',
      primary: true,
      cell: (r) => (
        <Link to={`/staff/cases/${r.id}`} className="whitespace-nowrap font-mono">
          {r.reference}
        </Link>
      ),
    },
    { key: 'title', header: 'Title', cell: (r) => r.title },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} audience="staff" /> },
    { key: 'reviewers', header: 'Reviewers', cell: (r) => (r.active_reviewers === 0 ? 'None' : String(r.active_reviewers)) },
    { key: 'updated', header: 'Last update', cell: (r) => formatDateCAT(r.updated_at) },
    { key: 'challenge', header: 'Challenge', cell: (r) => r.challenge.title },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">All cases</h1>
        <p className="text-ink-muted" role="status">
          {status ? `${rows.length} of ${cases.data.length} cases: ${staffStatus(status).label}` : `${rows.length} cases, most recently updated first.`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="all-cases-status" className="font-semibold">
          Status
        </label>
        <select
          id="all-cases-status"
          className="min-h-touch rounded-sm border border-line-input bg-surface-card px-2 text-base"
          value={status ?? ''}
          onChange={(e) => {
            const next = new URLSearchParams(params)
            if (e.target.value) next.set('status', e.target.value)
            else next.delete('status')
            setParams(next, { replace: true })
          }}
        >
          <option value="">All statuses</option>
          {FILTERABLE.map((s) => (
            <option key={s} value={s}>
              {staffStatus(s).label}
            </option>
          ))}
        </select>
      </div>
      <DataTable
        caption="All cases"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        empty={<EmptyState title={status ? 'No cases with this status' : 'No cases yet'}>Cases appear here once applicants submit them.</EmptyState>}
      />
    </div>
  )
}
