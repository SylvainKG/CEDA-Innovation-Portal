import { useId, useMemo, useState } from 'react'
import { VersionCompare } from '@/pages/staff/VersionCompare'
import { Link, useParams } from 'react-router-dom'
import { Banner, Button, Dialog, ReferencePill, TextField } from '@/components'
import { ErrorState, LoadingState, NotFoundState } from '@/components/states/States'
import { useDeclare, useReviewQueue, useSaveScorecard, useSubmitScorecard, useVerifyTask, useWorkspace } from '@/features/review/queries'
import type { ReviewActionState } from '@/features/review/queries'
import type { ReviewWorkspace, RubricCriterion, ScoreItem, TaskToVerify } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { formatBytes, formatDateCAT, formatDateTimeCAT } from '@/lib/format'
import { anchorFor, MIN_REASON, weightedScore } from '@/lib/scoring'

/**
 * T09 scorecard (spec T09, REV-03, D-19, D-20), built from the written spec (BCR-003; design review pending).
 * Step 1, the declaration gate: before declaring, the reviewer sees only what identifies the case (the contract
 * adds title and organisation so a conflict can be recognised; proposal text and files stay closed, N10).
 * Step 2: the proposal (read-only, version labelled) beside the scorecard; on phones a Proposal | Scorecard toggle.
 */
export function ScorePage() {
  const { id: proposalId } = useParams()
  const queue = useReviewQueue()
  const row = queue.data?.find((r) => r.proposal_id === proposalId)
  const workspace = useWorkspace(row?.assignment_id)
  const [withdrew, setWithdrew] = useState(false)

  if (withdrew) {
    return (
      <div className="flex max-w-form flex-col gap-4">
        <h1 className="text-h1 font-semibold">Conflict declared</h1>
        <p>You no longer have access to this case. An administrator will assign another reviewer.</p>
        <p>
          <Link to="/staff/reviews">Back to My reviews</Link>
        </p>
      </div>
    )
  }
  if (queue.isPending || (row && workspace.isPending)) return <LoadingState what="the review" />
  if (queue.isError || workspace.isError)
    return <ErrorState level="h1" message="We couldn't load this review." onRetry={() => void (queue.isError ? queue.refetch() : workspace.refetch())} />
  if (!row || !workspace.data) return <NotFoundState home="/staff/reviews" />
  const w = workspace.data

  return (
    <div className="flex flex-col gap-6">
      <p>
        <Link to="/staff/reviews">← My reviews</Link>
      </p>
      <header className="flex flex-col gap-2">
        <div className="flex">
          <ReferencePill reference={w.row.reference} copyable />
        </div>
        <h1 className="text-h1 font-semibold">{w.row.title}</h1>
        <p className="text-ink-muted">
          {w.row.challenge_title}
          {w.row.applicant_organisation ? ` · ${w.row.applicant_organisation}` : ''}
          {w.row.due_at ? ` · due ${formatDateCAT(w.row.due_at)}` : ''}
        </p>
      </header>
      {w.row.my_status === 'declaration_needed' ? (
        <DeclarationGate assignmentId={w.row.assignment_id} onWithdrew={() => setWithdrew(true)} />
      ) : (
        <Scoring w={w} />
      )}
    </div>
  )
}

function ActionBanner({ state, failed }: { state: ReviewActionState<unknown>; failed: string }) {
  if (state.kind === 'refused' && !state.fields) return <Banner kind="error">{state.message ?? failed}</Banner>
  if (state.kind === 'unconfirmed')
    return (
      <Banner kind="warning" title="Not confirmed yet">
        We couldn't confirm this was saved. Check your connection and try again: repeating it is safe.
      </Banner>
    )
  return null
}

