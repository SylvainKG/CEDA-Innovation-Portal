import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface Option<T extends string> {
  value: T
  label: ReactNode
}

interface SegmentedControlProps<T extends string> {
  value: T | null
  onChange: (value: T) => void
  options: Option<T>[]
  'aria-label'?: string
  'aria-labelledby'?: string
}

/**
 * Segmented control - a group of mutually exclusive buttons (Figma 21 Nov).
 * Visual alternative to radio buttons for 2-3 options. Used for Addressed/Not addressed on Revise roadmap.
 */
export function SegmentedControl<T extends string>({ value, onChange, options, ...ariaProps }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" {...ariaProps} className="inline-flex rounded-md border border-line">
      {options.map((option, idx) => {
        const isSelected = value === option.value
        const isFirst = idx === 0
        const isLast = idx === options.length - 1
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-touch min-w-[100px] border-line px-4 py-2 text-sm font-medium transition-colors',
              'hover:bg-surface-hover focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand',
              isSelected ? 'bg-surface-card-secondary text-ink' : 'bg-surface-card text-ink-muted',
              !isFirst && 'border-l',
              isFirst && 'rounded-l-sm',
              isLast && 'rounded-r-sm',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
