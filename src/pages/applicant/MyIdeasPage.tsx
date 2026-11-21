import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, IdeaCard, LoadingState, ButtonLink } from '@/components'
import { formatDateTimeCAT, relativeDays } from '@/lib/format'
import { isChallengeOpen } from '@/lib/form-check'
import { useSession } from '@/lib/session'
import { primaryActionFor, sortIdeas, toIdeaCard } from '@/features/ideas/idea-view'
import { useChallenges, useMyIdeas } from '@/features/submission/queries'

/**
 * T06 — Applicant "My ideas" (spec §7 T06), laid out to Sandra's 21 Nov frame: "MY IDEAS" above
 * "Welcome, <name>", a red banner when an idea needs a response (with the earliest deadline and its action), and
 * one card per idea, ideas needing action first.
 */
export function MyIdeasPage() {
  const { data: user } = useSession()
  const ideas = useMyIdeas()
  const challenges = useChallenges()
  const open = (challenges.data ?? []).filter((c) => isChallengeOpen(c))

  const startLink =
    open.length === 1 && open[0] ? `/ideas/new?challenge=${open[0].id}` : '/challenges'

  // The idea whose response is due soonest (an expired request needs no banner: its card says so).
  const waiting = (ideas.data ?? [])
    .filter((i) => i.status === 'action_required' && i.open_feedback && i.open_feedback.status !== 'expired')
    .sort((a, b) => a.open_feedback!.due_at.localeCompare(b.open_feedback!.due_at))
  const urgent = waiting[0]
  const urgentAction = urgent ? primaryActionFor(urgent) : undefined

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-text">My ideas</p>
          <h1 className="text-h1 font-semibold">Welcome, {user?.displayName ?? 'applicant'}</h1>
          <p className="text-ink-muted">Track your ideas and respond to CEDA when action is needed.</p>
        </div>
        <ButtonLink to={startLink}>
          Start a new idea
          <ArrowRight aria-hidden className="h-5 w-5" />
        </ButtonLink>
      </div>

      {ideas.isPending ? (
        <LoadingState what="your ideas" />
      ) : ideas.isError ? (
        <ErrorState message="We couldn't load your ideas." onRetry={() => void ideas.refetch()} />
      ) : ideas.data.length === 0 ? (
        <EmptyState title="You haven't started an idea yet" level="h2">
          {open.length > 0 ? 'These challenges are open now:' : 'No challenges are open right now. Check back soon or read the FAQs.'}
        </EmptyState>
      ) : (
        <>
          {urgent ? (
            <section aria-labelledby="needs-response" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-error bg-error-subtle p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle aria-hidden className="mt-0.5 h-6 w-6 shrink-0 text-error" />
                <div>
                  <h2 id="needs-response" className="font-semibold">
                    {waiting.length > 1 ? `${waiting.length} ideas need your response` : 'An idea needs your response'}
                  </h2>
                  <p className="text-sm">
                    Respond by {formatDateTimeCAT(urgent.open_feedback!.due_at)} ({relativeDays(urgent.open_feedback!.due_at)}).
                  </p>
                </div>
              </div>
              {urgentAction ? (
                <ButtonLink to={urgentAction.to} variant="secondary">
                  {urgentAction.label}
                  <span className="sr-only">: {urgent.title}</span>
                </ButtonLink>
              ) : null}
            </section>
          ) : null}
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {sortIdeas(ideas.data).map((idea) => (
              <li key={idea.id}>
                <IdeaCard idea={toIdeaCard(idea)} />
              </li>
            ))}
          </ul>
        </>
      )}

      {ideas.data?.length === 0 && open.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {open.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
              <h3 className="text-h3 font-semibold">{c.title}</h3>
              <p>{c.summary}</p>
              <p className="text-sm text-ink-muted">
                Closes {formatDateTimeCAT(c.closes_at)} ({relativeDays(c.closes_at)})
              </p>
              <Link to={`/ideas/new?challenge=${c.id}`}>
                Start an idea<span className="sr-only"> for {c.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
