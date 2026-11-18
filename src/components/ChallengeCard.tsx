import { CalendarClock } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ChallengeSummary } from '@/lib/api/types'
import type { StatusTone } from '@/lib/status'
import { TonePill } from './StatusBadge'
import { formatDateTimeCAT, relativeDays } from '@/lib/format'
import { challengeTiming, type ChallengeTiming } from '@/lib/form-check'

const LABEL: Record<ChallengeTiming, string> = {
  upcoming: 'Opening soon',
  open: 'Open',
  closing_soon: 'Closing soon',
  closed: 'Closed — not accepting submissions',
}
/** F4: timing pills reuse the status tones (Open = Approved, Closing soon = Action required, Opening soon = Under review, Closed = Closed). */
const TONE: Record<ChallengeTiming, StatusTone> = { upcoming: 'review', open: 'approved', closing_soon: 'action', closed: 'closed' }

/** Challenge card (spec T01): title, summary, audience, closing date in CAT with a relative hint, and status. */
export function ChallengeCard({ challenge, now }: { challenge: ChallengeSummary; now?: Date }) {
  const timing = challengeTiming(challenge, now)
  const closed = timing === 'closed'
  const headingId = `challenge-${challenge.id}`
  return (
    // No reduced opacity on closed cards: it drops text below 4.5:1 (Sandra, #38). The pill and date say it.
    <article aria-labelledby={headingId} className="flex h-full flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1">
      <TonePill tone={TONE[timing]} label={LABEL[timing]} className="self-start" />
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
