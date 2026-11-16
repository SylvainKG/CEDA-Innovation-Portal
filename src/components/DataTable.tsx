import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface Column<Row> {
  key: string
  header: string
  cell: (row: Row) => ReactNode
  /** Shown as the card title on mobile (one column should set this). */
  primary?: boolean
  className?: string
}

export interface DataTableProps<Row> {
  /** Accessible caption describing the table (visually hidden). */
  caption: string
  columns: Column<Row>[]
  rows: Row[]
  getRowKey: (row: Row) => string
  /** Rendered instead of the table when there are no rows (state kit EmptyState). */
  empty: ReactNode
}

/**
 * Data table (spec §5):
 * - sticky header on desktop, at most 6 columns;
 * - rows become stacked cards below 768 px, so nothing scrolls sideways on mobile.
 * Row links go inside a cell (for example a reference link), so keyboard users reach them.
 */
export function DataTable<Row>({ caption, columns, rows, getRowKey, empty }: DataTableProps<Row>) {
  if (rows.length === 0) return <>{empty}</>
  const primary = columns.find((c) => c.primary) ?? columns[0]
  const rest = columns.filter((c) => c !== primary)

  return (
    <div>
      <table className="hidden w-full border-collapse overflow-hidden rounded-md bg-surface-card shadow-1 md:table">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-surface-sunken">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className="border-b border-line px-4 py-3 text-left text-sm font-semibold text-ink">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="border-b border-line last:border-b-0">
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3 align-top text-base', c.className)}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-3 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={getRowKey(row)} className="rounded-md bg-surface-card p-4 shadow-1">
            {primary ? <div className="mb-2 font-semibold">{primary.cell(row)}</div> : null}
            <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
              {rest.map((c) => (
                <div key={c.key} className="contents">
                  <dt className="text-sm text-ink-muted">{c.header}</dt>
                  <dd className="text-sm">{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}
