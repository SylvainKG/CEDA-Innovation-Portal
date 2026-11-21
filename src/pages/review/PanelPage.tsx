import { Link, useParams } from 'react-router-dom'
import { Banner, ReferencePill } from '@/components'
import { ErrorState, LoadingState, NotFoundState } from '@/components/states/States'
import { usePanel } from '@/features/review/queries'
import type { ScorePanel } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { formatDateTimeCAT } from '@/lib/format'
import { useSession } from '@/lib/session'

/**
 * T09 panel view (spec T09; contract §4.3 `get_score_panel`), built from the written spec (BCR-003; design
 * review pending). Criterion × reviewer matrix with means and spreads, reasons on demand, each reviewer's
 * weighted score, the aggregate, spread flags (a difference of 2 or more, BCR-001 B7) and a warning while
 * reviews are outstanding. Adjudicators and admins see it; a reviewer sees it only after submitting their own.
 */
export function PanelPage() {
  const { id } = useParams()
  const panel = usePanel(id)
  const { data: user } = useSession()
  if (panel.isPending) return <LoadingState what="the score panel" />
  if (panel.isError) return <ErrorState level="h1" message="We couldn't load the score panel." onRetry={() => void panel.refetch()} />
  if (!panel.data) return <NotFoundState home="/staff" />
  const p = panel.data
  const reviewerOnly = Boolean(user?.roles.includes('reviewer') && !user.roles.some((r) => r === 'adjudicator' || r === 'admin'))
  const outstanding = Math.max(0, p.quorum - p.submitted_count)

  return (
    <div className="flex flex-col gap-6">
      <p>{reviewerOnly ? <Link to="/staff/reviews">← My reviews</Link> : <Link to={`/staff/cases/${p.proposal_id}`}>← Case</Link>}</p>
      <header className="flex flex-col gap-2">
        <div className="flex">
          <ReferencePill reference={p.reference} copyable />
        </div>
        <h1 className="text-h1 font-semibold">Score panel</h1>
        <p className="text-ink-muted">
          Version {p.version_no} · {p.submitted_count} of {p.quorum} reviews submitted
        </p>
      </header>
      {outstanding > 0 ? (
        <Banner kind="warning" title="Reviews outstanding">
          {outstanding} of {p.quorum} {outstanding === 1 ? 'review' : 'reviews'} outstanding. A decision is not available yet.
        </Banner>
      ) : null}
      {p.scorecards.length === 0 ? <p className="text-ink-muted">No scorecards have been submitted for this version yet.</p> : <PanelBody p={p} />}
    </div>
  )
}

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : Number(n).toFixed(2))

function Flag({ label }: { label: string }) {
  return <span className="ml-2 inline-flex rounded-full bg-status-action-bg px-2 py-0.5 text-sm font-semibold text-status-action-fg">{label}</span>
}

