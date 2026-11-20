import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

interface BaseProps {
  label: string
  help?: string
  error?: string
  required?: boolean
}

type InputProps = BaseProps & { multiline?: false } & Omit<InputHTMLAttributes<HTMLInputElement>, 'required'>
type AreaProps = BaseProps & { multiline: true } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'required'>
export type TextFieldProps = InputProps | AreaProps

/**
 * Text input or text area (spec §5):
 * - a persistent label above, with a "Required" marker written as text;
 * - help text;
 * - an error message with an icon;
 * - a character counter when maxLength is set.
 * Input text is 16 px so mobile browsers do not zoom.
 */
export function TextField(props: TextFieldProps) {
  const generatedId = useId()
  // A caller may pass an id (e.g. so an error summary can focus the field); the label follows it.
  const id = props.id ?? generatedId
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const countId = `${id}-count`
  const { label, help, error, required, className, multiline, ...rest } = props
  const length = typeof rest.value === 'string' ? rest.value.length : undefined
  const maxLength = rest.maxLength
  const describedBy = [help && helpId, error && errorId, maxLength && countId].filter(Boolean).join(' ') || undefined
  const fieldClass = cn(
    'w-full rounded-sm border bg-surface-card px-3 py-2 text-base text-ink',
    error ? 'border-error' : 'border-line-input',
    className,
  )
  const common = {
    id,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  }

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
      {multiline ? (
        <textarea
          {...common}
          rows={5}
          className={fieldClass}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          {...common}
          className={cn(fieldClass, 'min-h-touch')}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error || maxLength ? (
        <div className="flex items-start justify-between gap-2">
          {error ? (
            <p id={errorId} className="flex items-center gap-1 text-sm text-error">
              <AlertCircle aria-hidden className="h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : (
            <span />
          )}
          {maxLength ? (
            <p id={countId} className="text-sm text-ink-muted">
              {length ?? 0} / {maxLength} characters
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
