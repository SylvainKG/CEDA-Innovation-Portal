import { CalendarClock } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CaseStatus, FeedbackKind } from '@/lib/api/types'
import { formatDateTimeCAT, relativeDays } from '@/lib/format'
import { ReferencePill } from './ReferencePill'
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
  stages: StageEntry[]
  primaryAction: { label: string; to: string }
}

export function IdeaCard({ idea, now }: { idea: IdeaCardModel; now?: Date }) {
  const headingId = `idea-${idea.id}-title`
  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-4 rounded-md bg-surface-card p-4 shadow-1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={headingId} className="text-h3 font-semibold">
            {idea.title}
          </h3>
          <p className="text-sm text-ink-muted">{idea.challenge}</p>
        </div>
        <StatusBadge status={idea.status} audience="applicant" context={{ feedbackKind: idea.feedbackKind }} />
      </div>
      {idea.reference ? <ReferencePill reference={idea.reference} /> : <p className="text-sm text-ink-muted">Draft: no reference yet</p>}
      {idea.status !== 'draft' ? <StageTimeline stages={idea.stages} orientation="vertical" compact /> : null}
      <div className="flex flex-col gap-1 text-sm text-ink-muted">
        <span>Updated {formatDateTimeCAT(idea.updatedAt)}</span>
        {idea.deadline ? (
          <span className="flex items-center gap-1 font-semibold text-ink">
            <CalendarClock aria-hidden className="h-4 w-4 text-status-action-fg" />
            Respond by {formatDateTimeCAT(idea.deadline)} ({relativeDays(idea.deadline, now)})
          </span>
        ) : null}
      </div>
      <Link
        to={idea.primaryAction.to}
        className="inline-flex min-h-touch items-center justify-center rounded-md bg-brand px-4 font-semibold text-brand-on no-underline hover:bg-brand-hover"
      >
        {idea.primaryAction.label}
        <span className="sr-only">: {idea.title}</span>
      </Link>
    </article>
  )
}
