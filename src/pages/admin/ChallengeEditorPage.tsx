import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Banner, Button, Dialog, TextField } from '@/components'
import { ErrorState, LoadingState, NotFoundState } from '@/components/states/States'
import { api } from '@/lib/api'
import type { AdminChallenge, AdminChallengeVersion, CommandOutcome, FormField, FormSchema, RequiredDoc, RubricVersionOption } from '@/lib/api/types'
import { challengeKeys, fromCat, STATUS_WORD, toCat } from './challenge-shared'
import { DateTime } from './ChallengesPage'

type Msg = { kind: 'success' | 'error' | 'warning'; text: string; fields?: Record<string, string> } | null
const TYPES: { value: FormField['type']; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'select', label: 'Choice' },
  { value: 'email', label: 'Email' },
]
const EMPTY_FORM: FormSchema = { sections: [{ key: 'overview', title: 'Your idea', fields: [{ key: 'title', label: 'Idea title', type: 'text', required: true, max_length: 120 }] }] }

/**
 * T12 challenge editor (ADM-01, ADM-02), Provisional UI built from the written spec (BCR-003; design review
 * pending). Details and dates (CAT); the application form (sections, fields, required documents), the brief and
 * the rubric, saved as a draft form version ("Draft of v2, v1 is live"); then Publish, Unpublish, Close or Delete.
 * Published form versions never change. The server validates and audits everything.
 */
