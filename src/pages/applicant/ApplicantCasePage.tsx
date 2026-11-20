import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Banner, Button, ButtonLink, ReferencePill, StageTimeline, StatusBadge, TextField } from '@/components'
import { NextStepsPanel } from '@/components/NextStepsPanel'
import { Tabs } from '@/components/Tabs'
import { ErrorState, LoadingState, NotFoundState } from '@/components/states/States'
import { EXPIRED_NOTICE, stagesFor } from '@/features/ideas/idea-view'
import { useRespondClarification, useRoadmap } from '@/features/feedback/queries'
import { FeedbackList } from '@/pages/feedback/FeedbackList'
import { api } from '@/lib/api'
import type { FeedbackRequest, MyCase, PublicStage } from '@/lib/api/types'
import { formatBytes, formatDateTimeCAT } from '@/lib/format'
import { formatBWP } from '@/lib/money'

const STAGE_TEXT: Record<PublicStage, string> = {
  submission: 'Submitted',
  review: 'Under review',
  feedback: 'Feedback requested',
  approval: 'Decision published',
  award: 'Award recorded',
}

/**
 * T08 applicant case view (spec T08), built from the written spec (BCR-003; design review pending). The
 * applicant's own submitted idea: status, the five public stages, the submitted answers, the timeline, and the
 * decision once CEDA publishes it (with the award and Next steps, INN-05). Never shows internal notes, scores,
 * unpublished decisions or staff reasons (N4; contract §3). Feedback replies arrive with Slice 4.
 */
export function ApplicantCasePage() {
  const { id } = useParams()
  const kase = useQuery({ queryKey: ['my-case', id], queryFn: () => api.submission.getMyCase(id as string), enabled: Boolean(id) })
  const roadmap = useRoadmap(id)

  if (kase.isPending || roadmap.isPending) return <LoadingState what="your idea" />
  if (kase.isError) return <ErrorState level="h1" message="We couldn't load your idea." onRetry={() => void kase.refetch()} />
  if (!kase.data) return <NotFoundState home="/ideas" />
  const c = kase.data
  const requests = roadmap.data ?? []
  const waiting = requests.find((r) => r.status !== 'answered' && c.status === 'action_required')

  return (
    <div className="flex flex-col gap-6">
      <p>
        <Link to="/ideas">← My ideas</Link>
      </p>
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ReferencePill reference={c.reference} copyable />
          <StatusBadge status={c.status} audience="applicant" />
        </div>
        <h1 className="text-h1 font-semibold">{c.title}</h1>
        <p className="text-ink-muted">
          {c.challenge.title} · Submitted {c.submitted_at ? formatDateTimeCAT(c.submitted_at) : ''}
        </p>
        <StageTimeline stages={stagesFor({ status: c.status, stages: c.stages })} compact />
        <p className="text-sm text-ink-muted">Only you and the CEDA staff assigned to your case can see this idea.</p>
        {waiting ? (
          <Banner kind="action" title={waiting.kind === 'clarification' ? 'CEDA has a question for you' : 'CEDA asks you to revise your idea'}>
            {waiting.status === 'expired' ? EXPIRED_NOTICE : `Please respond by ${formatDateTimeCAT(waiting.due_at)}. See the Feedback tab.`}
          </Banner>
        ) : null}
        {c.status === 'closed' && c.closed_reason ? (
          <Banner kind="info" title="This idea was not taken forward">
            {c.closed_reason}
          </Banner>
        ) : null}
      </header>

      <Tabs
        label="Your idea"
        initial={waiting ? 'feedback' : c.decision ? 'decision' : 'proposal'}
        tabs={[
          { id: 'proposal', label: 'Proposal', content: <ProposalTab c={c} /> },
          { id: 'timeline', label: 'Timeline', content: <TimelineTab c={c} /> },
          {
            id: 'feedback',
            label: 'Feedback',
            content: <FeedbackList requests={requests} renderAction={(r) => <ApplicantAction c={c} r={r} />} />,
          },
          { id: 'decision', label: 'Decision', content: <DecisionTab c={c} /> },
        ]}
      />
    </div>
  )
}

/** What the applicant can do on an open request (spec T08 Feedback tab, T04 V2 mode). */
function ApplicantAction({ c, r }: { c: MyCase; r: FeedbackRequest }) {
  if (r.status === 'expired' && c.status === 'action_required') return <p className="text-sm font-semibold">{EXPIRED_NOTICE}</p>
  if (r.status !== 'open') return null
  if (r.kind === 'revision')
    return (
      <div>
        <ButtonLink to={`/ideas/${c.id}/revise`}>Revise your idea</ButtonLink>
      </div>
    )
  return <ClarificationReply proposalId={c.id} requestId={r.feedback_request_id} />
}

