import type { CaseStatus, FeedbackKind } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { formatDateTimeCAT, relativeDays, timeAgo } from '@/lib/format'
import { ButtonLink } from './ButtonLink'
import { StageTimeline, type StageEntry } from './StageTimeline'
import { StatusBadge } from './StatusBadge'

/**
 * What the applicant dashboard needs to show one idea (spec §7 T06). This is a view model:
 * the API layer maps the contract's response onto it, so the card does not depend on the API shape.
 */
export interface IdeaCardModel {
  id: string
  title: string
  challenge: string
  /** Null while the idea is a draft (the reference is issued on submit). */
  reference: string | null
  status: CaseStatus
  feedbackKind?: FeedbackKind
  updatedAt: string
  deadline?: string
  /** Words before the deadline: "Respond by" (feedback, default) or "Submit by" (a draft before the challenge closes). */
  deadlineLabel?: string
  stages: StageEntry[]
  /** Omitted when there is nothing the applicant can do (then `notice` says why). */
  primaryAction?: { label: string; to: string }
  /** A sentence shown instead of an action, e.g. when a response deadline has passed. */
  notice?: string
}

/**
 * Idea card (spec §7 T06), laid out to Sandra's 21 Nov "My ideas" frame: the status pill and the reference across
 * the top, the title and challenge, the five-step stepper, then "Updated … · deadline" and the one action. A card
 * that needs the applicant's response has a red top edge.
 */
export function IdeaCard({ idea, now }: { idea: IdeaCardModel; now?: Date }) {
  const headingId = `idea-${idea.id}-title`
  const needsResponse = idea.status === 'action_required' && !idea.notice
  return (
    <article
      aria-labelledby={headingId}
      className={cn('flex h-full flex-col gap-4 rounded-md border-t-4 bg-surface-card p-5 shadow-1', needsResponse ? 'border-error' : 'border-brand')}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={idea.status} audience="applicant" context={{ feedbackKind: idea.feedbackKind }} />
        {idea.reference ? <span className="font-mono text-xs text-ink-muted">{idea.reference}</span> : <span className="text-xs text-ink-muted">Draft: no reference yet</span>}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 id={headingId} className="text-h3 font-semibold">
          {idea.title}
        </h3>
        <p className="text-sm text-ink-muted">{idea.challenge}</p>
      </div>
      {idea.status !== 'draft' ? <StageTimeline stages={idea.stages} compact /> : null}
      {idea.notice ? <p className="rounded-md bg-surface-sunken p-3 text-sm">{idea.notice}</p> : null}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-sm text-ink-muted">
          <span title={formatDateTimeCAT(idea.updatedAt)}>Updated {timeAgo(idea.updatedAt, now)}</span>
          {idea.deadline ? (
            <>
              {' · '}
              <span className={cn('font-semibold', needsResponse ? 'text-error' : 'text-ink')}>
                {idea.deadlineLabel ?? 'Respond by'} {formatDateTimeCAT(idea.deadline)} ({relativeDays(idea.deadline, now)})
              </span>
            </>
          ) : null}
        </p>
        {idea.primaryAction ? (
          <ButtonLink to={idea.primaryAction.to}>
            {idea.primaryAction.label}
            <span className="sr-only">: {idea.title}</span>
          </ButtonLink>
        ) : null}
      </div>
    </article>
  )
}
