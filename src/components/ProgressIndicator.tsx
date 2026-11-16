import { cn } from '@/lib/cn'

export interface ProgressIndicatorProps {
  label: string
  /** 0–100. Omit for an indeterminate bar (e.g. waiting for the server). */
  value?: number
  /** Optional text after the label, e.g. "4 of 6 sections complete". */
  valueText?: string
  className?: string
}

/** Progress bar with a visible label (spec §5: upload progress, completeness meter). */
export function ProgressIndicator({ label, value, valueText, className }: ProgressIndicatorProps) {
  const clamped = value === undefined ? undefined : Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex justify-between gap-2 text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-ink-muted">{valueText ?? (clamped !== undefined ? `${clamped}%` : 'In progress')}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-valuetext={valueText}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className={cn('h-full rounded-full bg-brand', clamped === undefined && 'w-1/3 animate-pulse')}
          style={clamped !== undefined ? { width: `${clamped}%` } : undefined}
        />
      </div>
    </div>
  )
}
