import { useId, type SelectHTMLAttributes } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'required'> {
  label: string
  options: SelectOption[]
  placeholder?: string
  help?: string
  error?: string
  required?: boolean
}

/** Native select: the most accessible and mobile-friendly option for short lists (spec §5). */
export function Select({ label, options, placeholder, help, error, required, className, ...rest }: SelectProps) {
  const generatedId = useId()
  const id = rest.id ?? generatedId
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const describedBy = [help && helpId, error && errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">
        {label}
        {required ? <span className="ml-2 text-sm font-normal text-ink-muted">Required</span> : null}
      </label>
      {help ? (
        <p id={helpId} className="text-sm text-ink-muted">
          {help}
        </p>
      ) : null}
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'min-h-touch w-full rounded-sm border bg-surface-card px-3 py-2 text-base text-ink',
          error ? 'border-error' : 'border-line-input',
          className,
        )}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} className="flex items-center gap-1 text-sm text-error">
          <AlertCircle aria-hidden className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