/** Clarification reply (spec T08): required, 10–1,000 characters; no new version (D-21). */
function ClarificationReply({ proposalId, requestId }: { proposalId: string; requestId: string }) {
  const command = useRespondClarification(proposalId)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | undefined>()
  const id = useId()
  async function send() {
    const n = [...text.trim()].length
    if (n < 10) {
      setError(n === 0 ? 'Write your reply' : 'Write at least 10 characters')
      return
    }
    setError(undefined)
    await command.run({ feedbackRequestId: requestId, text: text.trim() })
  }
  const s = command.state
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        void send()
      }}
    >
      {s.kind === 'refused' ? <Banner kind="error">{s.message ?? 'Your reply was not sent.'}</Banner> : null}
      {s.kind === 'unconfirmed' ? (
        <Banner kind="warning" title="Not confirmed yet">
          We couldn't confirm your reply was sent. Check your connection and try again: a question can only be answered once.
        </Banner>
      ) : null}
      <TextField
        multiline
        rows={4}
        id={`${id}-reply`}
        label="Your reply"
        required
        maxLength={1000}
        help="10 to 1,000 characters. Your reply doesn't change your submitted idea."
        value={text}
        onChange={(e) => setText(e.target.value)}
        error={error ?? (s.kind === 'refused' ? s.fields?.response : undefined)}
      />
      <div>
        <Button type="submit" loading={s.kind === 'saving'} loadingLabel="Sending…">
          Send reply
        </Button>
      </div>
    </form>
  )
}

function ProposalTab({ c }: { c: MyCase }) {
  if (!c.version) return <p className="text-ink-muted">Your submitted answers are not available.</p>
  const v = c.version
  return (
    <div className="flex max-w-form flex-col gap-4">
      <p className="text-sm text-ink-muted">Version {v.version_no}: what you submitted. It can't be edited unless CEDA asks for a revision.</p>
      {v.form_schema.sections.map((s) => (
        <section key={s.key} aria-labelledby={`sec-${s.key}`} className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
          <h2 id={`sec-${s.key}`} className="text-h3 font-semibold">
            {s.title}
          </h2>
          <dl className="flex flex-col gap-2">
            {s.fields.map((f) => (
              <div key={f.key}>
                <dt className="text-sm font-semibold text-ink-muted">{f.label}</dt>
                <dd className="whitespace-pre-wrap break-words">{v.data[f.key]?.trim() ? v.data[f.key] : <span className="text-ink-muted">Not answered</span>}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <section aria-labelledby="sec-files" className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
        <h2 id="sec-files" className="text-h3 font-semibold">
          Files
        </h2>
        {v.files.length === 0 ? (
          <p className="text-ink-muted">No files attached.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {v.files.map((f) => (
              <li key={f.id} className="flex flex-wrap justify-between gap-2">
                <span className="break-all">{f.filename}</span>
                <span className="text-sm text-ink-muted">{formatBytes(f.size_bytes)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function TimelineTab({ c }: { c: MyCase }) {
  const items = [...c.stages].reverse()
  return (
    <ol className="flex max-w-form flex-col gap-3">
      {c.status === 'closed' ? (
        <li className="rounded-md bg-surface-card p-4 shadow-1">
          <span className="font-semibold">Closed</span>
          {c.closed_reason ? <p className="whitespace-pre-wrap break-words">{c.closed_reason}</p> : null}
        </li>
      ) : null}
      {items.map((s) => (
        <li key={s.stage} className="flex flex-wrap items-baseline justify-between gap-2 rounded-md bg-surface-card p-4 shadow-1">
          <span className="font-semibold">{STAGE_TEXT[s.stage]}</span>
          <time dateTime={s.at} className="text-sm text-ink-muted">
            {formatDateTimeCAT(s.at)}
          </time>
        </li>
      ))}
    </ol>
  )
}

function DecisionTab({ c }: { c: MyCase }) {
  if (!c.decision) {
    return (
      <p className="max-w-form text-ink-muted">
        {c.status === 'closed' ? 'This idea was closed without a decision.' : "No decision yet. We'll notify you when CEDA publishes it."}
      </p>
    )
  }
  const d = c.decision
  return (
    <div className="flex max-w-form flex-col gap-6">
      <section aria-labelledby="dec-h" className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
        <h2 id="dec-h" className="text-h2 font-semibold">
          {d.outcome === 'approved' ? 'Approved' : 'Not approved'}
        </h2>
        <p className="whitespace-pre-wrap break-words">{d.reason}</p>
        <p className="text-sm text-ink-muted">Published {formatDateTimeCAT(d.published_at)}</p>
      </section>
      {c.award ? (
        <section aria-labelledby="award-h" className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
          <h2 id="award-h" className="text-h2 font-semibold">
            Award: {formatBWP(c.award.amount_minor)}
          </h2>
          <p className="whitespace-pre-wrap break-words">{c.award.description}</p>
          <p className="text-sm text-ink-muted">Recorded {formatDateTimeCAT(c.award.recorded_at)}</p>
        </section>
      ) : d.outcome === 'approved' ? (
        <p className="text-ink-muted">CEDA will record any award separately. You'll be notified.</p>
      ) : null}
      <NextStepsPanel />
    </div>
  )
}