/** Step 1 (spec T09): no conflict + confidentiality → proposal opens; conflict → confirm, then withdrawn. */
function DeclarationGate({ assignmentId, onWithdrew }: { assignmentId: string; onWithdrew: () => void }) {
  const declare = useDeclare(assignmentId)
  const [choice, setChoice] = useState<'clear' | 'conflict' | null>(null)
  const [error, setError] = useState<string | undefined>()
  const [confirming, setConfirming] = useState(false)
  const id = useId()

  async function proceed() {
    if (!choice) {
      setError('Choose one option')
      return
    }
    setError(undefined)
    if (choice === 'conflict') {
      setConfirming(true)
      return
    }
    await declare.run({ hasConflict: false, confidentialityAccepted: true })
  }

  async function withdraw() {
    const final = await declare.run({ hasConflict: true, confidentialityAccepted: false })
    if (final.kind === 'done') {
      setConfirming(false)
      onWithdrew()
    }
  }

  return (
    <section aria-labelledby={`${id}-h`} className="flex max-w-form flex-col gap-4 rounded-md bg-surface-card p-6 shadow-1">
      <h2 id={`${id}-h`} className="text-h2 font-semibold">
        Declare before you open the proposal
      </h2>
      <p>The proposal and its files open only after you declare any conflict of interest. This declaration is recorded.</p>
      <ActionBanner state={declare.state} failed="Your declaration was not recorded." />
      <fieldset className="flex flex-col gap-2" aria-describedby={error ? `${id}-err` : undefined}>
        <legend className="sr-only">Your declaration</legend>
        <label className="flex min-h-touch cursor-pointer items-start gap-3 rounded-md border border-line p-3">
          <input type="radio" name={`${id}-d`} className="mt-0.5 h-6 w-6 shrink-0" checked={choice === 'clear'} onChange={() => setChoice('clear')} />
          <span>I have no conflict of interest and will keep this proposal confidential</span>
        </label>
        <label className="flex min-h-touch cursor-pointer items-start gap-3 rounded-md border border-line p-3">
          <input type="radio" name={`${id}-d`} className="mt-0.5 h-6 w-6 shrink-0" checked={choice === 'conflict'} onChange={() => setChoice('conflict')} />
          <span>I have a conflict of interest</span>
        </label>
        {error ? (
          <p id={`${id}-err`} className="text-sm text-error">
            {error}
          </p>
        ) : null}
      </fieldset>
      <div>
        <Button onClick={() => void proceed()} loading={declare.state.kind === 'saving' && !confirming} loadingLabel="Recording…">
          {choice === 'conflict' ? 'Declare conflict and withdraw' : 'Continue to proposal'}
        </Button>
      </div>
      <Dialog
        open={confirming}
        onOpenChange={(open) => {
          if (!open) declare.reset()
          setConfirming(open)
        }}
        title="Declare a conflict and withdraw?"
        consequence="You'll lose access to this case. An administrator will reassign it."
        primaryLabel="Declare conflict and withdraw"
        primaryVariant="destructive"
        onPrimary={() => void withdraw()}
        busy={declare.state.kind === 'saving'}
        audited
      >
        <ActionBanner state={declare.state} failed="Your declaration was not recorded." />
      </Dialog>
    </section>
  )
}

interface Draft {
  score: number | null
  reason: string
}

function initialDrafts(w: ReviewWorkspace): Record<string, Draft> {
  const out: Record<string, Draft> = {}
  for (const c of w.criteria) {
    const item = w.scorecard?.items.find((i) => i.criterion_id === c.id)
    out[c.id] = { score: item?.score ?? null, reason: item?.reason ?? '' }
  }
  return out
}

