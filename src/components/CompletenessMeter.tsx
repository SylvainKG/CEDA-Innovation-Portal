import { useId } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { ProgressIndicator } from './ProgressIndicator'

export interface SectionProgress {
  id: string
  label: string
  complete: boolean
  /** In-page anchor of the section, e.g. "#impact". */
  href: string
}

/**
 * Completeness meter for the proposal form (spec §5, INN-03). Rule-based and local: nothing is sent anywhere.
 * Incomplete sections are listed as links so the applicant can jump to them.
 */
export function CompletenessMeter({ sections }: { sections: SectionProgress[] }) {
  const headingId = useId()
  const done = sections.filter((s) => s.complete).length
  const percent = sections.length === 0 ? 0 : (done / sections.length) * 100
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1">
      <h2 id={headingId} className="text-h3 font-semibold">
        Your progress
      </h2>
      <ProgressIndicator label="Sections complete" value={percent} valueText={`${done} of ${sections.length} sections complete`} />
      <ul className="flex flex-col gap-1">
        {sections.map((s) => (
          <li key={s.id} className="flex min-h-touch items-center gap-2 text-sm">
            {s.complete ? (
              <CheckCircle2 aria-hidden className="h-4 w-4 text-success" />
            ) : (
              <Circle aria-hidden className="h-4 w-4 text-ink-muted" />
            )}
            {s.complete ? (
              <span>
                {s.label}
                <span className="sr-only">: complete</span>
              </span>
            ) : (
              <a href={s.href} className="inline-flex min-h-touch items-center">
                {s.label}
                <span className="sr-only">: needs attention</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
