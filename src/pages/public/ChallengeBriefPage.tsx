import { FileText } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button, ErrorState, LoadingState, NotFoundState, PlainMarkdown, SampleLabel } from '@/components'
import { formatDateTimeCAT, relativeDays } from '@/lib/format'
import { challengeTiming } from '@/lib/form-check'
import { useSession } from '@/lib/session'
import { useChallengeBrief, useMyIdeas } from '@/features/submission/queries'

/**
 * T03 — Challenge brief (spec §7 T03 "challenge brief" variant; HLP-01). Built from the written spec (BCR-003).
 * Unpublished or unknown slug → Not found. Closed → the primary action is disabled with the reason.
 * "How your idea is assessed" shows criteria and weights only, never the scoring anchors.
 */
export function ChallengeBriefPage() {
  const { slug } = useParams()
  const brief = useChallengeBrief(slug)
  const session = useSession()
  const isApplicant = session.data?.roles.includes('applicant') ?? false
  const ideas = useMyIdeas(isApplicant)

  if (brief.isPending) return <LoadingState what="the challenge" />
  if (brief.isError) return <ErrorState level="h1" message="We couldn't load this challenge." onRetry={() => void brief.refetch()} />
  if (!brief.data) return <NotFoundState home="/" />
  const { challenge, brief_md, templates, criteria } = brief.data
  const timing = challengeTiming(challenge)
  const open = timing === 'open' || timing === 'closing_soon'
  const draft = ideas.data?.find((i) => i.status === 'draft' && i.challenge.id === challenge.id)

  const action = !open ? (
    <Button disabled disabledReason={timing === 'upcoming' ? `Opens ${formatDateTimeCAT(challenge.opens_at)}.` : 'This challenge is closed and not accepting submissions.'}>
      Start an idea
    </Button>
  ) : (
    <Link
      to={draft ? `/ideas/${draft.id}/edit` : `/ideas/new?challenge=${challenge.id}`}
      className="inline-flex min-h-touch w-full items-center justify-center rounded-md bg-brand px-4 font-semibold text-brand-on no-underline"
    >
      {draft ? 'Continue your draft' : 'Start an idea'}
    </Link>
  )

  return (
    <div className="grid gap-6 pb-24 lg:grid-cols-[minmax(0,1fr),300px] lg:pb-0">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-h1 font-bold">{challenge.title}</h1>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <dt className="inline text-ink-muted">Status: </dt>
              <dd className="inline font-semibold">{open ? (timing === 'closing_soon' ? 'Closing soon' : 'Open') : timing === 'upcoming' ? 'Opening soon' : 'Closed'}</dd>
            </div>
            <div>
              <dt className="inline text-ink-muted">{open ? 'Closes: ' : 'Closed: '}</dt>
              <dd className="inline">
                {formatDateTimeCAT(challenge.closes_at)}
                {open ? ` (${relativeDays(challenge.closes_at)})` : ''}
              </dd>
            </div>
            <div>
              <dt className="inline text-ink-muted">Who can apply: </dt>
              <dd className="inline">{challenge.audience}</dd>
            </div>
          </dl>
        </header>

        <section aria-labelledby="brief-heading" className="flex flex-col gap-2">
          <h2 id="brief-heading" className="text-h2 font-semibold">
            The challenge
          </h2>
          <PlainMarkdown source={brief_md} />
        </section>

        <section aria-labelledby="assess-heading" className="flex flex-col gap-2">
          <h2 id="assess-heading" className="text-h2 font-semibold">
            How your idea is assessed
          </h2>
          <p>Two assessors score each idea against these criteria. The weights show how much each one counts.</p>
          <ul className="flex flex-col gap-2">
            {criteria.map((c) => (
              <li key={c.key} className="flex items-start justify-between gap-4 rounded-md bg-surface-card p-3 shadow-1">
                <span>
                  <span className="font-semibold">{c.label}</span>
                  <span className="block text-sm text-ink-muted">{c.guidance}</span>
                </span>
                <span className="shrink-0 font-semibold">{c.weight}%</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="downloads-heading" className="flex flex-col gap-2">
          <h2 id="downloads-heading" className="text-h2 font-semibold">
            Downloads
          </h2>
          {templates.length === 0 ? (
            <p className="text-ink-muted">This challenge has no templates.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {templates.map((t) => (
                <li key={t.path} className="flex flex-wrap items-center gap-2">
                  <FileText aria-hidden className="h-5 w-5" />
                  <span>{t.name}</span>
                  <span className="text-sm text-ink-muted">({t.name.split('.').pop()?.toUpperCase()})</span>
                  <SampleLabel />
                  <span className="text-sm text-ink-muted">Download link coming soon.</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p>
          Questions? <Link to="/help/faqs">Read the FAQs</Link>.
        </p>
      </div>

      {/* Primary action: sticky aside on desktop, bottom bar on mobile (spec T03). */}
      <aside className="hidden lg:block">
        <div className="sticky top-4 flex flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1">{action}</div>
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface-card p-3 lg:hidden">
        {action}
      </div>
    </div>
  )
}
