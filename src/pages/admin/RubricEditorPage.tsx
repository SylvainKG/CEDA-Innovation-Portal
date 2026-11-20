import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Banner, Button, TextField } from '@/components'
import { ErrorState, LoadingState, NotFoundState } from '@/components/states/States'
import { api } from '@/lib/api'
import type { AdminRubricVersion, CommandOutcome, RubricCriterion } from '@/lib/api/types'

type Msg = { kind: 'success' | 'error' | 'warning'; text: string } | null
type Draft = { key: string; label: string; weight: string; guidance: string; a1: string; a3: string; a5: string }
const toDraft = (c?: RubricCriterion): Draft => ({
  key: c?.key ?? '',
  label: c?.label ?? '',
  weight: c ? String(c.weight) : '',
  guidance: c?.guidance ?? '',
  a1: c?.anchors['1'] ?? '',
  a3: c?.anchors['3'] ?? '',
  a5: c?.anchors['5'] ?? '',
})

/**
 * T12 rubric editor (REV-02, ARC-01, D-20), Provisional UI built from the written spec (BCR-003; design review
 * pending). Criteria rows (name, weight, guidance, anchors for 1, 3 and 5), a weights total ("Total 100% ✓"), and
 * "Publish rubric vN". Published versions are read-only; changes go into a new draft copied from the latest one.
 */
export function RubricEditorPage() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const rubric = useQuery({ queryKey: ['admin', 'rubric', id], queryFn: () => api.rubricAdmin.getRubric(id) })
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)

  if (rubric.isPending) return <LoadingState what="the rubric" />
  if (rubric.isError) return <ErrorState level="h1" message="We couldn't load the rubric." onRetry={() => void rubric.refetch()} />
  if (rubric.data === null) return <NotFoundState home="/admin/challenges" />
  const r = rubric.data
  const latest = r.versions[0]!
  const live = r.versions.find((v) => v.published_at)

  async function act<T>(run: () => Promise<CommandOutcome<T>>, ok: (d: T) => string): Promise<CommandOutcome<T>> {
    setBusy(true)
    let res: CommandOutcome<T>
    try {
      res = await run()
    } catch {
      res = { kind: 'unknown', requestKey: '' }
    }
    await qc.invalidateQueries({ queryKey: ['admin'] })
    setBusy(false)
    setMsg(res.kind === 'ok' ? { kind: 'success', text: ok(res.data) } : res.kind === 'refused' ? { kind: 'error', text: res.message ?? 'The change was refused.' } : { kind: 'warning', text: "We couldn't confirm the change. The page shows what is saved." })
    return res
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">{r.title}</h1>
        <p className="text-ink-muted" role="status">
          {latest.published_at ? `v${latest.version_no} is published and locked` : `Draft of v${latest.version_no}${live ? `, v${live.version_no} is live` : ''}`}
        </p>
      </div>
      <div aria-live="polite">{msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}</div>
      {latest.published_at ? (
        <div className="flex flex-col gap-3">
          <ReadOnly v={latest} />
          <div>
            <Button loading={busy} loadingLabel="Creating…" onClick={() => void act(() => api.rubricAdmin.createDraft(r.id), (d) => `Draft v${d.version_no} created from v${latest.version_no}.`)}>
              Create draft v{latest.version_no + 1}
            </Button>
          </div>
        </div>
      ) : (
        <DraftEditor key={latest.id} v={latest} busy={busy} act={act} />
      )}
    </div>
  )
}

function Total({ criteria }: { criteria: RubricCriterion[] }) {
  const t = Math.round(criteria.reduce((s, c) => s + c.weight, 0) * 100) / 100
  return (
    <p className={`font-semibold ${t === 100 ? 'text-success' : 'text-error'}`} aria-live="polite">
      {t === 100 ? 'Total 100% ✓' : `Total ${t}%: must be 100% to publish`}
    </p>
  )
}

