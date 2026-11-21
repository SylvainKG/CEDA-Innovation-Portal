import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link, type LinkProps } from 'react-router-dom'
import { buttonClassName, type ButtonVariant } from './button-styles'

/** A navigation link that looks like a Button (same styles, hover and focus). Use it for "go somewhere" actions. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className,
  children,
  ...rest
}: Omit<LinkProps, 'className'> & { variant?: ButtonVariant; size?: 'sm' | 'md'; icon?: LucideIcon; className?: string; children: ReactNode }) {
  return (
    <Link className={buttonClassName(variant, size, className)} {...rest}>
      {Icon ? <Icon aria-hidden className="h-5 w-5" /> : null}
      {children}
    </Link>
  )
}
