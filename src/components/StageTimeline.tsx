import { Check } from 'lucide-react'
import type { PublicStage } from '@/lib/api/types'
import { PUBLIC_STAGES } from '@/lib/status'
import { formatDateCAT } from '@/lib/format'
import { cn } from '@/lib/cn'

export type StageState = 'done' | 'current' | 'upcoming' | 'skipped'

export interface StageEntry {
  stage: PublicStage
  state: StageState
  /** UTC timestamp when the stage was reached (done/current). */
  at?: string
}

export interface StageTimelineProps {
  stages: StageEntry[]
  /** Horizontal from 768 px and vertical below by default; force vertical inside narrow panels. */
  orientation?: 'responsive' | 'vertical'
  compact?: boolean
}

const STATE_TEXT: Record<StageState, string> = {
  done: 'completed',
  current: 'current stage',
  upcoming: 'not reached yet',
  skipped: 'not needed',
}

/**
 * The five applicant-visible stages (spec §5 StageTimeline), always all five as in Sandra's frames (#100
 * decision 2): numbered circles, a tick once done. A stage the case went past without using (Feedback when
 * CEDA asked nothing) is `skipped`: greyed, announced as "not needed", and the progress line runs through it.
 */
export function StageTimeline({ stages, orientation = 'responsive', compact = false }: StageTimelineProps) {
  const byStage = new Map(stages.map((s) => [s.stage, s]))
  const visible = PUBLIC_STAGES
  const horizontal = orientation === 'responsive'
  const passed = (state: StageState) => state === 'done' || state === 'skipped'

  return (
    <ol
      aria-label="Progress"
      className={cn('flex flex-col gap-3', horizontal && 'md:flex-row md:items-start md:gap-0')}
    >
      {visible.map((p, i) => {
        const entry = byStage.get(p.id) ?? { stage: p.id, state: 'upcoming' as const }
        return (
          <li
            key={p.id}
            aria-current={entry.state === 'current' ? 'step' : undefined}
            className={cn('flex items-start gap-2', horizontal && 'md:flex-1 md:flex-col md:items-center md:text-center')}
          >
            <span className={cn('flex items-center', horizontal && 'md:w-full')}>
              {horizontal && i > 0 ? (
                <span aria-hidden className={cn('hidden h-0.5 flex-1 md:block', entry.state === 'upcoming' ? 'bg-line' : 'bg-brand')} />
              ) : null}
              <span
                className={cn(
                  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                  entry.state === 'done' && 'border-brand bg-brand text-brand-on',
                  entry.state === 'current' && 'border-brand bg-brand-subtle text-brand-text',
                  entry.state === 'upcoming' && 'border-line-input bg-surface-card text-ink-muted',
                  entry.state === 'skipped' && 'border-dashed border-line-input bg-surface-sunken text-ink-muted',
                )}
              >
                {entry.state === 'done' ? (
                  <Check aria-hidden className="h-4 w-4" />
                ) : (
                  <span aria-hidden className="text-sm font-semibold leading-none">
                    {i + 1}
                  </span>
                )}
              </span>
              {horizontal && i < visible.length - 1 ? (
                <span aria-hidden className={cn('hidden h-0.5 flex-1 md:block', passed(entry.state) ? 'bg-brand' : 'bg-line')} />
              ) : null}
            </span>
            <span className="flex flex-col">
              <span className={cn('text-sm', entry.state === 'current' ? 'font-semibold text-ink' : entry.state === 'skipped' ? 'text-ink-muted' : 'text-ink')}>
                {p.label}
                <span className="sr-only">: {STATE_TEXT[entry.state]}</span>
              </span>
              {!compact && entry.at && (entry.state === 'done' || entry.state === 'current') ? (
                <span className="text-sm text-ink-muted">{formatDateCAT(entry.at)}</span>
              ) : null}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