function ReadOnly({ v }: { v: AdminRubricVersion }) {
  return (
    <section aria-labelledby="rub-ro" className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
      <h2 id="rub-ro" className="text-h2 font-semibold">
        Criteria (v{v.version_no}, read only)
      </h2>
      <Total criteria={v.criteria} />
      <ul className="flex flex-col divide-y divide-line">
        {v.criteria.map((c) => (
          <li key={c.key} className="flex flex-col gap-1 py-2">
            <span className="font-semibold">
              {c.label} · {c.weight}%
            </span>
            {c.guidance ? <span className="text-sm">{c.guidance}</span> : null}
            <span className="text-sm text-ink-muted">
              1: {c.anchors['1']} · 3: {c.anchors['3']} · 5: {c.anchors['5']}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function DraftEditor({ v, busy, act }: { v: AdminRubricVersion; busy: boolean; act: <T>(run: () => Promise<CommandOutcome<T>>, ok: (d: T) => string) => Promise<CommandOutcome<T>> }) {
  const [adding, setAdding] = useState(false)
  return (
    <section aria-labelledby="rub-draft" className="flex flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1">
      <h2 id="rub-draft" className="text-h2 font-semibold">
        Criteria (draft v{v.version_no})
      </h2>
      <p className="text-sm text-ink-muted">Reviewers score each criterion from 1 to 5. Describe what a 1, a 3 and a 5 look like.</p>
      <Total criteria={v.criteria} />
      {v.criteria.length === 0 ? <p className="text-ink-muted">No criteria yet.</p> : null}
      {v.criteria.map((c, i) => (
        <CriterionForm key={c.key} versionId={v.id} start={c} position={i} busy={busy} act={act} />
      ))}
      {adding ? <CriterionForm versionId={v.id} position={v.criteria.length} busy={busy} act={act} onDone={() => setAdding(false)} /> : null}
      <div className="flex flex-wrap gap-2">
        {!adding ? (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            Add criterion
          </Button>
        ) : null}
        <Button disabled={busy} onClick={() => void act(() => api.rubricAdmin.publish(v.id), () => `Rubric v${v.version_no} published. It is now locked.`)}>
          Publish rubric v{v.version_no}
        </Button>
      </div>
    </section>
  )
}

function CriterionForm({
  versionId,
  start,
  position,
  busy,
  act,
  onDone,
}: {
  versionId: string
  start?: RubricCriterion
  position: number
  busy: boolean
  act: <T>(run: () => Promise<CommandOutcome<T>>, ok: (d: T) => string) => Promise<CommandOutcome<T>>
  onDone?: () => void
}) {
  const [d, setD] = useState<Draft>(toDraft(start))
  const [fields, setFields] = useState<Record<string, string> | undefined>()
  const base = `crit-${start?.key ?? 'new'}`
  const name = start ? start.label : 'New criterion'
  async function save() {
    const res = await act(
      () => api.rubricAdmin.saveCriterion({ versionId, key: d.key.trim(), label: d.label, weight: Number(d.weight), anchors: { '1': d.a1, '3': d.a3, '5': d.a5 }, guidance: d.guidance, position }),
      (x) => `${d.label.trim() || 'Criterion'} saved. Weights now total ${x.weights_total}%.`,
    )
    setFields(res.kind === 'refused' ? res.fields : undefined)
    if (res.kind === 'ok') onDone?.()
  }
  return (
    <fieldset aria-label={name} className="flex flex-col gap-2 rounded-md border border-line p-3">
      <legend className="px-1 font-semibold">{name}</legend>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <TextField id={`${base}-key`} label="Key" value={d.key} disabled={Boolean(start)} onChange={(e) => setD({ ...d, key: e.target.value })} error={fields?.key} />
        <div className="md:col-span-2">
          <TextField id={`${base}-label`} label="Name" maxLength={120} value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} error={fields?.label} />
        </div>
        <TextField id={`${base}-weight`} label="Weight (%)" inputMode="decimal" value={d.weight} onChange={(e) => setD({ ...d, weight: e.target.value })} error={fields?.weight} />
      </div>
      <TextField id={`${base}-guidance`} label="Guidance for reviewers" value={d.guidance} onChange={(e) => setD({ ...d, guidance: e.target.value })} />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <TextField id={`${base}-a1`} label="Score 1 means" value={d.a1} onChange={(e) => setD({ ...d, a1: e.target.value })} error={fields?.anchors} />
        <TextField id={`${base}-a3`} label="Score 3 means" value={d.a3} onChange={(e) => setD({ ...d, a3: e.target.value })} />
        <TextField id={`${base}-a5`} label="Score 5 means" value={d.a5} onChange={(e) => setD({ ...d, a5: e.target.value })} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" loading={busy} loadingLabel="Saving…" onClick={() => void save()}>
          Save {start ? start.label : 'criterion'}
        </Button>
        {start ? (
          <Button size="sm" variant="tertiary" disabled={busy} onClick={() => void act(() => api.rubricAdmin.removeCriterion(versionId, start.key), (x) => `${start.label} removed. Weights now total ${x.weights_total}%.`)}>
            Remove {start.label}
          </Button>
        ) : (
          <Button size="sm" variant="tertiary" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </fieldset>
  )
}
