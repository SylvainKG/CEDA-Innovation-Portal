import { CalendarClock } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ChallengeSummary } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { formatDateTimeCAT, relativeDays } from '@/lib/format'
import { challengeTiming, type ChallengeTiming } from '@/lib/form-check'

const LABEL: Record<ChallengeTiming, string> = {
  upcoming: 'Opening soon',
  open: 'Open',
  closing_soon: 'Closing soon',
  closed: 'Closed — not accepting submissions',
}
const TONE: Record<ChallengeTiming, string> = {
  upcoming: 'bg-status-review-bg text-status-review-fg',
  open: 'bg-success-subtle text-ink',
  closing_soon: 'bg-warning-subtle text-ink',
  closed: 'bg-status-closed-bg text-status-closed-fg',
}

/** Challenge card (spec T01): title, summary, audience, closing date in CAT with a relative hint, and status. */
export function ChallengeCard({ challenge, now }: { challenge: ChallengeSummary; now?: Date }) {
  const timing = challengeTiming(challenge, now)
  const closed = timing === 'closed'
  const headingId = `challenge-${challenge.id}`
  return (
    <article aria-labelledby={headingId} className={cn('flex h-full flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1', closed && 'opacity-80')}>
      <span className={cn('self-start rounded-full px-3 py-1 text-sm font-semibold', TONE[timing])}>{LABEL[timing]}</span>
      <h3 id={headingId} className="text-h3 font-semibold">
        <Link to={`/challenges/${challenge.slug}`} className="inline-flex min-h-touch items-center text-ink">
          {challenge.title}
        </Link>
      </h3>
      <p>{challenge.summary}</p>
      <p className="text-sm text-ink-muted">For: {challenge.audience}</p>
      <p className="mt-auto flex items-center gap-1 text-sm">
        <CalendarClock aria-hidden className="h-4 w-4 shrink-0" />
        {closed ? `Closed on ${formatDateTimeCAT(challenge.closes_at)}` : `Closes ${formatDateTimeCAT(challenge.closes_at)} (${relativeDays(challenge.closes_at, now)})`}
      </p>
    </article>
  )
}
