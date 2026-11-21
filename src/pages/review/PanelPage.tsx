import { AlertTriangle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Banner, ButtonLink, ReferencePill, StatusBadge } from '@/components'
import { ErrorState, LoadingState, NotFoundState } from '@/components/states/States'
import { usePanel } from '@/features/review/queries'
import { useStaffCase } from '@/features/staff/queries'
import type { ScorePanel } from '@/lib/api/types'
import { formatDateTimeCAT } from '@/lib/format'
import { useSession } from '@/lib/session'

/**
 * T09 panel view (spec T09; contract §4.3 `get_score_panel`), laid out to Sandra's 21 Nov frame
 * ("ceda adjudicator evaluation" in `Figma pdf/`). Criterion × reviewer matrix with each score's reason on demand,
 * the spread per criterion with a flag at 2 or more (BCR-001 B7), each reviewer's weighted score and the panel
 * average, and a warning while reviews are outstanding. Adjudicators and admins see it, with the case's title,
 * challenge and status; a reviewer sees it only after submitting their own.
 */
export function PanelPage() {
  const { id } = useParams()
  const panel = usePanel(id)
  const { data: user } = useSession()
  const reviewerOnly = Boolean(user?.roles.includes('reviewer') && !user.roles.some((r) => r === 'adjudicator' || r === 'admin'))
  // Staff who may read the whole case also get its title, challenge and status (the panel itself doesn't carry them).
  const staffCase = useStaffCase(user && !reviewerOnly ? id : undefined)
  if (panel.isPending || (staffCase.fetchStatus === 'fetching' && !staffCase.data)) return <LoadingState what="the score panel" />
  if (panel.isError) return <ErrorState level="h1" message="We couldn't load the score panel." onRetry={() => void panel.refetch()} />
  if (!panel.data) return <NotFoundState home="/staff" />
  const p = panel.data
  const c = staffCase.data ?? null
  const outstanding = Math.max(0, p.quorum - p.submitted_count)
  const canDecide = Boolean(user?.roles.includes('adjudicator')) && outstanding === 0 && p.scorecards.length > 0

  return (
    <div className="flex flex-col gap-6">
      <p>
        {reviewerOnly ? (
          <Link to="/staff/reviews" className="inline-flex min-h-touch items-center text-sm">
            ← My reviews
          </Link>
        ) : (
          <Link to={`/staff/cases/${p.proposal_id}`} className="inline-flex min-h-touch items-center text-sm">
            ← Case
          </Link>
        )}
      </p>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ReferencePill reference={p.reference} copyable />
          {c ? <StatusBadge status={c.status} audience="staff" /> : null}
        </div>
        {c ? <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Score panel</p> : null}
        <h1 className="text-h1 font-semibold">{c ? c.title : 'Score panel'}</h1>
        {c ? <p className="text-ink-muted">{c.challenge.title}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="font-semibold">
            Version {p.version_no} · {p.submitted_count} of {p.quorum} reviews submitted
          </p>
          {reviewerOnly ? null : (
            <Link to={`/staff/cases/${p.proposal_id}`} className="inline-flex min-h-touch items-center font-semibold">
              Open full case →
            </Link>
          )}
        </div>
      </header>
      {outstanding > 0 ? (
        <Banner kind="warning" title="Reviews outstanding">
          {outstanding} of {p.quorum} {outstanding === 1 ? 'review' : 'reviews'} outstanding. A decision is not available yet.
        </Banner>
      ) : null}
      {p.scorecards.length === 0 ? <p className="text-ink-muted">No scorecards have been submitted for this version yet.</p> : <PanelBody p={p} />}
      {canDecide ? (
        <div className="flex justify-end">
          <ButtonLink to={`/staff/cases/${p.proposal_id}`}>Record decision on the case page</ButtonLink>
        </div>
      ) : null}
    </div>
  )
}

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : Number(n).toFixed(2))
const TH = 'p-3 text-xs font-semibold uppercase tracking-wide text-ink-muted'

