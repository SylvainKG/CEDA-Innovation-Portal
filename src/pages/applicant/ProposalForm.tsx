import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Circle, Trash2 } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AutosaveIndicator,
  Banner,
  Button,
  CompletenessMeter,
  DeclarationPanel,
  ErrorState,
  FileUpload,
  LoadingState,
  NotFoundState,
  OfflineBanner,
  Select,
  TextField,
  UnknownOutcomeBanner,
  type UploadState,
} from '@/components'
import { api } from '@/lib/api'
import type { AttachmentInfo, ChallengeForm, DraftData, DraftView, FormSection, RequiredDoc } from '@/lib/api/types'
import { formatBytes, formatDateTimeCAT, relativeDays } from '@/lib/format'
import { checkForm, isChallengeOpen } from '@/lib/form-check'
import { submissionKeys, useChallengeForm, useDeclaration, useDraft } from '@/features/submission/queries'
import { readLocalDraft, useAutosave } from '@/features/submission/useAutosave'
import { useSubmitIdea } from '@/features/submission/useSubmitIdea'

/**
 * T04 — Multi-section proposal form (spec §7 T04; APP-01, APP-02, APP-03, INN-03).
 * Built from the written spec (BCR-003, D-45 proposed): design review by Sandra pending.
 *
 * Routes: `/ideas/new?challenge=<id>` (new draft) and `/ideas/:id/edit` (existing draft).
 * The current step is in the URL hash (`#step-<key>`) so "Edit" links and the progress list can jump to it.
 * V2 (revise) mode arrives with Slice 4.
 */

const ACCEPT = ['.pdf', '.docx', '.xlsx', '.png', '.jpg']
const MAX_BYTES = 10 * 1024 * 1024
const FAQ_HREF = '/help/faqs'

interface Step {
  key: string
  title: string
  section?: FormSection
}

function stepsFor(form: ChallengeForm): Step[] {
  return [
    ...form.form_schema.sections.map((s) => ({ key: s.key, title: s.title, section: s })),
    { key: 'attachments', title: 'Attachments' },
    { key: 'review', title: 'Review & declare' },
  ]
}

/**
 * One page for `/ideas/new?challenge=` and `/ideas/:id/edit`. When the first save creates the draft, the address
 * changes to `/ideas/:id/edit` but the same form stays mounted, so nothing typed in that moment is lost and the
 * "Saved" indicator stays accurate. Someone else's draft is indistinguishable from none (Not found).
 */
export function ProposalFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const [live, setLive] = useState<{ id: string; form: ChallengeForm } | null>(null)
  const challengeId = id ? undefined : (params.get('challenge') ?? undefined)
  const newForm = useChallengeForm(challengeId)
  const draft = useDraft(id && live?.id !== id ? id : undefined)
  const draftForm = useChallengeForm(draft.data?.challenge_id)

  // The draft this form just created: keep the same form instance (same element type and position).
  if (live && live.id === id) return <ProposalForm form={live.form} onCreated={() => undefined} />

  if (!id) {
    if (!challengeId) return <NotFoundState home="/ideas" />
    if (newForm.isPending) return <LoadingState what="the proposal form" />
    if (newForm.isError) return <ErrorState level="h1" message="We couldn't load the proposal form." onRetry={() => void newForm.refetch()} />
    if (!newForm.data) return <NotFoundState home="/ideas" />
    if (!isChallengeOpen(newForm.data)) return <ClosedChallenge form={newForm.data} />
    const form = newForm.data
    return <ProposalForm form={form} onCreated={(newId) => setLive({ id: newId, form })} />
  }

  if (draft.isPending || (draft.data && draftForm.isPending)) return <LoadingState what="your draft" />
  if (draft.isError || draftForm.isError)
    return <ErrorState level="h1" message="We couldn't load your draft." onRetry={() => void (draft.isError ? draft.refetch() : draftForm.refetch())} />
  if (!draft.data || !draftForm.data) return <NotFoundState home="/ideas" />
  return <ProposalForm key={draft.data.proposal_id} form={draftForm.data} draft={draft.data} onCreated={() => undefined} />
}