function Scoring({ w }: { w: ReviewWorkspace }) {
  const [view, setView] = useState<'proposal' | 'scorecard'>('scorecard')
  const submitted = w.scorecard?.status === 'submitted'
  const closed = !submitted && w.row.case_status !== 'in_evaluation'
  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Show" className="flex gap-2 lg:hidden">
        {(['proposal', 'scorecard'] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={cn('min-h-touch flex-1 rounded-md border px-3 font-semibold', view === v ? 'border-brand bg-brand-subtle' : 'border-line-input bg-surface-card')}
          >
            {v === 'proposal' ? 'Proposal' : 'Scorecard'}
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={cn('min-w-0', view === 'scorecard' && 'hidden lg:block')}>
          <ProposalPanel w={w} />
        </div>
        <div className={cn('min-w-0', view === 'proposal' && 'hidden lg:block')}>
          <div className="lg:sticky lg:top-4">
            {submitted ? (
              <SubmittedCard w={w} />
            ) : closed ? (
              <Banner kind="info" title="Scoring is closed for this case">
                The case has moved on, so scores can no longer be added.
              </Banner>
            ) : (
              <ScorecardForm w={w} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProposalPanel({ w }: { w: ReviewWorkspace }) {
  if (!w.proposal) return <p className="text-ink-muted">The proposal is not available.</p>
  const p = w.proposal
  return (
    <section aria-labelledby="proposal-h" className="flex flex-col gap-4">
      <h2 id="proposal-h" className="text-h2 font-semibold">
        Proposal · Version {p.version_no}
      </h2>
      {p.form_schema.sections.map((s) => (
        <div key={s.key} className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
          <h3 className="text-h3 font-semibold">{s.title}</h3>
          <dl className="flex flex-col gap-2">
            {s.fields.map((f) => (
              <div key={f.key}>
                <dt className="text-sm font-semibold text-ink-muted">{f.label}</dt>
                <dd className="whitespace-pre-wrap break-words">{p.data[f.key]?.trim() ? p.data[f.key] : <span className="text-ink-muted">Not answered</span>}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      <div className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
        <h3 className="text-h3 font-semibold">Files</h3>
        {p.files.length === 0 ? (
          <p className="text-ink-muted">No files attached.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {p.files.map((f) => (
              <li key={f.id} className="flex flex-wrap justify-between gap-2">
                <span className="break-all">{f.filename}</span>
                <span className="text-sm text-ink-muted">{formatBytes(f.size_bytes)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function ScorecardForm({ w }: { w: ReviewWorkspace }) {
  const aid = w.row.assignment_id
  const save = useSaveScorecard(aid)
  const submit = useSubmitScorecard(aid)
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => initialDrafts(w))
  const [overall, setOverall] = useState(w.scorecard?.overall_comment ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [savedNote, setSavedNote] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [quorumNote, setQuorumNote] = useState<string | null>(null)
  const id = useId()

  const live = useMemo(
    () =>
      weightedScore(
        w.criteria.flatMap((c) => (drafts[c.id]?.score ? [{ criterion_id: c.id, score: drafts[c.id]!.score! }] : [])),
        w.criteria,
      ),
    [drafts, w.criteria],
  )

  const set = (cid: string, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [cid]: { ...d[cid]!, ...patch } }))

  /** Complete pairs only: the server stores no score without a reason (raised with Stacey). */
  function completeItems(): ScoreItem[] {
    return w.criteria.flatMap((c) => {
      const d = drafts[c.id]!
      return d.score && d.reason.trim() ? [{ criterion_id: c.id, score: d.score, reason: d.reason.trim() }] : []
    })
  }

  async function onSave() {
    setErrors({})
    const items = completeItems()
    const final = await save.run({ items, overallComment: overall })
    if (final.kind === 'done') {
      const pending = w.criteria.filter((c) => drafts[c.id]!.score && !drafts[c.id]!.reason.trim()).map((c) => c.label)
      setSavedNote(
        `Saved ${new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Gaborone', hour: '2-digit', minute: '2-digit' })} CAT.` +
          (pending.length ? ` Not saved yet: ${pending.join(', ')}. Add a reason to save ${pending.length === 1 ? 'its score' : 'their scores'}.` : ''),
      )
    }
    if (final.kind === 'refused' && final.fields) setErrors(final.fields)
  }

  function check(): boolean {
    const found: Record<string, string> = {}
    for (const c of w.criteria) {
      const d = drafts[c.id]!
      if (!d.score) found[c.key] = 'Choose a score from 1 to 5'
      else if ([...d.reason.trim()].length < MIN_REASON) found[c.key] = `Give a reason of at least ${MIN_REASON} characters`
    }
    // INN-02: every roadmap task answered in this version must be verified before submitting.
    for (const t of w.tasks) if (!t.my_result) found[`task:${t.position}`] = 'Verify this task'
    setErrors(found)
    if (Object.keys(found).length) {
      setTimeout(() => document.getElementById(`${id}-errors`)?.focus(), 0)
      return false
    }
    return true
  }

  async function onSubmit() {
    const final = await submit.run({ items: completeItems(), overallComment: overall })
    if (final.kind === 'done') {
      setConfirming(false)
      if (final.data?.quorum_reached) setQuorumNote('Both reviews are in. The case now moves to the adjudicator.')
    } else if (final.kind === 'refused') {
      setConfirming(false)
      if (final.fields) setErrors(final.fields)
    }
  }

  const errorList = Object.entries(errors)
  return (
    <section aria-labelledby={`${id}-h`} className="flex flex-col gap-4 rounded-md bg-surface-card p-4 shadow-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${id}-h`} className="text-h2 font-semibold">
          Your scorecard
        </h2>
        <p className="font-semibold" aria-live="polite">
          Weighted score: {live === null ? '— (score every criterion)' : `${live.toFixed(2)} of 5`}
        </p>
      </div>
      <p className="text-sm text-ink-muted">Other reviewers' scores appear after you submit yours.</p>
      {quorumNote ? <Banner kind="success">{quorumNote}</Banner> : null}
      {savedNote ? <Banner kind="info">{savedNote}</Banner> : null}
      <ActionBanner state={save.state.kind !== 'idle' ? save.state : submit.state} failed="Your scores were not saved." />
      {errorList.length ? (
        <div id={`${id}-errors`} tabIndex={-1} role="alert" className="flex flex-col gap-2 rounded-md bg-error-subtle p-4 outline-none">
          <h3 className="font-semibold">Some scores need attention</h3>
          <ul className="list-disc pl-6">
            {errorList.map(([key, msg]) => {
              const c = w.criteria.find((x) => x.key === key)
              const task = key.startsWith('task:') ? key.split(':')[1] : null
              return (
                <li key={key}>
                  <a href={task ? `#${id}-task-${task}` : `#${id}-${key}`}>{c ? `${c.label}: ${msg}` : task ? `Task ${task}: ${msg}` : msg}</a>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {w.change_note ? (
        <div className="rounded-md border border-line p-3">
          <p className="text-sm font-semibold">What changed in version {w.proposal?.version_no}</p>
          <p className="whitespace-pre-wrap break-words">{w.change_note}</p>
        </div>
      ) : null}

      {w.proposal && w.proposal.version_no >= 2 ? (
        <details className="rounded-md border border-line p-3">
          <summary className="min-h-touch cursor-pointer font-semibold">Compare with version {w.proposal.version_no - 1}</summary>
          <div className="mt-3">
            <VersionCompare proposalId={w.row.proposal_id} schema={w.proposal.form_schema} />
          </div>
        </details>
      ) : null}

      {w.tasks.length ? (
        <section aria-labelledby={`${id}-verify`} className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id={`${id}-verify`} className="text-h3 font-semibold">
              Roadmap verification
            </h3>
            <p className="font-semibold" aria-live="polite">
              {w.tasks.filter((t) => t.my_result).length} of {w.tasks.length} tasks verified
            </p>
          </div>
          <p className="text-sm text-ink-muted">Check each task against version {w.proposal?.version_no}. You can change a check until you submit your scorecard.</p>
          {w.tasks.map((t) => (
            <TaskCheck key={t.task_id} base={id} assignmentId={w.row.assignment_id} t={t} error={errors[`task:${t.position}`]} />
          ))}
        </section>
      ) : null}

      {w.criteria.map((c) => (
        <CriterionInput key={c.id} base={id} c={c} draft={drafts[c.id]!} error={errors[c.key]} onChange={(patch) => set(c.id, patch)} />
      ))}

      <TextField
        multiline
        rows={3}
        id={`${id}-overall`}
        label="Overall comment (optional)"
        maxLength={4000}
        value={overall}
        onChange={(e) => setOverall(e.target.value)}
        error={errors.overall_comment}
      />
      <div className="flex flex-col gap-3 md:flex-row">
        <Button variant="secondary" onClick={() => void onSave()} loading={save.state.kind === 'saving'} loadingLabel="Saving…">
          Save draft
        </Button>
        <Button
          onClick={() => {
            if (check()) setConfirming(true)
          }}
        >
          Submit scorecard
        </Button>
      </div>
      <Dialog
        open={confirming}
        onOpenChange={(open) => {
          if (!open) submit.reset()
          setConfirming(open)
        }}
        title={`Submit your scorecard for ${w.row.reference}?`}
        consequence="You can't change scores after submitting."
        primaryLabel="Submit scorecard"
        onPrimary={() => void onSubmit()}
        busy={submit.state.kind === 'saving'}
        audited
      >
        <p>Weighted score: {live === null ? '—' : `${live.toFixed(2)} of 5`}</p>
        {submit.state.kind === 'unconfirmed' ? <ActionBanner state={submit.state} failed="" /> : null}
      </Dialog>
    </section>
  )
}

/** One TaskVerification control (spec T09 verification block): Verified, or Not verified with a note. */
function TaskCheck({ base, assignmentId, t, error }: { base: string; assignmentId: string; t: TaskToVerify; error?: string }) {
  const verify = useVerifyTask(assignmentId)
  const [result, setResult] = useState<'verified' | 'not_verified' | null>(t.my_result)
  const [note, setNote] = useState(t.my_note ?? '')
  const [noteError, setNoteError] = useState<string | undefined>()
  const changed = result !== t.my_result || (result === 'not_verified' && note.trim() !== (t.my_note ?? ''))

  async function save() {
    if (!result) return
    if (result === 'not_verified' && !note.trim()) {
      setNoteError('Explain why the task is not verified')
      return
    }
    setNoteError(undefined)
    await verify.run({ taskId: t.task_id, result, note: result === 'not_verified' ? note.trim() : '' })
  }

  return (
    <fieldset id={`${base}-task-${t.position}`} className="flex flex-col gap-2 rounded-md border border-line p-3" aria-describedby={error ? `${base}-task-${t.position}-err` : undefined}>
      <legend className="font-semibold">
        Task {t.position}: {t.text}
      </legend>
      <p className="text-sm">
        <span className="font-semibold">Applicant: {t.applicant_status === 'addressed' ? 'Addressed' : t.applicant_status === 'not_addressed' ? 'Not addressed' : 'No answer'}</span>
        {t.applicant_explanation ? ` · ${t.applicant_explanation}` : ''}
      </p>
      <div className="flex flex-wrap gap-4">
        {(['verified', 'not_verified'] as const).map((r) => (
          <label key={r} className="flex min-h-touch items-center gap-2">
            <input type="radio" className="h-5 w-5" name={`${base}-t${t.position}-check`} checked={result === r} onChange={() => setResult(r)} />
            {r === 'verified' ? 'Verified' : 'Not verified'}
          </label>
        ))}
      </div>
      {result === 'not_verified' ? (
        <TextField
          multiline
          rows={2}
          id={`${base}-t${t.position}-note`}
          label="Why isn't it verified?"
          required
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          error={noteError ?? (verify.state.kind === 'refused' ? verify.state.fields?.note : undefined)}
        />
      ) : null}
      {verify.state.kind === 'refused' && !verify.state.fields ? <Banner kind="error">{verify.state.message ?? 'Your check was not saved.'}</Banner> : null}
      {verify.state.kind === 'unconfirmed' ? <p className="text-sm text-warning">Not confirmed yet. Try again: saving the same check twice is safe.</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" disabled={!result || !changed} disabledReason={!result ? 'Choose Verified or Not verified' : 'Saved'} loading={verify.state.kind === 'saving'} loadingLabel="Saving…" onClick={() => void save()}>
          Save check
        </Button>
        {t.my_result && !changed ? <span className="text-sm text-ink-muted">Saved: {t.my_result === 'verified' ? 'Verified' : 'Not verified'}</span> : null}
      </div>
      {error ? (
        <p id={`${base}-task-${t.position}-err`} className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

function CriterionInput({
  base,
  c,
  draft,
  error,
  onChange,
}: {
  base: string
  c: RubricCriterion
  draft: Draft
  error?: string
  onChange: (patch: Partial<Draft>) => void
}) {
  const anchor = anchorFor(c, draft.score)
  return (
    <fieldset id={`${base}-${c.key}`} className="flex flex-col gap-2 border-t border-line pt-4" aria-describedby={error ? `${base}-${c.key}-err` : undefined}>
      <legend className="flex w-full flex-wrap items-baseline justify-between gap-2 font-semibold">
        <span>{c.label}</span>
        <span className="text-sm font-normal text-ink-muted">Weight {c.weight}%</span>
      </legend>
      {c.guidance ? <p className="text-sm text-ink-muted">{c.guidance}</p> : null}
      <div role="radiogroup" aria-label={`${c.label} score`} className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className={cn(
              'flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-md border px-3 font-semibold focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2',
              draft.score === n ? 'border-brand bg-brand-subtle' : 'border-line-input',
            )}
          >
            <input type="radio" className="sr-only" name={`${base}-${c.key}-score`} checked={draft.score === n} onChange={() => onChange({ score: n })} />
            {n}
          </label>
        ))}
      </div>
      <p className="text-sm" aria-live="polite">
        {draft.score ? `Selected: ${draft.score}${anchor ? ` · ${anchor}` : ''}` : <span className="text-ink-muted">No score yet</span>}
      </p>
      {Object.keys(c.anchors).length ? (
        <p className="text-sm text-ink-muted">{Object.entries(c.anchors).map(([k, v]) => `${k} = ${v}`).join(' · ')}</p>
      ) : null}
      <TextField
        multiline
        rows={2}
        id={`${base}-${c.key}-reason`}
        label={`Reason for your ${c.label} score`}
        help={`At least ${MIN_REASON} characters.`}
        maxLength={4000}
        value={draft.reason}
        onChange={(e) => onChange({ reason: e.target.value })}
      />
      {error ? (
        <p id={`${base}-${c.key}-err`} className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

function SubmittedCard({ w }: { w: ReviewWorkspace }) {
  const card = w.scorecard!
  const score = weightedScore(card.items, w.criteria)
  return (
    <section aria-labelledby="submitted-h" className="flex flex-col gap-4 rounded-md bg-surface-card p-4 shadow-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="submitted-h" className="text-h2 font-semibold">
          Your scorecard
        </h2>
        <p className="font-semibold">Weighted score: {score === null ? '—' : `${score.toFixed(2)} of 5`}</p>
      </div>
      <p className="text-sm text-ink-muted">Submitted {card.submitted_at ? formatDateTimeCAT(card.submitted_at) : ''} · read only</p>
      <dl className="flex flex-col gap-3">
        {w.criteria.map((c) => {
          const item = card.items.find((i) => i.criterion_id === c.id)
          return (
            <div key={c.id} className="flex flex-col gap-1 border-t border-line pt-3">
              <dt className="flex flex-wrap justify-between gap-2 font-semibold">
                <span>{c.label}</span>
                <span>{item ? `${item.score} of 5` : '—'}</span>
              </dt>
              <dd className="whitespace-pre-wrap break-words text-sm">{item?.reason}</dd>
            </div>
          )
        })}
      </dl>
      {card.overall_comment ? <p className="whitespace-pre-wrap break-words">{card.overall_comment}</p> : null}
      <p>
        <Link to={`/staff/cases/${w.row.proposal_id}/panel`}>Compare with the other reviews</Link>
      </p>
    </section>
  )
}
