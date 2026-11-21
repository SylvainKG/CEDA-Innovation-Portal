import type { ReactNode } from 'react'
import { TonePill } from '@/components'
import type { FeedbackRequest, RoadmapTask } from '@/lib/api/types'
import { formatDateTimeCAT } from '@/lib/format'
import type { StatusTone } from '@/lib/status'

/**
 * The feedback requests on a case (spec T08 Feedback tab; contract §4.4 `get_roadmap`), newest first. Shared by
 * staff and the applicant; `renderAction` lets the applicant's page add a reply form or a "Revise" link to the
 * open request. Reviewers' verifications show only when the server includes them (staff; the applicant after
 * the decision is published, BCR-001 B6).
 */
const STATUS: Record<FeedbackRequest['status'], { label: string; tone: StatusTone }> = {
  open: { label: 'Open', tone: 'action' },
  answered: { label: 'Answered', tone: 'approved' },
  expired: { label: 'Expired', tone: 'closed' },
}

export function FeedbackList({ requests, renderAction }: { requests: FeedbackRequest[]; renderAction?: (r: FeedbackRequest) => ReactNode }) {
  if (requests.length === 0) return <p className="max-w-form text-ink-muted">No clarifications or revisions have been requested.</p>
  return (
    <ol className="flex max-w-form flex-col gap-4">
      {requests.map((r) => (
        <li key={r.feedback_request_id} className="flex flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-h3 font-semibold">{r.kind === 'clarification' ? 'Clarification' : 'Revision request'}</h3>
            <TonePill tone={STATUS[r.status].tone} label={STATUS[r.status].label} />
          </div>
          <p className="whitespace-pre-wrap break-words">{r.message}</p>
          <p className="text-sm text-ink-muted">
            Asked {formatDateTimeCAT(r.created_at)} on version {r.version_no} · respond by {formatDateTimeCAT(r.due_at)}
          </p>
          {r.tasks.length ? <TaskList r={r} /> : null}
          {r.response_text ? (
            <div className="rounded-md border border-line p-3">
              <p className="text-sm font-semibold">Reply{r.responded_at ? ` · ${formatDateTimeCAT(r.responded_at)}` : ''}</p>
              <p className="whitespace-pre-wrap break-words">{r.response_text}</p>
            </div>
          ) : null}
          {r.answered_version_no ? <p className="text-sm">Answered with version {r.answered_version_no}.</p> : null}
          {renderAction?.(r)}
        </li>
      ))}
    </ol>
  )
}

function TaskList({ r }: { r: FeedbackRequest }) {
  const { summary } = r
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">
        Roadmap · {summary.addressed} of {summary.tasks} {summary.tasks === 1 ? 'task' : 'tasks'} addressed
        {summary.verified !== null ? ` · ${summary.verified} verified` : ''}
        {summary.not_verified ? ` · ${summary.not_verified} not verified` : ''}
      </p>
      <ol className="flex flex-col gap-2">
        {r.tasks.map((t) => (
          <TaskItem key={t.task_id} t={t} />
        ))}
      </ol>
    </div>
  )
}

function TaskItem({ t }: { t: RoadmapTask }) {
  return (
    <li className="flex flex-col gap-1 rounded-md border border-line p-3">
      <p>
        <span className="font-semibold">{t.position}.</span> {t.text}
      </p>
      {t.applicant_status ? (
        <p className="text-sm">
          <span className="font-semibold">{t.applicant_status === 'addressed' ? 'Addressed' : 'Not addressed'}:</span> {t.applicant_explanation}
        </p>
      ) : (
        <p className="text-sm text-ink-muted">Not answered yet</p>
      )}
      {t.verifications?.length ? (
        <ul className="flex flex-col gap-1 text-sm">
          {t.verifications.map((v, i) => (
            <li key={i}>
              {v.reviewer_name ?? 'Reviewer'}: {v.result === 'verified' ? 'verified' : 'not verified'}
              {v.note ? ` · ${v.note}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}