function PanelBody({ p }: { p: ScorePanel }) {
  const name = (i: number) => p.scorecards[i]?.reviewer_name ?? `Reviewer ${i + 1}`
  const agg = p.aggregate
  const criterionFlag = p.criteria_summary.some((c) => c.flagged)
  const flagged = Boolean(agg?.flagged) || criterionFlag
  return (
    <>
      <section aria-labelledby="agg-h" className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
        <h2 id="agg-h" className="text-h2 font-semibold">
          Aggregate
        </h2>
        <p className="text-h1 font-semibold">
          {fmt(agg?.mean_weighted)} <span className="text-base font-normal text-ink-muted">of 5, mean of the weighted scores</span>
        </p>
        <p className="text-ink-muted">
          Range {fmt(agg?.min_weighted)} to {fmt(agg?.max_weighted)} · spread {fmt(agg?.spread)}
          {flagged ? <Flag label={agg?.flagged ? 'Large spread' : 'Criteria disagree'} /> : null}
        </p>
        {flagged ? (
          <p className="text-sm">
            Reviewers differ by {p.spread_flag_threshold} points or more {agg?.flagged ? 'overall' : 'on at least one criterion'}. Read their reasons before deciding.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="matrix-h" className="flex flex-col gap-3">
        <h2 id="matrix-h" className="text-h2 font-semibold">
          Scores by criterion
        </h2>
        {p.scorecards.length > 1 ? <p className="text-sm text-ink-muted md:hidden">Swipe the table sideways to see the mean and spread.</p> : null}
        <div className="overflow-x-auto rounded-md bg-surface-card shadow-1">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Scores by criterion and reviewer, with mean and spread</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="p-3">
                  Criterion
                </th>
                {p.scorecards.map((s, i) => (
                  <th key={s.scorecard_id} scope="col" className="p-3 text-right">
                    {name(i)}
                  </th>
                ))}
                <th scope="col" className="p-3 text-right">
                  Mean
                </th>
                <th scope="col" className="p-3 text-right">
                  Spread
                </th>
              </tr>
            </thead>
            <tbody>
              {p.criteria.map((c) => {
                const sum = p.criteria_summary.find((x) => x.criterion_id === c.criterion_id)
                return (
                  <tr key={c.criterion_id} className={cn('border-b border-line', sum?.flagged && 'bg-status-action-bg')}>
                    <th scope="row" className="p-3 font-normal">
                      <span className="font-semibold">{c.label}</span> <span className="text-sm text-ink-muted">{c.weight}%</span>
                    </th>
                    {p.scorecards.map((s) => (
                      <td key={s.scorecard_id} className="p-3 text-right tabular-nums">
                        {s.items.find((i) => i.criterion_id === c.criterion_id)?.score ?? '—'}
                      </td>
                    ))}
                    <td className="p-3 text-right tabular-nums">{fmt(sum?.mean)}</td>
                    <td className="whitespace-nowrap p-3 text-right tabular-nums">
                      {sum?.spread ?? '—'}
                      {sum?.flagged ? <Flag label="Flag" /> : null}
                    </td>
                  </tr>
                )
              })}
              <tr>
                <th scope="row" className="p-3">
                  Weighted score
                </th>
                {p.scorecards.map((s) => (
                  <td key={s.scorecard_id} className="p-3 text-right font-semibold tabular-nums">
                    {fmt(s.weighted_score)}
                  </td>
                ))}
                <td className="p-3 text-right font-semibold tabular-nums">{fmt(agg?.mean_weighted)}</td>
                <td className="p-3 text-right tabular-nums">{fmt(agg?.spread)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="reasons-h" className="flex flex-col gap-3">
        <h2 id="reasons-h" className="text-h2 font-semibold">
          Reasons
        </h2>
        {p.scorecards.map((s, i) => (
          <details key={s.scorecard_id} className="rounded-md bg-surface-card shadow-1">
            <summary className="flex min-h-touch cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 font-semibold">
              <span>{name(i)}</span>
              <span className="text-sm font-normal text-ink-muted">
                Weighted {fmt(s.weighted_score)}
                {s.submitted_at ? ` · submitted ${formatDateTimeCAT(s.submitted_at)}` : ''}
              </span>
            </summary>
            <dl className="flex flex-col gap-3 px-4 pb-4">
              {p.criteria.map((c) => {
                const item = s.items.find((x) => x.criterion_id === c.criterion_id)
                return (
                  <div key={c.criterion_id}>
                    <dt className="font-semibold">
                      {c.label}: {item?.score ?? '—'}
                    </dt>
                    <dd className="whitespace-pre-wrap break-words">{item?.reason}</dd>
                  </div>
                )
              })}
              {s.overall_comment ? (
                <div>
                  <dt className="font-semibold">Overall comment</dt>
                  <dd className="whitespace-pre-wrap break-words">{s.overall_comment}</dd>
                </div>
              ) : null}
            </dl>
          </details>
        ))}
      </section>
    </>
  )
}
