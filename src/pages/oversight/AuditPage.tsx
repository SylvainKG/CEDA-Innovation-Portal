import { useState } from 'react'
import { Banner, Button } from '@/components'
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '@/components/states/States'
import { useAuditLog } from '@/features/oversight/queries'
import type { AuditQuery, AuditRow } from '@/lib/api/types'
import { formatDateTimeCAT } from '@/lib/format'

/** A CAT calendar day as the instant it starts; "to" is inclusive, so the next day's midnight is sent. */
const dayStart = (d: string) => new Date(`${d}T00:00:00+02:00`).toISOString()
const dayAfter = (d: string) => new Date(Date.parse(`${d}T00:00:00+02:00`) + 86_400_000).toISOString()

interface Draft {
  reference: string
  action: string
  from: string
  to: string
}

/**
 * T14 audit log (spec T14, SEC-03), Provisional UI built from the written spec (BCR-003; design review pending).
 * Admins and auditors only; the server refuses everyone else (`query_audit`, audit.read). Newest first, 50 at a
 * time with "Load older" (keyset paging). Filters: case reference, action (prefix), date range. Each row opens its
 * full metadata as a key/value list. Read only. The actor filter needs a people list and is not built yet.
 */
export function AuditPage() {
  const [draft, setDraft] = useState<Draft>({ reference: '', action: '', from: '', to: '' })
  const [query, setQuery] = useState<AuditQuery>({})
  const [error, setError] = useState<string | null>(null)
  const log = useAuditLog(query)

  function apply() {
    if (draft.from && draft.to && draft.from > draft.to) {
      setError('The period must end on or after the day it starts')
      return
    }
    setError(null)
    setQuery({
      reference: draft.reference.trim() || undefined,
      action: draft.action.trim() || undefined,
      from: draft.from ? dayStart(draft.from) : undefined,
      to: draft.to ? dayAfter(draft.to) : undefined,
    })
  }

  if (log.isPending) return <LoadingState what="the audit log" />
  if (log.isError && !log.data) return <ErrorState level="h1" message="We couldn't load the audit log." onRetry={() => void log.refetch()} />
  if (log.data.pages[0] === null) return <ForbiddenState home="/staff" />
  const rows = log.data.pages.flatMap((p) => p ?? [])
  const field = 'min-h-touch rounded-sm border border-line-input bg-surface-card px-2 font-normal'

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1 font-semibold">Audit log</h1>
      <Banner kind="info">Audit entries can&apos;t be edited or deleted.</Banner>
      <form
        className="flex flex-wrap items-end gap-3"
        aria-label="Audit filters"
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
      >
        <label className="flex flex-col gap-1 font-semibold">
          Case reference
          <input className={field} placeholder="CEDA-2026-0009" value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 font-semibold">
          Action starts with
          <input className={field} placeholder="decision." value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 font-semibold">
          From
          <input type="date" className={field} value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 font-semibold">
          To
          <input
            type="date"
            className={field}
            value={draft.to}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'audit-period-err' : undefined}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
        </label>
        <Button type="submit" variant="secondary">
          Apply filters
        </Button>
      </form>
      {error ? (
        <p id="audit-period-err" className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-ink-muted" role="status">
        {rows.length === 0 ? '' : `${rows.length} entries shown, newest first.`}
      </p>
      {rows.length === 0 ? (
        <EmptyState title="No entries match these filters." />
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-md bg-surface-card shadow-1">
          {rows.map((r) => (
            <AuditEntry key={r.id} r={r} />
          ))}
        </ul>
      )}
      {log.isError ? <Banner kind="error">We couldn&apos;t load older entries. Try again.</Banner> : null}
      {log.hasNextPage ? (
        <Button variant="secondary" loading={log.isFetchingNextPage} loadingLabel="Loading…" onClick={() => void log.fetchNextPage()}>
          Load older entries
        </Button>
      ) : null}
    </div>
  )
}

function AuditEntry({ r }: { r: AuditRow }) {
  const who = r.actor_name ?? (r.actor_id ? 'Unknown user' : 'System')
  return (
    <li className="p-3">
      <details>
        <summary className="flex min-h-touch cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-sm">{r.action}</span>
          <span>
            {who}
            {r.actor_role ? <span className="text-ink-muted"> ({r.actor_role.replace(/_/g, ' ')})</span> : null}
          </span>
          {r.reference ? <span className="font-mono text-sm">{r.reference}</span> : null}
          <span className="text-sm text-ink-muted">{formatDateTimeCAT(r.at)}</span>
          <span className="text-sm text-link underline">View details</span>
        </summary>
        <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm md:grid-cols-[12rem_1fr]">
          <dt className="font-semibold">Entry</dt>
          <dd>#{r.id}</dd>
          <dt className="font-semibold">Target</dt>
          <dd className="break-all">
            {r.target_type}
            {r.target_id ? ` · ${r.target_id}` : ''}
          </dd>
          {Object.entries(r.metadata).map(([k, v]) => (
            <Pair key={k} k={k} v={v} />
          ))}
        </dl>
      </details>
    </li>
  )
}

function Pair({ k, v }: { k: string; v: unknown }) {
  return (
    <>
      <dt className="font-semibold">{k}</dt>
      <dd className="break-all">{v === null ? 'none' : typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
    </>
  )
}
