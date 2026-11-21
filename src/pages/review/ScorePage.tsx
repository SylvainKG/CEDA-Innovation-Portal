import { useId, useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { VersionCompare } from '@/pages/staff/VersionCompare'
import { Link, useParams } from 'react-router-dom'
import { Banner, Button, Dialog, ReferencePill, StatusBadge, TextField, ErrorSummary } from '@/components'
import { ErrorState, LoadingState, NotFoundState } from '@/components/states/States'
import { useDeclare, useReviewQueue, useSaveScorecard, useSubmitScorecard, useVerifyTask, useWorkspace } from '@/features/review/queries'
import type { ReviewActionState } from '@/features/review/queries'
import type { AttachmentInfo, ReviewQueueRow, ReviewWorkspace, RubricCriterion, ScoreItem, TaskToVerify } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { formatBytes, formatDateTimeCAT } from '@/lib/format'
import { anchorFor, MIN_REASON, weightedScore } from '@/lib/scoring'

/**
 * T09 scorecard (spec T09, REV-03, D-19, D-20), laid out to Sandra's 21 Nov frames ("ceda pre review",
 * "ceda scoreboard" in `Figma pdf/`).
 * Step 1, the declaration gate: before declaring, the reviewer sees only what identifies the case (the contract
 * adds title and organisation so a conflict can be recognised; proposal text and files stay closed, N10).
 * Step 2: the proposal (read-only, version labelled) on the left, the scorecard pinned on the right; on phones a
 * Proposal | Scorecard toggle.
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

  if (w.row.my_status === 'declaration_needed') {
    return (
      <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-4">
        <p>
          <BackLink />
        </p>
        <DeclarationGate row={w.row} onWithdrew={() => setWithdrew(true)} />
      </div>
    )
  }
  return <Scoring w={w} />
}

function BackLink() {
  return (
    <Link to="/staff/reviews" className="inline-flex min-h-touch items-center text-sm">
      ← My reviews
    </Link>
  )
}

/** Small capitals above a value (Sandra's frames: CASE, CHALLENGE, DUE). */
const EYEBROW = 'text-xs font-semibold uppercase tracking-wide text-ink-muted'

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
function DeclarationGate({ row, onWithdrew }: { row: ReviewQueueRow; onWithdrew: () => void }) {
  const declare = useDeclare(row.assignment_id)
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

  const option = (selected: boolean) =>
    cn(
      'flex min-h-touch cursor-pointer items-start gap-3 rounded-md border p-4 focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-2',
      selected ? 'border-brand bg-brand-subtle' : 'border-line-input bg-surface-card',
    )

  return (
    <section aria-labelledby={`${id}-h`} className="flex flex-col gap-5 rounded-md bg-surface-card p-5 shadow-1 sm:p-6">
      {/* What identifies the case, so a conflict can be recognised; nothing of the proposal itself (N10). */}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-b border-line pb-4 md:grid-cols-3">
        <div>
          <dt className={EYEBROW}>Case</dt>
          <dd>{row.reference}</dd>
        </div>
        <div>
          <dt className={EYEBROW}>Challenge</dt>
          <dd>{row.challenge_title}</dd>
        </div>
        <div>
          <dt className={EYEBROW}>Due</dt>
          <dd>{row.due_at ? formatDateTimeCAT(row.due_at) : 'No due date'}</dd>
        </div>
        <div className="md:col-span-2">
          <dt className={EYEBROW}>Proposal</dt>
          <dd className="break-words">{row.title}</dd>
        </div>
        {row.applicant_organisation ? (
          <div>
            <dt className={EYEBROW}>Organisation</dt>
            <dd className="break-words">{row.applicant_organisation}</dd>
          </div>
        ) : null}
      </dl>
      <div className="flex flex-col gap-2">
        <h1 id={`${id}-h`} className="text-h1 font-semibold">
          Before you open this proposal
        </h1>
        <p className="text-ink-muted">
          The proposal and its files open only after you declare any conflict of interest. Your declaration, and your promise to keep the proposal
          confidential, are recorded in the audit log.
        </p>
      </div>
      <ActionBanner state={declare.state} failed="Your declaration was not recorded." />
      <fieldset className="flex flex-col gap-3" aria-describedby={error ? `${id}-err` : undefined}>
        <legend className="sr-only">Your declaration</legend>
        <label className={option(choice === 'clear')}>
          <input type="radio" name={`${id}-d`} className="mt-0.5 h-5 w-5 shrink-0" checked={choice === 'clear'} onChange={() => setChoice('clear')} />
          <span className="font-semibold">I have no conflict of interest and will keep this proposal confidential</span>
        </label>
        <label className={option(choice === 'conflict')}>
          <input
            type="radio"
            name={`${id}-d`}
            className="mt-0.5 h-5 w-5 shrink-0"
            aria-labelledby={`${id}-c`}
            aria-describedby={`${id}-c-help`}
            checked={choice === 'conflict'}
            onChange={() => setChoice('conflict')}
          />
          <span className="flex flex-col gap-1">
            <span id={`${id}-c`} className="font-semibold">
              I have a conflict
            </span>
            <span id={`${id}-c-help`} className="text-sm text-ink-muted">
              You will be withdrawn from this assignment.
            </span>
          </span>
        </label>
        {error ? (
          <p id={`${id}-err`} className="text-sm text-error">
            {error}
          </p>
        ) : null}
      </fieldset>
      <div className="flex justify-end">
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <BackLink />
            <ReferencePill reference={w.row.reference} copyable />
          </div>
          <h1 className="text-h1 font-semibold">{w.row.title}</h1>
          <p className="text-ink-muted">
            {w.row.challenge_title}
            {w.row.applicant_organisation ? ` · ${w.row.applicant_organisation}` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
            <StatusBadge status={w.row.case_status} audience="staff" />
            {w.proposal ? <span>Version {w.proposal.version_no}</span> : null}
          </div>
        </header>
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
        <div className={cn(view === 'scorecard' && 'hidden lg:block')}>
          <ProposalPanel w={w} />
        </div>
      </div>
      <div className={cn('min-w-0', view === 'proposal' && 'hidden lg:block')}>
        {/* Pinned beside the proposal on wide screens, with its own scroll (Sandra's scoreboard frame). */}
        <div className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
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
  )
}

/** "application/pdf" → "PDF"; otherwise the file's extension. */
function fileKind(f: AttachmentInfo): string {
  if (f.mime === 'application/pdf') return 'PDF'
  const ext = f.filename.includes('.') ? f.filename.split('.').pop() : ''
  return ext ? ext.toUpperCase() : 'File'
}

function ProposalPanel({ w }: { w: ReviewWorkspace }) {
  if (!w.proposal) return <p className="text-ink-muted">The proposal is not available.</p>
  const p = w.proposal
  const answer = (key: string) => (p.data[key]?.trim() ? p.data[key] : <span className="text-ink-muted">Not answered</span>)
  return (
    <section aria-labelledby="proposal-h" className="flex flex-col gap-4">
      <h2 id="proposal-h" className="sr-only">
        Proposal · Version {p.version_no}
      </h2>
      {/* One card per form section; a section with a single answer shows just that answer under its title. */}
      {p.form_schema.sections.map((s) => (
        <div key={s.key} className="flex flex-col gap-3 rounded-md bg-surface-card p-5 shadow-1">
          <h3 className="text-h3 font-semibold">{s.title}</h3>
          {s.fields.length === 1 && s.fields[0]!.label === s.title ? (
            <p className="whitespace-pre-wrap break-words">{answer(s.fields[0]!.key)}</p>
          ) : (
            <dl className="flex flex-col gap-3">
              {s.fields.map((f) => (
                <div key={f.key}>
                  <dt className="text-sm font-semibold text-ink-muted">{f.label}</dt>
                  <dd className="whitespace-pre-wrap break-words">{answer(f.key)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ))}
      <div className="flex flex-col gap-3 rounded-md bg-surface-card p-5 shadow-1">
        <h3 className="text-h3 font-semibold">Attachments</h3>
        {p.files.length === 0 ? (
          <p className="text-ink-muted">No files attached.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {p.files.map((f) => (
              <li key={f.id} className="flex items-start gap-3">
                <FileText aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />
                <span className="flex min-w-0 flex-col">
                  <span className="break-all font-semibold">{f.filename}</span>
                  <span className="text-sm text-ink-muted">
                    {fileKind(f)} · {formatBytes(f.size_bytes)}
                  </span>
                </span>
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
  const [saved, setSaved] = useState<{ at: string; pending: string[] } | null>(null)
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
      setSaved({
        at: new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Gaborone', hour: '2-digit', minute: '2-digit' }),
        pending: w.criteria.filter((c) => drafts[c.id]!.score && !drafts[c.id]!.reason.trim()).map((c) => c.label),
      })
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
    <section aria-labelledby={`${id}-h`} className="flex flex-col gap-5 rounded-md bg-surface-card p-4 shadow-1 sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-h`} className="text-h2 font-semibold">
          Your scorecard{w.proposal ? ` · Version ${w.proposal.version_no}` : ''}
        </h2>
        {w.row.due_at ? <p className="text-sm text-ink-muted">Due {formatDateTimeCAT(w.row.due_at)}</p> : null}
        {saved ? (
          <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
            <span aria-hidden className="h-2 w-2 rounded-full bg-success" />
            Saved {saved.at} CAT
          </p>
        ) : null}
      </div>
      {quorumNote ? <Banner kind="success">{quorumNote}</Banner> : null}
      {saved?.pending.length ? (
        <Banner kind="warning">
          Not saved yet: {saved.pending.join(', ')}. Add a reason to save {saved.pending.length === 1 ? 'its score' : 'their scores'}.
        </Banner>
      ) : null}
      <ActionBanner state={save.state.kind !== 'idle' ? save.state : submit.state} failed="Your scores were not saved." />
      {errorList.length ? (
        <ErrorSummary id={`${id}-errors`} title="Some scores need attention" level={3}>
          <ul>
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
        </ErrorSummary>
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

      <div className="border-t border-line pt-4">
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
      </div>
      <WeightedScore base={id} live={live} criteria={w.criteria} drafts={drafts} />
      <p className="rounded-md bg-surface-sunken p-3 text-sm text-ink-muted">Other reviewers' scores appear after you submit yours.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
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

/** The dark weighted-score card (Sandra's scoreboard frame), with how it's worked out from the rubric's weights. */
function WeightedScore({ base, live, criteria, drafts }: { base: string; live: number | null; criteria: RubricCriterion[]; drafts: Record<string, Draft> }) {
  return (
    <div role="group" aria-labelledby={`${base}-ws`} className="flex flex-col gap-1 rounded-md bg-ink p-4 text-white">
      <p id={`${base}-ws`} className="text-sm">
        Weighted score
      </p>
      <p aria-live="polite">
        <span className="text-3xl font-semibold">{live === null ? '—' : live.toFixed(2)}</span> <span className="font-semibold">out of 5</span>
      </p>
      {live === null ? <p className="text-sm">Score every criterion to see it.</p> : null}
      <details className="text-sm">
        <summary className="inline-flex min-h-touch cursor-pointer items-center rounded underline outline-none focus-visible:ring-2 focus-visible:ring-white">
          How this is calculated
        </summary>
        <p className="mt-1">Each score is multiplied by its criterion's weight, and the results are added up:</p>
        <ul className="mt-1 list-disc pl-5">
          {criteria.map((c) => (
            <li key={c.id}>
              {c.label}: {drafts[c.id]?.score ?? '—'} × {c.weight}%
            </li>
          ))}
        </ul>
      </details>
    </div>
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

/** One rubric criterion: name and weight, guidance, a joined 1–5 scale, the chosen anchor, and the reason. */
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
      <legend className="flex w-full flex-wrap items-baseline justify-between gap-2 text-h3 font-semibold text-brand-text">
        <span>{c.label}</span>
        <span className="text-sm">
          {c.weight}%<span className="sr-only"> of the weighted score</span>
        </span>
      </legend>
      {c.guidance ? <p className="text-sm text-ink-muted">{c.guidance}</p> : null}
      <div role="radiogroup" aria-label={`${c.label} score`} className="grid grid-cols-5 overflow-hidden rounded-md border border-line-input">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className={cn(
              'flex min-h-touch cursor-pointer items-center justify-center border-l border-line-input font-semibold first:border-l-0 focus-within:ring-2 focus-within:ring-inset focus-within:ring-focus',
              draft.score === n ? 'bg-brand text-brand-on' : 'bg-surface-card hover:bg-brand-subtle',
            )}
          >
            <input type="radio" className="sr-only" name={`${base}-${c.key}-score`} checked={draft.score === n} onChange={() => onChange({ score: n })} />
            {n}
          </label>
        ))}
      </div>
      <p className="text-sm font-semibold text-brand-text" aria-live="polite">
        {draft.score ? (anchor ?? `Score ${draft.score} of 5`) : <span className="font-normal text-ink-muted">No score yet</span>}
      </p>
      <TextField
        multiline
        rows={3}
        id={`${base}-${c.key}-reason`}
        label="Reason"
        aria-label={`Reason for your ${c.label} score`}
        required
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
    <section aria-labelledby="submitted-h" className="flex flex-col gap-4 rounded-md bg-surface-card p-4 shadow-1 sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 id="submitted-h" className="text-h2 font-semibold">
          Your scorecard{w.proposal ? ` · Version ${w.proposal.version_no}` : ''}
        </h2>
        <p className="text-sm text-ink-muted">Submitted {card.submitted_at ? formatDateTimeCAT(card.submitted_at) : ''} · read only</p>
      </div>
      <div role="group" aria-labelledby="submitted-ws" className="flex flex-col gap-1 rounded-md bg-ink p-4 text-white">
        <p id="submitted-ws" className="text-sm">
          Weighted score
        </p>
        <p>
          <span className="text-3xl font-semibold">{score === null ? '—' : score.toFixed(2)}</span> <span className="font-semibold">out of 5</span>
        </p>
      </div>
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
