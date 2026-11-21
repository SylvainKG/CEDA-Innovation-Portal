import { useId, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Banner, Button, DeclarationPanel, ReferencePill, Select, TextField } from '@/components'
import { ErrorState, LoadingState, NotFoundState, UnknownOutcomeBanner } from '@/components/states/States'
import { useRoadmap } from '@/features/feedback/queries'
import { useSubmitRevision } from '@/features/feedback/useSubmitRevision'
import { useDeclaration } from '@/features/submission/queries'
import { api } from '@/lib/api'
import type { DraftData, FeedbackRequest, FormField, MyCase } from '@/lib/api/types'
import { formatDateTimeCAT } from '@/lib/format'

/**
 * T04 V2 revise mode (spec T04; contract §4.4; INN-02), Provisional UI built from the written spec (BCR-003).
 * The request and its deadline on top; a Roadmap panel where the applicant answers each task (Addressed / Not
 * addressed + explanation); the form pre-filled from the current version; "What changed?"; the declaration; and
 * "Submit Version N". Submit stays disabled, with the reason, until every task is answered.
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
  const id = useId()
  const nextVersion = version.version_no + 1

  const answered = request.tasks.filter((t) => answers[t.task_id]?.status && answers[t.task_id]!.explanation.trim()).length
  const allAnswered = answered === request.tasks.length
  const edited = useMemo(() => Object.keys({ ...data, ...version.data }).some((k) => (data[k] ?? '') !== (version.data[k] ?? '')), [data, version.data])

  const s = revision.state
  if (s.kind === 'submitted') return <Navigate to={`/ideas/${c.id}/receipt?v=${s.receipt.version_no}`} replace />

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

  return (
    <div className="flex flex-col gap-6">
      <p>
        <Link to={`/ideas/${c.id}`}>← Back to your idea</Link>
      </p>
      <header className="flex flex-col gap-2">
        <div className="flex">
          <ReferencePill reference={c.reference} copyable />
        </div>
        <h1 className="text-h1 font-semibold">Revise your idea</h1>
        <p className="text-ink-muted">{c.title} · you're preparing version {nextVersion}</p>
      </header>

      <Banner kind="action" title="CEDA asked you to revise your idea">
        <span className="whitespace-pre-wrap">{request.message}</span>
        <span className="mt-1 block">Respond by {formatDateTimeCAT(request.due_at)}.</span>
      </Banner>

      {s.kind === 'unknown' ? <UnknownOutcomeBanner what="Your revision" checking={s.checking} onCheckStatus={() => void revision.checkStatus()} /> : null}
      {s.kind === 'refused' && !s.fields ? <Banner kind="error">{s.message ?? 'Your revision was not submitted.'}</Banner> : null}
      {errorList.length ? (
        <div id={`${id}-errors`} tabIndex={-1} role="alert" className="flex max-w-form flex-col gap-2 rounded-md bg-error-subtle p-4 outline-none">
          <h2 className="font-semibold">Your revision wasn't submitted yet</h2>
          {s.kind === 'refused' && s.message ? <p>{s.message}</p> : null}
          <ul className="list-disc pl-6">
            {errorList.map(([key, msg]) => (
              <li key={key}>
                <a href={`#${id}-${key.replace(':', '-')}`}>
                  {key.startsWith('task:') ? `${taskLabel(key)}: ${msg}` : key === 'change_note' ? `What changed: ${msg}` : key === 'declaration' ? `Declaration: ${msg}` : msg}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {request.tasks.length ? (
        <section aria-labelledby={`${id}-roadmap`} className="flex max-w-form flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={`${id}-roadmap`} className="text-h2 font-semibold">
              Roadmap
            </h2>
            <p className="font-semibold" aria-live="polite">
              {answered} of {request.tasks.length} tasks answered
            </p>
          </div>
          {request.tasks.map((t) => {
            const a = answers[t.task_id]!
            const key = `task:${t.position}`
            return (
              <fieldset key={t.task_id} id={`${id}-task-${t.position}`} className="flex flex-col gap-2 border-t border-line pt-3">
                <legend className="font-semibold">
                  Task {t.position}: {t.text}
                </legend>
                <div className="flex flex-wrap gap-4">
                  {(['addressed', 'not_addressed'] as const).map((st) => (
                    <label key={st} className="flex min-h-touch items-center gap-2">
                      <input
                        type="radio"
                        className="h-5 w-5"
                        name={`${id}-t${t.position}`}
                        checked={a.status === st}
                        onChange={() => setAnswers((all) => ({ ...all, [t.task_id]: { ...all[t.task_id]!, status: st } }))}
                      />
                      {st === 'addressed' ? 'Addressed' : 'Not addressed'}
                    </label>
                  ))}
                </div>
                <TextField
                  multiline
                  rows={2}
                  id={`${id}-t${t.position}-expl`}
                  label={a.status === 'not_addressed' ? 'Why not?' : 'What did you change?'}
                  maxLength={500}
                  value={a.explanation}
                  onChange={(e) => setAnswers((all) => ({ ...all, [t.task_id]: { ...all[t.task_id]!, explanation: e.target.value } }))}
                  error={shown[key]}
                />
              </fieldset>
            )
          })}
        </section>
      ) : null}

      <section aria-labelledby={`${id}-form`} className="flex max-w-form flex-col gap-4">
        <h2 id={`${id}-form`} className="text-h2 font-semibold">
          Your answers
        </h2>
        <p className="text-sm text-ink-muted">Pre-filled from version {version.version_no}. Change what the request asks for. Your files carry forward.</p>
        {version.form_schema.sections.map((sec) => (
          <fieldset key={sec.key} className="flex flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1">
            <legend className="text-h3 font-semibold">{sec.title}</legend>
            {sec.fields.map((f) => (
              <FieldInput key={f.key} base={id} f={f} value={data[f.key] ?? ''} error={shown[f.key]} onChange={(v) => setData((d) => ({ ...d, [f.key]: v }))} />
            ))}
          </fieldset>
        ))}
      </section>

      <section className="flex max-w-form flex-col gap-4">
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
        <div>
          <Button
            onClick={() => void submit()}
            loading={s.kind === 'submitting'}
            loadingLabel="Submitting…"
            disabled={!allAnswered || s.kind === 'unknown'}
            disabledReason={!allAnswered ? `${answered} of ${request.tasks.length} tasks answered. Answer every task to submit.` : 'Check the status above before trying again.'}
          >
            Submit Version {nextVersion}
          </Button>
        </div>
      </section>
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
