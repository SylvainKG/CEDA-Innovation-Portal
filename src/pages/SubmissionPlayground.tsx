import { useMemo, useState } from 'react'
import { AutosaveIndicator, Banner, Button, DeclarationPanel, ReceiptCard, Select, TextField, UnknownOutcomeBanner } from '@/components'
import { WATER_SMART_ID } from '@/lib/api/mock/fixtures'
import { mockSubmission, mockSubmissionControls } from '@/lib/api/mock/submission'
import type { AttachmentInfo, DraftData } from '@/lib/api/types'
import { checkForm, completeness } from '@/lib/form-check'
import { useSession, useSwitchDemoRole } from '@/lib/session'
import { useChallengeForm, useDeclaration } from '@/features/submission/queries'
import { useAutosave } from '@/features/submission/useAutosave'
import { useSubmitIdea } from '@/features/submission/useSubmitIdea'

/**
 * DEVELOPMENT ONLY (mock mode, /dev/components). A test bench for the Slice 1 hooks, so the team can try
 * autosave, submit, refusals and a lost reply by hand. It is NOT the T04/T05 screen: those are built from
 * Sandra's snapshots (D-37). Layout here is deliberately plain.
 */
const SAMPLE: DraftData = {
  applicant_name: 'Demo Applicant A',
  contact_email: 'applicant.a@example.test',
  title: 'Solar drip irrigation kit (DEMO)',
  summary: 'A low-cost drip kit for smallholder farms, powered by a small solar pump.',
  sector: 'Horticulture',
  problem: 'Farmers lose most irrigation water to evaporation.',
  solution: 'Drip lines fed by a solar pump and a cheap moisture sensor.',
  impact: 'About 40% less water per hectare (fictional figure).',
}

