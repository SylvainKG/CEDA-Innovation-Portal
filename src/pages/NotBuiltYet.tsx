import { Construction } from 'lucide-react'

export interface NotBuiltYetProps {
  /** Template ID from the spec, e.g. "T07". */
  template: string
  title: string
  /** Optional variant, e.g. "Screening queue". */
  variant?: string
}

/**
 * Honest placeholder for a route whose screen is not built yet. It is not a fake screen:
 * it says what will live here and what it is waiting for (blueprint §8.5 Ready for build).
 */
export function NotBuiltYet({ template, title, variant }: NotBuiltYetProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-bold">{title}</h1>
      <section className="flex items-start gap-3 rounded-md border border-dashed border-line-input bg-surface-card p-4">
        <Construction aria-hidden className="mt-0.5 h-6 w-6 shrink-0 text-ink-muted" />
        <div className="flex flex-col gap-1">
          <p className="font-semibold">
            Not built yet: {template}
            {variant ? ` (${variant})` : ''}
          </p>
          <p className="text-ink-muted">
            This screen is waiting to be Ready for build: an approved design snapshot and the API contract for its actions.
          </p>
        </div>
      </section>
    </div>
  )
}
