import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Banner, EmptyState, ErrorState, IdeaCard, LoadingState, ButtonLink } from '@/components'
import { formatDateTimeCAT, relativeDays } from '@/lib/format'
import { isChallengeOpen } from '@/lib/form-check'
import { sortIdeas, toIdeaCard } from '@/features/ideas/idea-view'
import { useChallenges, useMyIdeas } from '@/features/submission/queries'

/**
 * T06 — Applicant "My ideas" (spec §7 T06). Built from the written spec (BCR-003, D-45 proposed).
 * One card per idea, ideas needing action first. Live updates (NTF-01) arrive with Realtime in Slice 3.
 */
export function MyIdeasPage() {
  const ideas = useMyIdeas()
  const challenges = useChallenges()
  const open = (challenges.data ?? []).filter((c) => isChallengeOpen(c))

  const startLink =
    open.length === 1 && open[0] ? `/ideas/new?challenge=${open[0].id}` : '/challenges'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 font-bold">My ideas</h1>
        <ButtonLink to={startLink}>
          <Plus aria-hidden className="h-5 w-5" />
          Start a new idea
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
          {ideas.data.some((i) => i.status === 'action_required' && i.open_feedback?.status !== 'expired') ? (
            <Banner kind="action" title="CEDA needs a response from you">
              One of your ideas is waiting for your answer. Respond before the deadline shown on the card.
            </Banner>
          ) : null}
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