function PanelBody({ p }: { p: ScorePanel }) {
  const name = (i: number) => p.scorecards[i]?.reviewer_name ?? `Reviewer ${i + 1}`
  const agg = p.aggregate
  const criterionFlag = p.criteria_summary.some((c) => c.flagged)
  const flagged = Boolean(agg?.flagged) || criterionFlag
  return (
    <>
      {flagged ? (
        <Banner kind="warning" title={agg?.flagged ? 'Large spread' : 'Criteria disagree'}>
          Reviewers differ by {p.spread_flag_threshold} points or more {agg?.flagged ? 'overall' : 'on at least one criterion'}. Read their reasons before deciding.
        </Banner>
      ) : null}

      <section aria-labelledby="matrix-h" className="flex flex-col gap-3">
        <h2 id="matrix-h" className="sr-only">
          Scores by criterion
        </h2>
        {p.scorecards.length > 1 ? <p className="text-sm text-ink-muted md:hidden">Swipe the table sideways to see every reviewer and the spread.</p> : null}
        {/* `relative` keeps the screen-reader-only labels in the cells inside this scroll box, not the page's. */}
        <div className="relative overflow-x-auto rounded-md bg-surface-card shadow-1">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Scores by criterion and reviewer, with each score's reason and the spread</caption>
            <thead className="bg-surface-sunken">
              <tr className="border-b border-line">
                <th scope="col" className={TH}>
                  Criterion
                </th>
                {p.scorecards.map((s, i) => (
                  <th key={s.scorecard_id} scope="col" className={TH}>
                    {name(i)}
                  </th>
                ))}
                <th scope="col" className={`${TH} text-right`}>
                  Spread
                </th>
              </tr>
            </thead>
            <tbody>
              {p.criteria.map((c) => {
                const sum = p.criteria_summary.find((x) => x.criterion_id === c.criterion_id)
                return (
                  <tr key={c.criterion_id} className="border-b border-line align-top">
                    <th scope="row" className="min-w-[10rem] p-3 font-normal">
                      <span className="font-semibold">{c.label}</span> <span className="text-sm text-ink-muted">{c.weight}%</span>
                      {sum?.flagged ? (
                        <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-status-action-fg">
                          <AlertTriangle aria-hidden className="h-4 w-4 shrink-0" />
                          Reviewers disagree (spread {sum.spread})
                        </span>
                      ) : null}
                    </th>
                    {p.scorecards.map((s, i) => {
                      const item = s.items.find((x) => x.criterion_id === c.criterion_id)
                      return (
                        <td key={s.scorecard_id} className="min-w-[9rem] p-3">
                          <div className="flex flex-wrap items-start gap-2">
                            <span data-score className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-lg font-semibold tabular-nums text-brand-text">
                              {item?.score ?? '—'}
                            </span>
                            {item?.reason ? (
                              <details className="min-w-0 flex-1 text-sm">
                                <summary className="inline-flex min-h-touch cursor-pointer items-center font-semibold text-brand-text">
                                  Reason<span className="sr-only">: {name(i)}, {c.label}</span>
                                </summary>
                                <p className="whitespace-pre-wrap break-words">{item.reason}</p>
                              </details>
                            ) : null}
                          </div>
                        </td>
                      )
                    })}
                    <td className="p-3 text-right text-h2 font-semibold tabular-nums">{sum?.spread ?? '—'}</td>
                  </tr>
                )
              })}
              <tr className="border-t-2 border-ink">
                <th scope="row" className="p-3 font-semibold">
                  Weighted score
                </th>
                {p.scorecards.map((s) => (
                  <td key={s.scorecard_id} className="p-3 font-semibold tabular-nums">
                    {fmt(s.weighted_score)}
                  </td>
                ))}
                <td className="p-3 text-right">
                  <span className="block font-semibold">Panel average {fmt(agg?.mean_weighted)} out of 5</span>
                  <span className="block text-sm text-ink-muted">spread {fmt(agg?.spread)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm font-semibold text-brand-text">
          Version {p.version_no} scorecards ({p.scorecards.length}), read only
        </p>
      </section>

      <section aria-labelledby="reviewers-h" className="flex flex-col gap-3">
        <h2 id="reviewers-h" className="text-h2 font-semibold">
          Each reviewer
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
              <div>
                <dt className="font-semibold">Overall comment</dt>
                <dd className="whitespace-pre-wrap break-words">{s.overall_comment || <span className="text-ink-muted">None</span>}</dd>
              </div>
            </dl>
          </details>
        ))}
      </section>
    </>
  )
}
