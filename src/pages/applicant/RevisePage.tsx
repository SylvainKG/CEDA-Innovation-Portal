import { useEffect, useId, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Banner, Button, DeclarationPanel, ErrorSummary, Select, TextField } from '@/components'
import { ErrorState, LoadingState, NotFoundState, UnknownOutcomeBanner } from '@/components/states/States'
import { useRoadmap } from '@/features/feedback/queries'
import { useSubmitRevision } from '@/features/feedback/useSubmitRevision'
import { useDeclaration } from '@/features/submission/queries'
import { api } from '@/lib/api'
import type { DraftData, FeedbackRequest, FormField, MyCase } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { formatDateTimeCAT } from '@/lib/format'

/**
 * T04 V2 revise mode (spec T04; contract §4.4; INN-02), laid out to Sandra's 21 Nov frames: "REVISE YOUR IDEA" over
 * the idea's title; "CEDA's message" with the deadline; "Your roadmap" (each task: Addressed / Not addressed and an
 * explanation, "n of m tasks answered"); then two steps: the Version N form, and "Review changes" ("What changed?",
 * the declaration (decision #3) and "Submit Version N", disabled with the reason until every task is answered).
 * Files carry forward from the current version (uploading replacements in V2 mode is not built yet).
 */
type Answer = { status: 'addressed' | 'not_addressed' | null; explanation: string }

export function RevisePage() {
  const { id } = useParams()
  const kase = useQuery({ queryKey: ['my-case', id], queryFn: () => api.submission.getMyCase(id as string), enabled: Boolean(id) })
  const roadmap = useRoadmap(id)
  if (kase.isPending || roadmap.isPending) return <LoadingState what="your revision" />
  if (kase.isError || roadmap.isError) return <ErrorState level="h1" message="We couldn't load your revision." onRetry={() => void (kase.refetch(), roadmap.refetch())} />
  if (!kase.data) return <NotFoundState home="/ideas" />
  const request = (roadmap.data ?? []).find((r) => r.kind === 'revision' && r.status === 'open')
  if (!request || kase.data.status !== 'action_required' || !kase.data.version) {
    return (
      <div className="flex max-w-form flex-col gap-4">
        <h1 className="text-h1 font-semibold">No revision is waiting</h1>
        <p>There's no open revision request for this idea.</p>
        <p>
          <Link to={`/ideas/${kase.data.id}`}>Back to your idea</Link>
        </p>
      </div>
    )
  }
  return <ReviseForm c={kase.data} request={request} />
}

