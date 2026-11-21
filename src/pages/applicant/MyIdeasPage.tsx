import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Banner, EmptyState, ErrorState, IdeaCard, LoadingState, ButtonLink } from '@/components'
import { formatDateTimeCAT, relativeDays } from '@/lib/format'
import { isChallengeOpen } from '@/lib/form-check'
import { sortIdeas, toIdeaCard } from '@/features/ideas/idea-view'
import { useChallenges, useMyIdeas } from '@/features/submission/queries'
import { useSession } from '@/lib/session'

/**
 * T06 — Applicant "My ideas" (spec §7 T06). Built from the written spec (BCR-003, D-45 proposed).
 * One card per idea, ideas needing action first. Live updates (NTF-01) arrive with Realtime in Slice 3.
 * Figma updates 21 Nov: eyebrow heading, personalized greeting, red action banner.
 */
export function MyIdeasPage() {
  const session = useSession()
  const ideas = useMyIdeas()
  const challenges = useChallenges()
  const open = (challenges.data ?? []).filter((c) => isChallengeOpen(c))

  const startLink =
    open.length === 1 && open[0] ? `/ideas/new?challenge=${open[0].id}` : '/challenges'

  // Find the earliest deadline from ideas needing action (Figma: show specific deadline in banner)
  const actionIdeas = ideas.data?.filter((i) => i.status === 'action_required' && i.open_feedback?.status !== 'expired') ?? []
  const earliestDeadline = actionIdeas.length > 0
    ? actionIdeas.reduce((earliest, idea) => {
        const deadline = idea.open_feedback?.due_at
        if (!deadline) return earliest
        if (!earliest) return deadline
        return new Date(deadline) < new Date(earliest) ? deadline : earliest
      }, null as string | null)
    : null

  return (
    <div className="flex flex-col gap-6">
      {/* Figma: "MY IDEAS" eyebrow + personalized greeting (21 Nov) */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">MY IDEAS</p>
        {session.isPending ? (
          <div aria-busy="true" className="flex flex-col gap-2">
            <div aria-hidden className="h-10 w-64 animate-pulse rounded-sm bg-surface-sunken" />
          </div>
        ) : (
          <h1 className="text-h1 font-bold">
            Welcome{session.data?.displayName ? `, ${session.data.displayName}` : ''}
          </h1>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
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
          {actionIdeas.length > 0 ? (
            <Banner kind="action" title="An idea needs your response">
              {actionIdeas.length === 1
                ? `You have 1 idea waiting for your response${earliestDeadline ? ` by ${formatDateTimeCAT(earliestDeadline)}` : ''}.`
                : `You have ${actionIdeas.length} ideas waiting for your response${earliestDeadline ? `. Earliest deadline: ${formatDateTimeCAT(earliestDeadline)}` : ''}.`}
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
