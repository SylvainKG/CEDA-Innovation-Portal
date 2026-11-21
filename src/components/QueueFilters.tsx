import { Search, X } from 'lucide-react'

export interface QueueFilter {
  key: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

/**
 * The filter card above a work queue (Sandra's 21 Nov screening-queue frame): a "Reference or title" search, the
 * queue's selects, and the active filters as removable chips with "Clear all".
 */
export function QueueFilters({ search, onSearch, filters }: { search: string; onSearch: (v: string) => void; filters: QueueFilter[] }) {
  const active = filters.filter((f) => f.value)
  const chips = [...(search.trim() ? [{ key: 'q', text: `Search: ${search.trim()}`, clear: () => onSearch('') }] : []), ...active.map((f) => ({ key: f.key, text: `${f.label}: ${f.options.find((o) => o.value === f.value)?.label ?? f.value}`, clear: () => f.onChange('') }))]
  return (
    <div className="flex flex-col gap-3">
      <div role="search" className="flex flex-wrap items-end gap-3 rounded-md border border-line bg-surface-card p-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm font-semibold">
          <span className="sr-only">Search by reference or title</span>
          <span className="relative flex items-center">
            <Search aria-hidden className="absolute left-3 h-4 w-4 text-ink-muted" />
            <input
              type="search"
              placeholder="Reference or title"
              className="min-h-touch w-full rounded-sm border border-line-input bg-surface-card pl-9 pr-3 text-base font-normal"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
            />
          </span>
        </label>
        {filters.map((f) => (
          <label key={f.key} className="flex min-w-0 flex-col gap-1 text-sm font-semibold">
            <span className="sr-only">{f.label}</span>
            <select className="min-h-touch w-full min-w-[9rem] max-w-full rounded-sm border border-line-input bg-surface-card px-2 text-base font-normal" value={f.value} onChange={(e) => f.onChange(e.target.value)}>
              <option value="">{f.label}: all</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {chips.length ? (
        <ul aria-label="Active filters" className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <li key={c.key}>
              <button type="button" onClick={c.clear} className="inline-flex min-h-touch items-center gap-2 rounded-full border border-line bg-surface-sunken px-3 text-sm">
                {c.text}
                <X aria-hidden className="h-4 w-4" />
                <span className="sr-only">(remove filter)</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                onSearch('')
                filters.forEach((f) => f.onChange(''))
              }}
              className="inline-flex min-h-touch items-center px-2 text-sm font-semibold text-brand-text underline"
            >
              Clear all
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  )
}