export function ChallengeEditorPage() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const data = useQuery({ queryKey: challengeKeys.one(id), queryFn: () => api.challengeAdmin.getChallenge(id) })
  const rubrics = useQuery({ queryKey: ['admin', 'rubric-versions'], queryFn: () => api.challengeAdmin.listRubricVersions() })
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (data.isPending || rubrics.isPending) return <LoadingState what="the challenge" />
  if (data.isError || rubrics.isError) return <ErrorState level="h1" message="We couldn't load the challenge." onRetry={() => void Promise.all([data.refetch(), rubrics.refetch()])} />
  // Admins only (route guard and server); null here means the challenge doesn't exist.
  if (data.data === null) return <NotFoundState home="/admin/challenges" />
  const { challenge: c, versions } = data.data

  async function act(run: () => Promise<CommandOutcome<unknown>>, ok: string): Promise<boolean> {
    setBusy(true)
    let r: CommandOutcome<unknown>
    try {
      r = await run()
    } catch {
      r = { kind: 'unknown', requestKey: '' }
    }
    await qc.invalidateQueries({ queryKey: ['admin'] })
    setBusy(false)
    setMsg(
      r.kind === 'ok'
        ? { kind: 'success', text: ok }
        : r.kind === 'refused'
          ? { kind: 'error', text: r.message ?? 'The change was refused.', fields: r.fields }
          : { kind: 'warning', text: "We couldn't confirm the change. The page shows what is saved." },
    )
    return r.kind === 'ok'
  }

  const live = versions.find((v) => v.published_at)
  const draft = versions.find((v) => !v.published_at)
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">{c.title}</h1>
        <p className="text-ink-muted" role="status">
          {STATUS_WORD[c.status]} · {draft ? `Draft of v${draft.version_no}${live ? `, v${live.version_no} is live` : ''}` : live ? `Form v${live.version_no} is live` : 'No application form yet'}
        </p>
      </div>
      <div aria-live="polite">
        {msg ? (
          <Banner kind={msg.kind}>
            {msg.text}
            {msg.fields ? (
              <ul className="mt-1 list-disc pl-5">
                {Object.entries(msg.fields).map(([k, v]) => (
                  <li key={k}>{k.startsWith('field:') ? `Field "${k.slice(6)}": ${v}` : v}</li>
                ))}
              </ul>
            ) : null}
          </Banner>
        ) : null}
      </div>

      <Details c={c} busy={busy} fields={msg?.fields} onSave={(i) => act(() => api.challengeAdmin.update(c.id, i), 'Details saved.')} />
      <FormEditor
        key={(draft ?? live)?.id ?? 'new'}
        start={draft ?? live}
        rubrics={rubrics.data}
        busy={busy}
        onSave={(v) => act(() => api.challengeAdmin.saveVersion({ challengeId: c.id, ...v }), 'Form saved as a draft. Publish to make it live.')}
      />

      <section aria-labelledby="ch-status" className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
        <h2 id="ch-status" className="text-h2 font-semibold">
          Status
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || (c.status === 'published' && !draft)} disabledReason={busy ? 'Saving…' : 'Already published'} onClick={() => void act(() => api.challengeAdmin.publish(c.id), draft ? `Published form v${draft.version_no}.` : 'Challenge published.')}>
            {draft && live ? `Publish form v${draft.version_no}` : 'Publish challenge'}
          </Button>
          {c.status === 'published' ? (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => void act(() => api.challengeAdmin.setStatus(c.id, 'unpublished'), 'Challenge unpublished.')}>
                Unpublish
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => void act(() => api.challengeAdmin.setStatus(c.id, 'closed'), 'Challenge closed to new ideas.')}>
                Close to new ideas
              </Button>
            </>
          ) : null}
          {c.status === 'draft' ? (
            <Button variant="destructive" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Delete draft
            </Button>
          ) : null}
        </div>
      </section>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${c.title}`}
        consequence="The draft challenge and its unpublished form are removed. This can't be undone."
        primaryLabel="Delete draft"
        primaryVariant="destructive"
        busy={busy}
        audited
        onPrimary={async () => {
          if (await act(() => api.challengeAdmin.remove(c.id), 'Draft deleted.')) navigate('/admin/challenges')
          setConfirmDelete(false)
        }}
      />
    </div>
  )
}

function Details({ c, busy, fields, onSave }: { c: AdminChallenge; busy: boolean; fields?: Record<string, string>; onSave: (i: { title: string; summary: string; audience: string; opensAt: string; closesAt: string }) => Promise<boolean> }) {
  const [v, setV] = useState({ title: c.title, summary: c.summary, audience: c.audience, opens: toCat(c.opens_at), closes: toCat(c.closes_at) })
  return (
    <form
      noValidate
      aria-labelledby="ch-details"
      className="flex flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1"
      onSubmit={(e) => {
        e.preventDefault()
        void onSave({ title: v.title, summary: v.summary, audience: v.audience, opensAt: fromCat(v.opens), closesAt: fromCat(v.closes) })
      }}
    >
      <h2 id="ch-details" className="text-h2 font-semibold">
        Details
      </h2>
      <TextField id="ed-title" label="Title" maxLength={200} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} error={fields?.title} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <DateTime id="ed-opens" label="Opens (CAT)" value={v.opens} onChange={(x) => setV({ ...v, opens: x })} />
        <DateTime id="ed-closes" label="Closes (CAT)" value={v.closes} onChange={(x) => setV({ ...v, closes: x })} error={fields?.closes_at} />
      </div>
      <TextField id="ed-summary" label="Summary" multiline rows={2} maxLength={1000} value={v.summary} onChange={(e) => setV({ ...v, summary: e.target.value })} />
      <TextField id="ed-audience" label="Who can apply" maxLength={300} value={v.audience} onChange={(e) => setV({ ...v, audience: e.target.value })} />
      <div>
        <Button type="submit" variant="secondary" loading={busy} loadingLabel="Saving…">
          Save details
        </Button>
      </div>
    </form>
  )
}

function FormEditor({
  start,
  rubrics,
  busy,
  onSave,
}: {
  start: AdminChallengeVersion | undefined
  rubrics: RubricVersionOption[]
  busy: boolean
  onSave: (v: { briefMd: string; formSchema: FormSchema; requiredDocs: RequiredDoc[]; rubricVersionId: string }) => Promise<boolean>
}) {
  const [schema, setSchema] = useState<FormSchema>(structuredClone(start?.form_schema ?? EMPTY_FORM))
  const [docs, setDocs] = useState<RequiredDoc[]>(structuredClone(start?.required_docs ?? []))
  const [brief, setBrief] = useState(start?.brief_md ?? '')
  const [rubric, setRubric] = useState(start?.rubric_version_id ?? rubrics.find((r) => r.published)?.id ?? '')
  const live = Boolean(start?.published_at)

  const setField = (si: number, fi: number, patch: Partial<FormField>) =>
    setSchema((s) => ({ sections: s.sections.map((sec, i) => (i !== si ? sec : { ...sec, fields: sec.fields.map((f, j) => (j !== fi ? f : { ...f, ...patch })) })) }))
  const setSection = (si: number, title: string) => setSchema((s) => ({ sections: s.sections.map((sec, i) => (i === si ? { ...sec, title } : sec)) }))

  return (
    <form
      noValidate
      aria-labelledby="ch-form"
      className="flex flex-col gap-4 rounded-md bg-surface-card p-4 shadow-1"
      onSubmit={(e) => {
        e.preventDefault()
        void onSave({ briefMd: brief, formSchema: schema, requiredDocs: docs, rubricVersionId: rubric })
      }}
    >
      <h2 id="ch-form" className="text-h2 font-semibold">
        Application form
      </h2>
      {live ? <p className="text-sm text-ink-muted">This is the live form. Saving creates a new draft version; the live one doesn&apos;t change until you publish.</p> : null}
      <TextField id="ed-brief" label="Brief (Markdown)" multiline rows={5} maxLength={20000} value={brief} onChange={(e) => setBrief(e.target.value)} />
      <div className="flex flex-col gap-1">
        <label htmlFor="ed-rubric" className="font-semibold">
          Scoring rubric
        </label>
        <select id="ed-rubric" className="min-h-touch rounded-sm border border-line-input bg-surface-card px-2" value={rubric} onChange={(e) => setRubric(e.target.value)}>
          <option value="">Choose a rubric</option>
          {rubrics.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title} v{r.version_no}
              {r.published ? '' : ' (not published)'}
            </option>
          ))}
        </select>
      </div>

      {schema.sections.map((sec, si) => (
        <fieldset key={si} className="flex flex-col gap-3 rounded-md border border-line p-3">
          <legend className="px-1 font-semibold">Section {si + 1}</legend>
          <TextField id={`sec-${si}`} label="Section title" value={sec.title} onChange={(e) => setSection(si, e.target.value)} />
          {sec.fields.map((f, fi) => (
            <div key={fi} role="group" aria-label={`Field ${f.key || fi + 1}`} className="grid grid-cols-1 gap-2 border-t border-line pt-2 md:grid-cols-6 md:items-end">
              <TextField id={`f-${si}-${fi}-key`} label="Key" value={f.key} onChange={(e) => setField(si, fi, { key: e.target.value })} />
              <div className="md:col-span-2">
                <TextField id={`f-${si}-${fi}-label`} label="Label" value={f.label} onChange={(e) => setField(si, fi, { label: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`f-${si}-${fi}-type`} className="font-semibold">
                  Type
                </label>
                <select id={`f-${si}-${fi}-type`} className="min-h-touch rounded-sm border border-line-input bg-surface-card px-2" value={f.type} onChange={(e) => setField(si, fi, { type: e.target.value as FormField['type'] })}>
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex min-h-touch items-center gap-2">
                <input type="checkbox" className="h-5 w-5" checked={f.required} onChange={(e) => setField(si, fi, { required: e.target.checked })} />
                Required
              </label>
              <Button
                size="sm"
                variant="tertiary"
                onClick={() => setSchema((s) => ({ sections: s.sections.map((x, i) => (i === si ? { ...x, fields: x.fields.filter((_, j) => j !== fi) } : x)) }))}
              >
                Remove field
              </Button>
              {f.type === 'select' ? (
                <div className="md:col-span-6">
                  <TextField
                    id={`f-${si}-${fi}-opts`}
                    label="Options (one per line)"
                    multiline
                    rows={3}
                    value={(f.options ?? []).join('\n')}
                    onChange={(e) => setField(si, fi, { options: e.target.value.split('\n').map((o) => o.trim()).filter(Boolean) })}
                  />
                </div>
              ) : null}
            </div>
          ))}
          <div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSchema((s) => ({ sections: s.sections.map((x, i) => (i === si ? { ...x, fields: [...x.fields, { key: '', label: '', type: 'text', required: false }] } : x)) }))}
            >
              Add field
            </Button>
          </div>
        </fieldset>
      ))}
      <div>
        <Button size="sm" variant="secondary" onClick={() => setSchema((s) => ({ sections: [...s.sections, { key: `section_${s.sections.length + 1}`, title: '', fields: [] }] }))}>
          Add section
        </Button>
      </div>

      <fieldset className="flex flex-col gap-2 rounded-md border border-line p-3">
        <legend className="px-1 font-semibold">Required documents</legend>
        {docs.length === 0 ? <p className="text-sm text-ink-muted">No documents asked for.</p> : null}
        {docs.map((d, di) => (
          <div key={di} role="group" aria-label={`Document ${d.key || di + 1}`} className="grid grid-cols-1 gap-2 md:grid-cols-4 md:items-end">
            <TextField id={`d-${di}-key`} label="Key" value={d.key} onChange={(e) => setDocs(docs.map((x, i) => (i === di ? { ...x, key: e.target.value } : x)))} />
            <TextField id={`d-${di}-label`} label="Label" value={d.label} onChange={(e) => setDocs(docs.map((x, i) => (i === di ? { ...x, label: e.target.value } : x)))} />
            <label className="flex min-h-touch items-center gap-2">
              <input type="checkbox" className="h-5 w-5" checked={d.required} onChange={(e) => setDocs(docs.map((x, i) => (i === di ? { ...x, required: e.target.checked } : x)))} />
              Required
            </label>
            <Button size="sm" variant="tertiary" onClick={() => setDocs(docs.filter((_, i) => i !== di))}>
              Remove document
            </Button>
          </div>
        ))}
        <div>
          <Button size="sm" variant="secondary" onClick={() => setDocs([...docs, { key: '', label: '', required: false }])}>
            Add document
          </Button>
        </div>
      </fieldset>

      <div>
        <Button type="submit" loading={busy} loadingLabel="Saving…" disabled={!rubric} disabledReason="Choose a rubric">
          Save form as draft
        </Button>
      </div>
    </form>
  )
}