function ReviseForm({ c, request }: { c: MyCase; request: FeedbackRequest }) {
  const version = c.version!
  const declaration = useDeclaration()
  const revision = useSubmitRevision(c.id, request.feedback_request_id)
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => Object.fromEntries(request.tasks.map((t) => [t.task_id, { status: null, explanation: '' }])))
  const [data, setData] = useState<DraftData>(() => ({ ...version.data }))
  const [changeNote, setChangeNote] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  /** Step 1: roadmap and the version form. Step 2: "Review changes" (what changed, declaration, submit). */
  const [step, setStep] = useState<1 | 2>(1)
  const id = useId()
  const nextVersion = version.version_no + 1

  const answered = request.tasks.filter((t) => answers[t.task_id]?.status && answers[t.task_id]!.explanation.trim()).length
  const allAnswered = answered === request.tasks.length
  const edited = useMemo(() => Object.keys({ ...data, ...version.data }).some((k) => (data[k] ?? '') !== (version.data[k] ?? '')), [data, version.data])
  const formKeys = useMemo(() => new Set(version.form_schema.sections.flatMap((sec) => sec.fields.map((f) => f.key))), [version.form_schema])

  const s = revision.state
  // A field the server refused lives on step 1: go back there so its message is visible.
  useEffect(() => {
    if (s.kind === 'refused' && Object.keys(s.fields ?? {}).some((k) => formKeys.has(k))) setStep(1)
  }, [s, formKeys])
  if (s.kind === 'submitted') return <Navigate to={`/ideas/${c.id}/receipt?v=${s.receipt.version_no}`} replace />

  function goTo(next: 1 | 2) {
    setStep(next)
    setTimeout(() => document.getElementById(`${id}-step`)?.focus(), 0)
  }

  async function submit() {
    const found: Record<string, string> = {}
    if (!changeNote.trim()) found.change_note = 'Say what changed'
    if (!accepted) found.declaration = 'Accept the declaration'
    request.tasks.forEach((t) => {
      const a = answers[t.task_id]!
      if (!a.status) found[`task:${t.position}`] = 'Mark this task Addressed or Not addressed'
      else if (!a.explanation.trim()) found[`task:${t.position}`] = 'Explain what you did'
    })
    setErrors(found)
    if (Object.keys(found).length || !declaration.data) {
      setTimeout(() => document.getElementById(`${id}-errors`)?.focus(), 0)
      return
    }
    await revision.submit({
      data: edited ? data : null,
      changeNote: changeNote.trim(),
      taskResponses: request.tasks.map((t) => ({ task_id: t.task_id, status: answers[t.task_id]!.status!, explanation: answers[t.task_id]!.explanation.trim() })),
      declarationVersion: declaration.data.version,
    })
  }

  const serverFields = s.kind === 'refused' ? (s.fields ?? {}) : {}
  const shown = { ...serverFields, ...errors }
  const errorList = Object.entries(shown)
  const taskLabel = (key: string) => {
    const n = Number(key.split(':')[1])
    return request.tasks.find((t) => t.position === n) ? `Task ${n}` : key
  }
  const missing = `Answer all ${request.tasks.length} roadmap tasks to submit (${answered} of ${request.tasks.length} answered).`

  return (
    <div className="flex flex-col gap-6">
      <p>
        <Link to={`/ideas/${c.id}`}>← Back to your idea</Link>
      </p>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-text">Revise your idea</p>
          <h1 className="break-words text-h1 font-semibold">{c.title}</h1>
          <p className="text-sm text-ink-muted">
            Version {nextVersion} · pre-filled from Version {version.version_no} · <span className="font-mono">{c.reference}</span>
          </p>
        </div>
      </header>

      <section aria-labelledby={`${id}-message`} className="flex items-start gap-3 rounded-md border border-brand-accent bg-brand-accent-subtle p-4">
        <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-message`} className="font-semibold">
            CEDA's message
          </h2>
          <p className="whitespace-pre-wrap">{request.message}</p>
          <p className="text-sm font-semibold text-brand-text">Respond by {formatDateTimeCAT(request.due_at)}</p>
        </div>
      </section>

      {s.kind === 'unknown' ? <UnknownOutcomeBanner what="Your revision" checking={s.checking} onCheckStatus={() => void revision.checkStatus()} /> : null}
      {s.kind === 'refused' && !s.fields ? <Banner kind="error">{s.message ?? 'Your revision was not submitted.'}</Banner> : null}
      {errorList.length ? (
        <ErrorSummary id={`${id}-errors`} title="Your revision wasn't submitted yet">
          {s.kind === 'refused' && s.message ? <p>{s.message}</p> : null}
          <ul>
            {errorList.map(([key, msg]) => (
              <li key={key}>
                <a
                  href={`#${id}-${key.replace(':', '-')}`}
                  onClick={() => {
                    if (formKeys.has(key)) setStep(1)
                    else if (key === 'change_note' || key === 'declaration') setStep(2)
                  }}
                >
                  {key.startsWith('task:') ? `${taskLabel(key)}: ${msg}` : key === 'change_note' ? `What changed: ${msg}` : key === 'declaration' ? `Declaration: ${msg}` : msg}
                </a>
              </li>
            ))}
          </ul>
        </ErrorSummary>
      ) : null}

      {request.tasks.length ? (
        <section aria-labelledby={`${id}-roadmap`} className="flex flex-col rounded-md bg-surface-card shadow-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line p-4">
            <div>
              <h2 id={`${id}-roadmap`} className="text-h2 font-semibold">
                Your roadmap
              </h2>
              <p className="text-sm text-ink-muted">Explain how you handled every feedback task.</p>
            </div>
            <p className="text-sm font-semibold" aria-live="polite">
              {answered} of {request.tasks.length} tasks answered
            </p>
          </div>
          {request.tasks.map((t) => {
            const a = answers[t.task_id]!
            const key = `task:${t.position}`
            const set = (patch: Partial<Answer>) => setAnswers((all) => ({ ...all, [t.task_id]: { ...all[t.task_id]!, ...patch } }))
            return (
              <fieldset key={t.task_id} id={`${id}-task-${t.position}`} className="flex gap-3 border-b border-line p-4 last:border-b-0">
                <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-sm font-semibold text-brand-text">
                  {t.position}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <legend className="sr-only">
                    Task {t.position}: {t.text}
                  </legend>
                  <p aria-hidden className="font-semibold">
                    {t.text}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['addressed', 'not_addressed'] as const).map((st) => (
                      <label
                        key={st}
                        className={cn(
                          'flex min-h-touch cursor-pointer items-center gap-2 rounded-md border px-3 text-sm',
                          a.status === st ? 'border-brand bg-brand-subtle font-semibold' : 'border-line-input bg-surface-card',
                        )}
                      >
                        <input type="radio" className="h-5 w-5 accent-[var(--brand-primary)]" name={`${id}-t${t.position}`} checked={a.status === st} onChange={() => set({ status: st })} />
                        {st === 'addressed' ? 'Addressed' : 'Not addressed'}
                      </label>
                    ))}
                  </div>
                  <TextField
                    multiline
                    rows={3}
                    id={`${id}-t${t.position}-expl`}
                    label="Explanation"
                    required
                    help={a.status === 'not_addressed' ? 'Say why this task is not addressed yet.' : 'Say what you changed for this task.'}
                    maxLength={500}
                    value={a.explanation}
                    onChange={(e) => set({ explanation: e.target.value })}
                    error={shown[key]}
                  />
                </div>
              </fieldset>
            )
          })}
        </section>
      ) : null}

      {step === 1 ? (
        <section aria-labelledby={`${id}-step`} className="mx-auto flex w-full max-w-form flex-col rounded-md bg-surface-card shadow-1">
          <div className="border-b border-line p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-text">Version {nextVersion}</p>
            <h2 id={`${id}-step`} tabIndex={-1} className="text-h2 font-semibold outline-none">
              Proposal form
            </h2>
            <p className="text-sm text-ink-muted">Your Version {version.version_no} answers are pre-filled. Change what the request asks for. Your files carry forward.</p>
          </div>
          <div className="flex flex-col gap-4 p-4">
            {version.form_schema.sections.map((sec) => (
              <fieldset key={sec.key} className="flex flex-col gap-3">
                <legend className="mb-1 text-h3 font-semibold">{sec.title}</legend>
                {sec.fields.map((f) => (
                  <FieldInput key={f.key} base={id} f={f} value={data[f.key] ?? ''} error={shown[f.key]} onChange={(v) => setData((d) => ({ ...d, [f.key]: v }))} />
                ))}
              </fieldset>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-3 border-t border-line p-4">
            <Button onClick={() => goTo(2)}>Review changes</Button>
          </div>
        </section>
      ) : (
        <section aria-labelledby={`${id}-step`} className="mx-auto flex w-full max-w-form flex-col rounded-md bg-surface-card shadow-1">
          <div className="border-b border-line p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-text">Version {nextVersion}</p>
            <h2 id={`${id}-step`} tabIndex={-1} className="text-h2 font-semibold outline-none">
              Review changes
            </h2>
            <p className="text-sm text-ink-muted">Check your roadmap and describe what changed.</p>
          </div>
          <div className="flex flex-col gap-4 p-4">
            <p className={cn('flex items-center gap-2 rounded-md p-3 text-sm font-semibold', allAnswered ? 'bg-success-subtle' : 'bg-surface-sunken')}>
              {allAnswered ? <CheckCircle2 aria-hidden className="h-5 w-5 text-success" /> : <AlertTriangle aria-hidden className="h-5 w-5" />}
              {answered} of {request.tasks.length} tasks answered
            </p>
            <TextField
              multiline
              rows={3}
              id={`${id}-change_note`}
              label="What changed?"
              required
              maxLength={2000}
              help="Summarise what you changed in this version. Reviewers read this first."
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              error={shown.change_note}
            />
            {declaration.data ? (
              <div id={`${id}-declaration`}>
                <DeclarationPanel
                  kind="applicant"
                  sampleWording={declaration.data.is_sample}
                  terms={<p className="whitespace-pre-line">{declaration.data.body_md.replace(/\*\*/g, '')}</p>}
                  accepted={accepted}
                  onAcceptedChange={setAccepted}
                  error={shown.declaration}
                />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 border-t border-line p-4">
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button variant="tertiary" onClick={() => goTo(1)}>
                Back
              </Button>
              <Button
                onClick={() => void submit()}
                loading={s.kind === 'submitting'}
                loadingLabel="Submitting…"
                disabled={!allAnswered || s.kind === 'unknown'}
                disabledReason={!allAnswered ? missing : 'Check the status above before trying again.'}
              >
                Submit Version {nextVersion}
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function FieldInput({ base, f, value, error, onChange }: { base: string; f: FormField; value: string; error?: string; onChange: (v: string) => void }) {
  const fid = `${base}-${f.key}`
  if (f.type === 'select')
    return (
      <Select
        id={fid}
        label={f.label}
        required={f.required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={[{ value: '', label: 'Choose…' }, ...(f.options ?? []).map((o) => ({ value: o, label: o }))]}
        error={error}
      />
    )
  return (
    <TextField
      {...(f.type === 'textarea' ? { multiline: true as const, rows: 4 } : { type: f.type === 'email' ? 'email' : 'text' })}
      id={fid}
      label={f.label}
      required={f.required}
      maxLength={f.max_length}
      help={f.help}
      value={value}
      onChange={(e: { target: { value: string } }) => onChange(e.target.value)}
      error={error}
    />
  )
}
