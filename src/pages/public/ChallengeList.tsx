import { Link } from 'react-router-dom'
import { ChallengeCard, EmptyState, ErrorState, LoadingState } from '@/components'
import { challengeTiming } from '@/lib/form-check'
import { useChallenges } from '@/features/submission/queries'

/** The challenge list shared by T01 home and /challenges. Open first (closing soonest first), then closed. */
export function ChallengeList() {
  const challenges = useChallenges()
  if (challenges.isPending) return <LoadingState what="challenges" />
  if (challenges.isError) return <ErrorState message="We couldn't load the challenges." onRetry={() => void challenges.refetch()} />
  const rank = { closing_soon: 0, open: 1, upcoming: 2, closed: 3 } as const
  const list = [...challenges.data].sort(
    (a, b) => rank[challengeTiming(a)] - rank[challengeTiming(b)] || a.closes_at.localeCompare(b.closes_at),
  )
  const anyOpen = list.some((c) => ['open', 'closing_soon'].includes(challengeTiming(c)))
  return (
    <div className="flex flex-col gap-4">
      {!anyOpen ? (
        <EmptyState
          title="No challenges are open right now"
          level="h2"
          action={
            <Link to="/help/faqs" className="inline-flex min-h-touch items-center">
              Read the FAQs
            </Link>
          }
        >
          Check back soon.
        </EmptyState>
      ) : null}
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {list.map((c) => (
          <li key={c.id}>
            <ChallengeCard challenge={c} />
          </li>
        ))}
      </ul>
    </div>
  )
}
