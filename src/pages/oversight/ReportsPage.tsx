import { useState, type ReactNode } from 'react'
import { Banner, Button, DashboardCard } from '@/components'
import { Tabs } from '@/components/Tabs'
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '@/components/states/States'
import { downloadText, reportCsv } from '@/features/oversight/csv'
import { useReport } from '@/features/oversight/queries'
import { useChallenges } from '@/features/submission/queries'
import { api } from '@/lib/api'
import type { CaseStatus, ProgrammeReport, ReportFilters } from '@/lib/api/types'
import { formatBWP } from '@/lib/money'
import { formatDateTimeCAT } from '@/lib/format'
import { staffStatus } from '@/lib/status'

const STAGE: Record<string, string> = { submission: 'Submission', review: 'Review', feedback: 'Feedback', approval: 'Approval', award: 'Award', closed: 'Closed' }
const stageLabel = (s: string) => STAGE[s] ?? staffStatus(s as CaseStatus).label
const pct = (x: number | null) => (x === null ? 'No data' : `${Math.round(x * 100)}%`)

/**
 * T13 reports dashboard (spec T13, RPT-01), Provisional UI built from the written spec (BCR-003; design review
 * pending). Figures come from `get_programme_report` (aggregated on the server); the CSV comes from
 * `report_case_rows` with the same filters, so the two reconcile. Each chart has a title, its definition and a
 * "Show as table" view. The Chat tab arrives with T15.
 */
