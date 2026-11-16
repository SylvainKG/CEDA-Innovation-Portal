import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  icon?: LucideIcon
  /** Shows a spinner, keeps the label visible and blocks repeat clicks (spec §5). */
  loading?: boolean
  /** Text shown while loading, e.g. "Submitting…". */
  loadingLabel?: string
  /** Why the button is disabled; shown as a hint and announced to assistive technology (spec §5). */
  disabledReason?: string
  children: ReactNode
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-on hover:bg-brand-hover',
  secondary: 'bg-surface-card text-ink border border-line-input hover:bg-surface-sunken',
  tertiary: 'bg-transparent text-brand-text underline underline-offset-2 hover:bg-brand-subtle',
  destructive: 'bg-error-fill text-white hover:bg-error',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon: Icon,
    loading = false,
    loadingLabel,
    disabledReason,
    disabled,
    children,
    className,
    type = 'button',
    ...rest
  },
  ref,
) {
  const reasonId = useId()
  const isDisabled = disabled || loading
  const showReason = Boolean(disabled && disabledReason)
  return (
    <span className="inline-flex flex-col">
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-describedby={showReason ? reasonId : undefined}
        className={cn(
          'inline-flex min-h-touch items-center justify-center gap-2 rounded-md font-semibold transition-colors',
          size === 'sm' ? 'px-3 text-sm' : 'px-4 text-base',
          VARIANTS[variant],
          isDisabled && 'cursor-not-allowed opacity-60',
          className,
        )}
        {...rest}
      >
        {loading ? (
          <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
        ) : Icon ? (
          <Icon aria-hidden className="h-5 w-5" />
        ) : null}
        <span>{loading && loadingLabel ? loadingLabel : children}</span>
      </button>
      {showReason ? (
        <span id={reasonId} className="mt-1 text-sm text-ink-muted">
          {disabledReason}
        </span>
      ) : null}
    </span>
  )
})