export function SubmissionPlayground() {
  const session = useSession()
  const switchRole = useSwitchDemoRole()
  const form = useChallengeForm(WATER_SMART_ID)
  const declaration = useDeclaration()
  const [data, setData] = useState<DraftData>({})
  const [proposalId, setProposalId] = useState<string>()
  const [files, setFiles] = useState<AttachmentInfo[]>([])
  const [fileError, setFileError] = useState<string>()
  const [accepted, setAccepted] = useState(false)
  const [loseReply, setLoseReply] = useState(false)
  const autosave = useAutosave({ challengeId: WATER_SMART_ID, proposalId, onCreated: setProposalId })
  const submit = useSubmitIdea(proposalId)

  const attached = useMemo(() => new Set(files.map((f) => f.doc_key).filter((k): k is string => Boolean(k))), [files])
  const isApplicant = session.data?.roles.includes('applicant') ?? false

  if (!isApplicant) {
    return (
      <Banner kind="info" title="Sign in as the demo applicant to try this">
        <Button onClick={() => switchRole.mutate('applicant')}>Act as Demo Applicant A</Button>
      </Banner>
    )
  }
  if (!form.data || !declaration.data) return <p>Loading the demo challenge…</p>

  const challenge = form.data
  const update = (next: DraftData) => {
    setData(next)
    autosave.change(next)
  }
  const serverErrors = submit.state.kind === 'refused' ? (submit.state.fields ?? {}) : {}
  const progress = completeness(challenge.form_schema, data, challenge.required_docs, attached)
  const localErrors = checkForm(challenge.form_schema, data, challenge.required_docs, attached)

  async function attach(file: File | undefined) {
    if (!file || !proposalId) return
    setFileError(undefined)
    const outcome = await mockSubmission.uploadAttachment({ proposalId, file, docKey: 'business_plan' })
    if (outcome.kind === 'ok') setFiles((f) => [...f, outcome.data])
    else if (outcome.kind === 'refused') setFileError(outcome.message ?? outcome.code)
  }

  async function onSubmit() {
    await autosave.saveNow()
    if (loseReply) mockSubmissionControls.loseNextSubmitReply()
    setLoseReply(false)
    await submit.submit(accepted ? declaration.data!.version : 'not-accepted')
  }

  if (submit.state.kind === 'submitted') {
    const r = submit.state.receipt
    return (
      <div className="flex flex-col gap-4">
        {r.replayed ? <Banner kind="info">This is the receipt from your earlier submit. Nothing was submitted twice.</Banner> : null}
        <ReceiptCard
          receipt={{
            reference: r.reference,
            version: r.version_no,
            submittedAt: r.submitted_at,
            challenge: r.challenge.title,
            formVersion: `Form v${r.form_version}`,
            files: r.files.map((f) => ({ name: f.filename, sizeBytes: f.size_bytes })),
            declarationAccepted: true,
          }}
        />
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Start over (reload)
        </Button>
      </div>
    )
  }

  return (
    <div className="grid max-w-form gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AutosaveIndicator state={autosave.state} />
        <span className="text-sm text-ink-muted">
          Required items: {progress.done} of {progress.total}
          {proposalId ? ` · draft ${proposalId.slice(0, 8)}` : ' · not saved yet'}
        </span>
      </div>
      <Button variant="secondary" onClick={() => update(SAMPLE)}>
        Fill with sample answers
      </Button>

      {challenge.form_schema.sections.map((section) => (
        <fieldset key={section.key} className="flex flex-col gap-3">
          <legend className="text-h3 font-semibold">{section.title}</legend>
          {section.fields.map((field) => {
            const error = serverErrors[field.key]
            const value = data[field.key] ?? ''
            const onChange = (v: string) => update({ ...data, [field.key]: v })
            return field.type === 'select' ? (
              <Select
                key={field.key}
                label={field.label}
                required={field.required}
                placeholder="Choose one"
                options={(field.options ?? []).map((o) => ({ value: o, label: o }))}
                value={value}
                error={error}
                onChange={(e) => onChange(e.target.value)}
              />
            ) : field.type === 'textarea' ? (
              <TextField key={field.key} multiline label={field.label} required={field.required} help={field.help} maxLength={field.max_length} value={value} error={error} onChange={(e) => onChange(e.target.value)} />
            ) : (
              <TextField key={field.key} type={field.type === 'email' ? 'email' : 'text'} label={field.label} required={field.required} maxLength={field.max_length} value={value} error={error} onChange={(e) => onChange(e.target.value)} />
            )
          })}
        </fieldset>
      ))}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-h3 font-semibold">Business plan (PDF) — required</legend>
        {proposalId ? (
          <input type="file" accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg" aria-label="Attach business plan" onChange={(e) => void attach(e.target.files?.[0])} />
        ) : (
          <p className="text-sm text-ink-muted">Type something first so the draft is saved, then attach the file.</p>
        )}
        {files.map((f) => (
          <span key={f.id} className="text-sm">
            Attached: {f.filename}
          </span>
        ))}
        {fileError || serverErrors['doc:business_plan'] ? <span className="text-sm text-error">{fileError ?? serverErrors['doc:business_plan']}</span> : null}
      </fieldset>

      <DeclarationPanel
        kind="applicant"
        sampleWording={declaration.data.is_sample}
        terms={<p className="whitespace-pre-line">{declaration.data.body_md.replace(/\*\*/g, '')}</p>}
        accepted={accepted}
        onAcceptedChange={setAccepted}
        error={serverErrors.declaration}
      />

      <label className="flex min-h-touch items-center gap-2 rounded-md bg-demo-subtle p-3 text-sm">
        <input type="checkbox" checked={loseReply} onChange={(e) => setLoseReply(e.target.checked)} />
        Test switch: lose the server's reply to the next submit (the submit still happens)
      </label>

      {submit.state.kind === 'refused' ? (
        <Banner kind="error" title="Your idea wasn't submitted">
          {submit.state.message ?? submit.state.code}
        </Banner>
      ) : null}
      {submit.state.kind === 'unknown' ? (
        <UnknownOutcomeBanner what="idea" checking={submit.state.checking} onCheckStatus={() => void submit.checkStatus()} />
      ) : null}

      <p className="text-sm text-ink-muted">
        Browser check before submit: {Object.keys(localErrors).length === 0 ? 'ready' : `${Object.keys(localErrors).length} item(s) need attention`}. The
        server checks again either way.
      </p>
      <Button loading={submit.state.kind === 'submitting'} loadingLabel="Submitting…" disabled={!proposalId} onClick={() => void onSubmit()}>
        Submit idea
      </Button>
    </div>
  )
}