export function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({})
  const [draft, setDraft] = useState<ReportFilters>({})
  const [periodError, setPeriodError] = useState<string | null>(null)
  const report = useReport(filters)
  const challenges = useChallenges()
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  if (report.isPending) return <LoadingState what="the report" />
  if (report.isError) return <ErrorState level="h1" message="We couldn't load the report." onRetry={() => void report.refetch()} />
  if (report.data === null) return <ForbiddenState home="/staff" />
  const r = report.data

  function apply() {
    if (draft.from && draft.to && draft.from > draft.to) {
      setPeriodError('The period must end on or after the day it starts')
      return
    }
    setPeriodError(null)
    setFilters({ ...draft })
  }

  async function exportCsv() {
    setExporting(true)
    setExportError(null)
    try {
      const rows = await api.oversight.reportRows(filters)
      if (rows === null) setExportError("You don't have access to export these cases.")
      else downloadText(`ceda-cases-${new Date().toISOString().slice(0, 10)}.csv`, reportCsv(rows))
    } catch {
      setExportError("The export didn't complete. Try again.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">Reports</h1>
        <p className="text-sm text-ink-muted">Generated {formatDateTimeCAT(r.generated_at)}. The period applies to when ideas were submitted (CAT).</p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        aria-label="Report filters"
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
      >
        <label className="flex flex-col gap-1 font-semibold">
          Challenge
          <select
            className="min-h-touch rounded-sm border border-line-input bg-surface-card px-2 text-base font-normal"
            value={draft.challengeId ?? ''}
            onChange={(e) => setDraft({ ...draft, challengeId: e.target.value || undefined })}
          >
            <option value="">All challenges</option>
            {(challenges.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-semibold">
          From
          <input type="date" className="min-h-touch rounded-sm border border-line-input bg-surface-card px-2 font-normal" value={draft.from ?? ''} onChange={(e) => setDraft({ ...draft, from: e.target.value || undefined })} />
        </label>
        <label className="flex flex-col gap-1 font-semibold">
          To
          <input
            type="date"
            className="min-h-touch rounded-sm border border-line-input bg-surface-card px-2 font-normal"
            value={draft.to ?? ''}
            aria-invalid={periodError ? true : undefined}
            aria-describedby={periodError ? 'report-period-err' : undefined}
            onChange={(e) => setDraft({ ...draft, to: e.target.value || undefined })}
          />
        </label>
        <Button type="submit" variant="secondary">
          Apply filters
        </Button>
        <Button variant="secondary" loading={exporting} loadingLabel="Exporting…" onClick={() => void exportCsv()}>
          Export CSV
        </Button>
      </form>
      {periodError ? (
        <p id="report-period-err" className="text-sm text-error" role="alert">
          {periodError}
        </p>
      ) : null}
      {exportError ? <Banner kind="error">{exportError}</Banner> : null}

      {r.participation.submitted === 0 ? (
        <EmptyState title="No activity in this period.">Try a wider period or another challenge.</EmptyState>
      ) : (
        <Tabs
          label="Report sections"
          tabs={[
            { id: 'participation', label: 'Participation', content: <Participation r={r} /> },
            { id: 'outcomes', label: 'Outcomes', content: <Outcomes r={r} /> },
            { id: 'timelines', label: 'Timelines', content: <Timelines r={r} /> },
            { id: 'impact', label: 'Impact', content: <Impact r={r} /> },
          ]}
        />
      )}
    </div>
  )
}

function Tiles({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{children}</div>
}

function Participation({ r }: { r: ProgrammeReport }) {
  const p = r.participation
  return (
    <div className="flex flex-col gap-6">
      <Tiles>
        <DashboardCard label="Ideas submitted" value={p.submitted} definition="Cases submitted in the selected period (drafts excluded)." />
        <DashboardCard label="Applicants" value={p.distinct_applicants} definition="Different applicants who submitted in the period." />
        <DashboardCard label="Drafts started" value={p.drafts_started} definition="Ideas started in the period, submitted or not." />
      </Tiles>
      <BarList title="Ideas submitted by challenge" definition="Submitted cases per challenge in the period." unit="ideas" rows={p.by_challenge.map((c) => ({ label: c.title, value: c.submitted }))} />
    </div>
  )
}

function Outcomes({ r }: { r: ProgrammeReport }) {
  const o = r.outcomes
  return (
    <div className="flex flex-col gap-6">
      <Tiles>
        <DashboardCard label="Approved" value={o.approved} definition="Approved, including those since awarded." />
        <DashboardCard label="Not approved" value={o.not_approved} definition="Published decision: not approved." />
        <DashboardCard label="Awarded" value={o.awarded} definition={`Total awarded: ${formatBWP(o.award_total_minor)}.`} />
      </Tiles>
      <BarList title="Cases that reached each stage" definition="Cases that have ever been in each stage, in workflow order." unit="cases" rows={r.funnel.map((f) => ({ label: stageLabel(f.stage), value: f.reached }))} />
      <BarList
        title="Cases by current stage"
        definition={`Where each case is now. ${o.closed} closed.`}
        unit="cases"
        rows={Object.entries(o.by_current_stage).map(([s, n]) => ({ label: stageLabel(s), value: n }))}
      />
    </div>
  )
}

function Timelines({ r }: { r: ProgrammeReport }) {
  return (
    <div className="flex flex-col gap-6">
      <BarList
        title="Median days in each status"
        definition="For every time a case entered a status, the days until it moved on (or until now). Final statuses are left out."
        unit="days"
        rows={r.time_in_stage.map((t) => ({ label: `${staffStatus(t.status as CaseStatus).label} (${t.cases})`, value: t.median_days ?? 0 }))}
      />
      <Tiles>
        <DashboardCard label="Overdue feedback requests" value={r.overdue.feedback_requests} definition="Open requests past their response deadline." />
        <DashboardCard label="Overdue reviews" value={r.overdue.reviews} definition="Active assignments past their due date without a submitted scorecard." />
      </Tiles>
    </div>
  )
}

function Impact({ r }: { r: ProgrammeReport }) {
  const i = r.impact
  return (
    <Tiles>
      <DashboardCard label="Reached a later stage" value={pct(i.reached_later_stage_share)} definition={`${i.reached_later_stage} ideas reached Review or beyond.`} />
      <DashboardCard label="Resubmitted after feedback" value={i.resubmitted_after_feedback} definition="Ideas with a version 2 or later." />
      <DashboardCard label="Roadmap tasks verified" value={pct(i.roadmap_tasks_verified_share)} definition="Share of reviewers' task checks marked Verified." />
    </Tiles>
  )
}

/**
 * One-series horizontal bar chart (dataviz method: magnitude → bars from a zero baseline in one hue; a single
 * series needs no legend because the title names it; values in ink, not the series colour; a table view).
 */
function BarList({ title, definition, unit, rows }: { title: string; definition: string; unit: string; rows: { label: string; value: number }[] }) {
  const [asTable, setAsTable] = useState(false)
  const max = Math.max(1, ...rows.map((x) => x.value))
  const id = title.replace(/\W+/g, '-').toLowerCase()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={id} className="text-h3 font-semibold">
          {title}
        </h2>
        <Button size="sm" variant="tertiary" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>
          {asTable ? 'Show as chart' : 'Show as table'}
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-ink-muted">No data in this period.</p>
      ) : asTable ? (
        <table className="w-full text-left">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th scope="col" className="py-1">
                Item
              </th>
              <th scope="col" className="py-1 text-right">
                {unit[0]!.toUpperCase() + unit.slice(1)}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.label} className="border-t border-line">
                <th scope="row" className="py-1 font-normal">
                  {x.label}
                </th>
                <td className="py-1 text-right tabular-nums">{x.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className="flex flex-col gap-2" aria-label={title}>
          {rows.map((x) => (
            <li key={x.label} className="grid grid-cols-1 gap-1 md:grid-cols-[12rem_1fr] md:items-center" title={`${x.label}: ${x.value} ${unit}`}>
              <span className="text-sm">{x.label}</span>
              <span className="flex items-center gap-2">
                <span aria-hidden className="h-4 rounded-r bg-brand" style={{ width: `${(x.value / max) * 85}%`, minWidth: x.value > 0 ? '4px' : 0 }} />
                <span className="text-sm tabular-nums">
                  {x.value}
                  <span className="sr-only"> {unit}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-ink-muted">{definition}</p>
    </section>
  )
}
