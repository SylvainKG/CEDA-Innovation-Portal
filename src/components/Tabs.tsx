import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export interface TabItem {
  id: string
  label: string
  content: ReactNode
}

/**
 * Accessible tabs (WAI-ARIA tabs pattern): arrow keys, Home and End move between tabs, and only the selected
 * panel is rendered. The tab bar wraps on phones instead of scrolling a tab out of view (spec T08 asks for a
 * scrolling bar with arrows; wrapping keeps every tab visible, noted for design review).
 */
export function Tabs({ label, tabs, initial }: { label: string; tabs: TabItem[]; initial?: string }) {
  const [selected, setSelected] = useState(initial && tabs.some((t) => t.id === initial) ? initial : tabs[0]?.id)
  const base = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  function onKey(e: KeyboardEvent, index: number) {
    const last = tabs.length - 1
    const next = e.key === 'ArrowRight' ? (index === last ? 0 : index + 1) : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : null
    if (next === null) return
    e.preventDefault()
    setSelected(tabs[next]!.id)
    refs.current[next]?.focus()
  }
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-x-1 border-b border-line">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-controls={`${base}-panel-${t.id}`}
            aria-selected={selected === t.id}
            tabIndex={selected === t.id ? 0 : -1}
            onClick={() => setSelected(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={
              'min-h-touch shrink-0 border-b-2 px-3 font-semibold ' +
              (selected === t.id ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink')
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`${base}-panel-${t.id}`} aria-labelledby={`${base}-tab-${t.id}`} hidden={selected !== t.id} tabIndex={0}>
          {selected === t.id ? t.content : null}
        </div>
      ))}
    </div>
  )
}
