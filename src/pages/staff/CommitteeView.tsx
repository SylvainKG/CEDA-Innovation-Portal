import { useQuery } from '@tanstack/react-query'
import { DataTable, DashboardCard, type Column } from '@/components'
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '@/components/states/States'
import { api } from '@/lib/api'
import type { CaseStatusRow } from '@/lib/api/types'
import { formatDateCAT } from '@/lib/format'

const STAGES = ['submission', 'review', 'feedback', 'approval', 'award', 'closed']
const LABEL: Record<string, string> = { submission: 'Submission', review: 'Review', feedback: 'Feedback', approval: 'Approval', award: 'Award', closed: 'Closed' }
const label = (s: string) => LABEL[s] ?? s
const NOTE = 'Committee view: references, challenges and stages only. No proposal text, scores or notes (D-08).'

/** T06 committee home (D-08), Provisional UI: counts by stage only. */
export function CommitteeHome() {
  const counts = useQuery({ queryKey: ['committee', 'counts'], queryFn: () => api.committee.stageCounts() })
  if (counts.isPending) return <LoadingState what="the stage counts" />
  if (counts.isError) return <ErrorState level="h1" message="We couldn't load the stage counts." onRetry={() => void counts.refetch()} />
  if (counts.data === null) return <ForbiddenState home="/" />
  const total = Object.values(counts.data).reduce((a, b) => a + b, 0)
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">Programme overview</h1>
        <p className="text-ink-muted">{NOTE}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <DashboardCard label="Ideas submitted" value={total} definition="All submitted ideas, in every stage." to="/staff/cases" />
        {STAGES.map((s) => (
          <DashboardCard key={s} label={label(s)} value={counts.data![s] ?? 0} definition={`Ideas now in ${label(s)}.`} />
        ))}
      </div>
    </div>
  )
}

/** T07 "All cases", committee variant (D-08), Provisional UI: reference, challenge, stage and last update. */
export function CommitteeCases() {
  const list = useQuery({ queryKey: ['committee', 'cases'], queryFn: () => api.committee.listStatus() })
  if (list.isPending) return <LoadingState what="cases" />
  if (list.isError) return <ErrorState level="h1" message="We couldn't load the cases." onRetry={() => void list.refetch()} />
  if (list.data === null) return <ForbiddenState home="/" />
  const columns: Column<CaseStatusRow>[] = [
    { key: 'reference', header: 'Reference', primary: true, cell: (r) => <span className="whitespace-nowrap font-mono">{r.reference}</span> },
    { key: 'challenge', header: 'Challenge', cell: (r) => r.challenge_title },
    { key: 'stage', header: 'Stage', cell: (r) => label(r.public_stage) },
    { key: 'updated', header: 'Last update', cell: (r) => formatDateCAT(r.last_update) },
  ]
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">All cases</h1>
        <p className="text-ink-muted">
          {list.data.length} cases, most recently updated first. {NOTE}
        </p>
      </div>
      <DataTable caption="All cases (status only)" columns={columns} rows={list.data} getRowKey={(r) => r.reference} empty={<EmptyState title="No cases yet" />} />
    </div>
  )
}
