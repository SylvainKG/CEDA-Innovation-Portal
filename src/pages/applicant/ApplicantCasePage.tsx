import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { Banner, Button, ButtonLink, ReferencePill, Select, StageTimeline, StatusBadge, TextField } from '@/components'
import { NextStepsPanel } from '@/components/NextStepsPanel'
import { Tabs } from '@/components/Tabs'
import { ErrorState, LoadingState, NotFoundState } from '@/components/states/States'
import { EXPIRED_NOTICE, stagesFor } from '@/features/ideas/idea-view'
import { useRespondClarification, useRoadmap } from '@/features/feedback/queries'
import { FeedbackList } from '@/pages/feedback/FeedbackList'
import { api } from '@/lib/api'
import type { FeedbackRequest, MyCase, PublicStage } from '@/lib/api/types'
import { formatBytes, formatDateCAT, formatDateTimeCAT } from '@/lib/format'
import { formatBWP } from '@/lib/money'

const STAGE_TEXT: Record<PublicStage, string> = {
  submission: 'Submitted',
  review: 'Under review',
  feedback: 'Feedback requested',
  approval: 'Decision published',
  award: 'Award recorded',
}

/**
 * T08 applicant case view (spec T08), laid out to Sandra's "ceda view ideas" frame (21 Nov, #100). The
 * applicant's own submitted idea: status, View receipt, the privacy line, the five public stages in a card, the
 * submitted answers with a version picker, the timeline, and the decision once CEDA publishes it (with the
 * award and Next steps, INN-05). Never shows internal notes, scores, unpublished decisions or staff reasons
 * (N4; contract §3).
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
        <Link to="/ideas" className="inline-flex min-h-touch items-center">
          ← My ideas
        </Link>
      </p>
      <header className="flex flex-col gap-4">
        {/* The case summary on the portal's sunrise card (post-freeze polish, ABM 22 Nov). */}
        <div className="relative isolate flex flex-col gap-3 overflow-hidden rounded-[1.5rem] border border-line bg-[linear-gradient(120deg,var(--ceda-sky-start),var(--ceda-band-start))] px-5 pb-6 pt-5 shadow-1 md:flex-row md:items-start md:justify-between md:px-7">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-28 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ceda-gold)_40%,transparent),transparent_66%)]" />
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-amber),var(--ceda-orange),var(--ceda-maroon))]" />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <ReferencePill reference={c.reference} copyable />
              <StatusBadge status={c.status} audience="applicant" context={{ feedbackKind: waiting?.kind }} />
            </div>
            <h1 className="text-[1.75rem] font-semibold leading-tight md:text-[2rem]">{c.title}</h1>
            <p className="text-ink-muted">{c.challenge.title}</p>
          </div>
          {c.version ? (
            <div className="shrink-0">
              <ButtonLink to={`/ideas/${c.id}/receipt?v=${c.version.version_no}`}>View receipt</ButtonLink>
            </div>
          ) : null}
        </div>
        <p className="flex items-center gap-2 rounded-md bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
          <ShieldCheck aria-hidden className="h-4 w-4 shrink-0" />
          Only you and CEDA staff assigned to this case can see your idea.
        </p>
        <div className="rounded-md bg-surface-card p-4 shadow-1">
          <StageTimeline stages={stagesFor({ status: c.status, stages: c.stages })} compact />
        </div>
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

/** Small uppercase label above each answer (Sandra's frame); 14 px, the smallest size the type scale allows. */
const ANSWER_LABEL = 'text-sm font-semibold uppercase tracking-wide text-ink-muted'

/**
 * "Submitted proposal" card with the version picker (frame; INN-01). Earlier versions come from the same
 * `listVersions` read staff use to compare versions; RLS lets the owner read their own case's versions.
 */
function ProposalTab({ c }: { c: MyCase }) {
  const versions = useQuery({ queryKey: ['versions', c.id], queryFn: () => api.versions.listVersions(c.id), enabled: Boolean(c.version) })
  const current = c.version?.version_no ?? 0
  const [chosen, setChosen] = useState(current)
  if (!c.version) return <p className="text-ink-muted">Your submitted answers are not available.</p>

  const list = versions.data ?? []
  const snapshot = chosen === current ? null : (list.find((v) => v.version_no === chosen) ?? null)
  const shown = snapshot
    ? {
        data: snapshot.data,
        files: snapshot.files.map((f) => ({ key: `${f.filename}:${f.sha256 ?? ''}`, filename: f.filename, size: f.size_bytes })),
        note: snapshot.change_note,
      }
    : {
        data: c.version.data,
        files: c.version.files.map((f) => ({ key: f.id, filename: f.filename, size: f.size_bytes })),
        note: list.find((v) => v.version_no === current)?.change_note ?? null,
      }
  const versionLabel = (n: number) => {
    const at = list.find((v) => v.version_no === n)?.submitted_at ?? (n === 1 ? c.submitted_at : undefined)
    return `Version ${n}${n === current ? ' (current)' : ''}${at ? ` · submitted ${formatDateCAT(at)}` : ''}`
  }

  return (
    <section aria-labelledby="proposal-h" className="flex flex-col rounded-md bg-surface-card shadow-1">
      <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="proposal-h" className="text-h3 font-semibold">
            Submitted proposal
          </h2>
          <p className="text-sm text-ink-muted">Read-only view of your submitted idea. It can't be edited unless CEDA asks for a revision.</p>
        </div>
        {list.length > 1 ? (
          <div className="md:w-80">
            <Select
              label="Version"
              value={String(chosen)}
              onChange={(e) => setChosen(Number(e.target.value))}
              options={[...list].reverse().map((v) => ({ value: String(v.version_no), label: versionLabel(v.version_no) }))}
            />
          </div>
        ) : (
          <p className="text-sm font-semibold">{versionLabel(current)}</p>
        )}
      </div>
      <div className="flex flex-col gap-6 p-4">
        {snapshot ? (
          <p className="rounded-md bg-surface-sunken p-3 text-sm">
            You're looking at an earlier version. Your current version is Version {current}.
          </p>
        ) : null}
        {shown.note ? (
          <div className="flex flex-col gap-1">
            <p className={ANSWER_LABEL}>What changed in this version</p>
            <p className="max-w-form whitespace-pre-wrap break-words">{shown.note}</p>
          </div>
        ) : null}
        {c.version.form_schema.sections.map((s) => (
          <section key={s.key} aria-labelledby={`sec-${s.key}`} className="flex flex-col gap-3">
            <h3 id={`sec-${s.key}`} className="text-h3 font-semibold">
              {s.title}
            </h3>
            <dl className="flex flex-col gap-3">
              {s.fields.map((f) => (
                <div key={f.key} className="flex flex-col gap-1">
                  <dt className={ANSWER_LABEL}>{f.label}</dt>
                  <dd className="max-w-form whitespace-pre-wrap break-words">
                    {shown.data[f.key]?.trim() ? shown.data[f.key] : <span className="text-ink-muted">Not answered</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <section aria-labelledby="sec-files" className="flex flex-col gap-2">
          <h3 id="sec-files" className="text-h3 font-semibold">
            Files
          </h3>
          {shown.files.length === 0 ? (
            <p className="text-ink-muted">No files attached.</p>
          ) : (
            <ul className="flex max-w-form flex-col gap-1">
              {shown.files.map((f) => (
                <li key={f.key} className="flex flex-wrap justify-between gap-2">
                  <span className="break-all">{f.filename}</span>
                  <span className="text-sm text-ink-muted">{formatBytes(f.size)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
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
