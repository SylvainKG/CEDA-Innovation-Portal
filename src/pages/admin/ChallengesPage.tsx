import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Banner, Button, DataTable, TextField, type Column } from '@/components'
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '@/components/states/States'
import { api } from '@/lib/api'
import type { AdminChallenge, CommandOutcome } from '@/lib/api/types'
import { formatDateCAT } from '@/lib/format'
import { challengeKeys, fromCat, STATUS_WORD } from './challenge-shared'
import { SettingsNav } from './SettingsNav'


/**
 * T12 challenges list (ADM-01), Provisional UI built from the written spec (BCR-003; design review pending).
 * Every challenge with its status and dates, and "New challenge" (a draft with its address, title and dates).
 */
export function ChallengesPage() {
  const list = useQuery({ queryKey: challengeKeys.list, queryFn: () => api.challengeAdmin.listChallenges() })
  const [creating, setCreating] = useState(false)
  if (list.isPending) return <LoadingState what="challenges" />
  if (list.isError) return <ErrorState level="h1" message="We couldn't load the challenges." onRetry={() => void list.refetch()} />
  if (list.data === null) return <ForbiddenState home="/staff" />
  const columns: Column<AdminChallenge>[] = [
    { key: 'title', header: 'Challenge', primary: true, cell: (c) => <Link to={`/admin/challenges/${c.id}`} className="inline-flex min-h-touch items-center">{c.title}</Link> },
    { key: 'status', header: 'Status', cell: (c) => STATUS_WORD[c.status] },
    { key: 'opens', header: 'Opens', cell: (c) => formatDateCAT(c.opens_at) },
    { key: 'closes', header: 'Closes', cell: (c) => formatDateCAT(c.closes_at) },
  ]
  return (
    <div className="flex flex-col gap-6">
      <SettingsNav />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 font-semibold">Challenges</h1>
        {!creating ? <Button onClick={() => setCreating(true)}>New challenge</Button> : null}
      </div>
      {creating ? <NewChallenge onCancel={() => setCreating(false)} /> : null}
      <DataTable caption="Challenges" columns={columns} rows={list.data} getRowKey={(c) => c.id} empty={<EmptyState title="No challenges yet" />} />
      <Rubrics />
    </div>
  )
}

function NewChallenge({ onCancel }: { onCancel: () => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [v, setV] = useState({ slug: '', title: '', summary: '', audience: '', opens: '', closes: '' })
  const [res, setRes] = useState<CommandOutcome<{ challenge_id: string }> | null>(null)
  const [busy, setBusy] = useState(false)
  const fields = res?.kind === 'refused' ? res.fields : undefined
  return (
    <form
      noValidate
      aria-labelledby="new-ch"
      className="flex flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        const r = await api.challengeAdmin
          .create({ slug: v.slug.trim(), title: v.title, summary: v.summary, audience: v.audience, opensAt: fromCat(v.opens), closesAt: fromCat(v.closes) })
          .catch((): CommandOutcome<{ challenge_id: string }> => ({ kind: 'unknown', requestKey: '' }))
        setBusy(false)
        setRes(r)
        await qc.invalidateQueries({ queryKey: challengeKeys.list })
        if (r.kind === 'ok') navigate(`/admin/challenges/${r.data.challenge_id}`)
      }}
    >
      <h2 id="new-ch" className="text-h2 font-semibold">
        New challenge
      </h2>
      {res?.kind === 'refused' ? <Banner kind="error">{res.message ?? 'The challenge was not created.'}</Banner> : null}
      {res?.kind === 'unknown' ? <Banner kind="warning">We couldn&apos;t confirm the challenge was created. Check the list before trying again.</Banner> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TextField id="ch-title" label="Title" required maxLength={200} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} error={fields?.title} />
        <TextField id="ch-slug" label="Web address" help="Lowercase letters, numbers and hyphens, e.g. solar-farming-2027" required value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} error={fields?.slug} />
        <DateTime id="ch-opens" label="Opens (CAT)" value={v.opens} onChange={(x) => setV({ ...v, opens: x })} />
        <DateTime id="ch-closes" label="Closes (CAT)" value={v.closes} onChange={(x) => setV({ ...v, closes: x })} error={fields?.closes_at} />
      </div>
      <TextField id="ch-summary" label="Summary" multiline rows={2} maxLength={1000} value={v.summary} onChange={(e) => setV({ ...v, summary: e.target.value })} />
      <TextField id="ch-audience" label="Who can apply" maxLength={300} value={v.audience} onChange={(e) => setV({ ...v, audience: e.target.value })} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy} loadingLabel="Creating…">
          Create draft
        </Button>
        <Button variant="tertiary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function DateTime({ id, label, value, onChange, error }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="datetime-local"
        className="min-h-touch rounded-sm border border-line-input bg-surface-card px-2"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <span id={`${id}-err`} className="text-sm text-error">
          {error}
        </span>
      ) : null}
    </div>
  )
}

/** Rubrics (T12): each with its latest version, and "New rubric" (key and title; starts as an empty draft v1). */
function Rubrics() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const list = useQuery({ queryKey: ['admin', 'rubrics'], queryFn: () => api.rubricAdmin.listRubrics() })
  const [v, setV] = useState({ key: '', title: '' })
  const [res, setRes] = useState<CommandOutcome<{ rubric_id: string }> | null>(null)
  if (list.isPending) return <LoadingState what="rubrics" lines={2} />
  if (list.isError || !list.data) return <ErrorState message="We couldn't load the rubrics." onRetry={() => void list.refetch()} />
  const fields = res?.kind === 'refused' ? res.fields : undefined
  return (
    <section aria-labelledby="rubrics-h" className="flex flex-col gap-3">
      <h2 id="rubrics-h" className="text-h2 font-semibold">
        Scoring rubrics
      </h2>
      <ul className="flex flex-col gap-2">
        {list.data.map((r) => {
          const latest = [...r.versions].sort((a, b) => b.version_no - a.version_no)[0]
          return (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 rounded-md bg-surface-card p-3 shadow-1">
              <Link to={`/admin/rubrics/${r.id}`} className="inline-flex min-h-touch items-center">{r.title}</Link>
              <span className="text-sm text-ink-muted">{latest ? `v${latest.version_no} ${latest.published_at ? 'published' : 'draft'}` : 'No versions'}</span>
            </li>
          )
        })}
      </ul>
      <form
        noValidate
        aria-label="New rubric"
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          const r = await api.rubricAdmin.create({ key: v.key.trim(), title: v.title }).catch((): CommandOutcome<{ rubric_id: string }> => ({ kind: 'unknown', requestKey: '' }))
          setRes(r)
          await qc.invalidateQueries({ queryKey: ['admin'] })
          if (r.kind === 'ok') navigate(`/admin/rubrics/${r.data.rubric_id}`)
        }}
      >
        <TextField id="rub-title" label="Rubric title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} error={fields?.title} />
        <TextField id="rub-key" label="Rubric key" help="Lowercase letters, numbers and hyphens" value={v.key} onChange={(e) => setV({ ...v, key: e.target.value })} error={fields?.key} />
        <Button type="submit" variant="secondary">
          New rubric
        </Button>
      </form>
      {res?.kind === 'refused' && !fields ? <Banner kind="error">{res.message}</Banner> : null}
      {res?.kind === 'unknown' ? <Banner kind="warning">We couldn&apos;t confirm the rubric was created. Check the list before trying again.</Banner> : null}
    </section>
  )
}
