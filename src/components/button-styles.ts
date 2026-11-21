import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-on hover:bg-brand-hover no-underline',
  secondary: 'bg-surface-card text-ink border border-line-input hover:bg-surface-sunken no-underline',
  tertiary: 'bg-transparent text-brand-text underline underline-offset-2 hover:bg-brand-subtle',
  destructive: 'bg-error-fill text-white hover:bg-error no-underline',
}

/** One source of button styling, shared by Button and ButtonLink so hover and focus always match (Sandra, #38). */
export function buttonClassName(variant: ButtonVariant = 'primary', size: 'sm' | 'md' = 'md', extra?: string) {
  return cn(
    'inline-flex min-h-touch items-center justify-center gap-2 rounded-md font-semibold transition-colors',
    size === 'sm' ? 'px-3 text-sm' : 'px-4 text-base',
    VARIANTS[variant],
    extra,
  )
}
