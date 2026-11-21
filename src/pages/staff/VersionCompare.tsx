import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ErrorState, LoadingState } from '@/components/states/States'
import { diffFields, diffFiles, type Change, type FileDiff } from '@/features/versions/compare'
import { api } from '@/lib/api'
import type { FormSchema } from '@/lib/api/types'
import { formatBytes, formatDateTimeCAT } from '@/lib/format'

const WORD: Record<Change | FileDiff['change'], string> = { changed: 'Changed', added: 'Added', removed: 'Removed', unchanged: 'Unchanged', replaced: 'Replaced' }
const TONE: Record<Change | FileDiff['change'], string> = {
  changed: 'border-brand',
  added: 'border-success',
  removed: 'border-error',
  replaced: 'border-brand',
  unchanged: 'border-line',
}

/**
 * INN-01 side-by-side version compare, Provisional UI built from the written spec (BCR-003; design review
 * pending). Every form field of the two versions next to each other with a word for what happened (changed,
 * added, removed), and the files: added, removed or replaced. "Show only changes" is on by default. The words carry
 * the meaning; the coloured edge only repeats it.
 */
export function VersionCompare({ proposalId, schema }: { proposalId: string; schema: FormSchema }) {
  const versions = useQuery({ queryKey: ['versions', proposalId], queryFn: () => api.versions.listVersions(proposalId) })
  const [onlyChanges, setOnlyChanges] = useState(true)
  const [pick, setPick] = useState<{ from: number; to: number } | null>(null)

  if (versions.isPending) return <LoadingState what="the versions" lines={3} />
  if (versions.isError) return <ErrorState message="We couldn't load the versions." onRetry={() => void versions.refetch()} />
  const list = versions.data ?? []
  if (list.length < 2) return <p className="text-ink-muted">There is only one version, so there is nothing to compare yet.</p>

  const to = pick?.to ?? list.at(-1)!.version_no
  const from = pick?.from ?? list.at(-2)!.version_no
  const a = list.find((v) => v.version_no === from)!
  const b = list.find((v) => v.version_no === to)!
  const fields = diffFields(schema, a, b)
  const files = diffFiles(a, b)
  const changed = fields.filter((f) => f.change !== 'unchanged').length
  const fileChanges = files.filter((f) => f.change !== 'unchanged').length
  const shownFields = onlyChanges ? fields.filter((f) => f.change !== 'unchanged') : fields
  const shownFiles = onlyChanges ? files.filter((f) => f.change !== 'unchanged') : files

  return (
    <section aria-labelledby={`cmp-${proposalId}`} className="flex flex-col gap-4">
      <h3 id={`cmp-${proposalId}`} className="text-h3 font-semibold">
        Compare versions
      </h3>
      <div className="flex flex-wrap items-end gap-3">
        {list.length > 2 ? (
          <>
            <VersionSelect label="From" value={from} options={list.map((v) => v.version_no).filter((n) => n < to)} onChange={(n) => setPick({ from: n, to })} />
            <VersionSelect label="To" value={to} options={list.map((v) => v.version_no).filter((n) => n > from)} onChange={(n) => setPick({ from, to: n })} />
          </>
        ) : null}
        <label className="flex min-h-touch items-center gap-2">
          <input type="checkbox" className="h-5 w-5" checked={onlyChanges} onChange={(e) => setOnlyChanges(e.target.checked)} />
          Show only changes
        </label>
      </div>
      <p role="status">
        Version {from} ({formatDateTimeCAT(a.submitted_at)}) → version {to} ({formatDateTimeCAT(b.submitted_at)}): {changed} {changed === 1 ? 'field' : 'fields'} and {fileChanges}{' '}
        {fileChanges === 1 ? 'file' : 'files'} changed.
      </p>
      {b.change_note ? (
        <div className="rounded-md border border-line p-3">
          <p className="text-sm font-semibold">What changed, in the applicant&apos;s words</p>
          <p className="whitespace-pre-wrap break-words">{b.change_note}</p>
        </div>
      ) : null}

      <ul className="flex flex-col gap-3" aria-label="Fields">
        {shownFields.length === 0 ? <li className="text-ink-muted">No field changed.</li> : null}
        {shownFields.map((f) => (
          <li key={f.key} className={`flex flex-col gap-2 rounded-md border-l-4 bg-surface-card p-3 shadow-1 ${TONE[f.change]}`} aria-label={`${f.label}: ${WORD[f.change]}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold">{f.label}</span>
              <span className="text-sm font-semibold">{WORD[f.change]}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <p className="text-sm text-ink-muted">Version {from}</p>
                <p className="whitespace-pre-wrap break-words">{f.before || <span className="text-ink-muted">(empty)</span>}</p>
              </div>
              <div>
                <p className="text-sm text-ink-muted">Version {to}</p>
                <p className="whitespace-pre-wrap break-words">{f.after || <span className="text-ink-muted">(empty)</span>}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <h4 className="font-semibold">Files</h4>
        <ul className="flex flex-col gap-2" aria-label="Files">
          {shownFiles.length === 0 ? <li className="text-ink-muted">No file changed.</li> : null}
          {shownFiles.map((f) => (
            <li key={`${f.docKey ?? ''}${f.name}`} className={`flex flex-wrap items-baseline gap-x-3 rounded-md border-l-4 bg-surface-card p-3 shadow-1 ${TONE[f.change]}`}>
              <span className="text-sm font-semibold">{WORD[f.change]}</span>
              <span className="break-all">
                {f.change === 'replaced' && f.before && f.after && f.before.filename !== f.after.filename ? `${f.before.filename} → ${f.after.filename}` : f.name}
              </span>
              <span className="text-sm text-ink-muted">{formatBytes((f.after ?? f.before)!.size_bytes)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function VersionSelect({ label, value, options, onChange }: { label: string; value: number; options: number[]; onChange: (n: number) => void }) {
  return (
    <label className="flex flex-col gap-1 font-semibold">
      {label}
      <select className="min-h-touch rounded-sm border border-line-input bg-surface-card px-2 text-base font-normal" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {options.map((n) => (
          <option key={n} value={n}>
            Version {n}
          </option>
        ))}
      </select>
    </label>
  )
}
