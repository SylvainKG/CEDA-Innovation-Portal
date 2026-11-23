import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Banner, Button, PlainMarkdown, TextField } from '@/components'
import { ErrorState, LoadingState } from '@/components/states/States'
import { api } from '@/lib/api'
import type { AdminContentKind, AdminContentPage, CommandOutcome } from '@/lib/api/types'
import { SettingsNav } from './SettingsNav'

const KEY = ['admin', 'content'] as const
const KINDS: { kind: AdminContentKind; label: string }[] = [
  { kind: 'faq', label: 'FAQs' },
  { kind: 'contact', label: 'Contacts' },
  { kind: 'referral', label: 'Referrals' },
  { kind: 'support', label: 'Support page' },
  { kind: 'privacy', label: 'Privacy notice' },
  { kind: 'declaration', label: 'Declaration' },
  { kind: 'page', label: 'Other pages' },
]
const VERSIONED: AdminContentKind[] = ['privacy', 'declaration']
type Msg = { kind: 'success' | 'error' | 'warning'; text: string } | null

/**
 * T12 content (HLP-01), Provisional UI built from the written spec (BCR-003; design review pending). FAQs,
 * contacts, referrals, the support page, the privacy notice and the declaration, each with a "Sample" toggle and
 * draft or published. Privacy and declaration wording carries a version, and changed wording needs a new one so
 * earlier consents stay traceable (the server refuses otherwise). Text is plain Markdown; HTML is never run.
 */
export function ContentAdminPage() {
  const qc = useQueryClient()
  const pages = useQuery({ queryKey: KEY, queryFn: () => api.configAdmin.listContent() })
  const [kind, setKind] = useState<AdminContentKind>('faq')
  const [editing, setEditing] = useState<AdminContentPage | 'new' | null>(null)
  const [msg, setMsg] = useState<Msg>(null)

  if (pages.isPending) return <LoadingState what="content" />
  if (pages.isError) return <ErrorState level="h1" message="We couldn't load the content." onRetry={() => void pages.refetch()} />
  const list = pages.data.filter((p) => p.kind === kind).sort((a, b) => a.position - b.position)

  return (
    <div className="flex flex-col gap-6">
      <SettingsNav />
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">Content</h1>
        <p className="text-ink-muted">Help pages, contacts and legal wording. Only published pages are shown to the public.</p>
      </div>
      <div aria-live="polite">{msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}</div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 font-semibold">
          Type
          <select
            className="min-h-touch rounded-sm border border-line-input bg-surface-card px-2 font-normal"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as AdminContentKind)
              setEditing(null)
            }}
          >
            {KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <Button variant="secondary" onClick={() => setEditing('new')}>
          New page
        </Button>
      </div>

      {editing ? (
        <PageEditor
          key={editing === 'new' ? 'new' : editing.slug}
          start={editing === 'new' ? null : editing}
          kind={kind}
          nextPosition={list.length}
          onCancel={() => setEditing(null)}
          onSaved={async (text) => {
            await qc.invalidateQueries({ queryKey: KEY })
            await qc.invalidateQueries({ queryKey: ['content'] })
            setMsg({ kind: 'success', text })
            setEditing(null)
          }}
          onProblem={setMsg}
        />
      ) : null}

      <ul className="flex flex-col gap-2" aria-label={KINDS.find((k) => k.kind === kind)!.label}>
        {list.length === 0 ? <li className="text-ink-muted">Nothing here yet.</li> : null}
        {list.map((p) => (
          <li key={p.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-card p-3 shadow-1">
            <span className="flex flex-col">
              <span className="font-semibold">{p.title}</span>
              <span className="text-sm text-ink-muted">
                {p.status === 'published' ? 'Published' : 'Draft'}
                {p.is_sample ? ' · Sample' : ''}
                {p.version ? ` · version ${p.version}` : ''}
              </span>
            </span>
            <Button size="sm" variant="secondary" aria-label={`Edit ${p.title}`} onClick={() => setEditing(p)}>
              Edit
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PageEditor({
  start,
  kind,
  nextPosition,
  onCancel,
  onSaved,
  onProblem,
}: {
  start: AdminContentPage | null
  kind: AdminContentKind
  nextPosition: number
  onCancel: () => void
  onSaved: (text: string) => Promise<void>
  onProblem: (m: Msg) => void
}) {
  const [v, setV] = useState({
    slug: start?.slug ?? '',
    title: start?.title ?? '',
    body: start?.body_md ?? '',
    version: start?.version ?? '',
    isSample: start?.is_sample ?? true,
  })
  const [fields, setFields] = useState<Record<string, string> | undefined>()
  const [busy, setBusy] = useState(false)
  const versioned = VERSIONED.includes(kind)

  async function save(status: 'draft' | 'published') {
    setBusy(true)
    let r: CommandOutcome<{ slug: string; status: 'draft' | 'published' }>
    try {
      r = await api.configAdmin.saveContent({
        slug: v.slug.trim(),
        kind: start?.kind ?? kind,
        title: v.title,
        bodyMd: v.body,
        status,
        position: start?.position ?? nextPosition,
        isSample: v.isSample,
        version: versioned ? v.version : null,
      })
    } catch {
      r = { kind: 'unknown', requestKey: '' }
    }
    setBusy(false)
    if (r.kind === 'ok') return onSaved(status === 'published' ? `"${v.title.trim()}" published.` : `"${v.title.trim()}" saved as a draft.`)
    setFields(r.kind === 'refused' ? r.fields : undefined)
    onProblem(r.kind === 'refused' ? { kind: 'error', text: r.message ?? 'The page was not saved.' } : { kind: 'warning', text: "We couldn't confirm the page was saved. Check the list before trying again." })
  }

  return (
    <form noValidate aria-labelledby="page-ed-h" className="flex flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1" onSubmit={(e) => e.preventDefault()}>
      <h2 id="page-ed-h" className="text-h2 font-semibold">
        {start ? `Edit ${start.title}` : 'New page'}
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TextField id="page-title" label="Title" maxLength={200} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} error={fields?.title} />
        <TextField id="page-slug" label="Address" help="Lowercase letters, numbers and hyphens" value={v.slug} disabled={Boolean(start)} onChange={(e) => setV({ ...v, slug: e.target.value })} error={fields?.slug} />
      </div>
      <TextField id="page-body" label="Text (Markdown)" multiline rows={6} maxLength={20000} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} error={fields?.body_md} />
      {versioned ? (
        <TextField
          id="page-version"
          label="Wording version"
          help="Change it whenever the wording changes, so earlier consents stay traceable"
          value={v.version}
          onChange={(e) => setV({ ...v, version: e.target.value })}
          error={fields?.version}
        />
      ) : null}
      <label className="flex min-h-touch items-center gap-2">
        <input type="checkbox" className="h-5 w-5" checked={v.isSample} onChange={(e) => setV({ ...v, isSample: e.target.checked })} />
        Sample wording (shows a &quot;Sample&quot; label until CEDA confirms it)
      </label>
      {v.body.trim() ? (
        <div className="rounded-md border border-line p-3">
          <p className="mb-1 text-sm font-semibold text-ink-muted">Preview</p>
          <PlainMarkdown source={v.body} />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button loading={busy} loadingLabel="Saving…" onClick={() => void save('published')}>
          Publish
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => void save('draft')}>
          Save as draft
        </Button>
        <Button variant="tertiary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