function ClosedChallenge({ form }: { form: ChallengeForm }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-bold">{form.title}</h1>
      <Banner kind="warning" title="This challenge is not accepting ideas">
        It closed on {formatDateTimeCAT(form.closes_at)}. <Link to="/challenges">See open challenges</Link>.
      </Banner>
    </div>
  )
}

function ProposalForm({ form, draft, onCreated }: { form: ChallengeForm; draft?: DraftView; onCreated: (proposalId: string) => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const steps = useMemo(() => stepsFor(form), [form])
  const stepKey = location.hash.startsWith('#step-') ? location.hash.slice(6) : steps[0]?.key
  const stepIndex = Math.max(0, steps.findIndex((s) => s.key === stepKey))
  const step = steps[stepIndex] as Step
  const headingRef = useRef<HTMLHeadingElement>(null)

  const [data, setData] = useState<DraftData>(draft?.data ?? {})
  const [files, setFiles] = useState<AttachmentInfo[]>(draft?.files ?? [])
  const [accepted, setAccepted] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [unsaved, setUnsaved] = useState(false)
  const [restorable, setRestorable] = useState<DraftData | null>(() => {
    const local = readLocalDraft(form.challenge_id, draft?.proposal_id)
    return local && JSON.stringify(local) !== JSON.stringify(draft?.data ?? {}) ? local : null
  })

  const autosave = useAutosave({
    challengeId: form.challenge_id,
    proposalId: draft?.proposal_id,
    // A new draft gets its own address, so a reload or the back button returns to it.
    onCreated: (id) => {
      onCreated(id)
      navigate(`/ideas/${id}/edit${window.location.hash || location.hash}`, { replace: true })
    },
  })
  const proposalId = autosave.proposalId
  const submit = useSubmitIdea(proposalId)
  const declaration = useDeclaration()

  const attached = useMemo(() => new Set(files.map((f) => f.doc_key).filter((k): k is string => Boolean(k))), [files])
  const localErrors = useMemo(() => {
    const errors = checkForm(form.form_schema, data, form.required_docs, attached)
    if (!accepted) errors.declaration = 'Accept the declaration to submit'
    return errors
  }, [form, data, attached, accepted])
  const serverErrors = submit.state.kind === 'refused' ? (submit.state.fields ?? {}) : {}
  const shownErrors: Record<string, string> = showErrors ? { ...localErrors, ...serverErrors } : serverErrors

  // Move focus to the step heading when the step changes (keyboard and screen-reader users).
  useEffect(() => {
    headingRef.current?.focus()
  }, [stepIndex])

  // Leaving the form: the cached draft is refreshed next time, so it shows what autosave sent.
  useEffect(() => {
    if (!proposalId) return
    return () => {
      void qc.invalidateQueries({ queryKey: submissionKeys.draft(proposalId) })
      void qc.invalidateQueries({ queryKey: submissionKeys.myIdeas })
    }
  }, [proposalId, qc])

  // After a confirmed submit, go to the receipt (spec T05). The receipt is already in the cache.
  useEffect(() => {
    if (submit.state.kind === 'submitted' && proposalId) navigate(`/ideas/${proposalId}/receipt`, { replace: true })
  }, [navigate, proposalId, submit.state.kind])

  const update = (next: DraftData) => {
    setData(next)
    autosave.change(next)
  }

  const goTo = (key: string) => navigate({ hash: `step-${key}` })
  const stepComplete = (s: Step) => {
    if (s.section) return s.section.fields.every((f) => !localErrors[f.key])
    if (s.key === 'attachments') return form.required_docs.every((d) => !localErrors[`doc:${d.key}`])
    return false
  }

  async function onSubmit() {
    setShowErrors(true)
    if (Object.keys(localErrors).length > 0) {
      setTimeout(() => document.getElementById('error-summary')?.focus(), 0)
      return
    }
    const saved = await autosave.saveNow()
    if (!saved) {
      setUnsaved(true)
      setTimeout(() => document.getElementById('error-summary')?.focus(), 0)
      return
    }
    setUnsaved(false)
    if (declaration.data) await submit.submit(declaration.data.version)
  }

  const closesAt = `${formatDateTimeCAT(form.closes_at)} (${relativeDays(form.closes_at)})`

  return (
    <div className="flex flex-col gap-4">
      <OfflineBanner />
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-ink-muted">{form.title}</p>
          <h1 className="text-h1 font-bold">{data.title?.trim() || 'New idea'}</h1>
        </div>
        <AutosaveIndicator state={autosave.state} />
      </header>

      {restorable ? (
        <Banner
          kind="info"
          title="We found unsaved changes from this device"
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  update(restorable)
                  setRestorable(null)
                }}
              >
                Restore them
              </Button>
              <Button variant="secondary" onClick={() => setRestorable(null)}>
                Keep the saved version
              </Button>
            </div>
          }
        >
          They were typed here but never reached CEDA.
        </Banner>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[200px,minmax(0,720px),260px]">
        {/* Section stepper: list on desktop, "Section n of m" picker on mobile. */}
        <nav aria-label="Form sections" className="hidden lg:block">
          <ol className="flex flex-col gap-1">
            {steps.map((s, i) => (
              <li key={s.key}>
                <Link
                  to={{ hash: `step-${s.key}` }}
                  aria-current={i === stepIndex ? 'step' : undefined}
                  className={`flex min-h-touch items-center gap-2 rounded-md px-2 no-underline ${i === stepIndex ? 'bg-surface-card font-semibold text-ink' : 'text-ink'}`}
                >
                  {stepComplete(s) ? <CheckCircle2 aria-hidden className="h-4 w-4 text-success" /> : <Circle aria-hidden className="h-4 w-4 text-ink-muted" />}
                  {s.title}
                  {stepComplete(s) ? <span className="sr-only"> (complete)</span> : null}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <div className="lg:hidden">
          <Select
            label={`Section ${stepIndex + 1} of ${steps.length}`}
            options={steps.map((s) => ({ value: s.key, label: s.title }))}
            value={step.key}
            onChange={(e) => goTo(e.target.value)}
          />
        </div>

        <section aria-labelledby="step-heading" className="flex flex-col gap-4">
          <h2 id="step-heading" ref={headingRef} tabIndex={-1} className="text-h2 font-semibold outline-none">
            {step.title}
          </h2>

          {step.section ? (
            <SectionFields section={step.section} data={data} errors={shownErrors} onChange={update} />
          ) : step.key === 'attachments' ? (
            <Attachments
              proposalId={proposalId}
              docs={form.required_docs}
              files={files}
              errors={shownErrors}
              onAdded={(f) => setFiles((all) => [...all, f])}
              onRemoved={(id) => setFiles((all) => all.filter((f) => f.id !== id))}
            />
          ) : (
            <ReviewStep form={form} steps={steps} data={data} files={files} errors={localErrors} showErrors={showErrors} onEdit={goTo}>
              <ErrorSummary
                errors={shownErrors}
                steps={steps}
                docs={form.required_docs}
                notSavedYet={unsaved}
                refusal={submit.state.kind === 'refused' ? submit.state : undefined}
                onGo={goTo}
              />
              {declaration.data ? (
                <DeclarationPanel
                  kind="applicant"
                  sampleWording={declaration.data.is_sample}
                  terms={<p className="whitespace-pre-line">{declaration.data.body_md.replace(/\*\*/g, '')}</p>}
                  accepted={accepted}
                  onAcceptedChange={setAccepted}
                  error={shownErrors.declaration}
                />
              ) : (
                <LoadingState what="the declaration" lines={2} />
              )}
              {submit.state.kind === 'unknown' ? (
                <UnknownOutcomeBanner what="idea" checking={submit.state.checking} onCheckStatus={() => void submit.checkStatus()} />
              ) : null}
              <div>
                <Button
                  loading={submit.state.kind === 'submitting'}
                  loadingLabel="Submitting…"
                  disabled={!proposalId || (submit.state.kind === 'unknown' && submit.state.checking)}
                  disabledReason={!proposalId ? 'Answer at least one question first, so your draft is saved.' : undefined}
                  onClick={() => void onSubmit()}
                >
                  {submit.state.kind === 'unknown' ? 'Submit again (safe: it cannot create a second idea)' : 'Submit idea'}
                </Button>
              </div>
            </ReviewStep>
          )}

          <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-4">
            {stepIndex > 0 ? (
              <Button variant="secondary" onClick={() => goTo((steps[stepIndex - 1] as Step).key)}>
                Back: {(steps[stepIndex - 1] as Step).title}
              </Button>
            ) : (
              <span />
            )}
            {stepIndex < steps.length - 1 ? (
              <Button
                onClick={() => {
                  void autosave.saveNow()
                  goTo((steps[stepIndex + 1] as Step).key)
                }}
              >
                Continue: {(steps[stepIndex + 1] as Step).title}
              </Button>
            ) : null}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <CompletenessMeter
            sections={steps
              .filter((s) => s.key !== 'review')
              .map((s) => ({ id: s.key, label: s.title, complete: stepComplete(s), href: `#step-${s.key}` }))}
          />
          <div className="rounded-md bg-surface-card p-4 text-sm shadow-1">
            <p className="font-semibold">Deadline</p>
            <p>{closesAt}</p>
          </div>
          <div className="rounded-md bg-surface-card p-4 text-sm shadow-1">
            <p className="font-semibold">Need help?</p>
            <Link to={FAQ_HREF}>Read the FAQs</Link>
          </div>
        </aside>
      </div>
      <p className="text-sm text-ink-muted">Only you and CEDA staff assigned to this case can see your idea.</p>
    </div>
  )
}

function SectionFields({ section, data, errors, onChange }: { section: FormSection; data: DraftData; errors: Record<string, string>; onChange: (d: DraftData) => void }) {
  return (
    <div className="flex flex-col gap-4">
      {section.fields.map((field) => {
        const value = data[field.key] ?? ''
        const set = (v: string) => onChange({ ...data, [field.key]: v })
        const common = { id: `field-${field.key}`, label: field.label, required: field.required, error: errors[field.key] }
        if (field.type === 'select')
          return (
            <Select
              key={field.key}
              {...common}
              placeholder="Choose one"
              options={(field.options ?? []).map((o) => ({ value: o, label: o }))}
              value={value}
              onChange={(e) => set(e.target.value)}
            />
          )
        if (field.type === 'textarea')
          return <TextField key={field.key} {...common} multiline rows={5} help={field.help} maxLength={field.max_length} value={value} onChange={(e) => set(e.target.value)} />
        return (
          <TextField
            key={field.key}
            {...common}
            type={field.type === 'email' ? 'email' : 'text'}
            autoComplete={field.type === 'email' ? 'email' : field.key === 'applicant_name' ? 'name' : undefined}
            help={field.help}
            maxLength={field.max_length}
            value={value}
            onChange={(e) => set(e.target.value)}
          />
        )
      })}
    </div>
  )
}

function Attachments({
  proposalId,
  docs,
  files,
  errors,
  onAdded,
  onRemoved,
}: {
  proposalId?: string
  docs: RequiredDoc[]
  files: AttachmentInfo[]
  errors: Record<string, string>
  onAdded: (f: AttachmentInfo) => void
  onRemoved: (id: string) => void
}) {
  const [upload, setUpload] = useState<Record<string, UploadState>>({})
  const [removeError, setRemoveError] = useState<string>()

  if (!proposalId)
    return <Banner kind="info">Answer at least one question first. Your draft is saved then, and you can attach files to it.</Banner>

  async function send(doc: RequiredDoc, file: File) {
    if (!proposalId) return
    setUpload((u) => ({ ...u, [doc.key]: { kind: 'uploading', fileName: file.name, percent: 50 } }))
    try {
      const outcome = await api.submission.uploadAttachment({ proposalId, file, docKey: doc.key })
      if (outcome.kind === 'ok') {
        onAdded(outcome.data)
        setUpload((u) => ({ ...u, [doc.key]: { kind: 'idle' } }))
      } else if (outcome.kind === 'refused') {
        const reason = outcome.fields?.file ?? outcome.fields?.doc_key ?? outcome.message ?? 'The file was not accepted.'
        setUpload((u) => ({ ...u, [doc.key]: { kind: 'rejected', fileName: file.name, reason } }))
      } else {
        setUpload((u) => ({ ...u, [doc.key]: { kind: 'failed', fileName: file.name, message: "We couldn't confirm the upload. Check the list below before trying again." } }))
      }
    } catch {
      setUpload((u) => ({ ...u, [doc.key]: { kind: 'failed', fileName: file.name, message: 'The upload failed. Try again.' } }))
    }
  }

  async function remove(id: string) {
    setRemoveError(undefined)
    const outcome = await api.submission.removeAttachment(id).catch(() => null)
    if (outcome?.kind === 'ok') onRemoved(id)
    else setRemoveError(outcome?.kind === 'refused' ? (outcome.message ?? 'The file could not be removed.') : "We couldn't remove the file. Try again.")
  }

  return (
    <div className="flex flex-col gap-6">
      <p>Accepted: PDF, DOCX, XLSX, PNG or JPG, up to 10 MB each, at most 10 files.</p>
      {docs.map((doc) => {
        const mine = files.filter((f) => f.doc_key === doc.key)
        return (
          <div key={doc.key} id={`field-doc:${doc.key}`} className="flex flex-col gap-2">
            <FileUpload
              label={`${doc.label}${doc.required ? '' : ' (optional)'}`}
              required={doc.required}
              accept={ACCEPT}
              maxSizeBytes={MAX_BYTES}
              state={upload[doc.key] ?? { kind: 'idle' }}
              onFileSelected={(f) => void send(doc, f)}
              onFileRejected={(fileName, reason) => setUpload((u) => ({ ...u, [doc.key]: { kind: 'rejected', fileName, reason } }))}
            />
            {errors[`doc:${doc.key}`] ? <p className="text-sm text-error">{errors[`doc:${doc.key}`]}</p> : null}
            {mine.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {mine.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-card p-2">
                    <span>
                      {f.filename} <span className="text-sm text-ink-muted">({formatBytes(f.size_bytes)})</span>
                    </span>
                    <Button variant="secondary" icon={Trash2} onClick={() => void remove(f.id)}>
                      Remove <span className="sr-only">{f.filename}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )
      })}
      {removeError ? <Banner kind="error">{removeError}</Banner> : null}
    </div>
  )
}

function ReviewStep({
  form,
  steps,
  data,
  files,
  errors,
  showErrors,
  onEdit,
  children,
}: {
  form: ChallengeForm
  steps: Step[]
  data: DraftData
  files: AttachmentInfo[]
  errors: Record<string, string>
  showErrors: boolean
  onEdit: (key: string) => void
  children: ReactNode
}) {
  const missing = Object.keys(errors).filter((k) => k !== 'declaration').length
  return (
    <div className="flex flex-col gap-6">
      <p>Check your answers. You can't change them after you submit, unless CEDA asks for a revision.</p>
      {!showErrors && missing > 0 ? (
        <Banner kind="action" title={`${missing} item${missing === 1 ? '' : 's'} still needed`}>
          Items marked “Not answered” or “Missing” below must be completed before you submit.
        </Banner>
      ) : null}
      {steps
        .filter((s) => s.section)
        .map((s) => (
          <section key={s.key} aria-labelledby={`review-${s.key}`} className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
            <div className="flex items-center justify-between gap-2">
              <h3 id={`review-${s.key}`} className="text-h3 font-semibold">
                {s.title}
              </h3>
              <Button variant="secondary" onClick={() => onEdit(s.key)}>
                Edit <span className="sr-only">{s.title}</span>
              </Button>
            </div>
            <dl className="grid gap-x-4 gap-y-2 md:grid-cols-[200px,1fr]">
              {s.section?.fields.map((f) => (
                <div key={f.key} className="contents">
                  <dt className="text-sm text-ink-muted">{f.label}</dt>
                  <dd className="whitespace-pre-line break-words">
                    {data[f.key]?.trim() ? data[f.key] : <span className="text-ink-muted">{f.required ? 'Not answered (required)' : 'Not answered'}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      <section aria-labelledby="review-attachments" className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
        <div className="flex items-center justify-between gap-2">
          <h3 id="review-attachments" className="text-h3 font-semibold">
            Attachments
          </h3>
          <Button variant="secondary" onClick={() => onEdit('attachments')}>
            Edit <span className="sr-only">attachments</span>
          </Button>
        </div>
        <ul className="flex flex-col gap-1">
          {form.required_docs.map((d) => {
            const f = files.find((x) => x.doc_key === d.key)
            return (
              <li key={d.key}>
                {d.label}: {f ? `${f.filename} (${formatBytes(f.size_bytes)})` : <span className="text-ink-muted">{d.required ? 'Missing (required)' : 'Not attached'}</span>}
              </li>
            )
          })}
        </ul>
      </section>
      {children}
    </div>
  )
}

/** Error summary at the top of the review step (spec T02/T04): every problem, linked to where it is fixed. */
function ErrorSummary({
  errors,
  steps,
  docs,
  notSavedYet,
  refusal,
  onGo,
}: {
  errors: Record<string, string>
  steps: Step[]
  docs: RequiredDoc[]
  notSavedYet: boolean
  refusal?: { code: string; message?: string }
  onGo: (key: string) => void
}) {
  const entries = Object.entries(errors)
  const labelOf = (key: string): { label: string; step: string } => {
    if (key === 'declaration') return { label: 'Declaration', step: 'review' }
    if (key.startsWith('doc:')) return { label: docs.find((d) => `doc:${d.key}` === key)?.label ?? 'Document', step: 'attachments' }
    for (const s of steps) {
      const f = s.section?.fields.find((x) => x.key === key)
      if (f) return { label: f.label, step: s.key }
    }
    return { label: key === 'email' ? 'Your email address' : key === 'consent' ? 'Privacy notice' : key, step: 'review' }
  }
  const generic = refusal && entries.length === 0 ? (refusal.message ?? 'Your idea was not submitted.') : null
  if (entries.length === 0 && !notSavedYet && !generic) return null
  return (
    <div id="error-summary" tabIndex={-1} role="alert" className="flex flex-col gap-2 rounded-md bg-error-subtle p-4 outline-none">
      <h3 className="text-h3 font-semibold">Your idea wasn't submitted yet</h3>
      {notSavedYet ? <p>Your latest changes aren't saved yet. Check your connection; they will be sent automatically.</p> : null}
      {generic ? <p>{generic}</p> : null}
      {refusal?.message && entries.length > 0 ? <p>{refusal.message}</p> : null}
      {entries.length > 0 ? (
        <ul className="list-disc pl-6">
          {entries.map(([key, message]) => {
            const { label, step } = labelOf(key)
            return (
              <li key={key}>
                <a
                  href={`#step-${step}`}
                  onClick={(e) => {
                    e.preventDefault()
                    onGo(step)
                    setTimeout(() => document.getElementById(`field-${key}`)?.focus(), 0)
                  }}
                >
                  {label}: {message}
                </a>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
