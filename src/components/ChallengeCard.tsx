import { Link } from 'react-router-dom'
import type { ChallengeSummary } from '@/lib/api/types'
import type { StatusTone } from '@/lib/status'
import { cn } from '@/lib/cn'
import { buttonClassName } from './button-styles'
import { TonePill } from './StatusBadge'
import { formatDateTimeCAT, relativeDays } from '@/lib/format'
import { challengeTiming, type ChallengeTiming } from '@/lib/form-check'

const LABEL: Record<ChallengeTiming, string> = {
  upcoming: 'Opening soon',
  open: 'Open',
  closing_soon: 'Closing soon',
  closed: 'Closed',
}
/** F4: timing pills reuse the status tones (Open = Approved, Closing soon = Action required, Opening soon = Under review, Closed = Closed). */
const TONE: Record<ChallengeTiming, StatusTone> = { upcoming: 'review', open: 'approved', closing_soon: 'action', closed: 'closed' }

/** An optional photo across the top of the card. Decorative: the title and summary say what the challenge is. */
export interface ChallengeCover {
  src: string
  width: number
  height: number
}

/**
 * Challenge card (spec T01), laid out to Sandra's home page reference: a coloured top edge (brand while open,
 * grey once closed), the status pill and how long is left, title, summary, audience and closing date (CAT), and
 * "View challenge". A closed challenge says so instead of offering a button; its brief stays readable via the title.
 * Post-freeze (ABM, 22 Nov): an optional cover photo above it all; it zooms gently on hover unless motion is reduced,
 * and is muted once the challenge has closed.
 */
export function ChallengeCard({ challenge, now, cover }: { challenge: ChallengeSummary; now?: Date; cover?: ChallengeCover }) {
  const timing = challengeTiming(challenge, now)
  const closed = timing === 'closed'
  const headingId = `challenge-${challenge.id}`
  const left = closed ? 'Closed — not accepting submissions' : timing === 'upcoming' ? 'Not open yet' : `Closes ${relativeDays(challenge.closes_at, now)}`
  return (
    // No reduced opacity on closed cards: it drops text below 4.5:1 (Sandra, #38). The pill and text say it.
    <article
      aria-labelledby={headingId}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-md border-t-4 bg-surface-card shadow-1 transition-shadow hover:shadow-2',
        closed ? 'border-line' : 'border-brand',
      )}
    >
      {cover ? (
        <div className="aspect-[16/7] overflow-hidden bg-surface-sunken">
          <img
            src={cover.src}
            alt=""
            width={cover.width}
            height={cover.height}
            loading="lazy"
            decoding="async"
            className={cn('h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105', closed && 'grayscale')}
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TonePill tone={TONE[timing]} label={LABEL[timing]} />
          <span className="text-xs text-ink-muted">{left}</span>
        </div>
        <h3 id={headingId} className="text-h3 font-semibold">
          <Link to={`/challenges/${challenge.slug}`} className="inline-flex min-h-touch items-center text-ink no-underline hover:underline">
            {challenge.title}
          </Link>
        </h3>
        <p className="text-sm text-ink-muted">{challenge.summary}</p>
        <dl className="mt-auto grid grid-cols-1 gap-3 border-t border-line pt-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Audience</dt>
            <dd>{challenge.audience}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Closing date</dt>
            <dd>{formatDateTimeCAT(challenge.closes_at)}</dd>
          </div>
        </dl>
        {closed ? (
          <span className={buttonClassName('secondary', 'md', 'pointer-events-none cursor-default self-start text-ink-muted')} aria-hidden>
            Closed
          </span>
        ) : (
          <Link to={`/challenges/${challenge.slug}`} className={buttonClassName('primary', 'md', 'self-start')} aria-label={`View challenge: ${challenge.title}`}>
            View challenge
          </Link>
        )}
      </div>
    </article>
  )
}
